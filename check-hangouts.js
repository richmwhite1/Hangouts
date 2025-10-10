const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkHangouts() {
  try {
    console.log('🔍 Checking existing hangouts...')
    
    const hangouts = await prisma.hangout_details.findMany({
      take: 5,
      select: {
        id: true,
        contentId: true,
        content: {
          select: {
            title: true,
            creatorId: true
          }
        }
      }
    })
    
    console.log('Found hangouts:', hangouts.length)
    hangouts.forEach(hangout => {
      console.log(`- ${hangout.id}: ${hangout.content.title} (creator: ${hangout.content.creatorId})`)
    })
    
    if (hangouts.length === 0) {
      console.log('No hangouts found. Creating a test hangout...')
      
      // Create or get a test user
      let testUser = await prisma.user.findFirst({
        where: { email: 'hangout@example.com' }
      })
      
      if (!testUser) {
        testUser = await prisma.user.create({
          data: {
            id: 'test-user-hangout-' + Date.now(),
            email: 'hangout@example.com',
            username: 'hangoutuser' + Date.now(),
            name: 'Hangout User',
            password: 'hashedpassword'
          }
        })
        console.log('✅ Test user created:', testUser.id)
      } else {
        console.log('✅ Using existing test user:', testUser.id)
      }
      
      // Create content first
      const testContent = await prisma.content.create({
        data: {
          id: 'test-content-' + Date.now(),
          title: 'Test Hangout for Polling',
          description: 'Test hangout for polling system',
          type: 'HANGOUT',
          creatorId: testUser.id,
          updatedAt: new Date()
        }
      })
      console.log('✅ Test content created:', testContent.id)
      
      // Create a test hangout
      const testHangout = await prisma.hangout_details.create({
        data: {
          id: 'test-hangout-' + Date.now(),
          contentId: testContent.id,
          maxParticipants: 10,
          weatherEnabled: false
        }
      })
      console.log('✅ Test hangout created:', testHangout.id)
      
      return testHangout.id
    } else {
      return hangouts[0].id
    }
    
  } catch (error) {
    console.error('Error checking hangouts:', error)
    return null
  } finally {
    await prisma.$disconnect()
  }
}

checkHangouts()
  .then((hangoutId) => {
    if (hangoutId) {
      console.log(`\n✅ Using hangout ID: ${hangoutId}`)
      process.exit(0)
    } else {
      console.log('\n❌ No hangout available')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('\n💥 Error:', error)
    process.exit(1)
  })
