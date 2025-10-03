import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth.js'
import { db } from '@/lib/db'

export interface AuthResult {
  isAuthenticated: boolean
  user?: {
    id: string
    email: string
    username: string
    name: string
    role: string
  }
  error?: string
}

export async function authMiddleware(request: NextRequest): Promise<AuthResult> {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        isAuthenticated: false,
        error: 'No authorization header found'
      }
    }
    
    // Extract token
    const token = authHeader.substring(7)
    
    if (!token) {
      return {
        isAuthenticated: false,
        error: 'No token provided'
      }
    }
    
    // Verify token
    const payload = verifyToken(token)
    
    if (!payload) {
      return {
        isAuthenticated: false,
        error: 'Invalid token'
      }
    }
    
    // Get user from database with role
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        isActive: true
      }
    })
    
    if (!user) {
      return {
        isAuthenticated: false,
        error: 'User not found'
      }
    }
    
    if (!user.isActive) {
      return {
        isAuthenticated: false,
        error: 'User account is inactive'
      }
    }
    
    return {
      isAuthenticated: true,
      user: {
        id: user.id,
        email: user.email || '',
        username: user.username || '',
        name: user.name || '',
        role: user.role
      }
    }
    
  } catch (error) {
    console.error('Auth middleware error:', error)
    return {
      isAuthenticated: false,
      error: 'Authentication failed'
    }
  }
}

export async function adminAuthMiddleware(request: NextRequest): Promise<AuthResult> {
  const authResult = await authMiddleware(request)
  
  if (!authResult.isAuthenticated) {
    return authResult
  }
  
  // Check if user is admin
  if (authResult.user?.role !== 'ADMIN') {
    return {
      isAuthenticated: false,
      error: 'Admin access required'
    }
  }
  
  return authResult
}
