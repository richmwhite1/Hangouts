import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from './db'

export async function getClerkApiUser() {
  const { userId } = await auth()
  if (!userId) return null
  
  const user = await db.user.findUnique({
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
  
  return user
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
