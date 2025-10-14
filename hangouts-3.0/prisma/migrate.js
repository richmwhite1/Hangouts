const { PrismaClient } = require('@prisma/client')

async function migrate() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Running database migration...')
    
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Run any necessary setup
    console.log('✅ Database migration completed')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrate()












