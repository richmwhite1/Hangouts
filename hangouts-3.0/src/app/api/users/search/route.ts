import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        users: []
      })
    }

    // Search for users by name or username
    const users = await db.user.findMany({
      where: {
        AND: [
          { id: { not: user.id } }, // Exclude current user
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { username: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        location: true
      },
      take: 20,
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      users
    })
  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    )
  }
}
