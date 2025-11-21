/**
 * Backfill script to populate lastActivityAt for existing hangouts
 * 
 * This script:
 * 1. Finds all hangouts (content with type = 'HANGOUT')
 * 2. For each hangout, finds the most recent activity:
 *    - Latest photo createdAt
 *    - Latest comment createdAt
 *    - Hangout createdAt (fallback)
 * 3. Updates lastActivityAt with the most recent timestamp
 * 
 * Run with: npx tsx scripts/backfill-hangout-activity.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillHangoutActivity() {
  console.log('🔄 Starting hangout activity backfill...')

  try {
    // Get all hangouts
    const hangouts = await prisma.content.findMany({
      where: {
        type: 'HANGOUT'
      },
      select: {
        id: true,
        createdAt: true
      }
    })

    console.log(`📊 Found ${hangouts.length} hangouts to process`)

    let updated = 0
    let skipped = 0

    for (const hangout of hangouts) {
      try {
        // Find most recent photo
        const latestPhoto = await prisma.photos.findFirst({
          where: {
            contentId: hangout.id
          },
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            createdAt: true
          }
        })

        // Find most recent comment
        const latestComment = await prisma.comments.findFirst({
          where: {
            contentId: hangout.id
          },
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            createdAt: true
          }
        })

        // Determine most recent activity
        const dates = [
          latestPhoto?.createdAt,
          latestComment?.createdAt,
          hangout.createdAt
        ].filter(Boolean) as Date[]

        if (dates.length === 0) {
          console.log(`⚠️  No dates found for hangout ${hangout.id}, skipping`)
          skipped++
          continue
        }

        const mostRecentActivity = new Date(Math.max(...dates.map(d => d.getTime())))

        // Update hangout
        await prisma.content.update({
          where: { id: hangout.id },
          data: {
            lastActivityAt: mostRecentActivity
          }
        })

        updated++
        if (updated % 100 === 0) {
          console.log(`✅ Processed ${updated} hangouts...`)
        }
      } catch (error) {
        console.error(`❌ Error processing hangout ${hangout.id}:`, error)
        skipped++
      }
    }

    console.log(`\n✨ Backfill complete!`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Total: ${hangouts.length}`)
  } catch (error) {
    console.error('❌ Fatal error during backfill:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the backfill
backfillHangoutActivity()
  .then(() => {
    console.log('✅ Backfill script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Backfill script failed:', error)
    process.exit(1)
  })


