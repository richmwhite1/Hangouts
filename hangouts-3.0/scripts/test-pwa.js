#!/usr/bin/env node

/**
 * PWA Testing Script
 * Tests various PWA features and functionality
 */

const fs = require('fs')
const path = require('path')

console.log('🧪 PWA Testing Script for Hangouts 3.0\n')

// Test 1: Check if manifest.json exists and is valid
function testManifest() {
  console.log('1. Testing Web App Manifest...')
  
  const manifestPath = path.join(__dirname, '../public/manifest.json')
  
  if (!fs.existsSync(manifestPath)) {
    console.log('❌ manifest.json not found')
    return false
  }
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons']
    const missingFields = requiredFields.filter(field => !manifest[field])
    
    if (missingFields.length > 0) {
      console.log(`❌ Missing required fields: ${missingFields.join(', ')}`)
      return false
    }
    
    console.log('✅ manifest.json is valid')
    console.log(`   - App name: ${manifest.name}`)
    console.log(`   - Short name: ${manifest.short_name}`)
    console.log(`   - Display mode: ${manifest.display}`)
    console.log(`   - Icons: ${manifest.icons.length} icons`)
    
    return true
  } catch (error) {
    console.log(`❌ Invalid JSON in manifest.json: ${error.message}`)
    return false
  }
}

// Test 2: Check if service worker exists
function testServiceWorker() {
  console.log('\n2. Testing Service Worker...')
  
  const swPath = path.join(__dirname, '../public/sw.js')
  
  if (!fs.existsSync(swPath)) {
    console.log('❌ sw.js not found')
    return false
  }
  
  const swContent = fs.readFileSync(swPath, 'utf8')
  
  const requiredFeatures = [
    'addEventListener',
    'install',
    'activate',
    'fetch',
    'push',
    'notificationclick'
  ]
  
  const missingFeatures = requiredFeatures.filter(feature => !swContent.includes(feature))
  
  if (missingFeatures.length > 0) {
    console.log(`❌ Missing service worker features: ${missingFeatures.join(', ')}`)
    return false
  }
  
  console.log('✅ Service worker is properly configured')
  console.log('   - Install event handler ✓')
  console.log('   - Activate event handler ✓')
  console.log('   - Fetch event handler ✓')
  console.log('   - Push event handler ✓')
  console.log('   - Notification click handler ✓')
  
  return true
}

// Test 3: Check if icons exist
function testIcons() {
  console.log('\n3. Testing App Icons...')
  
  const iconsDir = path.join(__dirname, '../public')
  const requiredIcons = [
    'icon-192x192.png',
    'icon-512x512.png'
  ]
  
  const missingIcons = requiredIcons.filter(icon => !fs.existsSync(path.join(iconsDir, icon)))
  
  if (missingIcons.length > 0) {
    console.log(`❌ Missing icons: ${missingIcons.join(', ')}`)
    return false
  }
  
  console.log('✅ All required icons are present')
  requiredIcons.forEach(icon => {
    console.log(`   - ${icon} ✓`)
  })
  
  return true
}

// Test 4: Check if PWA components exist
function testPWAComponents() {
  console.log('\n4. Testing PWA Components...')
  
  const componentsDir = path.join(__dirname, '../src/components')
  const hooksDir = path.join(__dirname, '../src/hooks')
  const libDir = path.join(__dirname, '../src/lib')
  
  const requiredFiles = [
    { path: path.join(componentsDir, 'pwa-setup.tsx'), name: 'PWA Setup Component' },
    { path: path.join(componentsDir, 'install-prompt.tsx'), name: 'Install Prompt Component' },
    { path: path.join(componentsDir, 'network-status.tsx'), name: 'Network Status Component' },
    { path: path.join(componentsDir, 'notifications/push-notification-settings.tsx'), name: 'Push Notification Settings' },
    { path: path.join(hooksDir, 'use-push-notifications.ts'), name: 'Push Notifications Hook' },
    { path: path.join(libDir, 'register-sw.ts'), name: 'Service Worker Registration' },
    { path: path.join(libDir, 'push-notifications.ts'), name: 'Push Notifications Service' }
  ]
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file.path))
  
  if (missingFiles.length > 0) {
    console.log('❌ Missing PWA components:')
    missingFiles.forEach(file => {
      console.log(`   - ${file.name}`)
    })
    return false
  }
  
  console.log('✅ All PWA components are present')
  requiredFiles.forEach(file => {
    console.log(`   - ${file.name} ✓`)
  })
  
  return true
}

