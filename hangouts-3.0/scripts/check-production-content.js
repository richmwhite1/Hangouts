const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProductionContent() {
  try {
    console.log('🔍 Checking production content (hangouts and events)...');

    // Check all content
    const allContent = await prisma.content.findMany({
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        creatorId: true,
        createdAt: true,
        status: true,
        startTime: true,
        endTime: true,
        location: true,
        image: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📄 Total content found: ${allContent.length}`);
    
    // Separate by type
    const hangouts = allContent.filter(c => c.type === 'HANGOUT');
    const events = allContent.filter(c => c.type === 'EVENT');
    
    console.log(`🎉 Hangouts: ${hangouts.length}`);
    console.log(`📅 Events: ${events.length}`);

    // Check for broken content (missing required fields)
    const brokenContent = allContent.filter(item => {
      return !item.title || 
             item.title.trim() === '' || 
             !item.creatorId || 
             !item.type ||
             !item.status;
    });
    
    if (brokenContent.length > 0) {
      console.log(`\n⚠️  Found ${brokenContent.length} potentially broken content items:`);
      brokenContent.forEach(item => {
        console.log(`   - ID: ${item.id}`);
        console.log(`     Type: ${item.type || 'NULL'}`);
        console.log(`     Title: "${item.title || 'NULL/EMPTY'}"`);
        console.log(`     Creator: ${item.creatorId || 'NULL'}`);
        console.log(`     Status: ${item.status || 'NULL'}`);
        console.log('');
      });
    } else {
      console.log('\n✅ No broken content found - all items have required fields');
    }

    // Check for content with weird IDs or malformed data
    const suspiciousContent = allContent.filter(item => {
      return item.id && (
        item.id.includes('hangout_1761258508210') || // From the error message
        item.id.length > 100 || // Unusually long IDs
        item.id.includes(' ') || // IDs with spaces
        !item.id.match(/^[a-zA-Z0-9_-]+$/) // IDs with special characters
      );
    });

    if (suspiciousContent.length > 0) {
      console.log(`\n🚨 Found ${suspiciousContent.length} content items with suspicious IDs:`);
      suspiciousContent.forEach(item => {
        console.log(`   - ID: "${item.id}"`);
        console.log(`     Type: ${item.type}`);
        console.log(`     Title: "${item.title}"`);
        console.log('');
      });
    }

    // Show recent content details
    console.log('\n📋 Recent content (last 10):');
    allContent.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. ${item.type}: "${item.title}"`);
      console.log(`   ID: ${item.id}`);
      console.log(`   Status: ${item.status}`);
      console.log(`   Creator: ${item.creatorId}`);
      console.log(`   Created: ${item.createdAt}`);
      if (item.startTime) console.log(`   Start: ${item.startTime}`);
      if (item.location) console.log(`   Location: ${item.location}`);
      console.log('');
    });

    // Check polls for content
    const polls = await prisma.polls.findMany({
      select: {
        id: true,
        title: true,
        contentId: true,
        createdAt: true
      }
    });
    console.log(`🗳️ Polls found: ${polls.length}`);

    // Check RSVPs
    const rsvps = await prisma.rsvp.findMany({
      select: {
        id: true,
        contentId: true,
        userId: true,
        status: true,
        createdAt: true
      }
    });
    console.log(`📝 RSVPs found: ${rsvps.length}`);

    // Check for orphaned polls (polls without matching content)
    const orphanedPolls = [];
    for (const poll of polls) {
      const contentExists = allContent.some(c => c.id === poll.contentId);
      if (!contentExists) {
        orphanedPolls.push(poll);
      }
    }

    if (orphanedPolls.length > 0) {
      console.log(`\n🚨 Found ${orphanedPolls.length} orphaned polls (no matching content):`);
      orphanedPolls.forEach(poll => {
        console.log(`   - Poll ID: ${poll.id}, Content ID: ${poll.contentId}, Title: "${poll.title}"`);
      });
    }

    // Check for orphaned RSVPs
    const orphanedRsvps = [];
    for (const rsvp of rsvps) {
      const contentExists = allContent.some(c => c.id === rsvp.contentId);
      if (!contentExists) {
        orphanedRsvps.push(rsvp);
      }
    }

    if (orphanedRsvps.length > 0) {
      console.log(`\n🚨 Found ${orphanedRsvps.length} orphaned RSVPs (no matching content):`);
      orphanedRsvps.forEach(rsvp => {
        console.log(`   - RSVP ID: ${rsvp.id}, Content ID: ${rsvp.contentId}, User: ${rsvp.userId}`);
      });
    }

    return {
      allContent,
      brokenContent,
      suspiciousContent,
      orphanedPolls,
      orphanedRsvps
    };

  } catch (error) {
    console.error('❌ Error checking content:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  checkProductionContent();
}

module.exports = { checkProductionContent };
