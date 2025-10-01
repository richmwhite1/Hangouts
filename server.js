const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const WebSocketServer = require('./src/lib/websocket.js')
// const { ReminderProcessor } = require('./src/lib/services/reminder-processor.ts')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

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

  // Initialize WebSocket server
  const wsServer = new WebSocketServer(server)

  server.once('error', (err) => {
    console.error(err)
    process.exit(1)
  })

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket server initialized`)
    
          // Start reminder processor
          // try {
          //   ReminderProcessor.start(60000) // Check every minute
          //   console.log(`> Reminder processor started`)
          // } catch (error) {
          //   console.error('Failed to start reminder processor:', error)
          // }
  })
})