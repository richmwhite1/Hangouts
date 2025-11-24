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
    
    // If user not found, sync from Clerk and attempt to link legacy accounts
    if (!user) {
      logger.info('getClerkApiUser - User not found, syncing from Clerk...')
      const clerkUser = await currentUser()
      
      if (clerkUser) {
        const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress || ''
        const allEmails = clerkUser.emailAddresses
          ?.map(addr => addr.emailAddress?.toLowerCase())
          .filter((email): email is string => Boolean(email)) || []
        const username = clerkUser.username || primaryEmail.split('@')[0] || 'user'
        const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || primaryEmail.split('@')[0]

        // Attempt to find an existing user by ANY known identifier (email aliases or username)
        const identifiers = [
          ...allEmails.map(email => ({ email })),
          ...(username ? [{ username }] : [])
        ]

        let existingUser = null
        if (identifiers.length > 0) {
          existingUser = await db.user.findFirst({
            where: {
              OR: identifiers
            }
          })
        }
        
        if (existingUser) {
          const normalizedPrimaryEmail = primaryEmail?.toLowerCase()
          const emailUpdate =
            normalizedPrimaryEmail && existingUser.email !== normalizedPrimaryEmail
              ? { email: normalizedPrimaryEmail }
              : {}

          // Update existing user with Clerk ID and latest profile info
          user = await db.user.update({
            where: { id: existingUser.id },
            data: { 
              clerkId: userId,
              // Only update email if we discovered a new verified address
              ...emailUpdate,
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
          logger.info('getClerkApiUser - Linked Clerk user to existing account', { userId: existingUser.id, username: existingUser.username })
        } else {
          // Create new user
          let uniqueUsername = username
          let counter = 1
          while (await db.user.findUnique({ where: { username: uniqueUsername } })) {
            uniqueUsername = `${username}${counter}`
            counter++
          }
          
          const emailForInsert = primaryEmail ? primaryEmail.toLowerCase() : `${uniqueUsername}@example.com`
          
          user = await db.user.create({
            data: {
              clerkId: userId,
              email: emailForInsert,
              username: uniqueUsername,
              name,
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
          logger.info('getClerkApiUser - Created new user from Clerk profile', { username: user.username })
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
