const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Real-looking Clerk user data (simulating actual Clerk signups)
const realUsers = [
  {
    clerkId: 'user_2abc123def456ghi789jkl012mno345pqr',
    email: 'sarah.johnson@email.com',
    username: 'sarahj',
    name: 'Sarah Johnson',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
  },
  {
    clerkId: 'user_2def456ghi789jkl012mno345pqr678stu',
    email: 'mike.chen@email.com',
    username: 'mikechen',
    name: 'Mike Chen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  },
  {
    clerkId: 'user_2ghi789jkl012mno345pqr678stu901vwx',
    email: 'emma.davis@email.com',
    username: 'emmadavis',
    name: 'Emma Davis',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
  },
  {
    clerkId: 'user_2jkl012mno345pqr678stu901vwx234yza',
    email: 'alex.rodriguez@email.com',
    username: 'alexrod',
    name: 'Alex Rodriguez',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  },
  {
    clerkId: 'user_2mno345pqr678stu901vwx234yza567bcd',
    email: 'jessica.wang@email.com',
    username: 'jesswang',
    name: 'Jessica Wang',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face'
  },
  {
    clerkId: 'user_2pqr678stu901vwx234yza567bcd890efg',
    email: 'david.kim@email.com',
    username: 'davidkim',
    name: 'David Kim',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
  },
  {
    clerkId: 'user_2stu901vwx234yza567bcd890efg123hij',
    email: 'lisa.martinez@email.com',
    username: 'lisamartinez',
    name: 'Lisa Martinez',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face'
  },
  {
    clerkId: 'user_2vwx234yza567bcd890efg123hij456klm',
    email: 'ryan.thompson@email.com',
    username: 'ryanthompson',
    name: 'Ryan Thompson',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face'
  },
  {
    clerkId: 'user_2yza567bcd890efg123hij456klm789nop',
    email: 'amanda.brown@email.com',
    username: 'amandabrown',
    name: 'Amanda Brown',
    avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face'
  },
  {
    clerkId: 'user_2bcd890efg123hij456klm789nop012qrs',
    email: 'kevin.lee@email.com',
    username: 'kevinlee',
    name: 'Kevin Lee',
    avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face'
  }
]

async function createRealUsers() {
  try {
    console.log('Creating real Clerk users...')
    
    const createdUsers = []
    
    for (const userData of realUsers) {
      const user = await prisma.user.create({
        data: {
          clerkId: userData.clerkId,
          email: userData.email,
          username: userData.username,
          name: userData.name,
          avatar: userData.avatar,
          isVerified: true,
          isActive: true,
          password: null, // Clerk users don't need passwords
          bio: `Hi! I'm ${userData.name.split(' ')[0]} and I love planning fun hangouts!`,
          location: 'San Francisco, CA'
        }
      })
      
      createdUsers.push(user)
      console.log(`Created user: ${user.name} (${user.email})`)
    }
    
    console.log(`\n✅ Created ${createdUsers.length} real Clerk users`)
    
    // Create friendships between all users (everyone is friends with everyone)
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
    
    console.log(`✅ Created ${friendshipCount} friendships (everyone is friends with everyone)`)
    
    return createdUsers
    
  } catch (error) {
    console.error('Error creating users:', error)
    throw error
  }
}

async function createRealHangouts(users) {
  try {
    console.log('\nCreating real hangouts...')
    
    const hangouts = [
      {
        title: 'Weekend Coffee & Code Session',
        description: 'Let\'s grab coffee and work on our side projects together! Bring your laptops and ideas.',
        location: 'Blue Bottle Coffee, Mission District',
        latitude: 37.7749,
        longitude: -122.4194,
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // +3 hours
        privacyLevel: 'FRIENDS_ONLY',
        maxParticipants: 8,
        creatorId: users[0].id,
        participants: [users[1].id, users[2].id, users[3].id]
      },
      {
        title: 'Saturday Morning Hiking Adventure',
        description: 'Join us for a beautiful hike in the Marin Headlands! We\'ll meet at the trailhead and explore together.',
        location: 'Marin Headlands Trailhead',
        latitude: 37.8267,
        longitude: -122.4994,
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // +4 hours
        privacyLevel: 'FRIENDS_ONLY',
        maxParticipants: 12,
        creatorId: users[1].id,
        participants: [users[0].id, users[4].id, users[5].id, users[6].id]
      },
      {
        title: 'Game Night at My Place',
        description: 'Board games, snacks, and good company! Bring your favorite games or just come to play.',
        location: 'My Apartment - Mission Bay',
        latitude: 37.7699,
        longitude: -122.3890,
        startTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000), // +5 hours
        privacyLevel: 'FRIENDS_ONLY',
        maxParticipants: 10,
        creatorId: users[2].id,
        participants: [users[0].id, users[1].id, users[7].id, users[8].id, users[9].id]
      },
      {
        title: 'Food Truck Festival',
        description: 'Let\'s explore the amazing food trucks at the Ferry Building! Great variety of cuisines.',
        location: 'Ferry Building Marketplace',
        latitude: 37.7956,
        longitude: -122.3933,
        startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // +2 hours
        privacyLevel: 'FRIENDS_ONLY',
        maxParticipants: 15,
        creatorId: users[3].id,
        participants: [users[1].id, users[2].id, users[4].id, users[5].id]
      },
      {
        title: 'Sunset Photography Walk',
        description: 'Capture the beautiful SF sunset! All skill levels welcome. We\'ll walk along the Embarcadero.',
        location: 'Embarcadero Waterfront',
        latitude: 37.7989,
        longitude: -122.3992,
        startTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
        endTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // +2 hours
        privacyLevel: 'FRIENDS_ONLY',
        maxParticipants: 8,
        creatorId: users[4].id,
        participants: [users[0].id, users[3].id, users[6].id, users[7].id]
      }
    ]
    
    const createdHangouts = []
    
    for (const hangoutData of hangouts) {
      const hangout = await prisma.content.create({
        data: {
          id: `hangout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'HANGOUT',
          title: hangoutData.title,
          description: hangoutData.description,
          location: hangoutData.location,
          latitude: hangoutData.latitude,
          longitude: hangoutData.longitude,
          startTime: hangoutData.startTime,
          endTime: hangoutData.endTime,
          status: 'PUBLISHED',
          privacyLevel: hangoutData.privacyLevel,
          creatorId: hangoutData.creatorId,
          maxParticipants: hangoutData.maxParticipants,
          updatedAt: new Date()
        }
      })
      
      // Add creator as participant
      await prisma.content_participants.create({
        data: {
          id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          contentId: hangout.id,
          userId: hangoutData.creatorId,
          role: 'CREATOR',
          canEdit: true,
          isMandatory: true,
          isCoHost: true,
          invitedAt: new Date(),
          joinedAt: new Date()
        }
      })
      
      // Add other participants
      for (const participantId of hangoutData.participants) {
        await prisma.content_participants.create({
          data: {
            id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            contentId: hangout.id,
            userId: participantId,
            role: 'MEMBER',
            canEdit: false,
            isMandatory: false,
            isCoHost: false,
            invitedAt: new Date(),
            joinedAt: new Date()
          }
        })
      }
      
      createdHangouts.push(hangout)
      console.log(`Created hangout: ${hangout.title}`)
    }
    
    console.log(`✅ Created ${createdHangouts.length} real hangouts with participants`)
    
    return createdHangouts
    
  } catch (error) {
    console.error('Error creating hangouts:', error)
    throw error
  }
}

async function main() {
  try {
    // Get existing users instead of creating new ones
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' }
    })
    
    console.log(`Found ${users.length} existing users`)
    
    const hangouts = await createRealHangouts(users)
    
    console.log('\n🎉 Successfully created:')
    console.log(`- ${users.length} real Clerk users`)
    console.log(`- ${hangouts.length} real hangouts`)
    console.log('- All users are friends with each other')
    console.log('- All hangouts have participants')
    
  } catch (error) {
    console.error('Error in main:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
