const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugContentLikes() {
  try {
    console.log('🔍 Checking content_likes table...')
    
    const likes = await prisma.content_likes.findMany({
      include: {
        content: {
          select: {
            id: true,
            title: true,
            type: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
    
    console.log('📊 Content likes found:', likes.length)
    console.log('📋 Content likes data:', JSON.stringify(likes, null, 2))
    
    console.log('\n🔍 Checking content table...')
    const content = await prisma.content.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        creatorId: true,
        _count: {
          select: {
            content_likes: true
          }
        }
      }
    })
    
    console.log('📊 Content found:', content.length)
    console.log('📋 Content data:', JSON.stringify(content, null, 2))
    
    console.log('\n🔍 Checking users table...')
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        clerkId: true
      }
    })
    
    console.log('📊 Users found:', users.length)
    console.log('📋 Users data:', JSON.stringify(users, null, 2))
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugContentLikes()
