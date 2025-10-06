#!/usr/bin/env node

// Set default DATABASE_URL if not provided
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db'
  console.log('🔧 Set default DATABASE_URL:', process.env.DATABASE_URL)
}

console.log('🚀 Starting production server...')
console.log('Environment:', process.env.NODE_ENV)
console.log('Port:', process.env.PORT)
console.log('Database URL:', process.env.DATABASE_URL)

// Import and start Next.js
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = false
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  server.listen(port, hostname, () => {
    console.log(`✅ Ready on http://${hostname}:${port}`)
  })
}).catch((err) => {
  console.error('❌ Failed to start server:', err)
  process.exit(1)
})