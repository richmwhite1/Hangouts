const { PrismaClient } = require('@prisma/client')

async function testDbModels() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Available Prisma models:')
    console.log(Object.keys(prisma))
    
    // Check if event is available
    if (prisma.event) {
      console.log('✅ Event model is available')
      const count = await prisma.event.count()
      console.log('📊 Event count:', count)
    } else {
      console.log('❌ Event model is NOT available')
    }
    
    // Check if events is available (plural)
    if (prisma.events) {
      console.log('✅ Events model is available')
    } else {
      console.log('❌ Events model is NOT available')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testDbModels()






