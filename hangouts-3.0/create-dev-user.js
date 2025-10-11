const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createDevUser() {
  try {
    console.log('Creating development user...')
    
    // Create a development user
    const user = await prisma.user.upsert({
      where: { email: 'dev@example.com' },
      update: {},
      create: {
        email: 'dev@example.com',
        username: 'devuser',
        name: 'Development User',
        isActive: true,
        isVerified: true,
        role: 'USER'
      }
    })
    
    console.log(`Created development user: ${user.name} (${user.username}) - ID: ${user.id}`)
    console.log('Development user can now be used for testing!')
    
  } catch (error) {
    console.error('Error creating development user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createDevUser()
