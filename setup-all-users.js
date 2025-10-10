const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
})

async function setupAllUsers() {
  try {
    console.log('🚀 Setting up all users and friendships...\n')
    
    // Clear existing data
    console.log('🧹 Clearing existing data...')
    await prisma.friendship.deleteMany()
    await prisma.friendRequest.deleteMany()
    await prisma.user.deleteMany()
    
    // Create users
    const users = [
      {
        email: 'richard@example.com',
        username: 'richard',
        name: 'Richard White',
        password: 'Password1!'
      },
      {
        email: 'hillary@example.com',
        username: 'hillaryclinton',
        name: 'Hillary Clinton',
        password: 'Password1!'
      },
      {
        email: 'ted@example.com',
        username: 'tedjohnson',
        name: 'Ted Johnson',
        password: 'Password1!'
      },
      {
        email: 'bill@example.com',
        username: 'billbev',
        name: 'Bill Beverly',
        password: 'Password1!'
      },
      {
        email: 'sarah@example.com',
        username: 'sarahsmith',
        name: 'Sarah Smith',
        password: 'Password1!'
      },
      {
        email: 'mike@example.com',
        username: 'mikejones',
        name: 'Mike Jones',
        password: 'Password1!'
      }
    ]
    
    console.log('👥 Creating users...')
    const createdUsers = []
    
    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          username: userData.username,
          name: userData.name,
          password: hashedPassword,
          isActive: true,
          isVerified: true
        }
      })
      
      createdUsers.push(user)
      console.log(`  ✅ Created ${user.name} (@${user.username})`)
    }
    
    // Create friendships
    console.log('\n🤝 Creating friendships...')
    
    const richard = createdUsers.find(u => u.username === 'richard')
    const hillary = createdUsers.find(u => u.username === 'hillaryclinton')
    const ted = createdUsers.find(u => u.username === 'tedjohnson')
    const bill = createdUsers.find(u => u.username === 'billbev')
    const sarah = createdUsers.find(u => u.username === 'sarahsmith')
    const mike = createdUsers.find(u => u.username === 'mikejones')
    
    // Create all friendships at once
    const friendships = [
      // Richard's friendships
      { userId: richard.id, friendId: hillary.id, status: 'ACTIVE' },
      { userId: richard.id, friendId: ted.id, status: 'ACTIVE' },
      { userId: richard.id, friendId: sarah.id, status: 'ACTIVE' },
      
      // Hillary's friendships (reciprocal)
      { userId: hillary.id, friendId: richard.id, status: 'ACTIVE' },
      { userId: hillary.id, friendId: ted.id, status: 'ACTIVE' },
      
      // Ted's friendships (reciprocal)
      { userId: ted.id, friendId: richard.id, status: 'ACTIVE' },
      { userId: ted.id, friendId: hillary.id, status: 'ACTIVE' },
      { userId: ted.id, friendId: mike.id, status: 'ACTIVE' },
      
      // Mike's friendships (reciprocal)
      { userId: mike.id, friendId: ted.id, status: 'ACTIVE' },
      
      // Sarah's friendships (reciprocal)
      { userId: sarah.id, friendId: richard.id, status: 'ACTIVE' }
    ]
    
    await prisma.friendship.createMany({
      data: friendships
    })
    
    console.log('  ✅ Created all friendships')
    
    // Verify the setup
    console.log('\n🔍 Verifying setup...')
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        isActive: true
      }
    })
    
    const allFriendships = await prisma.friendship.findMany({
      include: {
        user: {
          select: {
            name: true,
            username: true
          }
        },
        friend: {
          select: {
            name: true,
            username: true
          }
        }
      }
    })
    
    console.log(`\n📊 Final state:`)
    console.log(`  - Users: ${allUsers.length}`)
    console.log(`  - Friendships: ${allFriendships.length}`)
    
    console.log('\n👥 All users:')
    allUsers.forEach(user => {
      console.log(`  - ${user.name} (@${user.username}) - ${user.email}`)
    })
    
    console.log('\n🤝 All friendships:')
    allFriendships.forEach(friendship => {
      console.log(`  - ${friendship.user.name} ↔ ${friendship.friend.name}`)
    })
    
    console.log('\n✅ Setup complete!')
    
  } catch (error) {
    console.error('❌ Error setting up users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupAllUsers()
