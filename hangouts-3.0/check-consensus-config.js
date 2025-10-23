const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkConsensusConfig() {
  try {
    console.log('🔍 Checking consensus configuration...')
    
    const poll = await prisma.polls.findFirst({
      where: { id: 'poll_1758586812086_e73d4y0g7' },
      include: {
        consensusConfig: true
      }
    })
    
    if (poll) {
      console.log('📊 Poll found:', poll.title)
      console.log('🔧 Consensus Config:', poll.consensusConfig)
      
      if (poll.consensusConfig) {
        console.log('✅ Consensus config exists')
        console.log('   Min Participants:', poll.consensusConfig.minParticipants)
        console.log('   Threshold:', poll.consensusConfig.threshold)
        console.log('   Type:', poll.consensusConfig.consensusType)
      } else {
        console.log('❌ No consensus config found')
      }
    } else {
      console.log('❌ Poll not found')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkConsensusConfig()




























