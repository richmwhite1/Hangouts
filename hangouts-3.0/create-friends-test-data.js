const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestUsers() {
  try {
    console.log('Creating test users for friends functionality...')
    
    const testUsers = [
      {
        email: 'alice@example.com',
        username: 'alice',
        name: 'Alice Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
      },
      {
        email: 'bob@example.com',
        username: 'bob',
        name: 'Bob Smith',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
      },
      {
        email: 'charlie@example.com',
        username: 'charlie',
        name: 'Charlie Brown',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
      },
      {
        email: 'diana@example.com',
        username: 'diana',
        name: 'Diana Prince',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
      },
      {
        email: 'eve@example.com',
        username: 'eve',
        name: 'Eve Wilson',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face'
      }
    ]
    
    const createdUsers = []
    
    for (const userData of testUsers) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          username: userData.username,
          name: userData.name,
          avatar: userData.avatar,
          isActive: true,
          isVerified: true
        },
        create: {
          email: userData.email,
          username: userData.username,
          name: userData.name,
          avatar: userData.avatar,
          isActive: true,
          isVerified: true,
          role: 'USER'
        }
      })
      
      createdUsers.push(user)
      console.log(`✅ Created/Updated user: ${user.name} (@${user.username}) - ID: ${user.id}`)
    }
    
    // Create some friendships for testing
    console.log('\n🤝 Creating test friendships...')
    
    const devUserId = 'cmgmmbehc0000jpzattv53v2o' // Development user ID
    
    // Make Alice and Bob friends with the dev user
    const friendships = [
      { userId: devUserId, friendId: createdUsers[0].id }, // Alice
      { userId: devUserId, friendId: createdUsers[1].id }, // Bob
    ]
    
    for (const friendship of friendships) {
      // Create bidirectional friendship
      await prisma.friendship.upsert({
        where: {
          userId_friendId: {
            userId: friendship.userId,
            friendId: friendship.friendId
          }
        },
        update: { status: 'ACTIVE' },
        create: {
          userId: friendship.userId,
          friendId: friendship.friendId,
          status: 'ACTIVE'
        }
      })
      
      await prisma.friendship.upsert({
        where: {
          userId_friendId: {
            userId: friendship.friendId,
            friendId: friendship.userId
          }
        },
        update: { status: 'ACTIVE' },
        create: {
          userId: friendship.friendId,
          friendId: friendship.userId,
          status: 'ACTIVE'
        }
      })
    }
    
    console.log('✅ Created friendships between dev user and Alice, Bob')
    
    // Create some friend requests for testing
    console.log('\n📨 Creating test friend requests...')
    
    const friendRequests = [
      {
        senderId: createdUsers[2].id, // Charlie sends to dev user
        receiverId: devUserId,
        message: 'Hey! Let\'s be friends!'
      },
      {
        senderId: devUserId, // Dev user sends to Diana
        receiverId: createdUsers[3].id,
        message: 'Would love to connect!'
      }
    ]
    
    for (const request of friendRequests) {
      await prisma.friendRequest.upsert({
        where: {
          senderId_receiverId: {
            senderId: request.senderId,
            receiverId: request.receiverId
          }
        },
        update: { 
          status: 'PENDING',
          message: request.message
        },
        create: {
          senderId: request.senderId,
          receiverId: request.receiverId,
          message: request.message,
          status: 'PENDING'
        }
      })
    }
    
    console.log('✅ Created friend requests')
    
    console.log('\n🎉 Test data created successfully!')
    console.log('\n📊 Summary:')
    console.log(`- Created ${createdUsers.length} test users`)
    console.log('- Created 2 friendships (dev user ↔ Alice, Bob)')
    console.log('- Created 2 friend requests (Charlie → dev user, dev user → Diana)')
    console.log('\n🧪 Test scenarios:')
    console.log('1. Friends tab: Should show Alice and Bob as friends')
    console.log('2. Requests tab: Should show Charlie\'s incoming request and Diana\'s outgoing request')
    console.log('3. Find Friends tab: Should show Charlie, Diana, and Eve as potential friends')
    
  } catch (error) {
    console.error('Error creating test users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUsers()
