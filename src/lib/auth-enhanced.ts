import jwt from 'jsonwebtoken'
import { randomBytes, createHash } from 'crypto'
import { db } from './db'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

export interface TokenPayload {
  userId: string
  email: string
  username: string
  role: 'USER' | 'ADMIN' | 'MODERATOR'
  iat?: number
  exp?: number
}

export interface RefreshTokenPayload {
  userId: string
  tokenId: string
  iat?: number
  exp?: number
}

export class AuthService {
  // Generate access token
  static generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET!, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'hangouts-app',
      audience: 'hangouts-users'
    })
  }

  // Generate refresh token
  static generateRefreshToken(userId: string): string {
    const tokenId = randomBytes(32).toString('hex')
    return jwt.sign({ userId, tokenId }, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'hangouts-app',
      audience: 'hangouts-users'
    })
  }

  // Verify access token
  static verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET!, {
        issuer: 'hangouts-app',
        audience: 'hangouts-users'
      }) as TokenPayload
    } catch (error) {
      throw new Error('Invalid or expired access token')
    }
  }

  // Verify refresh token
  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'hangouts-app',
        audience: 'hangouts-users'
      }) as RefreshTokenPayload
    } catch (error) {
      throw new Error('Invalid or expired refresh token')
    }
  }

  // Store refresh token in database
  static async storeRefreshToken(userId: string, tokenId: string, expiresAt: Date): Promise<void> {
    await db.refreshToken.create({
      data: {
        id: tokenId,
        userId,
        expiresAt,
        isRevoked: false
      }
    })
  }

  // Revoke refresh token
  static async revokeRefreshToken(tokenId: string): Promise<void> {
    await db.refreshToken.update({
      where: { id: tokenId },
      data: { isRevoked: true }
    })
  }

  // Revoke all refresh tokens for user
  static async revokeAllRefreshTokens(userId: string): Promise<void> {
    await db.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true }
    })
  }

  // Check if refresh token is valid
  static async isRefreshTokenValid(tokenId: string): Promise<boolean> {
    const token = await db.refreshToken.findUnique({
      where: { id: tokenId }
    })
    
    return !!(token && !token.isRevoked && token.expiresAt > new Date())
  }

  // Generate token pair
  static async generateTokenPair(user: {
    id: string
    email: string
    username: string
    role: 'USER' | 'ADMIN' | 'MODERATOR'
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    })

    const refreshToken = this.generateRefreshToken(user.id)
    const refreshTokenPayload = this.verifyRefreshToken(refreshToken)
    
    await this.storeRefreshToken(
      user.id,
      refreshTokenPayload.tokenId,
      new Date(refreshTokenPayload.exp! * 1000)
    )

    return { accessToken, refreshToken }
  }

  // Refresh access token
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = this.verifyRefreshToken(refreshToken)
    
    // Check if refresh token is valid in database
    const isValid = await this.isRefreshTokenValid(payload.tokenId)
    if (!isValid) {
      throw new Error('Refresh token is invalid or expired')
    }

    // Get user data
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, username: true, role: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Revoke old refresh token
    await this.revokeRefreshToken(payload.tokenId)

    // Generate new token pair
    return this.generateTokenPair({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role as 'USER' | 'ADMIN' | 'MODERATOR'
    })
  }

  // Hash password
  static hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex')
    const hash = createHash('sha256').update(password + salt).digest('hex')
    return `${salt}:${hash}`
  }

  // Verify password
  static verifyPassword(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(':')
    const passwordHash = createHash('sha256').update(password + salt).digest('hex')
    return hash === passwordHash
  }

  // Generate password reset token
  static generatePasswordResetToken(): string {
    return randomBytes(32).toString('hex')
  }

  // Store password reset token
  static async storePasswordResetToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    
    await db.passwordResetToken.upsert({
      where: { userId },
      update: { token, expiresAt },
      create: { userId, token, expiresAt }
    })
  }

  // Verify password reset token
  static async verifyPasswordResetToken(token: string): Promise<string | null> {
    const resetToken = await db.passwordResetToken.findFirst({
      where: { 
        token,
        expiresAt: { gt: new Date() }
      }
    })

    return resetToken?.userId || null
  }

  // Clean up expired tokens
  static async cleanupExpiredTokens(): Promise<void> {
    await db.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true }
        ]
      }
    })

    await db.passwordResetToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    })
  }
}




















