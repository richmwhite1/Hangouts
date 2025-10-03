import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { userSchemas } from '@/lib/validation'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, username, name, password } = userSchemas.signUp.parse(body)

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    })

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return NextResponse.json(createErrorResponse('Email already exists', 'An account with this email already exists'), { status: 409 })
      } else {
        return NextResponse.json(createErrorResponse('Username already exists', 'This username is already taken'), { status: 409 })
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        name: name.trim(),
        password: hashedPassword,
        isActive: true,
        isVerified: false,
        role: 'USER',
        lastSeen: new Date()
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        isActive: true,
        isVerified: true,
        role: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true
      }
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

    return NextResponse.json(createSuccessResponse({
      user,
      token
    }, 'Sign up successful'))

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(createErrorResponse('Validation error', JSON.stringify(error.errors)), { status: 400 })
    }
    console.error('Sign up error:', error)
    return NextResponse.json(createErrorResponse('Sign up failed', error.message), { status: 500 })
  }
}