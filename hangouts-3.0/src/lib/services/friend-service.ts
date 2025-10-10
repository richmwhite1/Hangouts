import { BaseService, ServiceResult, PaginationOptions, SortOptions, FilterOptions } from './base-service'
import { FriendRequest, FriendRequestStatus, Prisma } from '@prisma/client'
import { z } from 'zod'
import { CACHE_TTL, CACHE_TAGS } from '@/lib/cache'

// Validation schemas
const sendFriendRequestSchema = z.object({
  receiverId: z.string(),
  message: z.string().max(500).optional()})

const respondToFriendRequestSchema = z.object({
  requestId: z.string(),
  status: z.enum(['ACCEPTED', 'DECLINED'])})

const blockUserSchema = z.object({
  userId: z.string(),
  reason: z.string().max(200).optional()})

// Common include objects for database queries
const userBasicSelect = {
  id: true,
  username: true,
  name: true,
  avatar: true
}

const userDetailedSelect = {
  id: true,
  username: true,
  name: true,
  avatar: true,
  bio: true,
  location: true,
  isActive: true,
  isVerified: true
}

const friendRequestInclude = {
  sender: {
    select: userBasicSelect
  },
  receiver: {
    select: userBasicSelect
  }
}

export interface FriendWithDetails {
  id: string
  username: string
  name: string
  avatar: string
  bio: string
  location: string
  isActive: boolean
  isVerified: boolean
  lastSeen: Date
  friendshipId: string
  friendsSince: Date
}

export interface FriendRequestWithDetails extends FriendRequest {
  sender: {
    id: string
    username: string
    name: string
    avatar: string
  }
  receiver: {
    id: string
    username: string
    name: string
    avatar: string
  }
}

export interface FriendSearchOptions extends PaginationOptions, SortOptions, FilterOptions {
  search?: string
  isActive?: boolean
  isVerified?: boolean
}

