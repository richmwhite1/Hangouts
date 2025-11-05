#!/usr/bin/env node

/**
 * Test Production API Endpoints
 * 
 * Tests the production API to verify data is loading correctly
 * Usage: node test-production-api.js <production-url>
 * Example: node test-production-api.js https://your-app.railway.app
 */

const https = require('https')
const http = require('http')

const productionUrl = process.argv[2] || 'https://hangouts.up.railway.app'

console.log('🧪 Testing Production API')
console.log('  URL:', productionUrl)
console.log('')

async function testEndpoint(path, description) {
  return new Promise((resolve) => {
    const url = new URL(path, productionUrl)
    const protocol = url.protocol === 'https:' ? https : http
    
    console.log(`📡 Testing: ${description}`)
    console.log(`   URL: ${url.href}`)
    
    const startTime = Date.now()
    const req = protocol.get(url.href, (res) => {
      const duration = Date.now() - startTime
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          console.log(`   ✅ Status: ${res.statusCode} (${duration}ms)`)
          
          if (json.success) {
            if (json.data) {
              if (json.data.content) {
                console.log(`   📊 Content items: ${json.data.content.length}`)
                if (json.data.content.length > 0) {
                  const sample = json.data.content[0]
                  console.log(`   📋 Sample: ${sample.type} - "${sample.title}"`)
                }
              } else if (Array.isArray(json.data)) {
                console.log(`   📊 Items: ${json.data.length}`)
              } else if (json.data.id) {
                console.log(`   📊 User: ${json.data.username || json.data.name || json.data.id}`)
              }
            }
          } else {
            console.log(`   ⚠️  Error: ${json.error || json.message}`)
          }
        } catch (e) {
          console.log(`   ⚠️  Response: ${data.substring(0, 100)}`)
        }
        console.log('')
        resolve()
      })
    })
    
    req.on('error', (error) => {
      console.log(`   ❌ Error: ${error.message}`)
      console.log('')
      resolve()
    })
    
    req.setTimeout(10000, () => {
      console.log(`   ❌ Timeout after 10 seconds`)
      console.log('')
      req.destroy()
      resolve()
    })
  })
}

async function runTests() {
  console.log('🔍 Testing Production Endpoints\n')
  
  // Test health check
  await testEndpoint('/api/health', 'Health Check')
  
  // Test auth/me (should return null for unauthenticated)
  await testEndpoint('/api/auth/me', 'Current User (Unauthenticated)')
  
  // Test feed (should return public content)
  await testEndpoint('/api/feed-simple?type=discover&contentType=all', 'Public Feed')
  
  // Test hangouts
  await testEndpoint('/api/hangouts?privacy=public', 'Public Hangouts')
  
  // Test events
  await testEndpoint('/api/content?type=event&privacy=public', 'Public Events')
  
  console.log('✅ Testing complete')
  console.log('')
  console.log('📋 Summary:')
  console.log('  If all endpoints returned 200 status codes, the API is working')
  console.log('  If content items are 0, you may need to:')
  console.log('    1. Check the DATABASE_URL in Railway environment variables')
  console.log('    2. Run migrations: railway run npx prisma migrate deploy')
  console.log('    3. Seed the database with test data')
  console.log('    4. Verify the database provider in schema.prisma matches Railway (PostgreSQL)')
}

runTests()

