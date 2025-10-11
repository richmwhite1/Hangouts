// Compatibility wrapper for @/lib/auth
// This file provides backward compatibility for existing API routes that expect JWT-based authentication
// while using Clerk authentication under the hood

import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from './clerk-auth'

import { logger } from '@/lib/logger'
export interface TokenPayload {
  userId: string
  email: string
  username: string
  role: string
  iat?: number
  exp?: number
}

/**
 * Legacy JWT token verification function
 * Now uses Clerk authentication instead of JWT
 * Returns the same payload structure that existing code expects
 */
export function verifyToken(_token: string): TokenPayload | null {
  // This function is called synchronously in many places, but Clerk auth is async
  // We need to handle this differently - this is a compatibility issue
  // For now, we'll return null and let the calling code handle it
  // The proper fix would be to update all calling code to use async auth
  logger.warn('verifyToken(); called - this should be replaced with async Clerk auth')
  return null
}

/**
 * Async version of verifyToken that works with Clerk
 * This should be used in new code instead of the sync version
 */
export async function verifyTokenAsync(): Promise<TokenPayload | null> {
  try {
    const { userId } = await auth()
    if (!userId) return null

    const user = await getClerkApiUser()
    if (!user) return null

    return {
      userId: user.id,
      email: user.email || '',
      username: user.username || '',
      role: user.role || 'USER'
    }
  } catch (error) {
    logger.error('Error verifying Clerk token:', error);
    return null
  }
}

/**
 * Get current user from Clerk
 * Compatible with existing code that expects a user object
 */
export async function getCurrentUser() {
  return await getClerkApiUser()
}

/**
 * Require authentication and return user ID
 * Throws error if not authenticated
 */
export async function requireAuth(): Promise<string> {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Authentication required')
  }
  return userId
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { userId } = await auth()
  return !!userId
}

/**
 * Get user role
 */
export async function getUserRole(): Promise<string | null> {
  const user = await getClerkApiUser()
  return user?.role || null
}

/**
 * Check if user has specific role
 */
export async function hasRole(role: string): Promise<boolean> {
  const userRole = await getUserRole()
  return userRole === role
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  return await hasRole('ADMIN')
}

/**
 * Check if user is moderator
 */
export async function isModerator(): Promise<boolean> {
  return await hasRole('MODERATOR')
}

/**
 * Legacy compatibility: Get user from token (now uses Clerk)
 * This maintains the same interface as the old JWT system
 */
export async function getUserFromToken(_token: string): Promise<TokenPayload | null> {
  // Since we can't verify the token directly, we'll use the current Clerk session
  return await verifyTokenAsync()
}

/**
 * Legacy compatibility: Validate token (now uses Clerk)
 */
export async function validateToken(_token: string): Promise<boolean> {
  const payload = await verifyTokenAsync()
  return !!payload
}

/**
 * Get user ID from token (now uses Clerk)
 */
export async function getUserIdFromToken(_token: string): Promise<string | null> {
  const payload = await verifyTokenAsync()
  return payload?.userId || null
}

/**
 * Middleware helper for API routes that need authentication
 * This provides a drop-in replacement for the old JWT middleware
 */
export async function withAuth(handler: (req: any, user: TokenPayload) => Promise<Response>) {
  return async (req: any) => {
    const user = await verifyTokenAsync()
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required',
        message: 'No valid authentication token provided'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return await handler(req, user)
  }
}

/**
 * Utility to extract user info from Clerk session
 * This is what most API routes actually need
 */
export async function getAuthUser() {
  const { userId } = await auth()
  if (!userId) return null

  const user = await getClerkApiUser()
  if (!user) return null

  return {
    id: user.id,
    userId: user.id, // For backward compatibility
    email: user.email || '',
    username: user.username || '',
    name: user.name || '',
    role: user.role || 'USER',
    avatar: user.avatar
  }
}
