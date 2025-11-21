/**
 * Debug script to check why home feed isn't showing hangouts
 */

const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function debugHomeFeed() {
  console.log('🔍 Debugging Home Feed Issue\n')
  
  try {
    // Check total hangouts/events in database
    const totalContent = await db.content.findMany({
      select: {
        id: true,
        type: true,
        title: true,
        creatorId: true,
        privacyLevel: true,
        status: true
      }
    })
    
    console.log(`📊 Total content in database: ${totalContent.length}`)
    console.log(`   - Hangouts: ${totalContent.filter(c => c.type === 'HANGOUT').length}`)
    console.log(`   - Events: ${totalContent.filter(c => c.type === 'EVENT').length}`)
    console.log(`   - Published: ${totalContent.filter(c => c.status === 'PUBLISHED').length}`)
    console.log(`   - Draft: ${totalContent.filter(c => c.status === 'DRAFT').length}\n`)
    
    // Check users
    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        clerkId: true
      }
    })
    
    console.log(`👥 Total users in database: ${users.length}`)
    users.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.username} (${user.email}) - clerkId: ${user.clerkId}`)
    })
    console.log('')
    
    // For each user, check what they should see on their home feed
    for (const user of users) {
      console.log(`\n🏠 Home feed for ${user.username} (${user.id}):`)
      
      // Query using the same logic as the API
      const userContent = await db.content.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            // User's own content
            { creatorId: user.id },
            // Content where user is a participant
            {
              content_participants: {
                some: { userId: user.id }
              }
            },
            // Content where user has RSVPed
            {
              rsvps: {
                some: { 
                  userId: user.id,
                  status: { in: ['YES', 'MAYBE', 'NO'] }
                }
              }
            }
          ]
        },
        select: {
          id: true,
          type: true,
          title: true,
          creatorId: true,
          privacyLevel: true
        }
      })
      
      console.log(`   Should see ${userContent.length} items:`)
      userContent.forEach(item => {
        const isCreator = item.creatorId === user.id
        console.log(`   - ${item.type}: "${item.title}" ${isCreator ? '(created by them)' : '(invited/RSVPed)'}`)
      })
      
      if (userContent.length === 0) {
        console.log('   ⚠️  No content visible to this user!')
      }
    }
    
    // Check for content_participants
    const participants = await db.content_participants.findMany({
      select: {
        contentId: true,
        userId: true,
        role: true
      }
    })
    
    console.log(`\n📋 Content participants: ${participants.length}`)
    if (participants.length > 0) {
      participants.forEach(p => {
        console.log(`   - User ${p.userId} is ${p.role} for content ${p.contentId}`)
      })
    }
    
    // Check for RSVPs
    const rsvps = await db.rsvp.findMany({
      select: {
        contentId: true,
        userId: true,
        status: true
      }
    })
    
    console.log(`\n✋ RSVPs: ${rsvps.length}`)
    if (rsvps.length > 0) {
      rsvps.forEach(r => {
        console.log(`   - User ${r.userId} RSVP'd ${r.status} for content ${r.contentId}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await db.$disconnect()
  }
}

debugHomeFeed()













