import { NextRequest, NextResponse } from 'next/server'
import { signUpSchema } from '@/lib/validations'
import { createUser, getUserByEmail, getUserByUsername, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = signUpSchema.parse(body)

    // Check if user already exists
    const existingUserByEmail = await getUserByEmail(validatedData.email)
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    const existingUserByUsername = await getUserByUsername(validatedData.username)
    if (existingUserByUsername) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      )
    }

    // Create user
    const user = await createUser({
      email: validatedData.email,
      username: validatedData.username,
      name: validatedData.name,
      password: validatedData.password,
    })

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    })

    return NextResponse.json({
      user,
      token,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      )
    }

    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

