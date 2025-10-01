import { db } from './db'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type Role = 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN'

export type Permission = 
  // Hangout permissions
  | 'hangout:create'
  | 'hangout:read'
  | 'hangout:update'
  | 'hangout:delete'
  | 'hangout:invite'
  | 'hangout:moderate'
  | 'hangout:view_private'
  | 'hangout:view_friends_only'
  | 'hangout:view_public'
  
  // User permissions
  | 'user:read'
  | 'user:update'
  | 'user:delete'
  | 'user:moderate'
  | 'user:view_profile'
  | 'user:view_private_info'
  
  // Friend permissions
  | 'friend:manage'
  | 'friend:request'
  | 'friend:accept'
  | 'friend:block'
  | 'friend:unblock'
  
  // Group permissions
  | 'group:create'
  | 'group:read'
  | 'group:update'
  | 'group:delete'
  | 'group:invite'
  | 'group:manage_members'
  | 'group:moderate'
  
  // Notification permissions
  | 'notification:send'
  | 'notification:manage'
  | 'notification:view_all'
  
  // Poll permissions
  | 'poll:create'
  | 'poll:vote'
  | 'poll:moderate'
  | 'poll:view_results'
  
  // Comment permissions
  | 'comment:create'
  | 'comment:update'
  | 'comment:delete'
  | 'comment:moderate'
  
  // Admin permissions
  | 'admin:access'
  | 'admin:users'
  | 'admin:hangouts'
  | 'admin:analytics'
  | 'admin:system'
  | 'admin:audit_logs'

export interface UserPermissions {
  userId: string
  role: Role
  permissions: Permission[]
  isActive: boolean
}

export interface ResourceAccess {
  resourceType: 'hangout' | 'user' | 'group' | 'comment' | 'poll'
  resourceId: string
  action: 'read' | 'update' | 'delete' | 'invite' | 'moderate'
  userId: string
  granted: boolean
  reason?: string
}

// ============================================================================
// RBAC CONFIGURATION
// ============================================================================

export class RBACService {
  // Role hierarchy (higher number = more permissions)
  private static readonly ROLE_HIERARCHY: Record<Role, number> = {
    USER: 1,
    MODERATOR: 2,
    ADMIN: 3,
    SUPER_ADMIN: 4
  }

  // Default permissions for each role
  private static readonly ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    USER: [
      // Hangout permissions
      'hangout:create',
      'hangout:read',
      'hangout:update',
      'hangout:delete',
      'hangout:invite',
      'hangout:view_private',
      'hangout:view_friends_only',
      'hangout:view_public',
      
      // User permissions
      'user:read',
      'user:update',
      'user:view_profile',
      
      // Friend permissions
      'friend:manage',
      'friend:request',
      'friend:accept',
      'friend:block',
      'friend:unblock',
      
      // Group permissions
      'group:create',
      'group:read',
      'group:update',
      'group:delete',
      'group:invite',
      'group:manage_members',
      
      // Notification permissions
      'notification:send',
      'notification:manage',
      
      // Poll permissions
      'poll:create',
      'poll:vote',
      'poll:view_results',
      
      // Comment permissions
      'comment:create',
      'comment:update',
      'comment:delete'
    ],
    
    MODERATOR: [
      // All USER permissions
      'hangout:create',
      'hangout:read',
      'hangout:update',
      'hangout:delete',
      'hangout:invite',
      'hangout:moderate',
      'hangout:view_private',
      'hangout:view_friends_only',
      'hangout:view_public',
      
      'user:read',
      'user:update',
      'user:moderate',
      'user:view_profile',
      'user:view_private_info',
      
      'friend:manage',
      'friend:request',
      'friend:accept',
      'friend:block',
      'friend:unblock',
      
      'group:create',
      'group:read',
      'group:update',
      'group:delete',
      'group:invite',
      'group:manage_members',
      'group:moderate',
      
      'notification:send',
      'notification:manage',
      'notification:view_all',
      
      'poll:create',
      'poll:vote',
      'poll:moderate',
      'poll:view_results',
      
      'comment:create',
      'comment:update',
      'comment:delete',
      'comment:moderate'
    ],
    
