const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkAllHangouts() {
  try {
    console.log('🔍 Checking ALL hangouts in database...')
    
    // Get all hangouts with full details
    const hangouts = await prisma.content.findMany({
      where: { type: 'HANGOUT' },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        },
        hangout_details: true,
        photos: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📊 Found ${hangouts.length} hangouts in database`)
    
    hangouts.forEach((hangout, index) => {
      console.log(`\n${index + 1}. Hangout: ${hangout.title}`)
      console.log(`   ID: ${hangout.id}`)
      console.log(`   Creator: ${hangout.creatorId}`)
      console.log(`   Creator Name: ${hangout.users?.name || 'Unknown'}`)
      console.log(`   Description: ${hangout.description}`)
      console.log(`   Image: ${hangout.image}`)
      console.log(`   Location: ${hangout.location}`)
      console.log(`   Start Time: ${hangout.startTime}`)
      console.log(`   Privacy: ${hangout.privacyLevel}`)
      console.log(`   Created: ${hangout.createdAt}`)
      console.log(`   Photos: ${hangout.photos?.length || 0}`)
      if (hangout.photos && hangout.photos.length > 0) {
        console.log(`   Latest Photo: ${hangout.photos[0].originalUrl}`)
      }
    })
    
    // Check specific user's hangouts
    const billUserId = 'cmfq75h2v0000jpf08u3kfi6b'
    console.log(`\n🔍 Checking hangouts created by user: ${billUserId}`)
    
    const billHangouts = hangouts.filter(h => h.creatorId === billUserId)
    console.log(`📊 Found ${billHangouts.length} hangouts created by Bill`)
    
    billHangouts.forEach((hangout, index) => {
      console.log(`\n${index + 1}. Bill's Hangout: ${hangout.title}`)
      console.log(`   ID: ${hangout.id}`)
      console.log(`   Image: ${hangout.image}`)
      console.log(`   Created: ${hangout.createdAt}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAllHangouts()






















