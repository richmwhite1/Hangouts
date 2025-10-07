import { db } from './db'

export interface FriendRequest {
  id: string
  senderId: string
  receiverId: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED'
  createdAt: Date
  updatedAt: Date
}

export interface Friend {
  id: string
  userId: string
  friendId: string
  status: 'ACTIVE' | 'BLOCKED'
  createdAt: Date
  updatedAt: Date
}

export class FriendsSystem {
  // Send a friend request
  static async sendFriendRequest(senderId: string, receiverId: string): Promise<FriendRequest> {
    // Check if users exist
    const [sender, receiver] = await Promise.all([
      db.user.findUnique({ where: { id: senderId } }),
      db.user.findUnique({ where: { id: receiverId } })
    ])

    if (!sender || !receiver) {
      throw new Error('User not found')
    }

    if (senderId === receiverId) {
      throw new Error('Cannot send friend request to yourself')
    }

    // Check if request already exists
    const existingRequest = await db.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ]
      }
    })

    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        throw new Error('Friend request already pending')
      }
      if (existingRequest.status === 'ACCEPTED') {
        throw new Error('Already friends')
      }
    }

    // Check if already friends
    const existingFriendship = await db.friendship.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId: receiverId },
          { userId: receiverId, friendId: senderId }
        ]
      }
    })

    if (existingFriendship) {
      throw new Error('Already friends')
    }

    // Create friend request
    return await db.friendRequest.create({
      data: {
        id: `friend_request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderId,
        receiverId,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  }

  // Accept a friend request
  static async acceptFriendRequest(requestId: string, accepterId: string): Promise<{ friendship: Friend, request: FriendRequest }> {
    const request = await db.friendRequest.findUnique({
      where: { id: requestId }
    })

    if (!request) {
      throw new Error('Friend request not found')
    }

    if (request.receiverId !== accepterId) {
      throw new Error('Not authorized to accept this request')
    }

    if (request.status !== 'PENDING') {
      throw new Error('Request is not pending')
    }

    // Use transaction to create friendship and update request
    return await db.$transaction(async (tx) => {
      // Update request status
      const updatedRequest = await tx.friendRequest.update({
        where: { id: requestId },
        data: {
          status: 'ACCEPTED',
          updatedAt: new Date()
        }
      })

      // Create bidirectional friendship
      const friendship = await tx.friendship.create({
        data: {
          id: `friendship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: request.senderId,
          friendId: request.receiverId,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // Create reverse friendship
      await tx.friendship.create({
        data: {
          id: `friendship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_reverse`,
          userId: request.receiverId,
          friendId: request.senderId,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      return { friendship, request: updatedRequest }
    })
  }

  // Decline a friend request
  static async declineFriendRequest(requestId: string, declinerId: string): Promise<FriendRequest> {
    const request = await db.friendRequest.findUnique({
      where: { id: requestId }
    })

    if (!request) {
      throw new Error('Friend request not found')
    }

    if (request.receiverId !== declinerId) {
      throw new Error('Not authorized to decline this request')
    }

    if (request.status !== 'PENDING') {
      throw new Error('Request is not pending')
    }

    return await db.friendRequest.update({
      where: { id: requestId },
      data: {
        status: 'DECLINED',
        updatedAt: new Date()
      }
    })
  }

  // Get user's friends
  static async getUserFriends(userId: string): Promise<Array<{
    id: string
    name: string
    username: string
    avatar?: string
    isActive: boolean
    friendshipCreatedAt: Date
  }>> {
    const friendships = await db.friendship.findMany({
      where: {
        userId,
        status: 'ACTIVE'
      },
      include: {
        friend: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            isActive: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Map friendships to friend data
    return friendships.map(f => ({
      id: f.friend.id,
      name: f.friend.name,
      username: f.friend.username,
      avatar: f.friend.avatar,
      isActive: f.friend.isActive,
      friendshipCreatedAt: f.createdAt
    }))
  }

  // Get pending friend requests (sent and received)
  static async getPendingRequests(userId: string): Promise<{
    sent: Array<{
      id: string
      receiver: {
        id: string
        name: string
        username: string
        avatar?: string
      }
      createdAt: Date
    }>
    received: Array<{
      id: string
      sender: {
        id: string
        name: string
        username: string
        avatar?: string
      }
      createdAt: Date
    }>
  }> {
    const [sent, received] = await Promise.all([
      db.friendRequest.findMany({
        where: {
          senderId: userId,
          status: 'PENDING'
        },
        include: {
          receiver: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      db.friendRequest.findMany({
        where: {
          receiverId: userId,
          status: 'PENDING'
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ])

    return {
      sent: sent.map(r => ({
        id: r.id,
        receiver: r.receiver,
        createdAt: r.createdAt
      })),
      received: received.map(r => ({
        id: r.id,
        sender: r.sender,
        createdAt: r.createdAt
      }))
    }
  }

  // Search for users to add as friends
  static async searchUsers(query: string, currentUserId: string, limit: number = 20): Promise<Array<{
    id: string
    name: string
    username: string
    avatar?: string
    isActive: boolean
    friendshipStatus?: 'FRIENDS' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'NONE'
  }>> {
    // Build where clause - if query is empty, return all users
    const whereClause: any = {
      id: { not: currentUserId }
    }
    
    // Only add search filters if query is provided
    if (query && query.trim().length > 0) {
      whereClause.OR = [
        { name: { contains: query } },
        { username: { contains: query } }
      ]
    }
    
    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        isActive: true
      },
      take: limit
    })

    // Get friendship status for each user
    const userIds = users.map(u => u.id)
    const [friendships, sentRequests, receivedRequests] = await Promise.all([
      db.friendship.findMany({
        where: {
          userId: currentUserId,
          friendId: { in: userIds },
          status: 'ACTIVE'
        }
      }),
      db.friendRequest.findMany({
        where: {
          senderId: currentUserId,
          receiverId: { in: userIds },
          status: 'PENDING'
        }
      }),
      db.friendRequest.findMany({
        where: {
          receiverId: currentUserId,
          senderId: { in: userIds },
          status: 'PENDING'
        }
      })
    ])

    const friendIds = new Set(friendships.map(f => f.friendId))
    const sentRequestIds = new Set(sentRequests.map(r => r.receiverId))
    const receivedRequestIds = new Set(receivedRequests.map(r => r.senderId))

    return users.map(user => ({
      ...user,
      friendshipStatus: friendIds.has(user.id) ? 'FRIENDS' as const :
                       sentRequestIds.has(user.id) ? 'PENDING_SENT' as const :
                       receivedRequestIds.has(user.id) ? 'PENDING_RECEIVED' as const :
                       'NONE' as const
    }))
  }

  // Make all users friends with each other (for testing)
  static async makeAllUsersFriends(): Promise<void> {
    const users = await db.user.findMany({
      select: { id: true }
    })

    if (users.length < 2) {
      console.log('Not enough users to create friendships')
      return
    }

    console.log(`Creating friendships between ${users.length} users...`)

    // Create friendships between all users
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const user1 = users[i]
        const user2 = users[j]

        // Check if friendship already exists
        const existingFriendship = await db.friendship.findFirst({
          where: {
            OR: [
              { userId: user1.id, friendId: user2.id },
              { userId: user2.id, friendId: user1.id }
            ]
          }
        })

        if (!existingFriendship) {
          // Create bidirectional friendship
          await db.friendship.createMany({
            data: [
              {
                id: `friendship_${Date.now()}_${i}_${j}`,
                userId: user1.id,
                friendId: user2.id,
                status: 'ACTIVE',
                createdAt: new Date(),
                updatedAt: new Date()
              },
              {
                id: `friendship_${Date.now()}_${j}_${i}`,
                userId: user2.id,
                friendId: user1.id,
                status: 'ACTIVE',
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          })
        }
      }
    }

    console.log('✅ All users are now friends with each other')
  }
}