    ADMIN: [
      // All MODERATOR permissions
      'hangout:create',
      'hangout:read',
      'hangout:update',
      'hangout:delete',
      'hangout:invite',
      'hangout:moderate',
      'hangout:view_private',
      'hangout:view_friends_only',
      'hangout:view_public',
      
      'user:read',
      'user:update',
      'user:delete',
      'user:moderate',
      'user:view_profile',
      'user:view_private_info',
      
      'friend:manage',
      'friend:request',
      'friend:accept',
      'friend:block',
      'friend:unblock',
      
      'group:create',
      'group:read',
      'group:update',
      'group:delete',
      'group:invite',
      'group:manage_members',
      'group:moderate',
      
      'notification:send',
      'notification:manage',
      'notification:view_all',
      
      'poll:create',
      'poll:vote',
      'poll:moderate',
      'poll:view_results',
      
      'comment:create',
      'comment:update',
      'comment:delete',
      'comment:moderate',
      
      // Admin-specific permissions
      'admin:access',
      'admin:users',
      'admin:hangouts',
      'admin:analytics'
    ],
    
    SUPER_ADMIN: [
      // All permissions
      'hangout:create',
      'hangout:read',
      'hangout:update',
      'hangout:delete',
      'hangout:invite',
      'hangout:moderate',
      'hangout:view_private',
      'hangout:view_friends_only',
      'hangout:view_public',
      
      'user:read',
      'user:update',
      'user:delete',
      'user:moderate',
      'user:view_profile',
      'user:view_private_info',
      
      'friend:manage',
      'friend:request',
      'friend:accept',
      'friend:block',
      'friend:unblock',
      
      'group:create',
      'group:read',
      'group:update',
      'group:delete',
      'group:invite',
      'group:manage_members',
      'group:moderate',
      
      'notification:send',
      'notification:manage',
      'notification:view_all',
      
      'poll:create',
      'poll:vote',
      'poll:moderate',
      'poll:view_results',
      
      'comment:create',
      'comment:update',
      'comment:delete',
      'comment:moderate',
      
      'admin:access',
      'admin:users',
      'admin:hangouts',
      'admin:analytics',
      'admin:system',
      'admin:audit_logs'
    ]
  }

  // ============================================================================
  // CORE RBAC METHODS
  // ============================================================================

  /**
   * Get user permissions including role and active status
   */
  static async getUserPermissions(userId: string): Promise<UserPermissions> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, isActive: true }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Ensure role is properly typed and exists in our permissions
      const role = user.role as Role
      
      // Check if role exists in our permissions map
      if (!(role in RBACService.ROLE_PERMISSIONS)) {
        console.error('Unknown role:', role, 'Available roles:', Object.keys(RBACService.ROLE_PERMISSIONS))
        throw new Error(`Unknown user role: ${role}`)
      }
      
      const permissions = RBACService.ROLE_PERMISSIONS[role]
      
      console.log('RBAC Debug:', {
        userId: user.id,
        role: user.role,
        roleType: typeof user.role,
        isActive: user.isActive,
        permissions: permissions.length,
        availableRoles: Object.keys(RBACService.ROLE_PERMISSIONS),
        hasRole: role in RBACService.ROLE_PERMISSIONS
      })

      return {
        userId: user.id,
        role,
        permissions,
        isActive: user.isActive
      }
    } catch (error) {
      console.error('Error getting user permissions:', error)
      throw new Error('Failed to get user permissions')
    }
  }

  /**
   * Check if user has a specific permission
   */
  static async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    try {
      const userPermissions = await RBACService.getUserPermissions(userId)
      return userPermissions.isActive && userPermissions.permissions.includes(permission)
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  static async hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
    try {
      const userPermissions = await RBACService.getUserPermissions(userId)
      if (!userPermissions.isActive) return false

      return permissions.some(permission => 
        userPermissions.permissions.includes(permission)
      )
    } catch (error) {
      console.error('Error checking any permission:', error)
      return false
    }
  }

  /**
   * Check if user has all of the specified permissions
   */
  static async hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
    try {
      const userPermissions = await RBACService.getUserPermissions(userId)
      if (!userPermissions.isActive) return false

      return permissions.every(permission => 
        userPermissions.permissions.includes(permission)
      )
    } catch (error) {
      console.error('Error checking all permissions:', error)
      return false
    }
  }

  /**
   * Check if user can access a specific resource
   */
  static async canAccessResource(
    userId: string,
    resourceType: 'hangout' | 'user' | 'group' | 'comment' | 'poll',
    resourceId: string,
    action: 'read' | 'update' | 'delete' | 'invite' | 'moderate'
  ): Promise<ResourceAccess> {
    try {
      const userPermissions = await RBACService.getUserPermissions(userId)
      
      if (!userPermissions.isActive) {
        return {
          resourceType,
          resourceId,
          action,
          userId,
          granted: false,
          reason: 'User account is inactive'
        }
      }

      // Super admin can access everything
      if (userPermissions.role === 'SUPER_ADMIN') {
        return {
          resourceType,
          resourceId,
          action,
          userId,
          granted: true,
          reason: 'Super admin access'
        }
      }

      // Check resource-specific permissions
      switch (resourceType) {
        case 'hangout':
          return await RBACService.checkHangoutAccess(userId, resourceId, action, userPermissions)
        
        case 'user':
          return await RBACService.checkUserAccess(userId, resourceId, action, userPermissions)
        
        case 'group':
          return await RBACService.checkGroupAccess(userId, resourceId, action, userPermissions)
        
        case 'comment':
          return await RBACService.checkCommentAccess(userId, resourceId, action, userPermissions)
        
        case 'poll':
          return await RBACService.checkPollAccess(userId, resourceId, action, userPermissions)
        
        default:
          return {
            resourceType,
            resourceId,
            action,
            userId,
            granted: false,
            reason: 'Unknown resource type'
          }
      }
    } catch (error) {
      console.error('Error checking resource access:', error)
      return {
        resourceType,
        resourceId,
        action,
        userId,
        granted: false,
        reason: 'Error checking access'
      }
    }
  }

  // ============================================================================
  // RESOURCE-SPECIFIC ACCESS CHECKS
  // ============================================================================

  private static async checkHangoutAccess(
    userId: string,
    hangoutId: string,
    action: string,
    userPermissions: UserPermissions
  ): Promise<ResourceAccess> {
    try {
      const hangout = await db.content.findUnique({
        where: { id: hangoutId },
        select: {
          id: true,
          creatorId: true,
          privacyLevel: true,
          participants: {
            select: { userId: true, role: true }
          }
        }
      })

      if (!hangout) {
        return {
          resourceType: 'hangout',
          resourceId: hangoutId,
          action: action as any,
          userId,
          granted: false,
          reason: 'Hangout not found'
        }
      }

      // Creator can do anything
      if (hangout.creatorId === userId) {
        return {
          resourceType: 'hangout',
          resourceId: hangoutId,
          action: action as any,
          userId,
          granted: true,
          reason: 'Hangout creator'
        }
      }

      // Check if user is a participant
      const isParticipant = hangout.participants.some(p => p.userId === userId)
      
      // Check privacy level permissions
      const privacyPermission = RBACService.getPrivacyPermission(hangout.privacyLevel)
      if (!userPermissions.permissions.includes(privacyPermission)) {
        return {
          resourceType: 'hangout',
          resourceId: hangoutId,
          action: action as any,
          userId,
          granted: false,
          reason: 'Insufficient privacy level permission'
        }
      }

      // Check action-specific permissions
      const actionPermission = RBACService.getActionPermission('hangout', action as any)
      if (!userPermissions.permissions.includes(actionPermission)) {
        return {
          resourceType: 'hangout',
          resourceId: hangoutId,
          action: action as any,
          userId,
          granted: false,
          reason: 'Insufficient action permission'
        }
      }

      // Participants can read, but need special permissions for other actions
      if (action === 'read' && isParticipant) {
        return {
          resourceType: 'hangout',
          resourceId: hangoutId,
          action: action as any,
          userId,
          granted: true,
          reason: 'Hangout participant'
        }
      }

      // For other actions, check if user has moderate permission
      if (userPermissions.permissions.includes('hangout:moderate')) {
        return {
          resourceType: 'hangout',
          resourceId: hangoutId,
          action: action as any,
          userId,
          granted: true,
          reason: 'Moderator permission'
        }
      }

      return {
        resourceType: 'hangout',
        resourceId: hangoutId,
        action: action as any,
        userId,
        granted: false,
        reason: 'Insufficient permissions'
      }
    } catch (error) {
      console.error('Error checking hangout access:', error)
      return {
        resourceType: 'hangout',
        resourceId: hangoutId,
        action: action as any,
        userId,
        granted: false,
        reason: 'Error checking access'
      }
    }
  }

  private static async checkUserAccess(
    userId: string,
    targetUserId: string,
    action: string,
    userPermissions: UserPermissions
  ): Promise<ResourceAccess> {
    // Users can only access their own profile, or admins can access any
    if (userId === targetUserId) {
      return {
        resourceType: 'user',
        resourceId: targetUserId,
        action: action as any,
        userId,
        granted: true,
        reason: 'Own profile'
      }
    }

    // Admins can access any user
    if (userPermissions.permissions.includes('admin:users')) {
      return {
        resourceType: 'user',
        resourceId: targetUserId,
        action: action as any,
        userId,
        granted: true,
        reason: 'Admin access'
      }
    }

    return {
      resourceType: 'user',
      resourceId: targetUserId,
      action: action as any,
      userId,
      granted: false,
      reason: 'Can only access own profile'
    }
  }

  private static async checkGroupAccess(
    userId: string,
    groupId: string,
    action: string,
    userPermissions: UserPermissions
  ): Promise<ResourceAccess> {
    try {
      const group = await db.group.findUnique({
        where: { id: groupId },
        select: {
          id: true,
          creatorId: true,
          members: {
            select: { userId: true, role: true }
          }
        }
      })

      if (!group) {
        return {
          resourceType: 'group',
          resourceId: groupId,
          action: action as any,
          userId,
          granted: false,
          reason: 'Group not found'
        }
      }

      // Creator can do anything
      if (group.creatorId === userId) {
        return {
          resourceType: 'group',
          resourceId: groupId,
          action: action as any,
          userId,
          granted: true,
          reason: 'Group creator'
        }
      }

      // Check if user is a member
      const membership = group.members.find(m => m.userId === userId)
      if (!membership) {
        return {
          resourceType: 'group',
          resourceId: groupId,
          action: action as any,
          userId,
          granted: false,
          reason: 'Not a group member'
        }
      }

      // Check action-specific permissions
      const actionPermission = RBACService.getActionPermission('group', action as any)
      if (!userPermissions.permissions.includes(actionPermission)) {
        return {
          resourceType: 'group',
          resourceId: groupId,
          action: action as any,
          userId,
          granted: false,
          reason: 'Insufficient action permission'
        }
      }

      return {
        resourceType: 'group',
        resourceId: groupId,
        action: action as any,
        userId,
        granted: true,
        reason: 'Group member'
      }
    } catch (error) {
      console.error('Error checking group access:', error)
      return {
        resourceType: 'group',
        resourceId: groupId,
        action: action as any,
        userId,
        granted: false,
        reason: 'Error checking access'
      }
    }
  }

  private static async checkCommentAccess(
    userId: string,
    commentId: string,
    action: string,
    userPermissions: UserPermissions
  ): Promise<ResourceAccess> {
    try {
      const comment = await db.comment.findUnique({
        where: { id: commentId },
        select: {
          id: true,
          userId: true,
          contentId: true
        }
      })

      if (!comment) {
        return {
          resourceType: 'comment',
          resourceId: commentId,
          action: action as any,
          userId,
          granted: false,
          reason: 'Comment not found'
        }
      }

      // Comment author can update/delete their own comments
      if (comment.userId === userId && ['update', 'delete'].includes(action)) {
        return {
          resourceType: 'comment',
          resourceId: commentId,
          action: action as any,
          userId,
          granted: true,
          reason: 'Comment author'
        }
      }

      // Check if user can moderate comments
      if (userPermissions.permissions.includes('comment:moderate')) {
        return {
          resourceType: 'comment',
          resourceId: commentId,
          action: action as any,
          userId,
          granted: true,
          reason: 'Moderator permission'
        }
      }

      return {
        resourceType: 'comment',
        resourceId: commentId,
        action: action as any,
        userId,
        granted: false,
        reason: 'Insufficient permissions'
      }
    } catch (error) {
      console.error('Error checking comment access:', error)
      return {
        resourceType: 'comment',
        resourceId: commentId,
        action: action as any,
        userId,
        granted: false,
        reason: 'Error checking access'
      }
    }
  }

  private static async checkPollAccess(
    userId: string,
    pollId: string,
    action: string,
    userPermissions: UserPermissions
  ): Promise<ResourceAccess> {
    try {
      const poll = await db.poll.findUnique({
        where: { id: pollId },
        select: {
          id: true,
          creatorId: true,
          hangoutId: true
        }
      })

      if (!poll) {
        return {
          resourceType: 'poll',
          resourceId: pollId,
          action: action as any,
          userId,
          granted: false,
          reason: 'Poll not found'
        }
      }

      // Poll creator can do anything
      if (poll.creatorId === userId) {
        return {
          resourceType: 'poll',
          resourceId: pollId,
          action: action as any,
          userId,
          granted: true,
          reason: 'Poll creator'
        }
      }

      // Check if user can moderate polls
      if (userPermissions.permissions.includes('poll:moderate')) {
        return {
          resourceType: 'poll',
          resourceId: pollId,
          action: action as any,
          userId,
          granted: true,
          reason: 'Moderator permission'
        }
      }

      // Check if user is participant in the hangout
      const hangoutAccess = await RBACService.checkHangoutAccess(userId, poll.hangoutId, 'read', userPermissions)
      if (hangoutAccess.granted && action === 'vote') {
        return {
          resourceType: 'poll',
          resourceId: pollId,
          action: action as any,
          userId,
          granted: true,
          reason: 'Hangout participant'
        }
      }

      return {
        resourceType: 'poll',
        resourceId: pollId,
        action: action as any,
        userId,
        granted: false,
        reason: 'Insufficient permissions'
      }
    } catch (error) {
      console.error('Error checking poll access:', error)
      return {
        resourceType: 'poll',
        resourceId: pollId,
        action: action as any,
        userId,
        granted: false,
        reason: 'Error checking access'
      }
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private static getPrivacyPermission(privacyLevel: string): Permission {
    switch (privacyLevel) {
      case 'PRIVATE':
        return 'hangout:view_private'
      case 'FRIENDS_ONLY':
        return 'hangout:view_friends_only'
      case 'PUBLIC':
        return 'hangout:view_public'
      default:
        return 'hangout:view_public'
    }
  }

  private static getActionPermission(resourceType: string, action: string): Permission {
    return `${resourceType}:${action}` as Permission
  }

  /**
   * Check if user can invite to hangout
   */
  static async canInviteToHangout(userId: string, hangoutId: string): Promise<boolean> {
    try {
      const access = await RBACService.canAccessResource(userId, 'hangout', hangoutId, 'invite')
      return access.granted
    } catch (error) {
      console.error('Error checking hangout invite permission:', error)
      return false
    }
  }

  /**
   * Check if user can moderate content
   */
  static async canModerate(userId: string, resourceType: string, resourceId: string): Promise<boolean> {
    try {
      const access = await RBACService.canAccessResource(userId, resourceType as any, resourceId, 'moderate')
      return access.granted
    } catch (error) {
      console.error('Error checking moderate permission:', error)
      return false
    }
  }

  /**
   * Get all users with a specific role
   */
  static async getUsersByRole(role: Role): Promise<Array<{ id: string; email: string; username: string; name: string }>> {
    try {
      const users = await db.user.findMany({
        where: { role, isActive: true },
        select: {
          id: true,
          email: true,
          username: true,
          name: true
        }
      })
      return users
    } catch (error) {
      console.error('Error getting users by role:', error)
      return []
    }
  }

  /**
   * Update user role
   */
  static async updateUserRole(userId: string, newRole: Role): Promise<boolean> {
    try {
      await db.user.update({
        where: { id: userId },
        data: { role: newRole }
      })
      return true
    } catch (error) {
      console.error('Error updating user role:', error)
      return false
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export const rbac = {
  getUserPermissions: RBACService.getUserPermissions,
  hasPermission: RBACService.hasPermission,
  hasAnyPermission: RBACService.hasAnyPermission,
  hasAllPermissions: RBACService.hasAllPermissions,
  canAccessResource: RBACService.canAccessResource,
  canInviteToHangout: RBACService.canInviteToHangout,
  canModerate: RBACService.canModerate,
  getUsersByRole: RBACService.getUsersByRole,
  updateUserRole: RBACService.updateUserRole
}