// Test 5: Check if API routes exist
function testAPIRoutes() {
  console.log('\n5. Testing Push Notification API Routes...')
  
  const apiDir = path.join(__dirname, '../src/app/api/push')
  const requiredRoutes = [
    'subscribe/route.ts',
    'unsubscribe/route.ts',
    'test/route.ts'
  ]
  
  const missingRoutes = requiredRoutes.filter(route => !fs.existsSync(path.join(apiDir, route)))
  
  if (missingRoutes.length > 0) {
    console.log('❌ Missing API routes:')
    missingRoutes.forEach(route => {
      console.log(`   - /api/push/${route}`)
    })
    return false
  }
  
  console.log('✅ All push notification API routes are present')
  requiredRoutes.forEach(route => {
    console.log(`   - /api/push/${route} ✓`)
  })
  
  return true
}

// Test 6: Check if offline page exists
function testOfflinePage() {
  console.log('\n6. Testing Offline Support...')
  
  const offlinePagePath = path.join(__dirname, '../src/app/offline/page.tsx')
  
  if (!fs.existsSync(offlinePagePath)) {
    console.log('❌ Offline page not found')
    return false
  }
  
  console.log('✅ Offline page is present')
  console.log('   - /offline route ✓')
  
  return true
}

// Test 7: Check environment variables
function testEnvironmentVariables() {
  console.log('\n7. Testing Environment Variables...')
  
  const envPath = path.join(__dirname, '../.env.local')
  
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  .env.local not found - you may need to create it')
    console.log('   Required variables:')
    console.log('   - NEXT_PUBLIC_VAPID_PUBLIC_KEY')
    console.log('   - VAPID_PRIVATE_KEY')
    console.log('   - VAPID_SUBJECT')
    return false
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8')
  const requiredVars = [
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_SUBJECT'
  ]
  
  const missingVars = requiredVars.filter(varName => !envContent.includes(varName))
  
  if (missingVars.length > 0) {
    console.log(`⚠️  Missing environment variables: ${missingVars.join(', ')}`)
    return false
  }
  
  console.log('✅ Environment variables are configured')
  requiredVars.forEach(varName => {
    console.log(`   - ${varName} ✓`)
  })
  
  return true
}

// Run all tests
function runTests() {
  const tests = [
    testManifest,
    testServiceWorker,
    testIcons,
    testPWAComponents,
    testAPIRoutes,
    testOfflinePage,
    testEnvironmentVariables
  ]
  
  let passedTests = 0
  let totalTests = tests.length
  
  tests.forEach(test => {
    if (test()) {
      passedTests++
    }
  })
  
  console.log('\n📊 Test Results:')
  console.log(`✅ Passed: ${passedTests}/${totalTests}`)
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`)
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All PWA tests passed! Your app is ready for PWA deployment.')
    console.log('\n📋 Next steps:')
    console.log('1. Add environment variables to Railway')
    console.log('2. Run database migration: npx prisma migrate deploy')
    console.log('3. Deploy to production')
    console.log('4. Test push notifications in production')
    console.log('5. Run Lighthouse audit for PWA score')
  } else {
    console.log('\n⚠️  Some tests failed. Please fix the issues above before deploying.')
  }
  
  return passedTests === totalTests
}

// Run the tests
if (require.main === module) {
  runTests()
}

module.exports = { runTests }
