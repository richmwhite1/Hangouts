#!/usr/bin/env node

/**
 * Generate VAPID keys for Web Push notifications
 * Run this script to generate VAPID keys for your PWA
 */

const webpush = require('web-push')

function generateVapidKeys() {
  console.log('🔑 Generating VAPID keys for Web Push notifications...\n')
  
  try {
    const vapidKeys = webpush.generateVAPIDKeys()
    
    console.log('✅ VAPID keys generated successfully!\n')
    console.log('📋 Add these to your environment variables:\n')
    console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + vapidKeys.publicKey)
    console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey)
    console.log('VAPID_SUBJECT=mailto:your-email@example.com\n')
    
    console.log('📝 For Railway deployment, add these to your environment variables:')
    console.log('1. Go to your Railway project dashboard')
    console.log('2. Navigate to Variables tab')
    console.log('3. Add the three variables above\n')
    
    console.log('📝 For local development, add these to your .env.local file:')
    console.log('1. Create .env.local in your project root')
    console.log('2. Add the three variables above\n')
    
    console.log('⚠️  Important:')
    console.log('- Keep VAPID_PRIVATE_KEY secret (server-side only)')
    console.log('- NEXT_PUBLIC_VAPID_PUBLIC_KEY is safe to expose (client-side)')
    console.log('- VAPID_SUBJECT should be a mailto: URL with your contact email')
    console.log('- These keys are tied to your domain, don\'t share them\n')
    
    console.log('🚀 Next steps:')
    console.log('1. Add the environment variables')
    console.log('2. Run database migration for PushSubscription model')
    console.log('3. Test push notifications in development')
    console.log('4. Deploy to production\n')
    
  } catch (error) {
    console.error('❌ Error generating VAPID keys:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  generateVapidKeys()
}

module.exports = { generateVapidKeys }
