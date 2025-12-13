require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set. Please configure it in .env.local before running this script.')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Finding non-published content (DRAFT, ARCHIVED, DELETED)...')

    // Count content by status
    const statusCounts = await prisma.content.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    })

    console.log('\n📊 Content status breakdown:')
    statusCounts.forEach(status => {
      console.log(`- ${status.status}: ${status._count.id} records`)
    })

    // Find all non-published content
    const nonPublishedContent = await prisma.content.findMany({
      where: {
        status: {
          in: ['DRAFT', 'ARCHIVED', 'DELETED']
        }
      },
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        creatorId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const totalNonPublished = nonPublishedContent.length

    if (totalNonPublished === 0) {
      console.log('\n✅ No non-published content found!')
      return
    }

    console.log(`\n📊 Found ${totalNonPublished} non-published records to delete:`)
    nonPublishedContent.forEach(record => {
      console.log(`- ${record.type} ${record.id}: "${record.title}" (${record.status})`)
    })

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

    const nonPublishedIds = nonPublishedContent.map(record => record.id)

    // Delete the non-published records
    const deleteResult = await prisma.content.deleteMany({
      where: {
        id: {
          in: nonPublishedIds
        }
      }
    })

    console.log(`✅ Deleted ${deleteResult.count} non-published content records`)

    // Also clean up related records (participants, RSVPs, etc.)
    console.log('🧹 Cleaning up related records...')

    // Delete related RSVPs
    const rsvpDelete = await prisma.rsvp.deleteMany({
      where: {
        contentId: {
          in: nonPublishedIds
        }
      }
    })

    // Delete related participants
    const participantDelete = await prisma.content_participants.deleteMany({
      where: {
        contentId: {
          in: nonPublishedIds
        }
      }
    })

    // Delete related event saves
    const eventSaveDelete = await prisma.eventSave.deleteMany({
      where: {
        contentId: {
          in: nonPublishedIds
        }
      }
    })

    // Delete related comments
    const commentDelete = await prisma.comments.deleteMany({
      where: {
        contentId: {
          in: nonPublishedIds
        }
      }
    })

    // Delete related polls and votes
    const polls = await prisma.polls.findMany({
      where: {
        contentId: {
          in: nonPublishedIds
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

    // Delete related photos
    const photoDelete = await prisma.photos.deleteMany({
      where: {
        contentId: {
          in: nonPublishedIds
        }
      }
    })

    console.log(`🧹 Cleaned up related records:`)
    console.log(`   - ${rsvpDelete.count} RSVPs`)
    console.log(`   - ${participantDelete.count} participants`)
    console.log(`   - ${eventSaveDelete.count} event saves`)
    console.log(`   - ${commentDelete.count} comments`)
    console.log(`   - ${pollIds.length} polls and their votes`)
    console.log(`   - ${photoDelete.count} photos`)

    console.log('\n✅ Draft content cleanup completed successfully!')

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()


