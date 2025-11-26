import { db } from '@/lib/db'
import { FriendRequest, FriendRequestStatus, Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'

export interface FriendRequestWithDetails extends FriendRequest {
  sender: {
    id: string
    username: string
    name: string
    avatar: string | null
  }
  receiver: {
    id: string
    username: string
    name: string
    avatar: string | null
  }
}

export interface CanSendRequestResult {
  canSend: boolean
  reason?: string
  existingRequestId?: string
  shouldAutoAccept?: boolean
}

const userBasicSelect = {
  id: true,
  username: true,
  name: true,
  avatar: true
}

const friendRequestInclude = {
  sender: {
    select: userBasicSelect
  },
  receiver: {
    select: userBasicSelect
  }
}

/**
 * Unified Friend Request Service
 * Centralizes all friend request operations with proper validation,
 * transaction safety, and bidirectional friendship creation
 */
export class FriendRequestService {
  /**
   * Check if a user can send a friend request to another user
   * Returns detailed result including whether to auto-accept reverse requests
   */
  static async checkCanSendRequest(
    senderId: string,
    receiverId: string
  ): Promise<CanSendRequestResult> {
    // Check if trying to send to self
    if (senderId === receiverId) {
      return {
        canSend: false,
        reason: 'Cannot send friend request to yourself'
      }
    }

    // Check if users exist and are active
    const [sender, receiver] = await Promise.all([
      db.user.findUnique({
        where: { id: senderId },
        select: { id: true, isActive: true }
      }),
      db.user.findUnique({
        where: { id: receiverId },
        select: { id: true, isActive: true }
      })
    ])

    if (!sender || !receiver) {
      return {
        canSend: false,
        reason: 'User not found'
      }
    }

    if (!sender.isActive || !receiver.isActive) {
      return {
        canSend: false,
        reason: 'User is not active'
      }
    }

    // Check if already friends (bidirectional query)
    const existingFriendship = await db.friendship.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId: receiverId, status: 'ACTIVE' },
          { userId: receiverId, friendId: senderId, status: 'ACTIVE' }
        ]
      }
    })

    if (existingFriendship) {
      return {
        canSend: false,
        reason: 'Already friends'
      }
    }

    // Check for existing requests (bidirectional)
    const existingRequest = await db.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    })

    if (existingRequest) {
      // Handle reverse request scenario (receiver already sent request to sender)
      if (existingRequest.senderId === receiverId && existingRequest.receiverId === senderId) {
        if (existingRequest.status === 'PENDING') {
          // Auto-accept both requests
          return {
            canSend: false,
            reason: 'Reverse request exists',
            existingRequestId: existingRequest.id,
            shouldAutoAccept: true
          }
        }
      }

      // Handle same-direction requests
      if (existingRequest.status === 'PENDING') {
        return {
          canSend: false,
          reason: 'Friend request already pending',
          existingRequestId: existingRequest.id
        }
      }

      if (existingRequest.status === 'ACCEPTED') {
        return {
          canSend: false,
          reason: 'Already friends'
        }
      }

      // DECLINED or CANCELLED requests can be re-sent
      // (Optional: could add cooldown period here)
    }

    return {
      canSend: true
    }
  }

  /**
   * Send a friend request
   * Handles reverse request scenario by auto-accepting if receiver already sent request
   */
  static async sendFriendRequest(
    senderId: string,
    receiverId: string,
    message?: string
  ): Promise<FriendRequestWithDetails> {
    const validation = await this.checkCanSendRequest(senderId, receiverId)

    if (!validation.canSend) {
      // Handle auto-accept scenario
      if (validation.shouldAutoAccept && validation.existingRequestId) {
        logger.info('Auto-accepting reverse friend request', {
          requestId: validation.existingRequestId,
          senderId,
          receiverId
        })
        // Accept the existing reverse request, which will create friendships
        await this.acceptFriendRequest(validation.existingRequestId, senderId)
        // Return the accepted request
        const acceptedRequest = await db.friendRequest.findUnique({
          where: { id: validation.existingRequestId },
          include: friendRequestInclude
        })
        if (!acceptedRequest) {
          throw new Error('Failed to retrieve accepted request')
        }
        return acceptedRequest as FriendRequestWithDetails
      }
      throw new Error(validation.reason || 'Cannot send friend request')
    }

    // Create new friend request
    const friendRequest = await db.friendRequest.create({
      data: {
        senderId,
        receiverId,
        message: message || null,
        status: 'PENDING'
      },
      include: friendRequestInclude
    })

    logger.info('Friend request created', {
      requestId: friendRequest.id,
      senderId,
      receiverId
    })

    return friendRequest as FriendRequestWithDetails
  }

  /**
   * Accept a friend request
   * Uses transaction to ensure atomicity: update request status + create bidirectional friendships
   */
  static async acceptFriendRequest(
    requestId: string,
    accepterId: string
  ): Promise<{ request: FriendRequestWithDetails; friendshipsCreated: number }> {
    // Find the request
    const request = await db.friendRequest.findUnique({
      where: { id: requestId },
      include: friendRequestInclude
    })

    if (!request) {
      throw new Error('Friend request not found')
    }

    // Validate accepter is the receiver
    if (request.receiverId !== accepterId) {
      throw new Error('Not authorized to accept this request')
    }

    // Validate request is pending
    if (request.status !== 'PENDING') {
      throw new Error(`Request is not pending (current status: ${request.status})`)
    }

    // Use transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      // Update request status
      const updatedRequest = await tx.friendRequest.update({
        where: { id: requestId },
        data: {
          status: 'ACCEPTED',
          updatedAt: new Date()
        },
        include: friendRequestInclude
      })

      // Check if friendship already exists (prevent duplicates)
      const existingFriendship = await tx.friendship.findFirst({
        where: {
          OR: [
            { userId: request.senderId, friendId: request.receiverId },
            { userId: request.receiverId, friendId: request.senderId }
          ]
        }
      })

      let friendshipsCreated = 0

      if (!existingFriendship) {
        // Create bidirectional friendships
        const createResult = await tx.friendship.createMany({
          data: [
            {
              userId: request.senderId,
              friendId: request.receiverId,
              status: 'ACTIVE'
            },
            {
              userId: request.receiverId,
              friendId: request.senderId,
              status: 'ACTIVE'
            }
          ],
          skipDuplicates: true
        })
        friendshipsCreated = createResult.count
      }

      // If there was a reverse request (receiver sent to sender), accept it too
      const reverseRequest = await tx.friendRequest.findFirst({
        where: {
          senderId: request.receiverId,
          receiverId: request.senderId,
          status: 'PENDING'
        }
      })

      if (reverseRequest) {
        await tx.friendRequest.update({
          where: { id: reverseRequest.id },
          data: {
            status: 'ACCEPTED',
            updatedAt: new Date()
          }
        })
      }

      return {
        request: updatedRequest as FriendRequestWithDetails,
        friendshipsCreated
      }
    })

    logger.info('Friend request accepted', {
      requestId,
      senderId: request.senderId,
      receiverId: request.receiverId,
      friendshipsCreated: result.friendshipsCreated
    })

    return result
  }

  /**
   * Decline a friend request
   */
  static async declineFriendRequest(
    requestId: string,
    declinerId: string
  ): Promise<FriendRequestWithDetails> {
    const request = await db.friendRequest.findUnique({
      where: { id: requestId },
      include: friendRequestInclude
    })

    if (!request) {
      throw new Error('Friend request not found')
    }

    // Validate decliner is the receiver
    if (request.receiverId !== declinerId) {
      throw new Error('Not authorized to decline this request')
    }

    // Validate request is pending
    if (request.status !== 'PENDING') {
      throw new Error(`Request is not pending (current status: ${request.status})`)
    }

    // Update request status
    const updatedRequest = await db.friendRequest.update({
      where: { id: requestId },
      data: {
        status: 'DECLINED',
        updatedAt: new Date()
      },
      include: friendRequestInclude
    })

    logger.info('Friend request declined', {
      requestId,
      senderId: request.senderId,
      receiverId: request.receiverId
    })

    return updatedRequest as FriendRequestWithDetails
  }

  /**
   * Cancel a friend request (by sender)
   * Updates status to CANCELLED instead of deleting
   */
  static async cancelFriendRequest(
    requestId: string,
    senderId: string
  ): Promise<FriendRequestWithDetails> {
    const request = await db.friendRequest.findUnique({
      where: { id: requestId },
      include: friendRequestInclude
    })

    if (!request) {
      throw new Error('Friend request not found')
    }

    // Validate canceller is the sender
    if (request.senderId !== senderId) {
      throw new Error('Not authorized to cancel this request')
    }

    // Validate request is pending
    if (request.status !== 'PENDING') {
      throw new Error(`Request is not pending (current status: ${request.status})`)
    }

    // Update request status to CANCELLED
    const updatedRequest = await db.friendRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      },
      include: friendRequestInclude
    })

    logger.info('Friend request cancelled', {
      requestId,
      senderId: request.senderId,
      receiverId: request.receiverId
    })

    return updatedRequest as FriendRequestWithDetails
  }

  /**
   * Get friend requests for a user
   * Can filter by type (sent/received) and status
   */
  static async getFriendRequests(
    userId: string,
    options: {
      type?: 'sent' | 'received' | 'all'
      status?: FriendRequestStatus | FriendRequestStatus[]
      includeDetails?: boolean
    } = {}
  ): Promise<FriendRequestWithDetails[]> {
    const { type = 'all', status, includeDetails = true } = options

    const where: Prisma.FriendRequestWhereInput = {}

    // Filter by type
    if (type === 'sent') {
      where.senderId = userId
    } else if (type === 'received') {
      where.receiverId = userId
    } else {
      where.OR = [{ senderId: userId }, { receiverId: userId }]
    }

    // Filter by status
    if (status) {
      if (Array.isArray(status)) {
        where.status = { in: status }
      } else {
        where.status = status
      }
    }

    const requests = await db.friendRequest.findMany({
      where,
      include: includeDetails ? friendRequestInclude : undefined,
      orderBy: { createdAt: 'desc' }
    })

    return requests as FriendRequestWithDetails[]
  }
}






