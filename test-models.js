const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testModels() {
  try {
    console.log('🧪 Testing Prisma models...')
    
    // Test finalPlan model
    console.log('Testing finalPlan model...')
    const finalPlan = await prisma.finalPlan.findFirst()
    console.log('✅ finalPlan model works')
    
    // Test rsvp model
    console.log('Testing rsvp model...')
    const rsvp = await prisma.rsvp.findFirst()
    console.log('✅ rsvp model works')
    
    // Test creating a finalPlan
    console.log('Testing finalPlan creation...')
    const testFinalPlan = await prisma.finalPlan.create({
      data: {
        hangoutId: 'hangout_details_1758585614387_6lc5frs92',
        pollId: 'test-poll-id',
        title: 'Test Plan',
        description: 'Test Description',
        optionId: 'test-option-id',
        optionText: 'Test Option',
        optionDescription: 'Test Option Description',
        metadata: {},
        consensusLevel: 50.0,
        totalVotes: 2,
        finalizedBy: 'cmfq75h2v0000jpf08u3kfi6b'
      }
    })
    console.log('✅ finalPlan creation works:', testFinalPlan.id)
    
    // Clean up
    await prisma.finalPlan.delete({ where: { id: testFinalPlan.id } })
    console.log('✅ Cleanup successful')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testModels()





