// Check events in database
const { PrismaClient } = require('@prisma/client');

async function checkEvents() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking events in database...\n');
    
    // Get all events
    const events = await prisma.content.findMany({
      where: {
        type: 'EVENT'
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Found ${events.length} events:`);
    events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   ID: ${event.id}`);
      console.log(`   Creator: ${event.users?.name || 'Unknown'} (${event.users?.username || 'unknown'})`);
      console.log(`   Creator ID: ${event.creatorId}`);
      console.log(`   Status: ${event.status}`);
      console.log(`   Privacy: ${event.privacyLevel}`);
      console.log(`   Created: ${event.createdAt}`);
      console.log(`   Start Time: ${event.startTime}`);
      console.log('');
    });
    
    // Check if there are any recent events (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentEvents = await prisma.content.findMany({
      where: {
        type: 'EVENT',
        createdAt: {
          gte: yesterday
        }
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`\nRecent events (last 24 hours): ${recentEvents.length}`);
    recentEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title} by ${event.users?.name || 'Unknown'}`);
      console.log(`   Created: ${event.createdAt}`);
    });
    
  } catch (error) {
    console.error('Error checking events:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEvents();
