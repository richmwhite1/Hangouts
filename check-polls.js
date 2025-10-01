const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkPolls() {
  try {
    const polls = await prisma.polls.findMany({
      take: 5,
      include: {
        hangout_details: true
      }
    })
    
    console.log('Polls found:', polls.length)
    polls.forEach(poll => {
      console.log(`Poll ID: ${poll.id}, Hangout ID: ${poll.hangoutId}, Status: ${poll.status}`)
    })
    
    // Also check hangout_details
    const hangoutDetails = await prisma.hangout_details.findMany({
      take: 5,
      include: {
        polls: true
      }
    })
    
    console.log('\nHangout details found:', hangoutDetails.length)
    hangoutDetails.forEach(detail => {
      console.log(`Hangout Detail ID: ${detail.id}, Polls: ${detail.polls.length}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPolls()