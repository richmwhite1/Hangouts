const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupHangouts() {
  try {
    console.log('🧹 Cleaning up test hangouts...')
    
    // Get all hangouts by Bill, ordered by creation date (newest first)
    const billHangouts = await prisma.content.findMany({
      where: { 
        creatorId: 'cmfq75h2v0000jpf08u3kfi6b',
        type: 'HANGOUT'
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📊 Found ${billHangouts.length} hangouts by Bill`)
    
    // Keep the 5 most recent ones
    const keepHangouts = billHangouts.slice(0, 5)
    const deleteHangouts = billHangouts.slice(5)
    
    console.log(`✅ Keeping ${keepHangouts.length} most recent hangouts:`)
    keepHangouts.forEach((h, i) => {
      console.log(`   ${i + 1}. ${h.title} (${h.createdAt.toISOString()})`)
    })
    
    console.log(`🗑️ Deleting ${deleteHangouts.length} older hangouts:`)
    deleteHangouts.forEach((h, i) => {
      console.log(`   ${i + 1}. ${h.title} (${h.createdAt.toISOString()})`)
    })
    
    // Delete the older hangouts
    if (deleteHangouts.length > 0) {
      const hangoutIds = deleteHangouts.map(h => h.id)
      
      // Delete related data first
      await prisma.pollVote.deleteMany({
        where: {
          poll: {
            hangoutId: { in: hangoutIds }
          }
        }
      })
      
      await prisma.pollOption.deleteMany({
        where: {
          poll: {
            hangoutId: { in: hangoutIds }
          }
        }
      })
      
      await prisma.pollParticipant.deleteMany({
        where: {
          poll: {
            hangoutId: { in: hangoutIds }
          }
        }
      })
      
      await prisma.polls.deleteMany({
        where: {
          hangoutId: { in: hangoutIds }
        }
      })
      
      await prisma.photos.deleteMany({
        where: {
          hangoutId: { in: hangoutIds }
        }
      })
      
      await prisma.hangout_details.deleteMany({
        where: {
          contentId: { in: hangoutIds }
        }
      })
      
      await prisma.content_participants.deleteMany({
        where: {
          contentId: { in: hangoutIds }
        }
      })
      
      // Finally delete the hangouts
      await prisma.content.deleteMany({
        where: {
          id: { in: hangoutIds }
        }
      })
      
      console.log(`✅ Deleted ${deleteHangouts.length} old hangouts`)
    }
    
    // Also delete all test hangouts by other users
    const testHangouts = await prisma.content.findMany({
      where: {
        creatorId: { not: 'cmfq75h2v0000jpf08u3kfi6b' },
        type: 'HANGOUT'
      }
    })
    
    if (testHangouts.length > 0) {
      console.log(`🗑️ Deleting ${testHangouts.length} test hangouts by other users`)
      
      const testHangoutIds = testHangouts.map(h => h.id)
      
      // Delete related data
      await prisma.pollVote.deleteMany({
        where: {
          poll: {
            hangoutId: { in: testHangoutIds }
          }
        }
      })
      
      await prisma.pollOption.deleteMany({
        where: {
          poll: {
            hangoutId: { in: testHangoutIds }
          }
        }
      })
      
      await prisma.pollParticipant.deleteMany({
        where: {
          poll: {
            hangoutId: { in: testHangoutIds }
          }
        }
      })
      
      await prisma.polls.deleteMany({
        where: {
          hangoutId: { in: testHangoutIds }
        }
      })
      
      await prisma.photos.deleteMany({
        where: {
          hangoutId: { in: testHangoutIds }
        }
      })
      
      await prisma.hangout_details.deleteMany({
        where: {
          contentId: { in: testHangoutIds }
        }
      })
      
      await prisma.content_participants.deleteMany({
        where: {
          contentId: { in: testHangoutIds }
        }
      })
      
      await prisma.content.deleteMany({
        where: {
          id: { in: testHangoutIds }
        }
      })
      
      console.log(`✅ Deleted ${testHangouts.length} test hangouts`)
    }
    
    // Verify final state
    const finalHangouts = await prisma.content.findMany({
      where: { type: 'HANGOUT' },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`\n📊 Final state: ${finalHangouts.length} hangouts remaining`)
    finalHangouts.forEach((h, i) => {
      console.log(`   ${i + 1}. ${h.title} by ${h.creatorId} (${h.createdAt.toISOString()})`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupHangouts()



























