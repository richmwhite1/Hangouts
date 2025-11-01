import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { UserDeletionService } from '@/lib/user-deletion-service'

/**
 * POST /api/profile/delete-account
 * Soft delete user account with 30-day grace period
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    
    if (!clerkId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true, deletedAt: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Check if already scheduled for deletion
    if (user.deletedAt) {
      return NextResponse.json(
        { success: false, message: 'Account is already scheduled for deletion' },
        { status: 400 }
      )
    }

    // Verify confirmation from request body
    const body = await request.json()
    if (!body.confirmed) {
      return NextResponse.json(
        { success: false, message: 'Deletion must be confirmed' },
        { status: 400 }
      )
    }

    // Soft delete user in our database
    const result = await UserDeletionService.softDeleteUser(user.id)

    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }

    // Delete from Clerk (this will immediately sign them out)
    try {
      const client = await clerkClient()
      await client.users.deleteUser(clerkId)
    } catch (clerkError) {
      console.error('Error deleting user from Clerk:', clerkError)
      // Continue even if Clerk deletion fails - we've already marked in our DB
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      scheduledDate: result.scheduledDate
    })
  } catch (error) {
    console.error('Error in delete account API:', error)
    return NextResponse.json(
      { success: false, message: 'An error occurred while deleting your account' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/profile/delete-account
 * Get deletion status for current user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    
    if (!clerkId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    const status = await UserDeletionService.getDeletionStatus(user.id)

    return NextResponse.json({
      success: true,
      ...status
    })
  } catch (error) {
    console.error('Error getting deletion status:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get deletion status' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/profile/delete-account
 * Cancel pending deletion (restore account)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    
    if (!clerkId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    const result = await UserDeletionService.cancelDeletion(user.id)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error canceling deletion:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to cancel deletion' },
      { status: 500 }
    )
  }
}

