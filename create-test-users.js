const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const db = new PrismaClient()

async function createTestUsers() {
  try {
    console.log('Creating 10 test users...')
    
    const users = [
      { name: 'Alice Johnson', username: 'alice', email: 'alice@example.com' },
      { name: 'Bob Smith', username: 'bob', email: 'bob@example.com' },
      { name: 'Charlie Brown', username: 'charlie', email: 'charlie@example.com' },
      { name: 'Diana Prince', username: 'diana', email: 'diana@example.com' },
      { name: 'Eve Wilson', username: 'eve', email: 'eve@example.com' },
      { name: 'Frank Miller', username: 'frank', email: 'frank@example.com' },
      { name: 'Grace Lee', username: 'grace', email: 'grace@example.com' },
      { name: 'Henry Davis', username: 'henry', email: 'henry@example.com' },
      { name: 'Ivy Chen', username: 'ivy', email: 'ivy@example.com' },
      { name: 'Jack Wilson', username: 'jack', email: 'jack@example.com' }
    ]

    const password = 'Password1!'
    const hashedPassword = await bcrypt.hash(password, 10)

    for (const userData of users) {
      const user = await db.user.upsert({
        where: { email: userData.email },
        update: {
          password: hashedPassword
        },
        create: {
          name: userData.name,
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          isActive: true,
          isVerified: true
        }
      })
      console.log(`Created/Updated user: ${user.name} (${user.username}) - ID: ${user.id}`)
    }

    console.log('\nAll users created successfully!')
    console.log('Password for all users: Password1!')
    
  } catch (error) {
    console.error('Error creating users:', error)
  } finally {
    await db.$disconnect()
  }
}

createTestUsers()
