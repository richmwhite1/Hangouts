require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set. Please configure it in .env.local before running this script.')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Finding broken/incomplete content records...')

    // Find content with missing required fields using raw SQL
    const brokenContent = await prisma.$queryRaw`
      SELECT id, type, title, "startTime", "endTime", "creatorId", status
      FROM content
      WHERE title IS NULL OR title = ''
         OR "startTime" IS NULL
         OR "endTime" IS NULL
         OR "creatorId" IS NULL OR "creatorId" = ''
    `

    // Find orphaned content (creator doesn't exist)
    const allUsers = await prisma.user.findMany({
      select: { id: true }
    })
    const userIds = allUsers.map(user => user.id)

    const orphanedContent = await prisma.content.findMany({
      where: {
        creatorId: {
          notIn: userIds
        }
      },
      select: {
        id: true,
        type: true,
        title: true,
        creatorId: true,
        status: true
      }
    })

    console.log(`\n📊 Found ${brokenContent.length} records with missing required fields:`)
    brokenContent.forEach(record => {
      console.log(`- ${record.type} ${record.id}: "${record.title}" (missing: ${record.title === null || record.title === '' ? 'title ' : ''}${record.startTime === null ? 'startTime ' : ''}${record.endTime === null ? 'endTime ' : ''}${record.creatorId === null || record.creatorId === '' ? 'creatorId' : ''})`)
    })

    console.log(`\n📊 Found ${orphanedContent.length} orphaned records (creator no longer exists):`)
    orphanedContent.forEach(record => {
      console.log(`- ${record.type} ${record.id}: "${record.title}" (creator: ${record.creatorId})`)
    })

    const totalBroken = brokenContent.length + orphanedContent.length

    if (totalBroken === 0) {
      console.log('\n✅ No broken content found!')
      return
    }

    // Combine all IDs to delete
    const brokenIds = [...brokenContent, ...orphanedContent].map(record => record.id)

    console.log(`\n⚠️  Will delete ${totalBroken} broken records.`)
    console.log('IDs to delete:', brokenIds)

    // Check for REPORT_ONLY mode (works in all environments)
    if (process.env.REPORT_ONLY === 'true') {
      console.log('\n📊 REPORT_ONLY=true - showing what would be deleted but not deleting')
      return
    }

    // Ask for confirmation in production
    if (process.env.NODE_ENV === 'production') {
      console.log('\n⚠️  PRODUCTION ENVIRONMENT DETECTED')
      console.log('This will permanently delete data from production!')
      console.log('Set FORCE_DELETE=true to proceed with deletion')
      console.log('Set REPORT_ONLY=true to only show what would be deleted')

      if (process.env.FORCE_DELETE === 'true') {
        console.log('🗑️  FORCE_DELETE=true - proceeding with deletion...')
      } else if (process.env.REPORT_ONLY === 'true') {
        console.log('📊 REPORT_ONLY=true - showing what would be deleted but not deleting')
        return
      } else {
        console.log('❌ Set FORCE_DELETE=true to actually delete records')
        return
      }
    }

    // Delete the broken records
    const deleteResult = await prisma.content.deleteMany({
      where: {
        id: {
          in: brokenIds
        }
      }
    })

    console.log(`✅ Deleted ${deleteResult.count} broken content records`)

    // Also clean up related records (participants, RSVPs, etc.)
    console.log('🧹 Cleaning up related records...')

    // Delete related RSVPs
    const rsvpDelete = await prisma.rsvp.deleteMany({
      where: {
        contentId: {
          in: brokenIds
        }
      }
    })

    // Delete related participants
    const participantDelete = await prisma.content_participants.deleteMany({
      where: {
        contentId: {
          in: brokenIds
        }
      }
    })

    // Delete related event saves
    const eventSaveDelete = await prisma.eventSave.deleteMany({
      where: {
        contentId: {
          in: brokenIds
        }
      }
    })

    // Delete related comments
    const commentDelete = await prisma.comments.deleteMany({
      where: {
        contentId: {
          in: brokenIds
        }
      }
    })

    // Delete related polls and votes
    const polls = await prisma.polls.findMany({
      where: {
        contentId: {
          in: brokenIds
        }
      },
      select: { id: true }
    })

    const pollIds = polls.map(poll => poll.id)

    if (pollIds.length > 0) {
      await prisma.pollVote.deleteMany({
        where: {
          pollId: {
            in: pollIds
          }
        }
      })

      await prisma.polls.deleteMany({
        where: {
          id: {
            in: pollIds
          }
        }
      })
    }

    console.log(`🧹 Cleaned up related records:`)
    console.log(`   - ${rsvpDelete.count} RSVPs`)
    console.log(`   - ${participantDelete.count} participants`)
    console.log(`   - ${eventSaveDelete.count} event saves`)
    console.log(`   - ${commentDelete.count} comments`)
    console.log(`   - ${pollIds.length} polls and their votes`)

    console.log('\n✅ Content cleanup completed successfully!')

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
