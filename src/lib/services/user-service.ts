import { BaseService, ServiceResult, PaginationOptions, SortOptions, FilterOptions } from './base-service'
import { User, UserRole, Prisma } from '@prisma/client'
import { z } from 'zod'

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional(),
  birthDate: z.string().datetime().optional(),
})

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional(),
  birthDate: z.string().datetime().optional(),
  avatar: z.string().url().optional(),
  backgroundImage: z.string().url().optional(),
})

const updateUserRoleSchema = z.object({
  role: z.enum(['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN']),
})

export interface UserWithCounts extends User {
  _count: {
    createdContent: number
    contentParticipants: number
    friendships1: number
    friendships2: number
    sentFriendRequests: number
    receivedFriendRequests: number
    notifications: number
  }
}

export interface UserSearchOptions extends PaginationOptions, SortOptions, FilterOptions {
  search?: string
  role?: UserRole
  isActive?: boolean
  isVerified?: boolean
}

export class UserService extends BaseService {
  /**
   * Get user by ID with optional privacy filtering
   */
  async getUserById(userId: string, includeCounts: boolean = false): Promise<ServiceResult<User | UserWithCounts>> {
    try {
      // Check if user can access this user's profile
      const canAccess = await this.canAccessResource('user', userId, 'read')
      if (!canAccess) {
        return this.createErrorResult('Access denied', 'You do not have permission to view this user')
      }

      const selectFields = {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        backgroundImage: true,
        bio: true,
        location: true,
        website: true,
        birthDate: true,
        role: true,
        isActive: true,
        isVerified: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
        ...(includeCounts && {
          _count: {
            select: {
              createdContent: true,
              contentParticipants: true,
              friendships1: true,
              friendships2: true,
              sentFriendRequests: true,
              receivedFriendRequests: true,
              notifications: true,
            }
          }
        })
      }

      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: selectFields
      })

      if (!user) {
        return this.createErrorResult('User not found', 'The requested user does not exist')
      }

      await this.logDataAccess('read', 'user', userId, { includeCounts })

