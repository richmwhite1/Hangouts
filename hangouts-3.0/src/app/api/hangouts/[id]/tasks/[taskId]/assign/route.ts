import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from '@/lib/clerk-auth'
import { db } from '@/lib/db'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
// POST /api/hangouts/[id]/tasks/[taskId]/assign - Assign/unassign user to task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, taskId: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (false) {
      return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(createErrorResponse('Invalid token', 'Authentication failed'), { status: 401 })
    }
    const { id: hangoutId, taskId } = await params
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
    // Check if task exists
    const task = await db.hangout_tasks.findUnique({
      where: { id: taskId },
      select: { id: true, hangoutId: true }
    })
    if (!task || task.hangoutId !== hangoutId) {
      return NextResponse.json(createErrorResponse('Task not found', 'Task does not exist in this hangout'), { status: 404 })
    }
    // Check if user is already assigned to this task
    const existingAssignment = await db.hangout_task_assignments.findUnique({
      where: {
        taskId_userId: {
          taskId: taskId,
          userId: user.id
        }
      }
    })
    if (existingAssignment) {
      // Remove assignment
      await db.hangout_task_assignments.delete({
        where: {
          taskId_userId: {
            taskId: taskId,
            userId: user.id
          }
        }
      })
    } else {
      // Add assignment
      await db.hangout_task_assignments.create({
        data: {
          taskId: taskId,
          userId: user.id
        }
      })
    }
    // Get updated task with assignments
    const updatedTask = await db.hangout_tasks.findUnique({
      where: { id: taskId },
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
      id: updatedTask!.id,
      text: updatedTask!.text,
      assignedTo: updatedTask!.assignedUsers.map(assignment => ({
        id: assignment.user.id,
        name: assignment.user.name,
        username: assignment.user.username,
        avatar: assignment.user.avatar
      })),
      createdBy: {
        id: updatedTask!.createdBy.id,
        name: updatedTask!.createdBy.name,
        username: updatedTask!.createdBy.username,
        avatar: updatedTask!.createdBy.avatar
      },
      createdAt: updatedTask!.createdAt.toISOString()
    }
    return NextResponse.json(createSuccessResponse({
      task: transformedTask,
      isAssigned: !existingAssignment
    }, existingAssignment ? 'Task unassigned successfully' : 'Task assigned successfully'))
  } catch (error: any) {
    console.error('Error assigning task:', error)
    return NextResponse.json(createErrorResponse('Failed to assign task', error.message), { status: 500 })
  }
}