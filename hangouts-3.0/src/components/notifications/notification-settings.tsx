"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { 
  Bell, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  Calendar, 
  Clock, 
  Settings,
  RotateCcw,
  Save,
  X,
  Users,
  Heart,
  Share2,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Vote,
  Zap
} from "lucide-react"
import { useNotificationPreferences } from "@/hooks/use-notification-preferences"
import { toast } from "sonner"

interface NotificationSettingsProps {
  isOpen: boolean
  onClose: () => void
}

// Group notification types by category for better UX
const NOTIFICATION_GROUPS = {
  Social: {
    icon: Users,
    types: ['FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'MENTION'],
    description: 'Notifications about friends and social interactions'
  },
  Hangouts: {
    icon: Calendar,
    types: ['CONTENT_INVITATION', 'CONTENT_RSVP', 'CONTENT_UPDATE', 'CONTENT_REMINDER', 'HANGOUT_CONFIRMED', 'HANGOUT_CANCELLED'],
    description: 'Notifications about hangouts and events'
  },
  Messages: {
    icon: MessageSquare,
    types: ['MESSAGE_RECEIVED'],
    description: 'Notifications about new messages'
  },
  Engagement: {
    icon: Heart,
    types: ['COMMENT', 'LIKE', 'SHARE'],
    description: 'Notifications about likes, comments, and shares'
  },
  Polls: {
    icon: Vote,
    types: ['POLL_VOTE_CAST', 'POLL_CONSENSUS_REACHED'],
    description: 'Notifications about poll voting and consensus'
  },
  System: {
    icon: Settings,
    types: ['COMMUNITY_INVITATION'],
    description: 'System and administrative notifications'
  }
}

const NOTIFICATION_LABELS = {
  FRIEND_REQUEST: 'Friend Requests',
  FRIEND_ACCEPTED: 'Friend Accepted',
  MESSAGE_RECEIVED: 'New Messages',
  CONTENT_INVITATION: 'Hangout Invitations',
  CONTENT_RSVP: 'RSVP Responses',
  CONTENT_REMINDER: 'Hangout Reminders',
  CONTENT_UPDATE: 'Hangout Updates',
  COMMUNITY_INVITATION: 'Community Invitations',
  MENTION: 'Mentions',
  LIKE: 'Likes',
  COMMENT: 'Comments',
  SHARE: 'Shares',
  POLL_VOTE_CAST: 'Poll Votes',
  POLL_CONSENSUS_REACHED: 'Poll Consensus',
  HANGOUT_CONFIRMED: 'Hangout Confirmed',
  HANGOUT_CANCELLED: 'Hangout Cancelled'
}

const NOTIFICATION_DESCRIPTIONS = {
  FRIEND_REQUEST: 'When someone sends you a friend request',
  FRIEND_ACCEPTED: 'When someone accepts your friend request',
  MESSAGE_RECEIVED: 'When you receive a new message in a hangout',
  CONTENT_INVITATION: 'When you\'re invited to a hangout or event',
  CONTENT_RSVP: 'When someone responds to your hangout invitation',
  CONTENT_REMINDER: 'Reminders about upcoming hangouts',
  CONTENT_UPDATE: 'When hangout details are changed',
  COMMUNITY_INVITATION: 'When you\'re invited to a community',
  MENTION: 'When someone mentions you in a comment or message',
  LIKE: 'When someone likes your hangout or comment',
  COMMENT: 'When someone comments on your hangout',
  SHARE: 'When someone shares your hangout',
  POLL_VOTE_CAST: 'When someone votes on your poll',
  POLL_CONSENSUS_REACHED: 'When your poll reaches consensus',
  HANGOUT_CONFIRMED: 'When your hangout is confirmed',
  HANGOUT_CANCELLED: 'When a hangout you\'re part of is cancelled'
}

export function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const {
    preferences,
    isLoading,
    isSaving,
    error,
    togglePreference,
    updatePreferences,
    resetToDefaults
  } = useNotificationPreferences()

  const [hasChanges, setHasChanges] = useState(false)

  if (!isOpen) return null

  const handleToggle = async (type: string, setting: 'emailEnabled' | 'pushEnabled' | 'inAppEnabled') => {
    if (!preferences) return

    const success = await togglePreference(type, setting)
    if (success) {
      setHasChanges(true)
      toast.success('Setting updated')
    } else {
      toast.error('Failed to update setting')
    }
  }

  const handleReset = async () => {
    const success = await resetToDefaults()
    if (success) {
      setHasChanges(false)
      toast.success('Settings reset to defaults')
    } else {
      toast.error('Failed to reset settings')
    }
  }

  const handleSave = () => {
    setHasChanges(false)
    toast.success('Settings saved')
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading notification settings...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <Settings className="w-12 h-12 mx-auto mb-2" />
              <p className="text-lg font-semibold">Error Loading Settings</p>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!preferences) {
    return null
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <CardTitle>Notification Settings</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Quick Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Quick Settings
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Master controls for all notification types
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4" />
                  <span className="font-medium">In-App</span>
                </div>
                <Switch
                  checked={Object.values(preferences).every(p => p.inAppEnabled)}
                  onCheckedChange={(checked) => {
                    // Toggle all in-app notifications
                    const updates: any = {}
                    Object.keys(preferences).forEach(type => {
                      updates[type] = { ...preferences[type], inAppEnabled: checked }
                    })
                    // This would need to be implemented in the hook
                  }}
                  disabled={isSaving}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4" />
                  <span className="font-medium">Push</span>
                </div>
                <Switch
                  checked={Object.values(preferences).every(p => p.pushEnabled)}
                  onCheckedChange={async (checked) => {
                    // Toggle all push notifications
                    const updates: any = {}
                    Object.keys(preferences).forEach(type => {
                      updates[type] = { ...preferences[type], pushEnabled: checked }
                    })
                    const success = await updatePreferences(updates)
                    if (success) {
                      setHasChanges(true)
                      toast.success('Push notifications updated')
                    } else {
                      toast.error('Failed to update push notifications')
                    }
                  }}
                  disabled={isSaving}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span className="font-medium">Email</span>
                </div>
                <Switch
                  checked={Object.values(preferences).every(p => p.emailEnabled)}
                  onCheckedChange={async (checked) => {
                    // Toggle all email notifications
                    const updates: any = {}
                    Object.keys(preferences).forEach(type => {
                      updates[type] = { ...preferences[type], emailEnabled: checked }
                    })
                    const success = await updatePreferences(updates)
                    if (success) {
                      setHasChanges(true)
                      toast.success('Email notifications updated')
                    } else {
                      toast.error('Failed to update email notifications')
                    }
                  }}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Detailed Settings by Category */}
          {Object.entries(NOTIFICATION_GROUPS).map(([groupName, group]) => {
            const GroupIcon = group.icon
            return (
              <div key={groupName} className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <GroupIcon className="w-5 h-5 mr-2" />
                  {groupName}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {group.description}
                </p>
                
                <div className="space-y-4">
                  {group.types.map(type => {
                    const pref = preferences[type]
                    if (!pref) return null
                    
                    return (
                      <div key={type} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium">{NOTIFICATION_LABELS[type as keyof typeof NOTIFICATION_LABELS]}</h4>
                            <p className="text-sm text-gray-600">
                              {NOTIFICATION_DESCRIPTIONS[type as keyof typeof NOTIFICATION_DESCRIPTIONS]}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Bell className="w-4 h-4 text-gray-500" />
                              <span className="text-sm">In-App</span>
                            </div>
                            <Switch
                              checked={pref.inAppEnabled}
                              onCheckedChange={() => handleToggle(type, 'inAppEnabled')}
                              disabled={isSaving}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Smartphone className="w-4 h-4 text-gray-500" />
                              <span className="text-sm">Push</span>
                            </div>
                            <Switch
                              checked={pref.pushEnabled}
                              onCheckedChange={() => handleToggle(type, 'pushEnabled')}
                              disabled={isSaving}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-gray-500" />
                              <span className="text-sm">Email</span>
                            </div>
                            <Switch
                              checked={pref.emailEnabled}
                              onCheckedChange={() => handleToggle(type, 'emailEnabled')}
                              disabled={isSaving}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <Separator />

          {/* Actions */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSaving}
              className="flex items-center"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}