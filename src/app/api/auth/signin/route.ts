import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

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
    console.log('SIGNIN API - Received body:', JSON.stringify(body))
    const { email, password } = SignInSchema.parse(body)
    console.log('SIGNIN API - Parsed email:', email, 'password length:', password.length)

    // Find user by email
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

    if (!user) {
      return NextResponse.json(createErrorResponse('Invalid credentials', 'Email or password is incorrect'), { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json(createErrorResponse('Account disabled', 'Your account has been disabled'), { status: 403 })
    }

    // Verify password
    console.log('SIGNIN API - Comparing password with hash')
    console.log('SIGNIN API - User found:', user.email, 'hash length:', user.password.length)
    const isValidPassword = await bcrypt.compare(password, user.password)
    console.log('SIGNIN API - Password valid:', isValidPassword)
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
      response = NextResponse.json(createErrorResponse('Validation error', JSON.stringify(error.errors)), { status: 400 })
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