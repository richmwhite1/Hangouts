import { createApiHandler, createSuccessResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/api-middleware'
import { db } from '@/lib/db'

async function getFriendSuggestionsHandler(request: AuthenticatedRequest) {
  const userId = request.user?.userId
  if (!userId) {
    return createErrorResponse('Authentication required', 'User ID not provided', 401)
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10')

  try {
    // Get user's current friends and sent/received requests
    const [userFriendships, sentRequests, receivedRequests] = await Promise.all([
      db.friendship.findMany({
        where: {
          OR: [
            { user1Id: userId },
            { user2Id: userId }
          ]
        },
        select: {
          user1Id: true,
          user2Id: true
        }
      }),
      db.friendRequest.findMany({
        where: { senderId: userId },
        select: { receiverId: true }
      }),
      db.friendRequest.findMany({
        where: { receiverId: userId },
        select: { senderId: true }
      })
    ])

    // Create sets of users to exclude
    const friendIds = new Set(
      userFriendships.map(f => f.user1Id === userId ? f.user2Id : f.user1Id)
    )
    
    const sentRequestIds = new Set(sentRequests.map(r => r.receiverId))
    const receivedRequestIds = new Set(receivedRequests.map(r => r.senderId))
    
    // Combine all users to exclude (friends, sent requests, received requests, self)
    const excludeIds = new Set([
      userId,
      ...friendIds,
      ...sentRequestIds,
      ...receivedRequestIds
    ])

    // Get mutual friends suggestions
    const mutualFriendsSuggestions = await db.friendship.findMany({
      where: {
        AND: [
          {
            OR: [
              { user1Id: { in: Array.from(friendIds) } },
              { user2Id: { in: Array.from(friendIds) } }
            ]
          }
        ]
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            lastSeen: true,
            isActive: true,
            bio: true,
            location: true
          }
        },
        user2: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            lastSeen: true,
            isActive: true,
            bio: true,
            location: true
          }
        }
      }
    })

    // Extract suggested users and count mutual friends
    const suggestionMap = new Map()
    
    mutualFriendsSuggestions.forEach(friendship => {
      const suggestedUser = friendship.user1Id === userId ? friendship.user2 : friendship.user1
      const mutualFriend = friendship.user1Id === userId ? friendship.user1 : friendship.user2
      
      // Skip if suggested user is in exclude list
      if (excludeIds.has(suggestedUser.id)) return
      
      if (!suggestionMap.has(suggestedUser.id)) {
        suggestionMap.set(suggestedUser.id, {
          ...suggestedUser,
          mutualFriendsCount: 0,
          mutualFriends: []
        })
      }
      
      const suggestion = suggestionMap.get(suggestedUser.id)
      suggestion.mutualFriendsCount++
      suggestion.mutualFriends.push(mutualFriend)
    })

    // Convert to array and sort by mutual friends count
    let suggestions = Array.from(suggestionMap.values())
      .sort((a, b) => b.mutualFriendsCount - a.mutualFriendsCount)
      .slice(0, limit)

    // If we don't have enough mutual friend suggestions, add random active users
    if (suggestions.length < limit) {
      const remainingLimit = limit - suggestions.length
      const suggestedIds = suggestions.map(s => s.id)
      
      const randomUsers = await db.user.findMany({
        where: {
          AND: [
            { id: { notIn: [...Array.from(excludeIds), ...suggestedIds] } },
            { isActive: true }
          ]
        },
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          lastSeen: true,
          isActive: true,
          bio: true,
          location: true
        },
        take: remainingLimit,
        orderBy: { lastSeen: 'desc' }
      })

      const randomSuggestions = randomUsers.map(user => ({
        ...user,
        mutualFriendsCount: 0,
        mutualFriends: []
      }))

      suggestions.push(...randomSuggestions)
    }

    // Add relationship status to each suggestion
    const suggestionIds = suggestions.map(s => s.id)
    const pendingRequests = await db.friendRequest.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: { in: suggestionIds } },
          { receiverId: userId, senderId: { in: suggestionIds } }
        ],
        status: 'PENDING'
      },
      select: {
        senderId: true,
        receiverId: true
      }
    })

    // Create a map of relationship statuses
    const relationshipMap = new Map()
    pendingRequests.forEach(request => {
      const otherUserId = request.senderId === userId ? request.receiverId : request.senderId
      const status = request.senderId === userId ? 'request_sent' : 'request_received'
      relationshipMap.set(otherUserId, status)
    })

    // Add relationship status to suggestions
    const suggestionsWithStatus = suggestions.map(suggestion => ({
      ...suggestion,
      relationshipStatus: relationshipMap.get(suggestion.id) || null
    }))

    return createSuccessResponse({ suggestions: suggestionsWithStatus })
  } catch (error) {
    console.error('Get friend suggestions error:', error)
    return createErrorResponse('Database error', 'Failed to get friend suggestions', 500)
  }
}

export const GET = createApiHandler(getFriendSuggestionsHandler, {
  requireAuth: true,
  enableRateLimit: true,
  enableCORS: true
})
