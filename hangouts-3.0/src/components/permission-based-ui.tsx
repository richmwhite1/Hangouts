"use client"
import { ReactNode, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { rbac, Permission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface PermissionGateProps {
  children: ReactNode
  permissions: Permission | Permission[]
  fallback?: ReactNode
  requireAll?: boolean
  resourceType?: 'hangout' | 'user' | 'group' | 'comment' | 'poll'
  resourceId?: string
  action?: 'read' | 'update' | 'delete' | 'invite' | 'moderate'
}
interface RoleGateProps {
  children: ReactNode
  roles: string | string[]
  fallback?: ReactNode
  requireAll?: boolean
}
interface ConditionalRenderProps {
  condition: boolean
  children: ReactNode
  fallback?: ReactNode
}
// ============================================================================
// PERMISSION GATE COMPONENT
// ============================================================================
export function PermissionGate({
  children,
  permissions,
  fallback = null,
  requireAll = false,
  resourceType,
  resourceId,
  action
}: PermissionGateProps) {
  const { user } = useAuth()
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    if (!user) {
      setHasPermission(false)
      setIsLoading(false)
      return
    }
    const checkPermission = async () => {
      try {
        let result: boolean
        if (resourceType && resourceId && action) {
          // Check resource-specific access
          const access = await rbac.canAccessResource(user.userId, resourceType, resourceId, action)
          result = access.granted
        } else {
          // Check general permissions
          const permissionArray = Array.isArray(permissions) ? permissions : [permissions]
          if (requireAll) {
            result = await rbac.hasAllPermissions(user.userId, permissionArray)
          } else {
            result = await rbac.hasAnyPermission(user.userId, permissionArray)
          }
        }
        setHasPermission(result)
      } catch (error) {
        logger.error('Error checking permission:', error);
        setHasPermission(false)
      } finally {
        setIsLoading(false)
      }
    }
    checkPermission()
  }, [user, permissions, requireAll, resourceType, resourceId, action])
  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 rounded h-4 w-20"></div>
  }
  if (hasPermission) {
    return <>{children}</>
  }
  return <>{fallback}</>
}
// ============================================================================
// ROLE GATE COMPONENT
// ============================================================================
export function RoleGate({
  children,
  roles,
  fallback = null,
  requireAll = false
}: RoleGateProps) {
  const { user } = useAuth()
  const [hasRole, setHasRole] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    if (!user) {
      setHasRole(false)
      setIsLoading(false)
      return
    }
    const checkRole = async () => {
      try {
        const userPermissions = await rbac.getUserPermissions(user.userId)
        const roleArray = Array.isArray(roles) ? roles : [roles]
        let result: boolean
        if (requireAll) {
          result = roleArray.every(role => userPermissions.role === role)
        } else {
          result = roleArray.includes(userPermissions.role)
        }
        setHasRole(result)
      } catch (error) {
        logger.error('Error checking role:', error);
        setHasRole(false)
      } finally {
        setIsLoading(false)
      }
    }
    checkRole()
  }, [user, roles, requireAll])
  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 rounded h-4 w-20"></div>
  }
  if (hasRole) {
    return <>{children}</>
  }
  return <>{fallback}</>
}
// ============================================================================
// CONDITIONAL RENDER COMPONENT
// ============================================================================
export function ConditionalRender({
  condition,
  children,
  fallback = null
}: ConditionalRenderProps) {
  return condition ? <>{children}</> : <>{fallback}</>
}
// ============================================================================
// PERMISSION-BASED BUTTON COMPONENT
// ============================================================================
interface PermissionButtonProps {
  permissions: Permission | Permission[]
  onClick: () => void
  children: ReactNode
  className?: string
  disabled?: boolean
  requireAll?: boolean
  resourceType?: 'hangout' | 'user' | 'group' | 'comment' | 'poll'
  resourceId?: string
  action?: 'read' | 'update' | 'delete' | 'invite' | 'moderate'
}
export function PermissionButton({
  permissions,
  onClick,
  children,
  className = '',
  disabled = false,
  requireAll = false,
  resourceType,
  resourceId,
  action
}: PermissionButtonProps) {
  return (
    <PermissionGate
      permissions={permissions}
      requireAll={requireAll}
      resourceType={resourceType}
      resourceId={resourceId}
      action={action}
      fallback={
        <button
          className={`${className} opacity-50 cursor-not-allowed`}
          disabled
          title="You don't have permission to perform this action"
        >
          {children}
        </button>
      }
    >
      <button
        className={className}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    </PermissionGate>
  )
}
// ============================================================================
// PERMISSION-BASED LINK COMPONENT
// ============================================================================
interface PermissionLinkProps {
  permissions: Permission | Permission[]
  href: string
  children: ReactNode
  className?: string
  requireAll?: boolean
  resourceType?: 'hangout' | 'user' | 'group' | 'comment' | 'poll'
  resourceId?: string
  action?: 'read' | 'update' | 'delete' | 'invite' | 'moderate'
}
export function PermissionLink({
  permissions,
  href,
  children,
  className = '',
  requireAll = false,
  resourceType,
  resourceId,
  action
}: PermissionLinkProps) {
  return (
    <PermissionGate
      permissions={permissions}
      requireAll={requireAll}
      resourceType={resourceType}
      resourceId={resourceId}
      action={action}
      fallback={
        <span
          className={`${className} opacity-50 cursor-not-allowed`}
          title="You don't have permission to access this resource"
        >
          {children}
        </span>
      }
    >
      <a href={href} className={className}>
        {children}
      </a>
    </PermissionGate>
  )
}
// ============================================================================
// PERMISSION-BASED FORM COMPONENT
// ============================================================================
interface PermissionFormProps {
  permissions: Permission | Permission[]
  onSubmit: (e: React.FormEvent) => void
  children: ReactNode
  className?: string
  requireAll?: boolean
  resourceType?: 'hangout' | 'user' | 'group' | 'comment' | 'poll'
  resourceId?: string
  action?: 'read' | 'update' | 'delete' | 'invite' | 'moderate'
}
export function PermissionForm({
  permissions,
  onSubmit,
  children,
  className = '',
  requireAll = false,
  resourceType,
  resourceId,
  action
}: PermissionFormProps) {
  return (
    <PermissionGate
      permissions={permissions}
      requireAll={requireAll}
      resourceType={resourceType}
      resourceId={resourceId}
      action={action}
      fallback={
        <div className={`${className} opacity-50 pointer-events-none`}>
          <div className="text-center text-gray-500 py-4">
            You don't have permission to perform this action
          </div>
        </div>
      }
    >
      <form onSubmit={onSubmit} className={className}>
        {children}
      </form>
    </PermissionGate>
  )
}
// ============================================================================
// PERMISSION HOOKS
// ============================================================================
export function usePermission(permission: Permission): boolean | null {
  const { user } = useAuth()
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    if (!user) {
      setHasPermission(false)
      setIsLoading(false)
      return
    }
    const checkPermission = async () => {
      try {
        const result = await rbac.hasPermission(user.userId, permission)
        setHasPermission(result)
      } catch (error) {
        logger.error('Error checking permission:', error);
        setHasPermission(false)
      } finally {
        setIsLoading(false)
      }
    }
    checkPermission()
  }, [user, permission])
  return isLoading ? null : hasPermission
}
export function usePermissions(permissions: Permission[], requireAll = false): boolean | null {
  const { user } = useAuth()
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    if (!user) {
      setHasPermissions(false)
      setIsLoading(false)
      return
    }
    const checkPermissions = async () => {
      try {
        let result: boolean
        if (requireAll) {
          result = await rbac.hasAllPermissions(user.userId, permissions)
        } else {
          result = await rbac.hasAnyPermission(user.userId, permissions)
        }
        setHasPermissions(result)
      } catch (error) {
        logger.error('Error checking permissions:', error);
        setHasPermissions(false)
      } finally {
        setIsLoading(false)
      }
    }
    checkPermissions()
  }, [user, permissions, requireAll])
  return isLoading ? null : hasPermissions
}
export function useRole(role: string): boolean | null {
  const { user } = useAuth()
  const [hasRole, setHasRole] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    if (!user) {
      setHasRole(false)
      setIsLoading(false)
      return
    }
    const checkRole = async () => {
      try {
        const userPermissions = await rbac.getUserPermissions(user.userId)
        setHasRole(userPermissions.role === role)
      } catch (error) {
        logger.error('Error checking role:', error);
        setHasRole(false)
      } finally {
        setIsLoading(false)
      }
    }
    checkRole()
  }, [user, role])
  return isLoading ? null : hasRole
}
// ============================================================================
// CONVENIENCE COMPONENTS
// ============================================================================
export const AdminOnly = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => (
  <RoleGate roles="ADMIN" fallback={fallback}>
    {children}
  </RoleGate>
)
export const ModeratorOnly = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => (
  <RoleGate roles={['MODERATOR', 'ADMIN', 'SUPER_ADMIN']} fallback={fallback}>
    {children}
  </RoleGate>
)
export const HangoutCreator = ({
  hangoutId,
  children,
  fallback = null
}: {
  hangoutId: string;
  children: ReactNode;
  fallback?: ReactNode
}) => (
  <PermissionGate
    permissions="hangout:update"
    resourceType="hangout"
    resourceId={hangoutId}
    action="update"
    fallback={fallback}
  >
    {children}
  </PermissionGate>
)
export const HangoutParticipant = ({
  hangoutId,
  children,
  fallback = null
}: {
  hangoutId: string;
  children: ReactNode;
  fallback?: ReactNode
}) => (
  <PermissionGate
    permissions="hangout:read"
    resourceType="hangout"
    resourceId={hangoutId}
    action="read"
    fallback={fallback}
  >
    {children}
  </PermissionGate>
)





