// Backfill script: mark sample content as public
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const limit = parseInt(process.env.LIMIT || '50', 10)
  const makeAll = process.env.MAKE_ALL === 'true'

  console.log('Backfilling isPublic for content...')

  // Select recent published content without isPublic
  const items = await prisma.content.findMany({
    where: { status: 'PUBLISHED', isPublic: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, title: true, type: true }
  })

  if (items.length === 0) {
    console.log('No unpublished public items found.')
    return
  }

  console.log(`Marking ${items.length} items as public...`)

  for (const item of items) {
    await prisma.content.update({ where: { id: item.id }, data: { isPublic: true, privacyLevel: 'PUBLIC' } })
  }

  if (makeAll) {
    console.log('MAKE_ALL enabled: ensuring all PUBLISHED content is marked public')
    await prisma.content.updateMany({ where: { status: 'PUBLISHED' }, data: { isPublic: true } })
  }

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})



