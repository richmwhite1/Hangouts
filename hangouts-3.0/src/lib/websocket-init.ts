import { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import wsManager from './websocket-server'

import { logger } from '@/lib/logger'
declare global {
  var io: SocketIOServer | undefined
  var httpServer: NetServer | undefined
}

export function initializeWebSocket() {
  if (typeof window === 'undefined' && !global.io) {
    // This runs on the server side
    const httpServer = global.httpServer as NetServer
    if (httpServer) {
      const io = new SocketIOServer(httpServer, {
        path: '/api/socket',
        cors: {
          origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
          methods: ["GET", "POST"],
          credentials: true
        }
      })
      
      global.io = io
      wsManager.initialize(httpServer)
      // console.log('WebSocket server initialized'); // Removed for production
    }
  }
}
