      return this.createSuccessResult(user, 'User retrieved successfully')
    } catch (error) {
      return this.handleError(error, 'Get user by ID')
    }
  }

  /**
   * Get current user's profile
   */
  async getCurrentUser(): Promise<ServiceResult<UserWithCounts>> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: this.context.userId },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatar: true,
          backgroundImage: true,
          bio: true,
          location: true,
          website: true,
          birthDate: true,
          role: true,
          isActive: true,
          isVerified: true,
          lastSeen: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              createdContent: true,
              contentParticipants: true,
              friendships1: true,
              friendships2: true,
              sentFriendRequests: true,
              receivedFriendRequests: true,
              notifications: true,
            }
          }
        }
      })

      if (!user) {
        return this.createErrorResult('User not found', 'Current user not found')
      }

      await this.logDataAccess('read', 'user', this.context.userId, { currentUser: true })

      return this.createSuccessResult(user, 'Current user retrieved successfully')
    } catch (error) {
      return this.handleError(error, 'Get current user')
    }
  }

  /**
   * Search users with filtering and pagination
   */
  async searchUsers(options: UserSearchOptions): Promise<ServiceResult<{ users: User[]; pagination: any }>> {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        role,
        isActive,
        isVerified,
        field = 'createdAt',
        direction = 'desc'
      } = options

      const offset = (page - 1) * limit

      // Build where clause
      const where: Prisma.UserWhereInput = {
        id: { not: this.context.userId }, // Exclude current user
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(isVerified !== undefined && { isVerified })
      }

      const [users, total] = await Promise.all([
        this.db.user.findMany({
          where,
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            bio: true,
            location: true,
            isActive: true,
            isVerified: true,
            lastSeen: true,
            createdAt: true
          },
          orderBy: { [field]: direction },
          skip: offset,
          take: limit
        }),
        this.db.user.count({ where })
      ])

      const pagination = this.calculatePagination(page, limit, total)

      await this.logDataAccess('read', 'user', 'search', { 
        search, 
        filters: { role, isActive, isVerified },
        pagination 
      })

      return this.createSuccessResult(
        { users, pagination },
        'Users retrieved successfully',
        pagination
      )
    } catch (error) {
      return this.handleError(error, 'Search users')
    }
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, data: any): Promise<ServiceResult<User>> {
    try {
      // Check if user can update this profile
      const canUpdate = await this.canAccessResource('user', userId, 'update')
      if (!canUpdate) {
        return this.createErrorResult('Access denied', 'You do not have permission to update this user')
      }

      // Validate input
      const validatedData = this.validateInput(data, updateUserSchema)

      // Get current user data for audit log
      const currentUser = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          bio: true,
          location: true,
          website: true,
          birthDate: true,
          avatar: true,
          backgroundImage: true
        }
      })

      const updatedUser = await this.db.user.update({
        where: { id: userId },
        data: validatedData,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatar: true,
          backgroundImage: true,
          bio: true,
          location: true,
          website: true,
          birthDate: true,
          role: true,
          isActive: true,
          isVerified: true,
          lastSeen: true,
          createdAt: true,
          updatedAt: true
        }
      })

      await this.logAction('update', 'user', userId, currentUser, validatedData)

      return this.createSuccessResult(updatedUser, 'User updated successfully')
    } catch (error) {
      return this.handleError(error, 'Update user')
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: string, roleData: any): Promise<ServiceResult<User>> {
    try {
      // Check if user has admin permissions
      const canModerate = await this.checkPermission('admin:users')
      if (!canModerate) {
        return this.createErrorResult('Access denied', 'You do not have permission to update user roles')
      }

      // Validate input
      const validatedData = this.validateInput(roleData, updateUserRoleSchema)

      // Get current user data for audit log
      const currentUser = await this.db.user.findUnique({
        where: { id: userId },
        select: { role: true }
      })

      const updatedUser = await this.db.user.update({
        where: { id: userId },
        data: validatedData,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          isActive: true,
          isVerified: true,
          updatedAt: true
        }
      })

      await this.logAction('update_role', 'user', userId, currentUser, validatedData)

      return this.createSuccessResult(updatedUser, 'User role updated successfully')
    } catch (error) {
      return this.handleError(error, 'Update user role')
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string): Promise<ServiceResult<User>> {
    try {
      // Check if user can deactivate this account
      const canModerate = await this.checkPermission('user:moderate')
      if (!canModerate && userId !== this.context.userId) {
        return this.createErrorResult('Access denied', 'You do not have permission to deactivate this user')
      }

      const updatedUser = await this.db.user.update({
        where: { id: userId },
        data: { isActive: false },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          isActive: true,
          updatedAt: true
        }
      })

      await this.logAction('deactivate', 'user', userId, { isActive: true }, { isActive: false })

      return this.createSuccessResult(updatedUser, 'User deactivated successfully')
    } catch (error) {
      return this.handleError(error, 'Deactivate user')
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<ServiceResult<any>> {
    try {
      // Check if user can access this user's stats
      const canAccess = await this.canAccessResource('user', userId, 'read')
      if (!canAccess) {
        return this.createErrorResult('Access denied', 'You do not have permission to view this user\'s statistics')
      }

      const stats = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          _count: {
            select: {
              createdContent: true,
              contentParticipants: true,
              friendships1: true,
              friendships2: true,
              sentFriendRequests: true,
              receivedFriendRequests: true,
              notifications: true
            }
          }
        }
      })

      if (!stats) {
        return this.createErrorResult('User not found', 'The requested user does not exist')
      }

      await this.logDataAccess('read', 'user_stats', userId)

      return this.createSuccessResult(stats._count, 'User statistics retrieved successfully')
    } catch (error) {
      return this.handleError(error, 'Get user statistics')
    }
  }

  /**
   * Update user's last seen timestamp
   */
  async updateLastSeen(userId: string): Promise<ServiceResult<void>> {
    try {
      await this.db.user.update({
        where: { id: userId },
        data: { lastSeen: new Date() }
      })

      return this.createSuccessResult(undefined, 'Last seen updated successfully')
    } catch (error) {
      return this.handleError(error, 'Update last seen')
    }
  }
}






















