const { PrismaClient } = require('@prisma/client')
const { clerkClient } = require('@clerk/clerk-sdk-node')

// Initialize Prisma with production DATABASE_URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function diagnoseAndFix() {
  console.log('\n🔍 Starting Production Diagnosis...\n')
  
  try {
    // Step 1: Test database connection
    console.log('1️⃣  Testing database connection...')
    await prisma.$queryRaw`SELECT 1`
    console.log('   ✅ Database connection successful\n')
    
    // Step 2: Check if User table exists and has required fields
    console.log('2️⃣  Checking User table schema...')
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'User'
      ORDER BY ordinal_position
    `
    console.log(`   ✅ User table has ${tableInfo.length} columns`)
    
    const requiredFields = ['clerkId', 'email', 'username', 'name', 'avatar']
    const missingFields = requiredFields.filter(field => 
      !tableInfo.some(col => col.column_name === field)
    )
    
    if (missingFields.length > 0) {
      console.log(`   ⚠️  Missing required fields: ${missingFields.join(', ')}`)
    } else {
      console.log('   ✅ All required fields present\n')
    }
    
    // Step 3: Check current users in database
    console.log('3️⃣  Checking existing users in database...')
    const dbUsers = await prisma.user.findMany({
      select: {
        id: true,
        clerkId: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        isActive: true
      }
    })
    console.log(`   📊 Found ${dbUsers.length} users in database`)
    const usersWithClerkId = dbUsers.filter(u => u.clerkId)
    console.log(`   📊 ${usersWithClerkId.length} have Clerk IDs\n`)
    
    // Step 4: Fetch Clerk users
    console.log('4️⃣  Fetching users from Clerk...')
    const clerkUsers = await clerkClient.users.getUserList({ limit: 100 })
    console.log(`   📊 Found ${clerkUsers.data.length} users in Clerk\n`)
    
    // Step 5: Sync users
    console.log('5️⃣  Syncing Clerk users to database...\n')
    
    let createdCount = 0
    let updatedCount = 0
    let errorCount = 0
    
    for (const clerkUser of clerkUsers.data) {
      try {
        const email = clerkUser.emailAddresses[0]?.emailAddress
        const firstName = clerkUser.firstName || ''
        const lastName = clerkUser.lastName || ''
        const fullName = `${firstName} ${lastName}`.trim() || email?.split('@')[0] || 'User'
        const username = clerkUser.username || email?.split('@')[0] || `user${Date.now()}`
        
        console.log(`   Processing: ${email} (${clerkUser.id})`)
        
        // Check if user exists by clerkId
        let dbUser = await prisma.user.findUnique({
          where: { clerkId: clerkUser.id }
        })
        
        // If not found by clerkId, check by email
        if (!dbUser && email) {
          dbUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
          })
        }
        
        if (dbUser) {
          // Update existing user
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              clerkId: clerkUser.id,
              name: fullName,
              avatar: clerkUser.imageUrl,
              isVerified: clerkUser.emailAddresses?.[0]?.verification?.status === 'verified' || false,
              isActive: true
            }
          })
          console.log(`     ✅ Updated (DB ID: ${dbUser.id})`)
          updatedCount++
        } else {
          // Create new user - ensure unique username
          let uniqueUsername = username
          let counter = 1
          while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
            uniqueUsername = `${username}${counter}`
            counter++
          }
          
          dbUser = await prisma.user.create({
            data: {
              clerkId: clerkUser.id,
              email: email.toLowerCase(),
              username: uniqueUsername,
              name: fullName,
              avatar: clerkUser.imageUrl,
              isVerified: clerkUser.emailAddresses?.[0]?.verification?.status === 'verified' || false,
              isActive: true,
              role: 'USER',
              password: null // Clerk users don't need passwords
            }
          })
          console.log(`     ✨ Created (DB ID: ${dbUser.id}, Username: ${uniqueUsername})`)
          createdCount++
        }
      } catch (error) {
        console.error(`     ❌ Error processing ${clerkUser.emailAddresses[0]?.emailAddress}:`, error.message)
        errorCount++
      }
    }
    
    // Step 6: Summary
    console.log(`\n📊 Sync Summary:`)
    console.log(`   Total Clerk users: ${clerkUsers.data.length}`)
    console.log(`   Created: ${createdCount}`)
    console.log(`   Updated: ${updatedCount}`)
    console.log(`   Errors: ${errorCount}`)
    
    // Step 7: Verify all users have clerkIds
    console.log('\n6️⃣  Verification...')
    const finalUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        clerkId: true,
        email: true,
        username: true,
        name: true,
        avatar: true
      }
    })
    
    const usersWithoutClerkId = finalUsers.filter(u => !u.clerkId)
    if (usersWithoutClerkId.length > 0) {
      console.log(`   ⚠️  ${usersWithoutClerkId.length} users without Clerk IDs:`)
      usersWithoutClerkId.forEach(u => {
        console.log(`      - ${u.email} (${u.username})`)
      })
    } else {
      console.log(`   ✅ All ${finalUsers.length} active users have Clerk IDs`)
    }
    
    console.log('\n✅ Diagnosis and sync complete!\n')
    
  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error)
    console.error('Full error:', error.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run it
diagnoseAndFix()

