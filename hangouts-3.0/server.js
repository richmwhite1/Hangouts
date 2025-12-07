const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const { Server } = require('socket.io');

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
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      console.log(`📥 ${req.method} ${req.url}`);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('❌ Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || process.env.RAILWAY_PUBLIC_DOMAIN || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    // Remove custom path to use default /socket.io
    transports: ['polling', 'websocket'],
    allowEIO3: true
  });

  // WebSocket event handlers
  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    // Authentication
    socket.on('authenticate', (data) => {
      try {
        // For now, accept authentication and validate later
        socket.userId = data.userId;
        console.log('✅ User authenticated:', data.userId);
      } catch (error) {
        console.error('❌ Authentication error:', error);
        socket.disconnect();
      }
    });

    // Join hangout room
    socket.on('join-hangout', (hangoutId) => {
      socket.join(`hangout:${hangoutId}`);
      console.log(`👥 User ${socket.userId} joined hangout ${hangoutId}`);
    });

    // Leave hangout room
    socket.on('leave-hangout', (hangoutId) => {
      socket.leave(`hangout:${hangoutId}`);
      console.log(`👋 User ${socket.userId} left hangout ${hangoutId}`);
    });

    // Send message to hangout
    socket.on('send-message', (data) => {
      const { hangoutId, message } = data;
      socket.to(`hangout:${hangoutId}`).emit('message-received', {
        messageId: `msg_${Date.now()}`,
        content: message,
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });
      console.log(`💬 Message sent to hangout ${hangoutId} by ${socket.userId}`);
    });

    // Typing indicators
    socket.on('typing:start', (data) => {
      socket.to(`hangout:${data.hangoutId}`).emit('typing:start', {
        userId: socket.userId,
        hangoutId: data.hangoutId
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(`hangout:${data.hangoutId}`).emit('typing:stop', {
        userId: socket.userId,
        hangoutId: data.hangoutId
      });
    });

    // Join user's notification room
    socket.on('join-notifications', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`🔔 User ${userId} joined their notification room`);
    });

    // Leave user's notification room
    socket.on('leave-notifications', (userId) => {
      socket.leave(`user:${userId}`);
      console.log(`🔕 User ${userId} left their notification room`);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });

  // Export io instance so other modules can emit notifications
  global.io = io;

  httpServer
    .once('error', (err) => {
      console.error('❌ Server error:', err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log(`✅ Server ready on http://${hostname}:${port}`);
      console.log(`🔌 WebSocket server ready on ws://${hostname}:${port}/api/socket`);
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
