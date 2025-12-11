/**
 * Script to publish all DRAFT content to PUBLISHED status
 * This ensures all existing events and hangouts show up in discovery
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function publishAllContent() {
  try {
    console.log('🔍 Finding all DRAFT content...')
    
    const draftContent = await prisma.content.findMany({
      where: {
        status: 'DRAFT'
      },
      select: {
        id: true,
        type: true,
        title: true,
        status: true
      }
    })

    console.log(`📊 Found ${draftContent.length} items in DRAFT status`)

    if (draftContent.length === 0) {
      console.log('✅ No DRAFT content found. All content is already published!')
      return
    }

    console.log('\n📝 Publishing content:')
    draftContent.forEach(item => {
      console.log(`  - ${item.type}: ${item.title} (${item.id})`)
    })

    const result = await prisma.content.updateMany({
      where: {
        status: 'DRAFT'
      },
      data: {
        status: 'PUBLISHED'
      }
    })

    console.log(`\n✅ Successfully published ${result.count} items!`)
    console.log('🎉 All content is now visible in discovery pages')

  } catch (error) {
    console.error('❌ Error publishing content:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

publishAllContent()
  .then(() => {
    console.log('\n✨ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })
