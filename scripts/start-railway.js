#!/usr/bin/env node

// Railway startup script with proper error handling
console.log('🚀 Starting Railway deployment...')

// Set production environment
process.env.NODE_ENV = 'production'

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET']
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars)
  console.error('Please set these in your Railway project settings')
  process.exit(1)
}

console.log('✅ Environment variables validated')
console.log('✅ Starting Next.js production server...')

// Start Next.js
require('next/dist/bin/next').start()






