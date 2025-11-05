import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from './db'
import { logger } from './logger'

export async function getClerkApiUser() {
  try {
    const { userId } = await auth()
    logger.info('getClerkApiUser - Clerk userId:', { userId })
    if (!userId) return null
    
    // First, try to find user by clerkId
    let user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { 
        id: true, 
        email: true, 
        username: true, 
        name: true, 
        role: true,
        avatar: true,
        isActive: true
      }
    })
    
    // If user not found, sync from Clerk
    if (!user) {
      logger.info('getClerkApiUser - User not found, syncing from Clerk...')
      const clerkUser = await currentUser()
      
      if (clerkUser) {
        const email = clerkUser.emailAddresses[0]?.emailAddress || ''
        const username = clerkUser.username || email.split('@')[0] || 'user'
        const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email.split('@')[0]
        
        // Check if user exists by email
        const existingUser = await db.user.findUnique({
          where: { email: email.toLowerCase() }
        })
        
        if (existingUser) {
          // Update existing user with Clerk ID
          user = await db.user.update({
            where: { id: existingUser.id },
            data: { 
              clerkId: userId,
              name: name || existingUser.name,
              avatar: clerkUser.imageUrl || existingUser.avatar,
              isVerified: true
            },
            select: { 
              id: true, 
              email: true, 
              username: true, 
              name: true, 
              role: true,
              avatar: true,
              isActive: true
            }
          })
          logger.info('getClerkApiUser - Updated existing user with Clerk ID', { userId: existingUser.id })
        } else {
          // Create new user
          // Ensure username is unique
          let uniqueUsername = username
          let counter = 1
          while (await db.user.findUnique({ where: { username: uniqueUsername } })) {
            uniqueUsername = `${username}${counter}`
            counter++
          }
          
          user = await db.user.create({
            data: {
              clerkId: userId,
              email: email.toLowerCase(),
              username: uniqueUsername,
              name: name,
              avatar: clerkUser.imageUrl,
              isVerified: true,
              isActive: true,
              password: null
            },
            select: { 
              id: true, 
              email: true, 
              username: true, 
              name: true, 
              role: true,
              avatar: true,
              isActive: true
            }
          })
          logger.info('getClerkApiUser - Created new user', { username: user.username })
        }
      }
    }
    
    logger.info('getClerkApiUser - Database user found', { found: !!user, userId: user?.id })
    return user
  } catch (error) {
    logger.error('getClerkApiUser - Error:', error)
    return null
  }
}

export async function getClerkUserData() {
  const user = await currentUser()
  if (!user) return null
  
  return {
    clerkId: user.id,
    email: user.emailAddresses[0]?.emailAddress,
    username: user.username,
    name: `${user.firstName} ${user.lastName}`.trim(),
    avatar: user.imageUrl,
    isVerified: user.emailAddresses[0]?.verification?.status === 'verified'
  }
}

export async function syncClerkUserToDatabase(clerkUser: any) {
  const userData = {
    clerkId: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress,
    username: clerkUser.username,
    name: `${clerkUser.firstName} ${clerkUser.lastName}`.trim(),
    avatar: clerkUser.imageUrl,
    isVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
    isActive: true,
    password: null // Clerk users don't need passwords
  }
  
  // Check if user exists by email
  const existingUser = await db.user.findUnique({
    where: { email: userData.email }
  })
  
  if (existingUser) {
    // Update existing user with Clerk ID
    return await db.user.update({
      where: { id: existingUser.id },
      data: { clerkId: userData.clerkId }
    })
  } else {
    // Create new user
    return await db.user.create({
      data: userData
    })
  }
}
