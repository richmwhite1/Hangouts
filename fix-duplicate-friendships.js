const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
})

async function fixDuplicateFriendships() {
  try {
    console.log('🔧 Fixing duplicate friendships...\n')
    
    // Get all friendships
    const friendships = await prisma.friendship.findMany()
    console.log(`Found ${friendships.length} friendships`)
    
    // Find and remove duplicates
    const seenPairs = new Set()
    const duplicatesToDelete = []
    
    friendships.forEach(friendship => {
      const pair1 = `${friendship.userId}-${friendship.friendId}`
      const pair2 = `${friendship.friendId}-${friendship.userId}`
      
      if (seenPairs.has(pair1) || seenPairs.has(pair2)) {
        duplicatesToDelete.push(friendship.id)
        console.log(`  🗑️  Marking for deletion: ${friendship.id}`)
      } else {
        seenPairs.add(pair1)
        seenPairs.add(pair2)
      }
    })
    
    if (duplicatesToDelete.length > 0) {
      console.log(`\nDeleting ${duplicatesToDelete.length} duplicate friendships...`)
      await prisma.friendship.deleteMany({
        where: {
          id: {
            in: duplicatesToDelete
          }
        }
      })
      console.log('✅ Duplicates removed')
    } else {
      console.log('✅ No duplicates found')
    }
    
    // Verify the fix
    const remainingFriendships = await prisma.friendship.findMany({
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
    console.log(`  - Friendships: ${remainingFriendships.length}`)
    
    console.log('\n🤝 Remaining friendships:')
    remainingFriendships.forEach(friendship => {
      console.log(`  - ${friendship.user.name} ↔ ${friendship.friend.name}`)
    })
    
    console.log('\n✅ Duplicate friendships fixed!')
    
  } catch (error) {
    console.error('❌ Error fixing friendships:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixDuplicateFriendships()










