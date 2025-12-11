/**
 * Data Migration Script: Fix Bidirectional Friendships
 * 
 * This script fixes existing friendships that only exist in one direction
 * by creating the missing reverse friendships.
 * 
 * Usage:
 *   node scripts/fix-bidirectional-friendships.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixBidirectionalFriendships(dryRun = false) {
  console.log('Starting bidirectional friendship fix...')
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be made)'}`)
  console.log('')

  try {
    // Get all friendships
    const allFriendships = await prisma.friendship.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        userId: true,
        friendId: true,
        status: true,
        createdAt: true
      }
    })

    console.log(`Found ${allFriendships.length} total friendships`)

    // Find friendships missing their reverse
    const missingReverses = []
    const processed = new Set()

    for (const friendship of allFriendships) {
      const key = `${friendship.userId}-${friendship.friendId}`
      const reverseKey = `${friendship.friendId}-${friendship.userId}`

      // Skip if we've already processed this pair
      if (processed.has(key) || processed.has(reverseKey)) {
        continue
      }

      // Check if reverse exists
      const reverseExists = allFriendships.some(
        f => f.userId === friendship.friendId && f.friendId === friendship.userId
      )

      if (!reverseExists) {
        missingReverses.push({
          userId: friendship.friendId,
          friendId: friendship.userId,
          originalCreatedAt: friendship.createdAt
        })
        console.log(`Missing reverse: ${friendship.userId} -> ${friendship.friendId}`)
      }

      processed.add(key)
    }

    console.log('')
    console.log(`Found ${missingReverses.length} friendships missing their reverse`)

    if (missingReverses.length === 0) {
      console.log('All friendships are already bidirectional!')
      return
    }

    if (dryRun) {
      console.log('')
      console.log('[DRY RUN] Would create the following reverse friendships:')
      missingReverses.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.userId} -> ${f.friendId}`)
      })
      console.log('')
      console.log('Run without --dry-run to apply changes')
      return
    }

    // Create missing reverse friendships
    console.log('')
    console.log('Creating missing reverse friendships...')

    let created = 0
    let errors = 0

    for (const reverse of missingReverses) {
      try {
        await prisma.friendship.create({
          data: {
            userId: reverse.userId,
            friendId: reverse.friendId,
            status: 'ACTIVE',
            createdAt: reverse.originalCreatedAt // Use same timestamp as original
          }
        })
        created++
        console.log(`  ✓ Created: ${reverse.userId} -> ${reverse.friendId}`)
      } catch (error) {
        if (error.code === 'P2002') {
          // Unique constraint violation - reverse already exists (race condition)
          console.log(`  ⊘ Skipped (already exists): ${reverse.userId} -> ${reverse.friendId}`)
        } else {
          errors++
          console.error(`  ✗ Error creating ${reverse.userId} -> ${reverse.friendId}:`, error.message)
        }
      }
    }

    console.log('')
    console.log('Summary:')
    console.log(`  Created: ${created}`)
    console.log(`  Errors: ${errors}`)
    console.log('')
    console.log('Bidirectional friendship fix completed!')

  } catch (error) {
    console.error('Error fixing bidirectional friendships:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

fixBidirectionalFriendships(dryRun)
  .then(() => {
    console.log('Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })















