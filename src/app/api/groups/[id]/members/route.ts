import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { createApiHandler } from '@/lib/api-middleware'

// POST /api/groups/[id]/members - Add members to group
async function addMembersHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: groupId } = await params
    const { memberIds } = await request.json()

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json(
        { error: 'Member IDs are required' },
        { status: 400 }
      )
    }

    // Check if user is admin of the group
    const groupMember = await db.groupMember.findFirst({
      where: {
        groupId,
        userId: user.userId,
        role: 'ADMIN'
      }
    })

    if (!groupMember) {
      return NextResponse.json({ error: 'Only group admins can add members' }, { status: 403 })
    }

    // Add members to group
    const addedMembers = await db.$transaction(async (tx) => {
      const memberPromises = memberIds.map((memberId: string) =>
        tx.groupMember.upsert({
          where: {
            groupId_userId: {
              groupId,
              userId: memberId
            }
          },
          update: {},
          create: {
            groupId,
            userId: memberId,
            role: 'MEMBER'
          }
        })
      )
      return Promise.all(memberPromises)
    })

    // Fetch updated group with all members
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
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
            members: true
          }
        }
      }
    })

    return NextResponse.json({ group, addedMembers })
  } catch (error) {
    console.error('Error adding members to group:', error)
    return NextResponse.json(
      { error: 'Failed to add members to group' },
      { status: 500 }
    )
  }
}

// DELETE /api/groups/[id]/members - Remove member from group
async function removeMemberHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: groupId } = await params
    const { memberId } = await request.json()

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      )
    }

    // Check if user is admin of the group or removing themselves
    const groupMember = await db.groupMember.findFirst({
      where: {
        groupId,
        userId: user.userId,
        role: 'ADMIN'
      }
    })

    const isRemovingSelf = memberId === user.userId
    const isAdmin = !!groupMember

    if (!isAdmin && !isRemovingSelf) {
      return NextResponse.json({ error: 'Only group admins can remove other members' }, { status: 403 })
    }

    // Remove member from group
    await db.groupMember.deleteMany({
      where: {
        groupId,
        userId: memberId
      }
    })

    // Fetch updated group with all members
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
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
            members: true
          }
        }
      }
    })

    return NextResponse.json({ group })
  } catch (error) {
    console.error('Error removing member from group:', error)
    return NextResponse.json(
      { error: 'Failed to remove member from group' },
      { status: 500 }
    )
  }
}

export const POST = createApiHandler(addMembersHandler)
export const DELETE = createApiHandler(removeMemberHandler)












