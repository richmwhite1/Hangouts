const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function checkContent() {
  console.log('\n📊 Checking Production Content...\n')
  
  try {
    // Check content
    const contentCount = await prisma.content.count()
    const hangouts = await prisma.content.findMany({
      where: { type: 'HANGOUT' },
      select: {
        id: true,
        title: true,
        privacyLevel: true,
        startTime: true,
        creatorId: true,
        users: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      },
      take: 10
    })
    
    const events = await prisma.content.findMany({
      where: { type: 'EVENT' },
      select: {
        id: true,
        title: true,
        privacyLevel: true,
        startTime: true,
        creatorId: true,
        users: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      },
      take: 10
    })
    
    const publicContent = await prisma.content.count({
      where: { privacyLevel: 'PUBLIC' }
    })
    
    console.log('Content Summary:')
    console.log(`  Total content items: ${contentCount}`)
    console.log(`  Public content: ${publicContent}`)
    console.log(`  Hangouts: ${hangouts.length}`)
    console.log(`  Events: ${events.length}`)
    console.log('')
    
    if (hangouts.length > 0) {
      console.log('Sample Hangouts:')
      hangouts.forEach(h => {
        console.log(`  - ${h.title} (${h.privacyLevel}) by ${h.users?.name || 'Unknown'}`)
      })
      console.log('')
    } else {
      console.log('⚠️  No hangouts found in database')
      console.log('')
    }
    
    if (events.length > 0) {
      console.log('Sample Events:')
      events.forEach(e => {
        console.log(`  - ${e.title} (${e.privacyLevel}) by ${e.users?.name || 'Unknown'}`)
      })
      console.log('')
    } else {
      console.log('⚠️  No events found in database')
      console.log('')
    }
    
    // Check users
    const userCount = await prisma.user.count()
    const activeUsers = await prisma.user.count({ where: { isActive: true } })
    const usersWithClerkId = await prisma.user.count({ where: { clerkId: { not: null } } })
    
    console.log('User Summary:')
    console.log(`  Total users: ${userCount}`)
    console.log(`  Active users: ${activeUsers}`)
    console.log(`  Users with Clerk IDs: ${usersWithClerkId}`)
    console.log('')
    
    if (userCount === 0) {
      console.log('❌ No users found! You need to:')
      console.log('   1. Run: ./fix-production-users.sh')
      console.log('   2. This will sync all Clerk users to the database')
      console.log('')
    }
    
    if (contentCount === 0) {
      console.log('❌ No content found! To add content:')
      console.log('   1. Sign in to the app')
      console.log('   2. Create some hangouts or events')
      console.log('   3. OR run a seed script to add sample content')
      console.log('')
    }
    
    // Recommendations
    console.log('Recommendations:')
    if (usersWithClerkId === 0) {
      console.log('  🔴 CRITICAL: No users have Clerk IDs')
      console.log('     Run: ./fix-production-users.sh')
    }
    if (publicContent === 0 && contentCount > 0) {
      console.log('  ⚠️  No public content - users won\'t see anything on discovery page')
      console.log('     Create some public hangouts/events')
    }
    if (contentCount === 0) {
      console.log('  ⚠️  Database is empty - create some content to test')
    }
    if (usersWithClerkId > 0 && contentCount > 0 && publicContent > 0) {
      console.log('  ✅ Everything looks good!')
      console.log('     Users can sign in and see content')
    }
    console.log('')
    
  } catch (error) {
    console.error('❌ Error checking content:', error.message)
    console.error('Full error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkContent()

