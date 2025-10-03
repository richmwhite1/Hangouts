"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { rbac, Role, Permission } from '@/lib/rbac'
import { auditLogger } from '@/lib/audit-logger'
import { AdminOnly, PermissionGate } from '@/components/permission-based-ui'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface User {
  id: string
  email: string
  username: string
  name: string
  role: Role
  isActive: boolean
  lastSeen: Date
  createdAt: Date
}

interface AuditLog {
  id: string
  entityType: string
  entityId: string
  action: string
  userId?: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

interface SecurityEvent {
  userId?: string
  action: string
  resource?: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  timestamp: Date
}

// ============================================================================
// ADMIN DASHBOARD COMPONENT
// ============================================================================

export default function AdminDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'audit' | 'security'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      switch (activeTab) {
        case 'users':
          await loadUsers()
          break
        case 'audit':
          await loadAuditLogs()
          break
        case 'security':
          await loadSecurityEvents()
          break
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const loadUsers = async () => {
    // This would typically be an API call
    // For now, we'll simulate it
    setUsers([])
  }

  const loadAuditLogs = async () => {
    // This would typically be an API call
    setAuditLogs([])
  }

  const loadSecurityEvents = async () => {
    // This would typically be an API call
    setSecurityEvents([])
  }

  const updateUserRole = async (userId: string, newRole: Role) => {
    try {
      const success = await rbac.updateUserRole(userId, newRole)
      if (success) {
        // Log admin action
        await auditLogger.logAdminAction(
          'update_user_role',
          'user',
          userId,
          user?.userId || 'system',
          { oldRole: users.find(u => u.id === userId)?.role },
          { newRole },
          '127.0.0.1', // In real app, get from request
          'Admin Dashboard'
        )
        
        // Refresh users
        await loadUsers()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-100'
      case 'HIGH': return 'text-orange-600 bg-orange-100'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100'
      case 'LOW': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <AdminOnly fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage users, permissions, and monitor system activity</p>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-8">
            <nav className="flex space-x-8">
              {[
                { id: 'users', label: 'Users', icon: '👥' },
                { id: 'permissions', label: 'Permissions', icon: '🔐' },
                { id: 'audit', label: 'Audit Logs', icon: '📋' },
                { id: 'security', label: 'Security Events', icon: '🛡️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="text-red-600 mb-4">⚠️ Error</div>
                <p className="text-gray-600">{error}</p>
                <button
                  onClick={loadData}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="p-6">
                {activeTab === 'users' && (
                  <UsersTab users={users} onUpdateRole={updateUserRole} />
                )}
                {activeTab === 'permissions' && (
                  <PermissionsTab />
                )}
                {activeTab === 'audit' && (
                  <AuditLogsTab logs={auditLogs} />
                )}
                {activeTab === 'security' && (
                  <SecurityEventsTab events={securityEvents} getSeverityColor={getSeverityColor} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminOnly>
  )
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

function UsersTab({ users, onUpdateRole }: { users: User[]; onUpdateRole: (userId: string, role: Role) => void }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">@{user.username}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                    user.role === 'MODERATOR' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.lastSeen).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <select
                    value={user.role}
                    onChange={(e) => onUpdateRole(user.id, e.target.value as Role)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                  >
                    <option value="USER">User</option>
                    <option value="MODERATOR">Moderator</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PermissionsTab() {
  const [permissions, setPermissions] = useState<Record<Role, Permission[]>>({})

  useEffect(() => {
    // Load permissions for each role
    const loadPermissions = async () => {
      // This would typically be an API call
      // For now, we'll show the static permissions
      setPermissions({
        USER: ['hangout:create', 'hangout:read', 'user:read', 'friend:manage'],
        MODERATOR: ['hangout:moderate', 'user:moderate', 'comment:moderate'],
        ADMIN: ['admin:access', 'admin:users', 'admin:hangouts'],
        SUPER_ADMIN: ['admin:system', 'admin:audit_logs']
      })
    }

    loadPermissions()
  }, [])

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Role Permissions</h2>
      <div className="space-y-6">
        {Object.entries(permissions).map(([role, rolePermissions]) => (
          <div key={role} className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">{role}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {rolePermissions.map((permission) => (
                <span
                  key={permission}
                  className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                >
                  {permission}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AuditLogsTab({ logs }: { logs: AuditLog[] }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Audit Logs</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {log.action}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.entityType}:{log.entityId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.userId || 'System'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.ipAddress || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SecurityEventsTab({ events, getSeverityColor }: { events: SecurityEvent[]; getSeverityColor: (severity: string) => string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Events</h2>
      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(event.severity)}`}>
                    {event.severity}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{event.action}</span>
                </div>
                {event.resource && (
                  <div className="text-sm text-gray-500 mt-1">Resource: {event.resource}</div>
                )}
                {event.userId && (
                  <div className="text-sm text-gray-500">User: {event.userId}</div>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {new Date(event.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}












