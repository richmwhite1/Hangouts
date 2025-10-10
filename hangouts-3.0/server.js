const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // CRITICAL: Must bind to 0.0.0.0 for Railway
const port = parseInt(process.env.PORT || '8080', 10);

console.log('🔍 Current directory:', __dirname);
console.log('🔍 Process CWD:', process.cwd());
console.log('🔍 Node version:', process.version);
console.log('🔍 Environment:', process.env.NODE_ENV);
console.log('🔍 Port:', process.env.PORT);
console.log('🔍 Hostname:', hostname);

const fs = require('fs');
const appPath = path.join(__dirname, 'app');
console.log('🔍 App directory exists:', fs.existsSync(appPath));
console.log('🔍 App contents:', fs.existsSync(appPath) ? fs.readdirSync(appPath) : 'N/A');

console.log('🚀 Starting server...');

const app = next({ 
  dev, 
  hostname, 
  port,
  dir: __dirname
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      console.log(`📥 ${req.method} ${req.url}`);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('❌ Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error('❌ Server error:', err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log(`✅ Server ready on http://${hostname}:${port}`);
      console.log(`🏥 Health check: http://${hostname}:${port}/api/health`);
    });
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
