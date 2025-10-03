const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testHangout() {
  try {
    const hangoutId = 'hangout_1758733323810_zc0ama639'
    
    // Check if hangout exists
    const hangout = await prisma.content.findUnique({
      where: { 
        id: hangoutId,
        type: 'HANGOUT'
      },
      include: {
        hangout_details: {
          include: {
            polls: true
          }
        }
      }
    })
    
    console.log('Hangout found:', !!hangout)
    if (hangout) {
      console.log('Hangout details:', hangout.hangout_details)
      console.log('Polls:', hangout.hangout_details?.polls)
    }
    
    // Also check all hangouts
    const allHangouts = await prisma.content.findMany({
      where: { type: 'HANGOUT' },
      select: { id: true, title: true }
    })
    
    console.log('\nAll hangouts:')
    allHangouts.forEach(h => console.log(`- ${h.id}: ${h.title}`))
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testHangout()







