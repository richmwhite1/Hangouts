const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

console.log('🚀 Starting production server...')
console.log('Environment:', process.env.NODE_ENV)
console.log('Hostname:', hostname)
console.log('Port:', port)
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  console.log('✅ Next.js app prepared successfully')
  
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

  server.once('error', (err) => {
    console.error('❌ Server error:', err)
    process.exit(1)
  })

  server.listen(port, hostname, () => {
    console.log(`✅ Ready on http://${hostname}:${port}`)
    console.log(`✅ Environment: ${process.env.NODE_ENV}`)
    console.log(`✅ Production server started successfully`)
  })
}).catch((err) => {
  console.error('❌ Failed to prepare Next.js app:', err)
  process.exit(1)
})
