require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testFriendsAPI() {
  try {
    console.log('🔍 Testing friends API logic...\n')

    // Find user
    const user = await prisma.user.findUnique({
      where: { username: 'richmwhite' },
      select: { id: true, username: true }
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log(`✅ Found user: ${user.username} (id: ${user.id})\n`)

    // Simulate the API query
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: user.id },
          { friendId: user.id }
        ],
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            location: true
          }
        },
        friend: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            location: true
          }
        }
      }
    })

    console.log(`📊 Found ${friendships.length} friendship records\n`)

    // Process like the API does
    const processedFriends = friendships.map(friendship => {
      // Determine which user is the friend (the one that's not the current user)
      const friendUser = friendship.userId === user.id ? friendship.friend : friendship.user
      const friendId = friendship.userId === user.id ? friendship.friendId : friendship.userId
      
      return {
        friendshipId: friendship.id,
        userId: friendship.userId,
        friendId: friendship.friendId,
        friendUser: friendUser ? friendUser.username : 'MISSING',
        friendIdCalculated: friendId,
        isCurrentUser: friendUser?.id === user.id
      }
    })

    console.log('📋 Processed friendships:')
    processedFriends.forEach((f, i) => {
      console.log(`\n${i + 1}. Friendship ID: ${f.friendshipId}`)
      console.log(`   userId: ${f.userId}`)
      console.log(`   friendId: ${f.friendId}`)
      console.log(`   Friend user: ${f.friendUser}`)
      console.log(`   Calculated friendId: ${f.friendIdCalculated}`)
      console.log(`   Is current user? ${f.isCurrentUser}`)
    })

    // Filter out where friend is current user (shouldn't happen but check)
    const validFriends = processedFriends.filter(f => !f.isCurrentUser && f.friendUser !== 'MISSING')
    
    // Remove duplicates by friendId
    const uniqueFriends = []
    const seenFriendIds = new Set()
    validFriends.forEach(f => {
      if (!seenFriendIds.has(f.friendIdCalculated)) {
        seenFriendIds.add(f.friendIdCalculated)
        uniqueFriends.push(f)
      }
    })

    console.log(`\n✅ Valid unique friends: ${uniqueFriends.length}`)
    uniqueFriends.forEach(f => {
      console.log(`   - ${f.friendUser}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testFriendsAPI()

