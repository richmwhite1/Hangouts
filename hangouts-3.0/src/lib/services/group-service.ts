import { BaseService, ServiceResult, PaginationOptions, SortOptions, FilterOptions } from './base-service'
import { Group, GroupRole, Prisma } from '@prisma/client'
import { z } from 'zod'

// Validation schemas
const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  isPrivate: z.boolean().optional()})

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  isPrivate: z.boolean().optional()})

const addGroupMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(['MEMBER', 'ADMIN', 'MODERATOR']).optional()})

const updateGroupMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(['MEMBER', 'ADMIN', 'MODERATOR'])})

export interface GroupWithDetails extends Group {
  creator: {
    id: string
    username: string
    name: string
    avatar: string
  }
  members: Array<{
    id: string
    userId: string
    role: GroupRole
    joinedAt: Date
    user: {
      id: string
      username: string
      name: string
      avatar: string
      isActive: boolean
    }
  }>
  _count: {
    members: number
  }
}

export interface GroupSearchOptions extends PaginationOptions, SortOptions, FilterOptions {
  search?: string
  isPrivate?: boolean
  creatorId?: string
  memberId?: string
}

export class GroupService extends BaseService {
  /**
   * Create a new group
   */
  async createGroup(data: any): Promise<ServiceResult<GroupWithDetails>> {
    try {
      // Check if user can create groups
      const canCreate = await this.checkPermission('group:create')
      if (!canCreate) {
        return this.createErrorResult('Access denied', 'You do not have permission to create groups')
      }

      // Validate input
      const validatedData = this.validateInput(data, createGroupSchema)

      const group = await this.db.group.create({
        data: {
          ...validatedData,
          creatorId: this.context.userId
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  avatar: true,
                  isActive: true
                }
              }
            }
          },
          _count: {
            select: {
              members: true
            }
          }
        }
      })

      // Add creator as admin member
      await this.db.groupMember.create({
        data: {
          groupId: group.id,
          userId: this.context.userId,
          role: 'ADMIN'
        }
      })

      await this.logAction('create', 'group', group.id, null, validatedData)

      return this.createSuccessResult(group, 'Group created successfully')
    } catch (error) {
      return this.handleError(error, 'Create group')
    }
  }

  /**
   * Get group by ID
   */
  async getGroupById(groupId: string): Promise<ServiceResult<GroupWithDetails>> {
    try {
      // Check if user can access this group
      const canAccess = await this.canAccessResource('group', groupId, 'read')
      if (!canAccess) {
        return this.createErrorResult('Access denied', 'You do not have permission to view this group')
      }

      const group = await this.db.group.findUnique({
        where: { id: groupId },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  avatar: true,
                  isActive: true
                }
              }
            },
            orderBy: { joinedAt: 'asc' }
          },
          _count: {
            select: {
              members: true
            }
          }
        }
      })

      if (!group) {
        return this.createErrorResult('Group not found', 'The requested group does not exist')
      }

      // Check if user is a member (for private groups)
      if (group.isPrivate) {
        const isMember = group.members.some(member => member.userId === this.context.userId)
        if (!isMember) {
          return this.createErrorResult('Access denied', 'You must be a member to view this private group')
        }
      }

      await this.logDataAccess('read', 'group', groupId)

      return this.createSuccessResult(group, 'Group retrieved successfully')
    } catch (error) {
      return this.handleError(error, 'Get group by ID')
    }
  }

  /**
   * Search groups with filtering and pagination
   */
  async searchGroups(options: GroupSearchOptions): Promise<ServiceResult<{ groups: GroupWithDetails[]; pagination: any }>> {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        isPrivate,
        creatorId,
        memberId,
        field = 'createdAt',
        direction = 'desc'
      } = options

      const offset = (page - 1) * limit

      // Build where clause
      const where: Prisma.GroupWhereInput = {
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(isPrivate !== undefined && { isPrivate }),
        ...(creatorId && { creatorId }),
        ...(memberId && {
          members: {
            some: { userId: memberId }
          }
        })
      }

      const [groups, total] = await Promise.all([
        this.db.group.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    avatar: true,
                    isActive: true
                  }
                }
              }
            },
            _count: {
              select: {
                members: true
              }
            }
          },
          orderBy: { [field]: direction },
          skip: offset,
          take: limit
        }),
        this.db.group.count({ where })
      ])

      // Filter out private groups the user is not a member of
      const filteredGroups = groups.filter(group => {
        if (!group.isPrivate) return true
        return group.members.some(member => member.userId === this.context.userId)
      })

      const pagination = this.calculatePagination(page, limit, total)

      await this.logDataAccess('read', 'group', 'search', { 
        search, 
        filters: { isPrivate, creatorId, memberId },
        pagination 
      })

      return this.createSuccessResult(
        { groups: filteredGroups, pagination },
        'Groups retrieved successfully',
        pagination
      )
    } catch (error) {
      return this.handleError(error, 'Search groups')
    }
  }

  /**
   * Update group
   */
  async updateGroup(groupId: string, data: any): Promise<ServiceResult<GroupWithDetails>> {
    try {
      // Check if user can update this group
      const canUpdate = await this.canAccessResource('group', groupId, 'update')
      if (!canUpdate) {
        return this.createErrorResult('Access denied', 'You do not have permission to update this group')
      }

      // Check if user is admin or moderator
      const membership = await this.db.groupMember.findFirst({
        where: {
          groupId,
          userId: this.context.userId,
          role: { in: ['ADMIN', 'MODERATOR'] }
        }
      })

      if (!membership) {
        return this.createErrorResult('Access denied', 'You must be an admin or moderator to update this group')
      }

      // Validate input
      const validatedData = this.validateInput(data, updateGroupSchema)

      // Get current group data for audit log
      const currentGroup = await this.db.group.findUnique({
        where: { id: groupId },
        select: {
          name: true,
          description: true,
          imageUrl: true,
          isPrivate: true
        }
      })

      const updatedGroup = await this.db.group.update({
        where: { id: groupId },
        data: validatedData,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  avatar: true,
                  isActive: true
                }
              }
            }
          },
          _count: {
            select: {
              members: true
            }
          }
        }
      })

      await this.logAction('update', 'group', groupId, currentGroup, validatedData)

      return this.createSuccessResult(updatedGroup, 'Group updated successfully')
    } catch (error) {
      return this.handleError(error, 'Update group')
    }
  }

  /**
   * Delete group
   */
  async deleteGroup(groupId: string): Promise<ServiceResult<void>> {
    try {
      // Check if user can delete this group
      const canDelete = await this.canAccessResource('group', groupId, 'delete')
      if (!canDelete) {
        return this.createErrorResult('Access denied', 'You do not have permission to delete this group')
      }

      // Check if user is the creator or admin
      const group = await this.db.group.findUnique({
        where: { id: groupId },
        select: { id: true, creatorId: true, name: true }
      })

      if (!group) {
        return this.createErrorResult('Group not found', 'The requested group does not exist')
      }

      if (group.creatorId !== this.context.userId) {
        const membership = await this.db.groupMember.findFirst({
          where: {
            groupId,
            userId: this.context.userId,
            role: 'ADMIN'
          }
        })

        if (!membership) {
          return this.createErrorResult('Access denied', 'Only the creator or admins can delete this group')
        }
      }

      // Delete group (cascade will handle members)
      await this.db.group.delete({
        where: { id: groupId }
      })

      await this.logAction('delete', 'group', groupId, { name: group.name }, null)

      return this.createSuccessResult(undefined, 'Group deleted successfully')
    } catch (error) {
      return this.handleError(error, 'Delete group')
    }
  }

  /**
   * Add member to group
   */
  async addGroupMember(groupId: string, data: any): Promise<ServiceResult<void>> {
    try {
      // Check if user can invite to this group
      const canInvite = await this.canAccessResource('group', groupId, 'invite')
      if (!canInvite) {
        return this.createErrorResult('Access denied', 'You do not have permission to invite members to this group')
      }

      // Validate input
      const validatedData = this.validateInput(data, addGroupMemberSchema)

      // Check if group exists
      const group = await this.db.group.findUnique({
        where: { id: groupId },
        select: { id: true, name: true, isPrivate: true }
      })

      if (!group) {
        return this.createErrorResult('Group not found', 'The requested group does not exist')
      }

      // Check if user is already a member
      const existingMember = await this.db.groupMember.findFirst({
        where: {
          groupId,
          userId: validatedData.userId
        }
      })

      if (existingMember) {
        return this.createErrorResult('Already a member', 'User is already a member of this group')
      }

      // Add member
      await this.db.groupMember.create({
        data: {
          groupId,
          userId: validatedData.userId,
          role: validatedData.role || 'MEMBER'
        }
      })

      await this.logAction('add_member', 'group', groupId, null, {
        userId: validatedData.userId,
        role: validatedData.role || 'MEMBER'
      })

      return this.createSuccessResult(undefined, 'Member added successfully')
    } catch (error) {
      return this.handleError(error, 'Add group member')
    }
  }

  /**
   * Remove member from group
   */
  async removeGroupMember(groupId: string, userId: string): Promise<ServiceResult<void>> {
    try {
      // Check if user can manage this group
      const canManage = await this.canAccessResource('group', groupId, 'update')
      if (!canManage) {
        return this.createErrorResult('Access denied', 'You do not have permission to remove members from this group')
      }

      // Check if user is admin or moderator
      const membership = await this.db.groupMember.findFirst({
        where: {
          groupId,
          userId: this.context.userId,
          role: { in: ['ADMIN', 'MODERATOR'] }
        }
      })

      if (!membership) {
        return this.createErrorResult('Access denied', 'You must be an admin or moderator to remove members')
      }

      // Check if trying to remove self
      if (userId === this.context.userId) {
        return this.createErrorResult('Invalid request', 'Cannot remove yourself from the group')
      }

      // Remove member
      await this.db.groupMember.deleteMany({
        where: {
          groupId,
          userId
        }
      })

      await this.logAction('remove_member', 'group', groupId, null, { userId })

      return this.createSuccessResult(undefined, 'Member removed successfully')
    } catch (error) {
      return this.handleError(error, 'Remove group member')
    }
  }

  /**
   * Update group member role
   */
  async updateGroupMemberRole(groupId: string, data: any): Promise<ServiceResult<void>> {
    try {
      // Check if user can manage this group
      const canManage = await this.canAccessResource('group', groupId, 'update')
      if (!canManage) {
        return this.createErrorResult('Access denied', 'You do not have permission to update member roles in this group')
      }

      // Validate input
      const validatedData = this.validateInput(data, updateGroupMemberSchema)

      // Check if user is admin
      const membership = await this.db.groupMember.findFirst({
        where: {
          groupId,
          userId: this.context.userId,
          role: 'ADMIN'
        }
      })

      if (!membership) {
        return this.createErrorResult('Access denied', 'Only admins can update member roles')
      }

      // Check if trying to update self
      if (validatedData.userId === this.context.userId) {
        return this.createErrorResult('Invalid request', 'Cannot update your own role')
      }

      // Update member role
      await this.db.groupMember.updateMany({
        where: {
          groupId,
          userId: validatedData.userId
        },
        data: {
          role: validatedData.role
        }
      })

      await this.logAction('update_member_role', 'group', groupId, null, {
        userId: validatedData.userId,
        role: validatedData.role
      })

      return this.createSuccessResult(undefined, 'Member role updated successfully')
    } catch (error) {
      return this.handleError(error, 'Update group member role')
    }
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId: string): Promise<ServiceResult<any[]>> {
    try {
      // Check if user can view this group
      const canAccess = await this.canAccessResource('group', groupId, 'read')
      if (!canAccess) {
        return this.createErrorResult('Access denied', 'You do not have permission to view members of this group')
      }

      const members = await this.db.groupMember.findMany({
        where: { groupId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
              isActive: true,
              lastSeen: true
            }
          }
        },
        orderBy: [
          { role: 'asc' },
          { joinedAt: 'asc' }
        ]
      })

      await this.logDataAccess('read', 'group_members', groupId)

      return this.createSuccessResult(members, 'Group members retrieved successfully')
    } catch (error) {
      return this.handleError(error, 'Get group members')
    }
  }

  /**
   * Leave group
   */
  async leaveGroup(groupId: string): Promise<ServiceResult<void>> {
    try {
      // Check if user is a member
      const membership = await this.db.groupMember.findFirst({
        where: {
          groupId,
          userId: this.context.userId
        }
      })

      if (!membership) {
        return this.createErrorResult('Not a member', 'You are not a member of this group')
      }

      // Check if user is the creator
      const group = await this.db.group.findUnique({
        where: { id: groupId },
        select: { creatorId: true, name: true }
      })

      if (group?.creatorId === this.context.userId) {
        return this.createErrorResult('Cannot leave', 'Group creators cannot leave their own group')
      }

      // Remove membership
      await this.db.groupMember.delete({
        where: { id: membership.id }
      })

      await this.logAction('leave_group', 'group', groupId, null, { groupName: group?.name })

      return this.createSuccessResult(undefined, 'Left group successfully')
    } catch (error) {
      return this.handleError(error, 'Leave group')
    }
  }

  /**
   * Get user's groups
   */
  async getUserGroups(userId: string, options: PaginationOptions = {}): Promise<ServiceResult<{ groups: GroupWithDetails[]; pagination: any }>> {
    try {
      const { page = 1, limit = 20 } = options
      const offset = (page - 1) * limit

      // Check if user can view this user's groups
      const canAccess = await this.canAccessResource('user', userId, 'read')
      if (!canAccess) {
        return this.createErrorResult('Access denied', 'You do not have permission to view this user\'s groups')
      }

      const [groups, total] = await Promise.all([
        this.db.group.findMany({
          where: {
            members: {
              some: { userId }
            }
          },
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    avatar: true,
                    isActive: true
                  }
                }
              }
            },
            _count: {
              select: {
                members: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        this.db.group.count({
          where: {
            members: {
              some: { userId }
            }
          }
        })
      ])

      // Filter out private groups the current user is not a member of
      const filteredGroups = groups.filter(group => {
        if (!group.isPrivate) return true
        return group.members.some(member => member.userId === this.context.userId)
      })

      const pagination = this.calculatePagination(page, limit, total)

      await this.logDataAccess('read', 'user_groups', userId, { pagination })

      return this.createSuccessResult(
        { groups: filteredGroups, pagination },
        'User groups retrieved successfully',
        pagination
      )
    } catch (error) {
      return this.handleError(error, 'Get user groups')
    }
  }
}






























