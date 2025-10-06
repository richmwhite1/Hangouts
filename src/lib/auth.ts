import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET
  console.log('Auth getJWTSecret - JWT_SECRET from env:', secret)
  if (!secret) {
    console.log('Auth getJWTSecret - No JWT_SECRET found, using fallback')
    return 'fallback-secret'
  }
  return secret
}

export interface JWTPayload {
  userId: string
  email: string
  username: string
  role: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJWTSecret(), { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const secret = getJWTSecret()
    console.log('Auth verifyToken - Using secret:', secret)
    const decoded = jwt.verify(token, secret)
    console.log('Auth verifyToken - Decoded payload:', decoded)
    return decoded as JWTPayload
  } catch (error) {
    console.log('Auth verifyToken - Error:', error instanceof Error ? error.message : 'Unknown error')
    return null
  }
}

export async function getUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      avatar: true,
      password: true,
      isActive: true,
      createdAt: true,
    }
  })
}

export async function getUserByUsername(username: string) {
  return db.user.findUnique({
    where: { username },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      avatar: true,
      password: true,
      isActive: true,
      createdAt: true,
    }
  })
}

export async function createUser(data: {
  email: string
  username: string
  name: string
  password: string
}) {
  const hashedPassword = await hashPassword('Password1!')
  
  return db.user.create({
    data: {
      ...data,
      password: hashedPassword,
    },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      avatar: true,
      isActive: true,
      createdAt: true,
    }
  })
}

export async function getUserById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      avatar: true,
      backgroundImage: true,
      bio: true,
      location: true,
      isActive: true,
      lastSeen: true,
      createdAt: true,
    }
  })
}

