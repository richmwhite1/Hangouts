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
      
      // Check all users with "rich" in username
      const richUsers = await prisma.user.findMany({
        where: {
          username: {
            contains: 'rich',
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          clerkId: true
        },
        take: 10
      })
      
      if (richUsers.length > 0) {
        console.log('\n📋 Users with "rich" in username:')
        richUsers.forEach(u => {
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

    // Get all friendships (both directions) - query directly
    const friendshipsAsUser = await prisma.friendship.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE'
      },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            name: true,
            clerkId: true
          }
        }
      }
    })

    const friendshipsAsFriend = await prisma.friendship.findMany({
      where: {
        friendId: user.id,
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            clerkId: true
          }
        }
      }
    })

    const allFriendships = [
      ...friendshipsAsUser.map(f => ({
        id: f.id,
        friend: f.friend,
        direction: 'user -> friend',
        status: f.status
      })),
      ...friendshipsAsFriend.map(f => ({
        id: f.id,
        friend: f.user,
        direction: 'friend -> user',
        status: f.status
      }))
    ]

    console.log(`📊 Total ACTIVE friendships: ${allFriendships.length}\n`)

    if (allFriendships.length === 0) {
      // Check for any friendships (including inactive)
      const allFriendshipsAnyStatus = await prisma.friendship.findMany({
        where: {
          OR: [
            { userId: user.id },
            { friendId: user.id }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true
            }
          },
          friend: {
            select: {
              id: true,
              username: true,
              name: true
            }
          }
        }
      })

      if (allFriendshipsAnyStatus.length > 0) {
        console.log(`⚠️  Found ${allFriendshipsAnyStatus.length} friendships with non-ACTIVE status:`)
        allFriendshipsAnyStatus.forEach(f => {
          const otherUser = f.userId === user.id ? f.friend : f.user
          console.log(`   - ${otherUser.username} (status: ${f.status})`)
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
    const totalFriendships = await prisma.friendship.count({
      where: { status: 'ACTIVE' }
    })
    console.log(`📈 Total ACTIVE friendships in database: ${totalFriendships}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUserFriendships()

