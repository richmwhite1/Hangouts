const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Real Clerk users - you'll need to get the actual Clerk IDs from your Clerk dashboard
const realClerkUsers = [
  {
    clerkId: 'user_richard_1', // Replace with actual Clerk ID
    email: 'richmwhite@gmail.com',
    username: 'richard1',
    name: 'Richard White',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  },
  {
    clerkId: 'user_richard_2', // Replace with actual Clerk ID
    email: 'rwhite@victig.com',
    username: 'richard2',
    name: 'Richard White',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  },
  {
    clerkId: 'user_ted', // Replace with actual Clerk ID
    email: 'ted@example.com', // Replace with Ted's actual email
    username: 'ted',
    name: 'Ted',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
  }
]

async function createRealClerkUsers() {
  try {
    console.log('Creating real Clerk users...')
    
    const createdUsers = []
    
    for (const userData of realClerkUsers) {
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

async function main() {
  try {
    const users = await createRealClerkUsers()
    
    console.log('\n🎉 Successfully created:')
    console.log(`- ${users.length} real Clerk users`)
    console.log('- All users are friends with each other')
    console.log('\n📝 IMPORTANT: You need to update the Clerk IDs in this script with the actual IDs from your Clerk dashboard!')
    console.log('Current placeholder IDs:')
    users.forEach(user => {
      console.log(`  - ${user.name}: ${user.clerkId}`)
    })
    
  } catch (error) {
    console.error('Error in main:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