export class FriendService extends BaseService {
  /**
   * Get user's friends
   */
  async getFriends(options: FriendSearchOptions = {}): Promise<ServiceResult<{ friends: FriendWithDetails[]; pagination: any }>> {
    try {
      const { page = 1, limit = 50, search = '', isActive, isVerified, field = 'createdAt', direction = 'desc' } = options
      const offset = (page - 1) * limit

      // Temporarily disable caching for friends data to fix display issue
      // const cacheKey = `friends:${this.context.userId}:${JSON.stringify(options)}`
      
      // const result = await this.cacheUserQuery(
      //   this.context.userId,
      //   'friends',
      //   async () => {
      // Build where clause for friendships
      const friendshipWhere: Prisma.FriendshipWhereInput = {
        OR: [
          { user1Id: this.context.userId },
          { user2Id: this.context.userId }
        ]
      }

      const [friendships, total] = await Promise.all([
        this.db.friendship.findMany({
          where: friendshipWhere,
          include: {
            user1: {
              select: {
                ...userDetailedSelect,
                lastSeen: true
              }
            },
            user2: {
              select: {
                ...userDetailedSelect,
                lastSeen: true
              }
            }
          },
          orderBy: { [field]: direction },
          skip: offset,
          take: limit
        }),
        this.db.friendship.count({ where: friendshipWhere })
      ])

      // Transform friendships to get the friend (not the current user) and apply filtering
      const friends = friendships
        .map(friendship => {
          const friend = friendship.user1Id === this.context.userId ? friendship.user2 : friendship.user1
          return friend ? {
            ...friend,
            friendshipId: friendship.id,
            friendsSince: friendship.createdAt
          } : null
        })
        .filter(Boolean)
        .filter(friend => {
          // Apply user filtering
          if (search && !friend.name.toLowerCase().includes(search.toLowerCase()) && 
              !friend.username.toLowerCase().includes(search.toLowerCase())) {
            return false
          }
          if (isActive !== undefined && friend.isActive !== isActive) {
            return false
          }
          if (isVerified !== undefined && friend.isVerified !== isVerified) {
            return false
          }
          return true
        }) as FriendWithDetails[]

      const pagination = this.calculatePagination(page, limit, total)
      const result = { friends, pagination }

      await this.logDataAccess('read', 'friends', this.context.userId, { 
        search, 
        filters: { isActive, isVerified },
        pagination: result.pagination 
      })

      return this.createSuccessResult(
        result,
        'Friends retrieved successfully',
        result.pagination
      )
    } catch (error) {
      return this.handleError(error, 'Get friends')
    }
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(data: any): Promise<ServiceResult<FriendRequestWithDetails>> {
    try {
      // Check if user can send friend requests
      const canSend = await this.checkPermission('friend:request')
      if (!canSend) {
        return this.createErrorResult('Access denied', 'You do not have permission to send friend requests')
      }

      // Validate input
      const validatedData = this.validateInput(data, sendFriendRequestSchema)

      // Check if trying to send request to self
      if (validatedData.receiverId === this.context.userId) {
        return this.createErrorResult('Invalid request', 'Cannot send friend request to yourself')
      }

      // Check if receiver exists
      const receiver = await this.db.user.findUnique({
        where: { id: validatedData.receiverId },
        select: { id: true, isActive: true }
      })

      if (!receiver) {
        return this.createErrorResult('User not found', 'The requested user does not exist')
      }

      if (!receiver.isActive) {
        return this.createErrorResult('User inactive', 'Cannot send friend request to an inactive user')
      }

      // Check if friendship already exists
      const existingFriendship = await this.db.friendship.findFirst({
        where: {
          OR: [
            { user1Id: this.context.userId, user2Id: validatedData.receiverId },
            { user1Id: validatedData.receiverId, user2Id: this.context.userId }
          ]
        }
      })

      if (existingFriendship) {
        return this.createErrorResult('Already friends', 'You are already friends with this user')
      }

      // Check if there's already a pending request
      const existingRequest = await this.db.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: this.context.userId, receiverId: validatedData.receiverId },
            { senderId: validatedData.receiverId, receiverId: this.context.userId }
          ],
          status: 'PENDING'
        }
      })

      if (existingRequest) {
        return this.createErrorResult('Request pending', 'There is already a pending friend request between you and this user')
      }

      const friendRequest = await this.db.friendRequest.create({
        data: {
          senderId: this.context.userId,
          receiverId: validatedData.receiverId,
          message: validatedData.message,
          status: 'PENDING'
        },
        include: friendRequestInclude
      })

      await this.logAction('send_friend_request', 'friend_request', friendRequest.id, null, {
        receiverId: validatedData.receiverId,
        message: validatedData.message
      })

      // Invalidate friends cache for both users
      await this.invalidateFriendsCache(this.context.userId)
      await this.invalidateFriendsCache(validatedData.receiverId)

      return this.createSuccessResult(friendRequest, 'Friend request sent successfully')
    } catch (error) {
      return this.handleError(error, 'Send friend request')
    }
  }

  /**
   * Respond to friend request
   */
  async respondToFriendRequest(data: any): Promise<ServiceResult<void>> {
    try {
      // Check if user can respond to friend requests
      const canRespond = await this.checkPermission('friend:accept')
      if (!canRespond) {
        return this.createErrorResult('Access denied', 'You do not have permission to respond to friend requests')
      }

      // Validate input
      const validatedData = this.validateInput(data, respondToFriendRequestSchema)

      // Get the friend request
      const friendRequest = await this.db.friendRequest.findUnique({
        where: { id: validatedData.requestId },
        include: {
          sender: { select: { id: true, username: true } },
          receiver: { select: { id: true, username: true } }
        }
      })

      if (!friendRequest) {
        return this.createErrorResult('Request not found', 'The requested friend request does not exist')
      }

      // Check if user is the receiver
      if (friendRequest.receiverId !== this.context.userId) {
        return this.createErrorResult('Access denied', 'You can only respond to friend requests sent to you')
      }

      // Check if request is still pending
      if (friendRequest.status !== 'PENDING') {
        return this.createErrorResult('Request already processed', 'This friend request has already been processed')
      }

      // Update the request status
      await this.db.friendRequest.update({
        where: { id: validatedData.requestId },
        data: { status: validatedData.status }
      })

      // If accepted, create friendship
      if (validatedData.status === 'ACCEPTED') {
        await this.db.friendship.create({
          data: {
            user1Id: friendRequest.senderId,
            user2Id: friendRequest.receiverId
          }
        })

        await this.logAction('accept_friend_request', 'friendship', friendRequest.id, null, {
          senderId: friendRequest.senderId,
          receiverId: friendRequest.receiverId
        })
      } else {
        await this.logAction('decline_friend_request', 'friend_request', friendRequest.id, null, {
          senderId: friendRequest.senderId,
          receiverId: friendRequest.receiverId
        })
      }

      // Invalidate friends cache for both users
      await this.invalidateFriendsCache(this.context.userId)
      await this.invalidateFriendsCache(friendRequest.senderId)

      return this.createSuccessResult(undefined, `Friend request ${validatedData.status.toLowerCase()} successfully`)
    } catch (error) {
      return this.handleError(error, 'Respond to friend request')
    }
  }

  /**
   * Get friend requests
   */
  async getFriendRequests(type: 'sent' | 'received' = 'received'): Promise<ServiceResult<FriendRequestWithDetails[]>> {
    try {
      const where: Prisma.FriendRequestWhereInput = {
        status: 'PENDING',
        ...(type === 'sent' 
          ? { senderId: this.context.userId }
          : { receiverId: this.context.userId }
        )
      }

      const requests = await this.db.friendRequest.findMany({
        where,
        include: friendRequestInclude,
        orderBy: { createdAt: 'desc' }
      })

      await this.logDataAccess('read', 'friend_requests', this.context.userId, { type })

      return this.createSuccessResult(requests, `${type} friend requests retrieved successfully`)
    } catch (error) {
      return this.handleError(error, 'Get friend requests')
    }
  }

  /**
   * Cancel friend request
   */
  async cancelFriendRequest(requestId: string): Promise<ServiceResult<void>> {
    try {
      // Check if user can cancel friend requests
      const canCancel = await this.checkPermission('friend:request')
      if (!canCancel) {
        return this.createErrorResult('Access denied', 'You do not have permission to cancel friend requests')
      }

      const friendRequest = await this.db.friendRequest.findUnique({
        where: { id: requestId },
        select: { id: true, senderId: true, receiverId: true, status: true }
      })

      if (!friendRequest) {
        return this.createErrorResult('Request not found', 'The requested friend request does not exist')
      }

      // Check if user is the sender
      if (friendRequest.senderId !== this.context.userId) {
        return this.createErrorResult('Access denied', 'You can only cancel friend requests you sent')
      }

      // Check if request is still pending
      if (friendRequest.status !== 'PENDING') {
        return this.createErrorResult('Request already processed', 'This friend request has already been processed')
      }

      await this.db.friendRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' }
      })

      await this.logAction('cancel_friend_request', 'friend_request', requestId, null, {
        receiverId: friendRequest.receiverId
      })

      return this.createSuccessResult(undefined, 'Friend request cancelled successfully')
    } catch (error) {
      return this.handleError(error, 'Cancel friend request')
    }
  }

  /**
   * Remove friend
   */
  async removeFriend(userId: string): Promise<ServiceResult<void>> {
    try {
      // Check if user can manage friends
      const canManage = await this.checkPermission('friend:manage')
      if (!canManage) {
        return this.createErrorResult('Access denied', 'You do not have permission to remove friends')
      }

      // Check if friendship exists
      const friendship = await this.db.friendship.findFirst({
        where: {
          OR: [
            { user1Id: this.context.userId, user2Id: userId },
            { user1Id: userId, user2Id: this.context.userId }
          ]
        }
      })

      if (!friendship) {
        return this.createErrorResult('Friendship not found', 'You are not friends with this user')
      }

      // Delete the friendship
      await this.db.friendship.delete({
        where: { id: friendship.id }
      })

      await this.logAction('remove_friend', 'friendship', friendship.id, null, {
        removedUserId: userId
      })

      return this.createSuccessResult(undefined, 'Friend removed successfully')
    } catch (error) {
      return this.handleError(error, 'Remove friend')
    }
  }

  /**
   * Block user
   */
  async blockUser(data: any): Promise<ServiceResult<void>> {
    try {
      // Check if user can manage friends
      const canManage = await this.checkPermission('friend:manage')
      if (!canManage) {
        return this.createErrorResult('Access denied', 'You do not have permission to block users')
      }

      // Validate input
      const validatedData = this.validateInput(data, blockUserSchema)

      // Check if trying to block self
      if (validatedData.userId === this.context.userId) {
        return this.createErrorResult('Invalid request', 'Cannot block yourself')
      }

      // Check if user exists
      const user = await this.db.user.findUnique({
        where: { id: validatedData.userId },
        select: { id: true, username: true }
      })

      if (!user) {
        return this.createErrorResult('User not found', 'The requested user does not exist')
      }

      // Remove friendship if exists
      const friendship = await this.db.friendship.findFirst({
        where: {
          OR: [
            { user1Id: this.context.userId, user2Id: validatedData.userId },
            { user1Id: validatedData.userId, user2Id: this.context.userId }
          ]
        }
      })

      if (friendship) {
        await this.db.friendship.delete({
          where: { id: friendship.id }
        })
      }

      // Cancel any pending friend requests
      await this.db.friendRequest.updateMany({
        where: {
          OR: [
            { senderId: this.context.userId, receiverId: validatedData.userId },
            { senderId: validatedData.userId, receiverId: this.context.userId }
          ],
          status: 'PENDING'
        },
        data: { status: 'CANCELLED' }
      })

      // TODO: Add to blocked users table when implemented
      // await this.db.blockedUser.create({
      //   data: {
      //     blockerId: this.context.userId,
      //     blockedId: validatedData.userId,
      //     reason: validatedData.reason
      //   }
      // })

      await this.logAction('block_user', 'user', validatedData.userId, null, {
        reason: validatedData.reason
      })

      return this.createSuccessResult(undefined, 'User blocked successfully')
    } catch (error) {
      return this.handleError(error, 'Block user')
    }
  }

  /**
   * Get friend suggestions
   */
  async getFriendSuggestions(limit: number = 10): Promise<ServiceResult<FriendWithDetails[]>> {
    try {
      // Get user's current friends
      const friendships = await this.db.friendship.findMany({
        where: {
          OR: [
            { user1Id: this.context.userId },
            { user2Id: this.context.userId }
          ]
        }
      })

      const friendIds = new Set(
        friendships.map(f => f.user1Id === this.context.userId ? f.user2Id : f.user1Id)
      )

      // Get sent friend requests
      const sentRequests = await this.db.friendRequest.findMany({
        where: { senderId: this.context.userId, status: 'PENDING' },
        select: { receiverId: true }
      })

      const sentRequestIds = new Set(sentRequests.map(r => r.receiverId))

      // Get received friend requests
      const receivedRequests = await this.db.friendRequest.findMany({
        where: { receiverId: this.context.userId, status: 'PENDING' },
        select: { senderId: true }
      })

      const receivedRequestIds = new Set(receivedRequests.map(r => r.senderId))

      // Get mutual friends' friends who are not already friends or have pending requests
      const mutualFriends = await this.db.friendship.findMany({
        where: {
          OR: [
            { user1Id: { in: Array.from(friendIds) } },
            { user2Id: { in: Array.from(friendIds) } }
          ]
        },
        include: {
          user1: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
              bio: true,
              location: true,
              isActive: true,
              isVerified: true,
              lastSeen: true
            }
          },
          user2: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
              bio: true,
              location: true,
              isActive: true,
              isVerified: true,
              lastSeen: true
            }
          }
        }
      })

      // Filter out current user, existing friends, and users with pending requests
      const suggestions = mutualFriends
        .map(friendship => {
          const user = friendship.user1Id === this.context.userId ? friendship.user2 : friendship.user1
          return user
        })
        .filter(user => 
          user && 
          user.id !== this.context.userId && 
          !friendIds.has(user.id) && 
          !sentRequestIds.has(user.id) && 
          !receivedRequestIds.has(user.id) &&
          user.isActive
        )
        .slice(0, limit)

      await this.logDataAccess('read', 'friend_suggestions', this.context.userId, { limit })

      return this.createSuccessResult(suggestions, 'Friend suggestions retrieved successfully')
    } catch (error) {
      return this.handleError(error, 'Get friend suggestions')
    }
  }

  /**
   * Check if two users are friends
   */
  async areFriends(userId1: string, userId2: string): Promise<ServiceResult<boolean>> {
    try {
      const friendship = await this.db.friendship.findFirst({
        where: {
          OR: [
            { user1Id: userId1, user2Id: userId2 },
            { user1Id: userId2, user2Id: userId1 }
          ]
        }
      })

      return this.createSuccessResult(!!friendship, 'Friendship status retrieved successfully')
    } catch (error) {
      return this.handleError(error, 'Check friendship status')
    }
  }
}
