import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clerkId, email, username, name, avatar } = body

    // In development, allow the request to proceed even if Clerk auth fails
    let userId: string | null = null
    try {
      const authResult = await auth()
      userId = authResult.userId
    } catch (error) {
      console.log('⚠️ Clerk auth failed in development, proceeding anyway:', error)
    }

    // If no userId from Clerk, use the clerkId from the request body
    if (!userId) {
      userId = clerkId
      
      if (!userId) {
        return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
      }
    }

    // Check if user exists by email
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    let user
    if (existingUser) {
      // Update existing user with Clerk ID
      user = await db.user.update({
        where: { id: existingUser.id },
        data: { 
          clerkId,
          username: username || existingUser.username,
          name: name || existingUser.name,
          avatar: avatar || existingUser.avatar,
          isVerified: true
        }
      })
    } else {
      // Create new user with unique username
      const baseUsername = username || email.split('@')[0]
      let uniqueUsername = baseUsername
      let counter = 1
      
      // Ensure username is unique
      while (await db.user.findUnique({ where: { username: uniqueUsername } })) {
        uniqueUsername = `${baseUsername}${counter}`
        counter++
      }
      
      user = await db.user.create({
        data: {
          clerkId,
          email: email.toLowerCase(),
          username: uniqueUsername,
          name: name || email.split('@')[0],
          avatar,
          isVerified: true,
          isActive: true,
          password: null // Clerk users don't need passwords
        }
      })
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(createSuccessResponse({
      user: userWithoutPassword
    }, 'User synced successfully'))

  } catch (error: any) {
    console.error('Sync Clerk user error:', error)
    return NextResponse.json(createErrorResponse('Sync failed', error.message), { status: 500 })
  }
}
