const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Create local test users
const localUsers = [
  {
    clerkId: 'local_user_001',
    email: 'test1@local.com',
    username: 'testuser1',
    name: 'Test User 1',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
  },
  {
    clerkId: 'local_user_002',
    email: 'test2@local.com',
    username: 'testuser2',
    name: 'Test User 2',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  },
  {
    clerkId: 'local_user_003',
    email: 'test3@local.com',
    username: 'testuser3',
    name: 'Test User 3',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
  }
]

async function createLocalTestData() {
  try {
    console.log('Creating local test users...')
    
    const createdUsers = []
    
    for (const userData of localUsers) {
      const user = await prisma.user.create({
        data: {
          clerkId: userData.clerkId,
          email: userData.email,
          username: userData.username,
          name: userData.name,
          avatar: userData.avatar,
          isVerified: true,
          isActive: true,
          password: null,
          bio: `Hi! I'm ${userData.name.split(' ')[0]} and I love planning fun hangouts!`,
          location: 'San Francisco, CA'
        }
      })
      
      createdUsers.push(user)
      console.log(`Created user: ${user.name} (${user.email})`)
    }
    
    console.log(`\n✅ Created ${createdUsers.length} local test users`)
    
    // Create friendships between all users
    console.log('\nCreating friendships...')
    let friendshipCount = 0
    
    for (let i = 0; i < createdUsers.length; i++) {
      for (let j = i + 1; j < createdUsers.length; j++) {
        await prisma.friendship.create({
          data: {
            userId: createdUsers[i].id,
            friendId: createdUsers[j].id,
            status: 'ACTIVE'
          }
        })
        friendshipCount++
      }
    }
    
    console.log(`✅ Created ${friendshipCount} friendships`)
    
    // Create a test hangout
    const hangout = await prisma.content.create({
      data: {
        id: `hangout_local_${Date.now()}`,
        type: 'HANGOUT',
        title: 'Local Test Hangout',
        description: 'This is a test hangout for local development',
        location: 'Local Coffee Shop',
        latitude: 37.7749,
        longitude: -122.4194,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // Tomorrow + 2 hours
        status: 'PUBLISHED',
        privacyLevel: 'FRIENDS_ONLY',
        creatorId: createdUsers[0].id,
        maxParticipants: 5,
        updatedAt: new Date()
      }
    })
    
    // Add creator as participant
    await prisma.content_participants.create({
      data: {
        id: `participant_local_${Date.now()}_1`,
        contentId: hangout.id,
        userId: createdUsers[0].id,
        role: 'CREATOR',
        canEdit: true,
        isMandatory: true,
        isCoHost: true,
        invitedAt: new Date(),
        joinedAt: new Date()
      }
    })
    
    // Add other participants
    for (let i = 1; i < createdUsers.length; i++) {
      await prisma.content_participants.create({
        data: {
          id: `participant_local_${Date.now()}_${i + 1}`,
          contentId: hangout.id,
          userId: createdUsers[i].id,
          role: 'MEMBER',
          canEdit: false,
          isMandatory: false,
          isCoHost: false,
          invitedAt: new Date(),
          joinedAt: new Date()
        }
      })
    }
    
    console.log(`✅ Created test hangout: ${hangout.title}`)
    
    console.log('\n🎉 Local test data created successfully!')
    
  } catch (error) {
    console.error('Error creating local test data:', error)
    throw error
  }
}

async function main() {
  try {
    await createLocalTestData()
  } catch (error) {
    console.error('Error in main:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
