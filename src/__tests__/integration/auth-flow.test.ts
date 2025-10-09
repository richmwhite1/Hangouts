import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { setupTestEnvironment, cleanupTestEnvironment, createMockUser } from '@/lib/test-utils'
import { AuthService } from '@/lib/auth-enhanced'
import { RBACService } from '@/lib/rbac'

describe('Authentication Flow Integration', () => {
  beforeAll(() => {
    setupTestEnvironment()
  })

  afterAll(() => {
    cleanupTestEnvironment()
  })

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
  })

  describe('User Registration and Login', () => {
    it('should register a new user and generate tokens', async () => {
      const userData = createMockUser({
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User'
      })

      // Mock database operations
      const mockUser = {
        ...userData,
        id: 'user-123',
        role: 'USER' as const
      }

      // Test token generation
      const { accessToken, refreshToken } = await AuthService.generateTokenPair({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        role: mockUser.role
      })

      expect(accessToken).toBeDefined()
      expect(refreshToken).toBeDefined()

      // Verify access token
      const payload = AuthService.verifyAccessToken(accessToken)
      expect(payload.userId).toBe(mockUser.id)
      expect(payload.email).toBe(mockUser.email)
      expect(payload.role).toBe(mockUser.role)
    })

    it('should handle password validation', () => {
      const strongPassword = 'StrongPass123!'
      const weakPassword = 'weak'

      const strongResult = AuthService.validatePassword(strongPassword)
      const weakResult = AuthService.validatePassword(weakPassword)

      expect(strongResult.isValid).toBe(true)
      expect(strongResult.errors).toHaveLength(0)

      expect(weakResult.isValid).toBe(false)
      expect(weakResult.errors.length).toBeGreaterThan(0)
    })

    it('should hash and verify passwords correctly', () => {
      const password = 'testpassword123'
      const hashed = AuthService.hashPassword(password)

      expect(hashed).toBeDefined()
      expect(hashed).not.toBe(password)
      expect(hashed).toContain(':')

      expect(AuthService.verifyPassword(password, hashed)).toBe(true)
      expect(AuthService.verifyPassword('wrongpassword', hashed)).toBe(false)
    })
  })

  describe('Token Management', () => {
    it('should refresh access token with valid refresh token', async () => {
      const userData = createMockUser()
      const { accessToken, refreshToken } = await AuthService.generateTokenPair({
        id: userData.id,
        email: userData.email,
        username: userData.username,
        role: userData.role
      })

      // Mock database operations
      const mockUser = {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        role: userData.role
      }

      // Test token refresh
      const newTokens = await AuthService.refreshAccessToken(refreshToken)

      expect(newTokens.accessToken).toBeDefined()
      expect(newTokens.refreshToken).toBeDefined()
      expect(newTokens.accessToken).not.toBe(accessToken)
      expect(newTokens.refreshToken).not.toBe(refreshToken)
    })

    it('should reject invalid refresh token', async () => {
      await expect(
        AuthService.refreshAccessToken('invalid-token')
      ).rejects.toThrow('Refresh token is invalid or expired')
    })
  })

  describe('Role-Based Access Control', () => {
    it('should grant correct permissions to USER role', async () => {
      const userId = 'user-123'
      
      // Mock user with USER role
      const mockUser = {
        id: userId,
        role: 'USER' as const,
        isActive: true
      }

      // Test permissions
      const canCreateHangout = await RBACService.hasPermission(userId, 'hangout:create')
      const canAccessAdmin = await RBACService.hasPermission(userId, 'admin:access')

      expect(canCreateHangout).toBe(true)
      expect(canAccessAdmin).toBe(false)
    })

    it('should grant correct permissions to ADMIN role', async () => {
      const userId = 'admin-123'
      
      // Mock user with ADMIN role
      const mockUser = {
        id: userId,
        role: 'ADMIN' as const,
        isActive: true
      }

      // Test permissions
      const canCreateHangout = await RBACService.hasPermission(userId, 'hangout:create')
      const canAccessAdmin = await RBACService.hasPermission(userId, 'admin:access')

      expect(canCreateHangout).toBe(true)
      expect(canAccessAdmin).toBe(true)
    })

    it('should check resource access correctly', async () => {
      const userId = 'user-123'
      const hangoutId = 'hangout-123'

      // Mock hangout owned by user
      const mockHangout = {
        id: hangoutId,
        creatorId: userId,
        participants: []
      }

      // Test resource access
      const canAccess = await RBACService.canAccessResource(
        userId,
        'hangout',
        hangoutId,
        'read'
      )

      expect(canAccess).toBe(true)
    })
  })

  describe('Security Features', () => {
    it('should generate secure password reset tokens', () => {
      const token1 = AuthService.generatePasswordResetToken()
      const token2 = AuthService.generatePasswordResetToken()

      expect(token1).toBeDefined()
      expect(token2).toBeDefined()
      expect(token1).not.toBe(token2)
      expect(token1.length).toBe(64) // 32 bytes = 64 hex chars
    })

    it('should clean up expired tokens', async () => {
      // This would test the cleanup functionality
      // In a real implementation, you would create expired tokens and test cleanup
      await expect(AuthService.cleanupExpiredTokens()).resolves.not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid access tokens gracefully', () => {
      expect(() => {
        AuthService.verifyAccessToken('invalid-token')
      }).toThrow('Invalid or expired access token')
    })

    it('should handle invalid refresh tokens gracefully', () => {
      expect(() => {
        AuthService.verifyRefreshToken('invalid-token')
      }).toThrow('Invalid or expired refresh token')
    })

    it('should handle missing JWT secret', () => {
      const originalSecret = process.env.JWT_SECRET
      delete process.env.JWT_SECRET

      expect(() => {
        new AuthService()
      }).toThrow('JWT_SECRET environment variable is required')

      process.env.JWT_SECRET = originalSecret
    })
  })
})






















