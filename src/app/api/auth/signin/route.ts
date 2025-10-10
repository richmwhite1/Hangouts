import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { logger } from '@/lib/logger'

const SignInSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    logger.debug('Received signin request', { email: body.email }, 'AUTH')
    const { email, password } = SignInSchema.parse(body)
    logger.debug('Parsed signin data', { email, passwordLength: password.length }, 'AUTH')

    // Find user by email
    logger.debug('Looking for user', { email: email.toLowerCase() }, 'AUTH')
    logger.debug('Database connection', { hasUrl: !!process.env.DATABASE_URL }, 'AUTH')
    
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        password: true,
        isActive: true,
        isVerified: true,
        role: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    logger.debug('User lookup result', { found: !!user, userId: user?.id, username: user?.username }, 'AUTH')

    if (!user) {
      return NextResponse.json(createErrorResponse('Invalid credentials', 'Email or password is incorrect'), { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json(createErrorResponse('Account disabled', 'Your account has been disabled'), { status: 403 })
    }

    // Verify password
    logger.debug('Verifying password', {}, 'AUTH')
    logger.debug('Password verification', { email: user.email, hashLength: user.password.length }, 'AUTH')
    const isValidPassword = await bcrypt.compare(password, user.password)
    logger.debug('Password verification result', { isValid: isValidPassword }, 'AUTH')
    if (!isValidPassword) {
      return NextResponse.json(createErrorResponse('Invalid credentials', 'Email or password is incorrect'), { status: 401 })
    }

    // Update last seen
    await db.user.update({
      where: { id: user.id },
      data: { lastSeen: new Date() }
    })

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    const response = NextResponse.json(createSuccessResponse({
      user: userWithoutPassword,
      token
    }, 'Sign in successful'))
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response

  } catch (error: any) {
    let response: NextResponse
    if (error instanceof z.ZodError) {
      response = NextResponse.json(createErrorResponse('Validation error', JSON.stringify(error.issues)), { status: 400 })
    } else {
      console.error('Sign in error:', error)
      response = NextResponse.json(createErrorResponse('Sign in failed', error.message), { status: 500 })
    }
    
    // Add CORS headers to error responses
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
  }
}