import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { z } from 'zod'

// GET /api/hangouts/[id]/tasks - Get tasks for a hangout
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const { id: hangoutId } = await params

    // Check if the hangout exists and user has access
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      select: {
        id: true,
        type: true,
        privacyLevel: true,
        creatorId: true,
        content_participants: {
          select: {
            userId: true
          }
        }
      }
    })

    if (!hangout) {
      return NextResponse.json(createErrorResponse('Hangout not found', 'Hangout does not exist'), { status: 404 })
    }

    // Check if user has access to the hangout
    const hasAccess = hangout.privacyLevel === 'PUBLIC' || 
                     hangout.creatorId === user.id ||
                     hangout.content_participants.some(p => p.userId === user.id)

    if (!hasAccess) {
      return NextResponse.json(createErrorResponse('Forbidden', 'You do not have access to this hangout'), { status: 403 })
    }

    // Get tasks for the hangout
    const tasks = await db.hangout_tasks.findMany({
      where: { hangoutId: hangoutId },
      include: {
        assignedUsers: {
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
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    const transformedTasks = tasks.map(task => ({
      id: task.id,
      text: task.text,
      assignedTo: task.assignedUsers.map(assignment => ({
        id: assignment.user.id,
        name: assignment.user.name,
        username: assignment.user.username,
        avatar: assignment.user.avatar
      })),
      createdBy: {
        id: task.createdBy.id,
        name: task.createdBy.name,
        username: task.createdBy.username,
        avatar: task.createdBy.avatar
      },
      createdAt: task.createdAt.toISOString()
    }))

    return NextResponse.json(createSuccessResponse({ tasks: transformedTasks }, 'Tasks retrieved successfully'))

  } catch (error: any) {
    console.error('Error fetching hangout tasks:', error)
    return NextResponse.json(createErrorResponse('Failed to fetch tasks', error.message), { status: 500 })
  }
}

const CreateTaskSchema = z.object({
  text: z.string().min(1, 'Task text cannot be empty').max(200, 'Task text too long')
})

// POST /api/hangouts/[id]/tasks - Create a new task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication using Clerk
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    const user = await getClerkApiUser()
    if (!user) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }

    const { id: hangoutId } = await params
    const body = await request.json()
    const { text } = CreateTaskSchema.parse(body)

    // Check if the hangout exists and user has access
    const hangout = await db.content.findUnique({
      where: { id: hangoutId },
      select: {
        id: true,
        type: true,
        privacyLevel: true,
        creatorId: true,
        content_participants: {
          select: {
            userId: true
          }
        }
      }
    })

    if (!hangout) {
      return NextResponse.json(createErrorResponse('Hangout not found', 'Hangout does not exist'), { status: 404 })
    }

    // Check if user has access to the hangout
    const hasAccess = hangout.privacyLevel === 'PUBLIC' || 
                     hangout.creatorId === user.id ||
                     hangout.content_participants.some(p => p.userId === user.id)

    if (!hasAccess) {
      return NextResponse.json(createErrorResponse('Forbidden', 'You do not have access to this hangout'), { status: 403 })
    }

    // Create the task
    const newTask = await db.hangout_tasks.create({
      data: {
        hangoutId: hangoutId,
        text: text,
        createdById: user.id
      },
      include: {
        assignedUsers: {
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
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    })

    const transformedTask = {
      id: newTask.id,
      text: newTask.text,
      assignedTo: newTask.assignedUsers.map(assignment => ({
        id: assignment.user.id,
        name: assignment.user.name,
        username: assignment.user.username,
        avatar: assignment.user.avatar
      })),
      createdBy: {
        id: newTask.createdBy.id,
        name: newTask.createdBy.name,
        username: newTask.createdBy.username,
        avatar: newTask.createdBy.avatar
      },
      createdAt: newTask.createdAt.toISOString()
    }

    return NextResponse.json(createSuccessResponse({ task: transformedTask }, 'Task created successfully'), { status: 201 })

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(createErrorResponse('Validation error', JSON.stringify(error.errors)), { status: 400 })
    }
    console.error('Error creating hangout task:', error)
    return NextResponse.json(createErrorResponse('Failed to create task', error.message), { status: 500 })
  }
}
