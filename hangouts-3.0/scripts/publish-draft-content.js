require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set. Please configure it in .env.local before running this script.')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  try {
    const result = await prisma.content.updateMany({
      where: {
        status: { not: 'PUBLISHED' },
        type: { in: ['HANGOUT', 'EVENT'] }
      },
      data: {
        status: 'PUBLISHED'
      }
    })

    console.log(`✅ Updated ${result.count} content records to PUBLISHED status.`)
  } catch (error) {
    console.error('❌ Error updating content statuses:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
