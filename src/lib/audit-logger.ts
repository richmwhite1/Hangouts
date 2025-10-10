import { db } from './db'
import { ResourceAccess } from './rbac'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AuditLogEntry {
  id: string
  entityType: string
  entityId: string
  action: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  userId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
  createdAt: Date
}

export interface PermissionCheckLog {
  userId: string
  permission: string
  resourceType?: string
  resourceId?: string
  granted: boolean
  reason?: string
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

export interface SecurityEvent {
  userId?: string
  action: string
  resource?: string
  ipAddress?: string
  userAgent?: string
  details?: Record<string, any>
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  timestamp: Date
}

// ============================================================================
// AUDIT LOGGER CLASS
// ============================================================================

export class AuditLogger {
  /**
   * Log a general audit event
   */
  static async logAuditEvent(
    entityType: string,
    entityId: string,
    action: string,
    userId?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await db.audit_logs.create({
        data: {
          entityType,
          entityId,
          action,
          oldValues: oldValues ? JSON.stringify(oldValues) : null,
          newValues: newValues ? JSON.stringify(newValues) : null,
          userId,
          ipAddress,
          userAgent,
          createdAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error logging audit event:', error)
    }
  }

  /**
   * Log a permission check
   */
  static async logPermissionCheck(
    userId: string,
    permission: string,
    granted: boolean,
    resourceType?: string,
    resourceId?: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // Log to security logs for permission checks
      await db.securityLog.create({
        data: {
          userId,
          action: `permission_check:${permission}`,
          resource: resourceType ? `${resourceType}:${resourceId}` : null,
          ipAddress,
          userAgent,
          details: JSON.stringify({
            permission,
            granted,
            reason,
            resourceType,
            resourceId
          }),
          createdAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error logging permission check:', error)
    }
  }

  /**
   * Log a resource access check
   */
  static async logResourceAccess(
    access: ResourceAccess,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await db.securityLog.create({
        data: {
          userId: access.userId,
          action: `resource_access:${access.resourceType}:${access.action}`,
          resource: `${access.resourceType}:${access.resourceId}`,
          ipAddress,
          userAgent,
          details: JSON.stringify({
            resourceType: access.resourceType,
            resourceId: access.resourceId,
            action: access.action,
            granted: access.granted,
            reason: access.reason
          }),
          createdAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error logging resource access:', error)
    }
  }

  /**
   * Log a security event
   */
  static async logSecurityEvent(
    action: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    userId?: string,
    resource?: string,
    ipAddress?: string,
    userAgent?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      await db.securityLog.create({
        data: {
          userId,
          action,
          resource,
          ipAddress,
          userAgent,
          details: details ? JSON.stringify(details) : null,
          createdAt: new Date()
        }
      })

      // For critical events, also log to console
      if (severity === 'CRITICAL') {
        console.error('CRITICAL SECURITY EVENT:', {
          action,
          userId,
          resource,
          ipAddress,
          userAgent,
          details,
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error logging security event:', error)
    }
  }

  /**
   * Log user authentication events
   */
  static async logAuthEvent(
    action: 'login' | 'logout' | 'login_failed' | 'password_change' | 'account_locked',
    userId?: string,
    email?: string,
    ipAddress?: string,
    userAgent?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const severity = action === 'login_failed' || action === 'account_locked' ? 'HIGH' : 'LOW'
    
    await this.logSecurityEvent(
      `auth:${action}`,
      severity,
      userId,
      email,
      ipAddress,
      userAgent,
      details
    )
  }

  /**
   * Log data access events
   */
  static async logDataAccess(
    action: 'read' | 'create' | 'update' | 'delete',
    resourceType: string,
    resourceId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAuditEvent(
      resourceType,
      resourceId,
      action,
      userId,
      undefined,
      undefined,
      ipAddress,
      userAgent,
      metadata
    )
  }

  /**
   * Log admin actions
   */
  static async logAdminAction(
    action: string,
    targetEntityType: string,
    targetEntityId: string,
    adminUserId: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAuditEvent(
      targetEntityType,
      targetEntityId,
      `admin:${action}`,
      adminUserId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
      { adminAction: true }
    )
  }

  /**
   * Get audit logs for a specific entity
   */
  static async getEntityAuditLogs(
    entityType: string,
    entityId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    try {
      const logs = await db.auditLog.findMany({
        where: {
          entityType,
          entityId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      })

      return logs.map(log => ({
        id: log.id,
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        oldValues: log.oldValues as Record<string, any> || undefined,
        newValues: log.newValues as Record<string, any> || undefined,
        userId: log.userId || undefined,
        ipAddress: log.ipAddress || undefined,
        userAgent: log.userAgent || undefined,
        metadata: undefined,
        createdAt: log.createdAt
      }))
    } catch (error) {
      console.error('Error getting entity audit logs:', error)
      return []
    }
  }

  /**
   * Get security logs for a specific user
   */
  static async getUserSecurityLogs(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SecurityEvent[]> {
    try {
      const logs = await db.securityLog.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      })

      return logs.map(log => ({
        userId: log.userId || undefined,
        action: log.action,
        resource: log.resource || undefined,
        ipAddress: log.ipAddress || undefined,
        userAgent: log.userAgent || undefined,
        details: log.details as Record<string, any> || undefined,
        severity: this.determineSeverity(log.action),
        timestamp: log.createdAt
      }))
    } catch (error) {
      console.error('Error getting user security logs:', error)
      return []
    }
  }

  /**
   * Get recent security events by severity
   */
  static async getRecentSecurityEvents(
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    limit: number = 100,
    offset: number = 0
  ): Promise<SecurityEvent[]> {
    try {
      const logs = await db.securityLog.findMany({
        where: severity ? {
          // Note: We don't have a severity field in the current schema
          // This would need to be added or we'd need to filter by action patterns
        } : {},
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      })

      return logs
        .map(log => ({
          userId: log.userId || undefined,
          action: log.action,
          resource: log.resource || undefined,
          ipAddress: log.ipAddress || undefined,
          userAgent: log.userAgent || undefined,
          details: log.details as Record<string, any> || undefined,
          severity: this.determineSeverity(log.action),
          timestamp: log.createdAt
        }))
        .filter(log => !severity || log.severity === severity)
    } catch (error) {
      console.error('Error getting recent security events:', error)
      return []
    }
  }

  /**
   * Determine severity based on action
   */
  private static determineSeverity(action: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (action.includes('CRITICAL') || action.includes('account_locked') || action.includes('unauthorized_access')) {
      return 'CRITICAL'
    }
    if (action.includes('HIGH') || action.includes('login_failed') || action.includes('permission_denied')) {
      return 'HIGH'
    }
    if (action.includes('MEDIUM') || action.includes('suspicious') || action.includes('rate_limit')) {
      return 'MEDIUM'
    }
    return 'LOW'
  }

  /**
   * Clean up old audit logs (run periodically)
   */
  static async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const deletedAuditLogs = await db.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      })

      const deletedSecurityLogs = await db.securityLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      })

      return deletedAuditLogs.count + deletedSecurityLogs.count
    } catch (error) {
      console.error('Error cleaning up old logs:', error)
      return 0
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export const auditLogger = {
  logAuditEvent: AuditLogger.logAuditEvent,
  logPermissionCheck: AuditLogger.logPermissionCheck,
  logResourceAccess: AuditLogger.logResourceAccess,
  logSecurityEvent: AuditLogger.logSecurityEvent,
  logAuthEvent: AuditLogger.logAuthEvent,
  logDataAccess: AuditLogger.logDataAccess,
  logAdminAction: AuditLogger.logAdminAction,
  getEntityAuditLogs: AuditLogger.getEntityAuditLogs,
  getUserSecurityLogs: AuditLogger.getUserSecurityLogs,
  getRecentSecurityEvents: AuditLogger.getRecentSecurityEvents,
  cleanupOldLogs: AuditLogger.cleanupOldLogs
}





