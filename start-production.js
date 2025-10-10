#!/usr/bin/env node

// Set default DATABASE_URL if not provided
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db'
  console.log('🔧 Set default DATABASE_URL:', process.env.DATABASE_URL)
}

// Set NODE_ENV to production if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production'
}

console.log('🚀 Starting production server...')
console.log('Environment:', process.env.NODE_ENV)
console.log('Port:', process.env.PORT)
console.log('Database URL exists:', !!process.env.DATABASE_URL)

// Add process error handlers
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Use custom server to ensure API routes are available
console.log('🚀 Starting custom Next.js server...')

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = false
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

console.log('🔧 Next.js configuration:', { dev, hostname, port })

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

let isServerReady = false

app.prepare().then(() => {
  console.log('✅ Next.js app prepared successfully')
  
  const server = createServer(async (req, res) => {
    try {
      // Add CORS headers for health checks
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      
      if (req.method === 'OPTIONS') {
        res.statusCode = 200
        res.end()
        return
      }

      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  server.once('error', (err) => {
    console.error('❌ Server error:', err)
    process.exit(1)
  })

  server.listen(port, hostname, () => {
    console.log(`✅ Ready on http://${hostname}:${port}`)
    console.log(`✅ Environment: ${process.env.NODE_ENV}`)
    console.log(`✅ Production server started successfully`)
    
    // Mark server as ready after a short delay to ensure everything is loaded
    setTimeout(() => {
      isServerReady = true
      console.log('✅ Server marked as ready for health checks')
    }, 2000)
  })

  // Add graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully')
    server.close(() => {
      console.log('Process terminated')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully')
    server.close(() => {
      console.log('Process terminated')
      process.exit(0)
    })
  })

}).catch((err) => {
  console.error('❌ Failed to prepare Next.js app:', err)
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    name: err.name
  })
  process.exit(1)
})