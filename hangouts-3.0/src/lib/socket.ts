import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'

import { logger } from '@/lib/logger'
export function initializeSocket(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  })

  io.on('connection', (socket) => {
    // console.log('User connected:', socket.id); // Removed for production

    // Join hangout room
    socket.on('join-hangout', (hangoutId: string) => {
      socket.join(`hangout-${hangoutId}`)
      // // console.log(`User ${socket.id} joined hangout ${hangoutId}`); // Removed for production; // Removed for production
    })

    // Leave hangout room
    socket.on('leave-hangout', (hangoutId: string) => {
      socket.leave(`hangout-${hangoutId}`)
      // // console.log(`User ${socket.id} left hangout ${hangoutId}`); // Removed for production; // Removed for production
    })

    // Handle RSVP updates
    socket.on('rsvp-update', (data: { hangoutId: string; userId: string; status: string }) => {
      socket.to(`hangout-${data.hangoutId}`).emit('rsvp-updated', data)
    })

    // Handle new participants
    socket.on('participant-joined', (data: { hangoutId: string; participant: { id: string; user: { name: string; username: string } } }) => {
      socket.to(`hangout-${data.hangoutId}`).emit('participant-joined', data)
    })

    // Handle hangout updates
    socket.on('hangout-updated', (data: { hangoutId: string; updates: Record<string, unknown> }) => {
      socket.to(`hangout-${data.hangoutId}`).emit('hangout-updated', data)
    })

    socket.on('disconnect', () => {
      // console.log('User disconnected:', socket.id); // Removed for production
    })
  })

  return io
}

// Client-side socket connection
export const socketEvents = {
  JOIN_HANGOUT: 'join-hangout',
  LEAVE_HANGOUT: 'leave-hangout',
  RSVP_UPDATE: 'rsvp-update',
  PARTICIPANT_JOINED: 'participant-joined',
  HANGOUT_UPDATED: 'hangout-updated',
  RSVP_UPDATED: 'rsvp-updated'
} as const