require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkUserFriendships() {
  try {
    console.log('🔍 Checking user "richmwhite" and friendships...\n')

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username: 'richmwhite' },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        clerkId: true
      }
    })

    if (!user) {
      console.log('❌ User "richmwhite" not found in database')
      
      // Check if there's a user with similar username
      const similarUsers = await prisma.user.findMany({
        where: {
          username: {
            contains: 'richmwhite',
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          clerkId: true
        }
      })
      
      if (similarUsers.length > 0) {
        console.log('\n📋 Found similar users:')
        similarUsers.forEach(u => {
          console.log(`  - ${u.username} (id: ${u.id}, clerkId: ${u.clerkId || 'none'})`)
        })
      }
      return
    }

    console.log(`✅ Found user: ${user.username}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Clerk ID: ${user.clerkId || 'none'}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.name || 'none'}\n`)

    // Get all friendships (both directions) - use raw query to avoid schema issues
    const friendshipsAsUser = await prisma.$queryRaw`
      SELECT f.id, f."userId", f."friendId", f.status, f."createdAt",
             u.id as friend_id, u.username as friend_username, u.name as friend_name, u."clerkId" as friend_clerkId
      FROM friendships f
      JOIN users u ON u.id = f."friendId"
      WHERE f."userId" = ${user.id} AND f.status = 'ACTIVE'
    `

    const friendshipsAsFriend = await prisma.$queryRaw`
      SELECT f.id, f."userId", f."friendId", f.status, f."createdAt",
             u.id as friend_id, u.username as friend_username, u.name as friend_name, u."clerkId" as friend_clerkId
      FROM friendships f
      JOIN users u ON u.id = f."userId"
      WHERE f."friendId" = ${user.id} AND f.status = 'ACTIVE'
    `

    const allFriendships = [
      ...friendshipsAsUser.map(f => ({
        id: f.id,
        friend: {
          id: f.friend_id,
          username: f.friend_username,
          name: f.friend_name,
          clerkId: f.friend_clerkId
        },
        direction: 'user -> friend',
        status: f.status
      })),
      ...friendshipsAsFriend.map(f => ({
        id: f.id,
        friend: {
          id: f.friend_id,
          username: f.friend_username,
          name: f.friend_name,
          clerkId: f.friend_clerkId
        },
        direction: 'friend -> user',
        status: f.status
      }))
    ]

    console.log(`📊 Total ACTIVE friendships: ${allFriendships.length}\n`)

    if (allFriendships.length === 0) {
      // Check for any friendships (including inactive)
      const allFriendshipsAnyStatus = await prisma.$queryRaw`
        SELECT f.id, f."userId", f."friendId", f.status,
               CASE 
                 WHEN f."userId" = ${user.id} THEN u2.id
                 ELSE u1.id
               END as friend_id,
               CASE 
                 WHEN f."userId" = ${user.id} THEN u2.username
                 ELSE u1.username
               END as friend_username,
               CASE 
                 WHEN f."userId" = ${user.id} THEN u2.name
                 ELSE u1.name
               END as friend_name
        FROM friendships f
        JOIN users u1 ON u1.id = f."userId"
        JOIN users u2 ON u2.id = f."friendId"
        WHERE (f."userId" = ${user.id} OR f."friendId" = ${user.id})
      `

      if (allFriendshipsAnyStatus.length > 0) {
        console.log(`⚠️  Found ${allFriendshipsAnyStatus.length} friendships with non-ACTIVE status:`)
        allFriendshipsAnyStatus.forEach(f => {
          console.log(`   - ${f.friend_username} (status: ${f.status})`)
        })
      } else {
        console.log('❌ No friendships found at all (any status)')
      }

      // Check for friend requests
      const sentRequests = await prisma.friendRequest.findMany({
        where: {
          senderId: user.id,
          status: 'PENDING'
        },
        include: {
          receiver: {
            select: {
              id: true,
              username: true,
              name: true
            }
          }
        }
      })

      const receivedRequests = await prisma.friendRequest.findMany({
        where: {
          receiverId: user.id,
          status: 'PENDING'
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              name: true
            }
          }
        }
      })

      if (sentRequests.length > 0 || receivedRequests.length > 0) {
        console.log(`\n📨 Friend Requests:`)
        if (sentRequests.length > 0) {
          console.log(`   Sent (${sentRequests.length}):`)
          sentRequests.forEach(r => {
            console.log(`     - To: ${r.receiver.username}`)
          })
        }
        if (receivedRequests.length > 0) {
          console.log(`   Received (${receivedRequests.length}):`)
          receivedRequests.forEach(r => {
            console.log(`     - From: ${r.sender.username}`)
          })
        }
      }
    } else {
      console.log('👥 Friends:')
      allFriendships.forEach(f => {
        console.log(`   - ${f.friend.username} (${f.friend.name || 'no name'})`)
        console.log(`     Direction: ${f.direction}`)
      })
    }

    // Check if there are other users in the database
    const totalUsers = await prisma.user.count()
    console.log(`\n📈 Total users in database: ${totalUsers}`)

    // Check total friendships
    const totalFriendships = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM friendships WHERE status = 'ACTIVE'
    `
    console.log(`📈 Total ACTIVE friendships in database: ${totalFriendships[0].count}`)

    // Check if there are other users that could be friends
    const otherUsers = await prisma.user.findMany({
      where: {
        id: { not: user.id }
      },
      select: {
        id: true,
        username: true,
        name: true
      },
      take: 10
    })

    if (otherUsers.length > 0) {
      console.log(`\n👤 Sample of other users in database (${otherUsers.length} shown):`)
      otherUsers.forEach(u => {
        console.log(`   - ${u.username} (${u.name || 'no name'})`)
      })
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUserFriendships()

