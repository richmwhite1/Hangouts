const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupProductionData() {
  try {
    console.log('🧹 Starting production data cleanup...');

    // First, let's identify what we need to clean up
    console.log('\n🔍 Identifying items to clean up...');

    // 1. Find the suspicious hangout that's causing the loading error
    const suspiciousHangout = await prisma.content.findUnique({
      where: { id: 'hangout_1761258508210_021443uty' },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        creatorId: true,
        createdAt: true
      }
    });

    if (suspiciousHangout) {
      console.log('🚨 Found suspicious hangout that matches the error:');
      console.log(`   ID: ${suspiciousHangout.id}`);
      console.log(`   Title: "${suspiciousHangout.title}"`);
      console.log(`   Type: ${suspiciousHangout.type}`);
      console.log(`   Status: ${suspiciousHangout.status}`);
      console.log(`   Created: ${suspiciousHangout.createdAt}`);
    }

    // 2. Find all orphaned polls
    const allPolls = await prisma.polls.findMany({
      select: {
        id: true,
        title: true,
        contentId: true
      }
    });

    const allContent = await prisma.content.findMany({
      select: { id: true }
    });

    const contentIds = new Set(allContent.map(c => c.id));
    const orphanedPolls = allPolls.filter(poll => !contentIds.has(poll.contentId));

    console.log(`\n📊 Cleanup summary:`);
    console.log(`   - Suspicious hangouts to remove: ${suspiciousHangout ? 1 : 0}`);
    console.log(`   - Orphaned polls to remove: ${orphanedPolls.length}`);

    if (!suspiciousHangout && orphanedPolls.length === 0) {
      console.log('✅ No cleanup needed - all data looks good!');
      return;
    }

    // Ask for confirmation (in production, we want to be careful)
    console.log('\n⚠️  This will permanently delete the above items from production.');
    console.log('   The suspicious hangout is likely causing the loading errors.');
    console.log('   The orphaned polls are just taking up space and causing confusion.');

    // In a script, we'll proceed automatically, but log everything
    console.log('\n🚀 Proceeding with cleanup...');

    let deletedCount = 0;

    // 3. Delete orphaned polls first (safer)
    if (orphanedPolls.length > 0) {
      console.log(`\n🗳️ Deleting ${orphanedPolls.length} orphaned polls...`);
      
      for (const poll of orphanedPolls) {
        try {
          // Delete poll votes first
          const deletedVotes = await prisma.pollVote.deleteMany({
            where: { pollId: poll.id }
          });
          
          // Delete poll participants
          const deletedParticipants = await prisma.pollParticipant.deleteMany({
            where: { pollId: poll.id }
          });
          
          // Delete the poll itself
          await prisma.polls.delete({
            where: { id: poll.id }
          });
          
          console.log(`   ✅ Deleted poll: "${poll.title}" (${poll.id})`);
          console.log(`      - Removed ${deletedVotes.count} votes`);
          console.log(`      - Removed ${deletedParticipants.count} participants`);
          deletedCount++;
        } catch (error) {
          console.error(`   ❌ Failed to delete poll ${poll.id}:`, error.message);
        }
      }
    }

    // 4. Delete the suspicious hangout and all related data
    if (suspiciousHangout) {
      console.log(`\n🎉 Deleting suspicious hangout: "${suspiciousHangout.title}"...`);
      
      try {
        const hangoutId = suspiciousHangout.id;
        
        // Delete related data in the correct order (foreign key constraints)
        
        // Delete poll votes for this hangout's polls
        const hangoutPolls = await prisma.polls.findMany({
          where: { contentId: hangoutId },
          select: { id: true }
        });
        
        for (const poll of hangoutPolls) {
          await prisma.pollVote.deleteMany({
            where: { pollId: poll.id }
          });
          await prisma.pollParticipant.deleteMany({
            where: { pollId: poll.id }
          });
        }
        
        // Delete polls
        const deletedPolls = await prisma.polls.deleteMany({
          where: { contentId: hangoutId }
        });
        
        // Delete RSVPs
        const deletedRsvps = await prisma.rsvp.deleteMany({
          where: { contentId: hangoutId }
        });
        
        // Delete participants
        const deletedParticipants = await prisma.content_participants.deleteMany({
          where: { contentId: hangoutId }
        });
        
        // Delete likes
        const deletedLikes = await prisma.content_likes.deleteMany({
          where: { contentId: hangoutId }
        });
        
        // Delete shares
        const deletedShares = await prisma.content_shares.deleteMany({
          where: { contentId: hangoutId }
        });
        
        // Delete reports
        const deletedReports = await prisma.content_reports.deleteMany({
          where: { contentId: hangoutId }
        });
        
        // Delete comments
        const deletedComments = await prisma.comments.deleteMany({
          where: { contentId: hangoutId }
        });
        
        // Delete photos
        const deletedPhotos = await prisma.photos.deleteMany({
          where: { contentId: hangoutId }
        });
        
        // Delete messages
        const deletedMessages = await prisma.messages.deleteMany({
          where: { contentId: hangoutId }
        });
        
        // Delete hangout tasks
        const deletedTasks = await prisma.hangout_tasks.deleteMany({
          where: { hangoutId: hangoutId }
        });
        
        // Delete reminders
        const deletedReminders = await prisma.reminder.deleteMany({
          where: { contentId: hangoutId }
        });
        
        // Finally, delete the hangout itself
        await prisma.content.delete({
          where: { id: hangoutId }
        });
        
        console.log(`   ✅ Successfully deleted hangout and all related data:`);
        console.log(`      - Polls: ${deletedPolls.count}`);
        console.log(`      - RSVPs: ${deletedRsvps.count}`);
        console.log(`      - Participants: ${deletedParticipants.count}`);
        console.log(`      - Likes: ${deletedLikes.count}`);
        console.log(`      - Shares: ${deletedShares.count}`);
        console.log(`      - Reports: ${deletedReports.count}`);
        console.log(`      - Comments: ${deletedComments.count}`);
        console.log(`      - Photos: ${deletedPhotos.count}`);
        console.log(`      - Messages: ${deletedMessages.count}`);
        console.log(`      - Tasks: ${deletedTasks.count}`);
        console.log(`      - Reminders: ${deletedReminders.count}`);
        
        deletedCount++;
      } catch (error) {
        console.error(`   ❌ Failed to delete hangout ${suspiciousHangout.id}:`, error.message);
      }
    }

    console.log(`\n🎉 Cleanup completed!`);
    console.log(`   Total items cleaned up: ${deletedCount + orphanedPolls.length}`);
    console.log(`   This should resolve the hangout loading errors.`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  cleanupProductionData()
    .then(() => {
      console.log('\n✅ Production cleanup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Production cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupProductionData };
