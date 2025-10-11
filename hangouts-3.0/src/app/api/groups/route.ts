import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { createApiHandler } from '@/lib/api-handler'

import { logger } from '@/lib/logger'
// GET /api/groups - Get user's groups
async function getGroupsHandler(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const token = authHeader.substring(7)
  const user = verifyToken(token)
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  try {
    const groups = await db.groups.findMany({
      where: {
        OR: [
          { creatorId: user.userId },
          { group_members: { some: { userId: user.userId } } }
        ]
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        group_members: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            group_members: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({ groups })
  } catch (error) {
    logger.error('Error fetching groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    )
  }
}

// POST /api/groups - Create a new group
async function createGroupHandler(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const token = authHeader.substring(7)
  const user = verifyToken(token)
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  try {
    const { name, description, avatar, memberIds = [] } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      )
    }

    // Create group with creator as admin member
    const group = await db.$transaction(async (tx) => {
      const newGroup = await tx.groups.create({
        data: {
          id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: name.trim(),
          description: description?.trim() || null,
          avatar: avatar || null,
          creatorId: user.userId,
          updatedAt: new Date()
        }
      })

      // Add creator as admin member
      await tx.group_members.create({
        data: {
          id: `group_member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          groupId: newGroup.id,
          userId: user.userId,
          role: 'ADMIN'
        }
      })

      // Add other members if provided
      if (memberIds.length > 0) {
        const memberPromises = memberIds.map((memberId: string) =>
          tx.group_members.create({
            data: {
              id: `group_member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              groupId: newGroup.id,
              userId: memberId,
              role: 'MEMBER'
            }
          })
        )
        await Promise.all(memberPromises)
      }

      return newGroup
    })

    // Fetch the complete group with relations
    const completeGroup = await db.groups.findUnique({
      where: { id: group.id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        group_members: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            group_members: true
          }
        }
      }
    })

    return NextResponse.json({ group: completeGroup })
  } catch (error) {
    logger.error('Error creating group:', error);
    logger.error('Error details:', error.message);
    logger.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to create group', details: error.message },
      { status: 500 }
    )
  }
}

export const GET = createApiHandler(getGroupsHandler)
export const POST = createApiHandler(createGroupHandler)

