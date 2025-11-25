const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteProblematicHangout() {
  try {
    console.log('🎯 Targeting problematic hangout for deletion...');
    
    const hangoutId = 'hangout_1761258508210_021443uty';
    
    // Check if it exists first
    const hangout = await prisma.$queryRaw`
      SELECT id, title, type, status, "creatorId", "createdAt" 
      FROM content 
      WHERE id = ${hangoutId}
    `;
    
    if (hangout.length === 0) {
      console.log('✅ Hangout not found - it may have already been deleted.');
      return;
    }
    
    console.log('🚨 Found problematic hangout:');
    console.log(`   ID: ${hangout[0].id}`);
    console.log(`   Title: "${hangout[0].title}"`);
    console.log(`   Type: ${hangout[0].type}`);
    console.log(`   Status: ${hangout[0].status}`);
    
    console.log('\n🧹 Deleting related data first...');
    
    // Delete in the correct order to respect foreign key constraints
    // Using raw SQL to avoid Prisma schema issues
    
    // 1. Delete poll votes for this hangout's polls
    const pollIds = await prisma.$queryRaw`
      SELECT id FROM polls WHERE "contentId" = ${hangoutId}
    `;
    
    for (const poll of pollIds) {
      await prisma.$executeRaw`DELETE FROM poll_votes WHERE "pollId" = ${poll.id}`;
      await prisma.$executeRaw`DELETE FROM poll_participants WHERE "pollId" = ${poll.id}`;
    }
    
    // 2. Delete polls
    const deletedPolls = await prisma.$executeRaw`
      DELETE FROM polls WHERE "contentId" = ${hangoutId}
    `;
    console.log(`   - Deleted ${deletedPolls} polls`);
    
    // 3. Delete RSVPs
    const deletedRsvps = await prisma.$executeRaw`
      DELETE FROM rsvps WHERE "contentId" = ${hangoutId}
    `;
    console.log(`   - Deleted ${deletedRsvps} RSVPs`);
    
    // 4. Delete participants
    const deletedParticipants = await prisma.$executeRaw`
      DELETE FROM content_participants WHERE "contentId" = ${hangoutId}
    `;
    console.log(`   - Deleted ${deletedParticipants} participants`);
    
    // 5. Delete likes
    const deletedLikes = await prisma.$executeRaw`
      DELETE FROM content_likes WHERE "contentId" = ${hangoutId}
    `;
    console.log(`   - Deleted ${deletedLikes} likes`);
    
    // 6. Delete shares
    const deletedShares = await prisma.$executeRaw`
      DELETE FROM content_shares WHERE "contentId" = ${hangoutId}
    `;
    console.log(`   - Deleted ${deletedShares} shares`);
    
    // 7. Delete reports
    const deletedReports = await prisma.$executeRaw`
      DELETE FROM content_reports WHERE "contentId" = ${hangoutId}
    `;
    console.log(`   - Deleted ${deletedReports} reports`);
    
    // 8. Delete comments
    const deletedComments = await prisma.$executeRaw`
      DELETE FROM comments WHERE "contentId" = ${hangoutId}
    `;
    console.log(`   - Deleted ${deletedComments} comments`);
    
    // 9. Delete photos
    const deletedPhotos = await prisma.$executeRaw`
      DELETE FROM photos WHERE "contentId" = ${hangoutId}
    `;
    console.log(`   - Deleted ${deletedPhotos} photos`);
    
    // 10. Delete messages
    const deletedMessages = await prisma.$executeRaw`
      DELETE FROM messages WHERE "contentId" = ${hangoutId}
    `;
    console.log(`   - Deleted ${deletedMessages} messages`);
    
    // 11. Delete hangout tasks and assignments
    const taskIds = await prisma.$queryRaw`
      SELECT id FROM hangout_tasks WHERE "hangoutId" = ${hangoutId}
    `;
    
    for (const task of taskIds) {
      await prisma.$executeRaw`DELETE FROM hangout_task_assignments WHERE "taskId" = ${task.id}`;
    }
    
    const deletedTasks = await prisma.$executeRaw`
      DELETE FROM hangout_tasks WHERE "hangoutId" = ${hangoutId}
    `;
    console.log(`   - Deleted ${deletedTasks} tasks`);
    
    // 12. Delete reminders
    const deletedReminders = await prisma.$executeRaw`
      DELETE FROM reminders WHERE "contentId" = ${hangoutId}
    `;
    console.log(`   - Deleted ${deletedReminders} reminders`);
    
    // 13. Finally, delete the hangout itself
    console.log('\n🎯 Deleting the hangout...');
    const deletedHangout = await prisma.$executeRaw`
      DELETE FROM content WHERE id = ${hangoutId}
    `;
    
    if (deletedHangout > 0) {
      console.log('✅ Successfully deleted the problematic hangout!');
      console.log('   This should resolve the loading errors you were experiencing.');
    } else {
      console.log('❌ Failed to delete the hangout - it may not exist.');
    }
    
  } catch (error) {
    console.error('❌ Error deleting hangout:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  deleteProblematicHangout()
    .then(() => {
      console.log('\n🎉 Hangout deletion completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Hangout deletion failed:', error);
      process.exit(1);
    });
}

module.exports = { deleteProblematicHangout };
