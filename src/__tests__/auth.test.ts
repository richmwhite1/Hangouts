import { AuthService } from '@/lib/auth-enhanced'
import { setupTestEnvironment, cleanupTestEnvironment } from '@/lib/test-utils'

describe('AuthService', () => {
  beforeAll(() => {
    setupTestEnvironment()
  })

  afterAll(() => {
    cleanupTestEnvironment()
  })

  describe('Token Generation', () => {
    it('should generate valid access token', () => {
      const payload = {
        userId: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: 'USER' as const
      }

      const token = AuthService.generateAccessToken(payload)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })

    it('should generate valid refresh token', () => {
      const userId = 'user-1'
      const token = AuthService.generateRefreshToken(userId)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })

    it('should verify valid access token', () => {
      const payload = {
        userId: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: 'USER' as const
      }

      const token = AuthService.generateAccessToken(payload)
      const decoded = AuthService.verifyAccessToken(token)
      
      expect(decoded.userId).toBe(payload.userId)
      expect(decoded.email).toBe(payload.email)
      expect(decoded.username).toBe(payload.username)
      expect(decoded.role).toBe(payload.role)
    })

    it('should throw error for invalid access token', () => {
      expect(() => {
        AuthService.verifyAccessToken('invalid-token')
      }).toThrow('Invalid or expired access token')
    })
  })

  describe('Password Hashing', () => {
    it('should hash password correctly', () => {
      const password = 'testpassword123'
      const hashed = AuthService.hashPassword(password)
      
      expect(hashed).toBeDefined()
      expect(hashed).toContain(':')
      expect(hashed.length).toBeGreaterThan(password.length)
    })

    it('should verify correct password', () => {
      const password = 'testpassword123'
      const hashed = AuthService.hashPassword(password)
      
      expect(AuthService.verifyPassword(password, hashed)).toBe(true)
    })

    it('should reject incorrect password', () => {
      const password = 'testpassword123'
      const wrongPassword = 'wrongpassword'
      const hashed = AuthService.hashPassword(password)
      
      expect(AuthService.verifyPassword(wrongPassword, hashed)).toBe(false)
    })
  })

  describe('Password Validation', () => {
    it('should validate strong password', () => {
      const strongPassword = 'StrongPass123!'
      const result = AuthService.validatePassword(strongPassword)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject weak password', () => {
      const weakPassword = 'weak'
      const result = AuthService.validatePassword(weakPassword)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Token Cleanup', () => {
    it('should generate secure tokens', () => {
      const token1 = AuthService.generatePasswordResetToken()
      const token2 = AuthService.generatePasswordResetToken()
      
      expect(token1).toBeDefined()
      expect(token2).toBeDefined()
      expect(token1).not.toBe(token2)
      expect(token1.length).toBe(64) // 32 bytes = 64 hex chars
    })
  })
})






















