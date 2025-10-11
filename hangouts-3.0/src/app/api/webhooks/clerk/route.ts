import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { syncClerkUserToDatabase } from '@/lib/clerk-auth'
import { db } from '@/lib/db'

import { logger } from '@/lib/logger'
export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  
  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env.local')
  }
  
  const headerPayload = req.headers
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')
  
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400})
  }
  
  const payload = await req.text()
  const body = JSON.parse(payload)
  
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: any
  
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature})
  } catch (err) {
    logger.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400})
  }
  
  const { type, data } = evt
  
  switch (type) {
    case 'user.created':
      try {
        await syncClerkUserToDatabase(data)
        // console.log('User created and synced:', data.id); // Removed for production
      } catch (error) {
        logger.error('Error syncing user creation:', error);
      }
      break
      
    case 'user.updated':
      try {
        const user = await db.user.findUnique({
          where: { clerkId: data.id }
        })
        
        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: {
              email: data.email_addresses[0]?.email_address,
              username: data.username,
              name: `${data.first_name} ${data.last_name}`.trim(),
              avatar: data.image_url,
              isVerified: data.email_addresses[0]?.verification?.status === 'verified'
            }
          })
          // console.log('User updated:', data.id); // Removed for production
        }
      } catch (error) {
        logger.error('Error updating user:', error);
      }
      break
      
    case 'user.deleted':
      try {
        const user = await db.user.findUnique({
          where: { clerkId: data.id }
        })
        
        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: { isActive: false }
          })
          // console.log('User deactivated:', data.id); // Removed for production
        }
      } catch (error) {
        logger.error('Error deactivating user:', error);
      }
      break
  }
  
  return NextResponse.json({ message: 'Webhook processed' })
}
