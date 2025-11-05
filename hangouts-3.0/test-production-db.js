#!/usr/bin/env node

/**
 * Test Production Database Connection and Data
 * 
 * This script tests the production database connection and verifies data exists
 */

const { PrismaClient } = require('@prisma/client')

// Get DATABASE_URL from environment
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set')
  process.exit(1)
}

// Determine database type
const isPostgres = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')
const isSQLite = databaseUrl.startsWith('file:') || databaseUrl.includes('.db')

console.log('🔍 Database Configuration:')
console.log('  Type:', isPostgres ? 'PostgreSQL (Production)' : isSQLite ? 'SQLite (Local)' : 'Unknown')
console.log('  URL:', databaseUrl.startsWith('postgresql') 
  ? databaseUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')
  : databaseUrl.substring(0, 50) + '...')
console.log('')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  },
  log: ['error', 'warn']
})

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connection successful\n')

    // Test query
    console.log('📊 Testing database query...')
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Database query successful\n')

    // Count users
    console.log('👥 Checking users...')
    const userCount = await prisma.user.count()
    console.log(`  Found ${userCount} users`)
    
    if (userCount > 0) {
      const sampleUsers = await prisma.user.findMany({
        take: 3,
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          clerkId: true
        }
      })
      console.log('  Sample users:', JSON.stringify(sampleUsers, null, 2))
    }
    console.log('')

    // Count content (hangouts + events)
    console.log('📅 Checking content (hangouts/events)...')
    const contentCount = await prisma.content.count()
    console.log(`  Found ${contentCount} total content items`)
    
    const hangoutCount = await prisma.content.count({ where: { type: 'HANGOUT' } })
    const eventCount = await prisma.content.count({ where: { type: 'EVENT' } })
    console.log(`  - ${hangoutCount} hangouts`)
    console.log(`  - ${eventCount} events`)
    
    if (contentCount > 0) {
      const sampleContent = await prisma.content.findMany({
        take: 3,
        select: {
          id: true,
          type: true,
          title: true,
          privacyLevel: true,
          createdAt: true,
          creatorId: true
        },
        orderBy: { createdAt: 'desc' }
      })
      console.log('  Sample content:', JSON.stringify(sampleContent, null, 2))
    }
    console.log('')

    // Count friendships
    console.log('👫 Checking friendships...')
    const friendshipCount = await prisma.friendship.count()
    console.log(`  Found ${friendshipCount} friendships`)
    console.log('')

    // Summary
    console.log('📋 Summary:')
    console.log('  ✅ Database connection: Working')
    console.log(`  ✅ Users: ${userCount}`)
    console.log(`  ✅ Hangouts: ${hangoutCount}`)
    console.log(`  ✅ Events: ${eventCount}`)
    console.log(`  ✅ Friendships: ${friendshipCount}`)
    console.log('')

    if (userCount === 0) {
      console.log('⚠️  WARNING: No users found in database!')
      console.log('   You may need to run: npm run seed:production')
    }
    if (contentCount === 0) {
      console.log('⚠️  WARNING: No content found in database!')
      console.log('   You may need to create some hangouts/events')
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message)
    if (error.code) {
      console.error('   Error code:', error.code)
    }
    if (error.meta) {
      console.error('   Meta:', error.meta)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()

