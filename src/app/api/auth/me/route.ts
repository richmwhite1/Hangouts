import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'No token provided' 
      }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    
    if (!payload) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid token' 
      }, { status: 401 })
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true
      }
    })

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          isActive: user.isActive
        }
      }
    })

  } catch (error) {
    console.error('Get me error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}