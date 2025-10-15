import { RBACService } from '@/lib/rbac'
import { setupTestEnvironment, cleanupTestEnvironment, mockDatabase } from '@/lib/test-utils'

// Mock the database
jest.mock('@/lib/db', () => ({
  db: mockDatabase
}))

describe('RBACService', () => {
  beforeAll(() => {
    setupTestEnvironment()
  })

  afterAll(() => {
    cleanupTestEnvironment()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserPermissions', () => {
    it('should return user permissions for USER role', async () => {
      mockDatabase.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'USER',
        isActive: true
      })

      const permissions = await RBACService.getUserPermissions('user-1')
      
      expect(permissions.userId).toBe('user-1')
      expect(permissions.role).toBe('USER')
      expect(permissions.isActive).toBe(true)
      expect(permissions.permissions).toContain('hangout:create')
      expect(permissions.permissions).toContain('hangout:read')
      expect(permissions.permissions).not.toContain('admin:access')
    })

    it('should return user permissions for ADMIN role', async () => {
      mockDatabase.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN',
        isActive: true
      })

      const permissions = await RBACService.getUserPermissions('admin-1')
      
      expect(permissions.role).toBe('ADMIN')
      expect(permissions.permissions).toContain('admin:access')
      expect(permissions.permissions).toContain('admin:users')
      expect(permissions.permissions).toContain('admin:hangouts')
    })

    it('should throw error for non-existent user', async () => {
      mockDatabase.user.findUnique.mockResolvedValue(null)

      await expect(RBACService.getUserPermissions('non-existent')).rejects.toThrow('User not found')
    })
  })

  describe('hasPermission', () => {
    it('should return true for valid permission', async () => {
      mockDatabase.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'USER',
        isActive: true
      })

      const hasPermission = await RBACService.hasPermission('user-1', 'hangout:create')
      expect(hasPermission).toBe(true)
    })

    it('should return false for invalid permission', async () => {
      mockDatabase.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'USER',
        isActive: true
      })

      const hasPermission = await RBACService.hasPermission('user-1', 'admin:access')
      expect(hasPermission).toBe(false)
    })

    it('should return false for inactive user', async () => {
      mockDatabase.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'USER',
        isActive: false
      })

      const hasPermission = await RBACService.hasPermission('user-1', 'hangout:create')
      expect(hasPermission).toBe(false)
    })
  })

  describe('canAccessResource', () => {
    it('should allow creator to access their hangout', async () => {
      mockDatabase.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'USER',
        isActive: true
      })

      mockDatabase.hangout.findUnique.mockResolvedValue({
        id: 'hangout-1',
        creatorId: 'user-1',
        participants: []
      })

      const canAccess = await RBACService.canAccessResource('user-1', 'hangout', 'hangout-1', 'read')
      expect(canAccess).toBe(true)
    })

    it('should allow participant to read hangout', async () => {
      mockDatabase.user.findUnique.mockResolvedValue({
        id: 'user-2',
        role: 'USER',
        isActive: true
      })

      mockDatabase.hangout.findUnique.mockResolvedValue({
        id: 'hangout-1',
        creatorId: 'user-1',
        participants: [{ userId: 'user-2' }]
      })

      const canAccess = await RBACService.canAccessResource('user-2', 'hangout', 'hangout-1', 'read')
      expect(canAccess).toBe(true)
    })

    it('should deny non-participant access to hangout', async () => {
      mockDatabase.user.findUnique.mockResolvedValue({
        id: 'user-3',
        role: 'USER',
        isActive: true
      })

      mockDatabase.hangout.findUnique.mockResolvedValue({
        id: 'hangout-1',
        creatorId: 'user-1',
        participants: [{ userId: 'user-2' }]
      })

      const canAccess = await RBACService.canAccessResource('user-3', 'hangout', 'hangout-1', 'read')
      expect(canAccess).toBe(false)
    })
  })

  describe('isAdmin', () => {
    it('should return true for admin user', async () => {
      mockDatabase.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN',
        isActive: true
      })

      const isAdmin = await RBACService.isAdmin('admin-1')
      expect(isAdmin).toBe(true)
    })

    it('should return false for regular user', async () => {
      mockDatabase.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'USER',
        isActive: true
      })

      const isAdmin = await RBACService.isAdmin('user-1')
      expect(isAdmin).toBe(false)
    })

    it('should return false for inactive admin', async () => {
      mockDatabase.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN',
        isActive: false
      })

      const isAdmin = await RBACService.isAdmin('admin-1')
      expect(isAdmin).toBe(false)
    })
  })

  describe('role hierarchy', () => {
    it('should have correct role levels', () => {
      expect(RBACService.getRoleLevel('USER')).toBe(1)
      expect(RBACService.getRoleLevel('MODERATOR')).toBe(2)
      expect(RBACService.getRoleLevel('ADMIN')).toBe(3)
    })

    it('should allow higher roles to access lower role resources', () => {
      expect(RBACService.canRoleAccess('ADMIN', 'USER')).toBe(true)
      expect(RBACService.canRoleAccess('ADMIN', 'MODERATOR')).toBe(true)
      expect(RBACService.canRoleAccess('MODERATOR', 'USER')).toBe(true)
    })

    it('should deny lower roles from accessing higher role resources', () => {
      expect(RBACService.canRoleAccess('USER', 'ADMIN')).toBe(false)
      expect(RBACService.canRoleAccess('USER', 'MODERATOR')).toBe(false)
      expect(RBACService.canRoleAccess('MODERATOR', 'ADMIN')).toBe(false)
    })
  })
})






























