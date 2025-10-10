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
  X
} from "lucide-react"
import { useNotificationPreferences } from "@/hooks/use-notification-preferences"
import { toast } from "sonner"

interface NotificationSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const {
    preferences,
    isLoading,
    isSaving,
    error,
    togglePreference,
    resetToDefaults
  } = useNotificationPreferences()

  const [hasChanges, setHasChanges] = useState(false)

  if (!isOpen) return null

  const handleToggle = async (key: keyof typeof preferences) => {
    if (!preferences) return

    const success = await togglePreference(key)
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
        <Card className="w-full max-w-2xl">
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
        <Card className="w-full max-w-2xl">
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
        
        <CardContent className="space-y-6">
          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              General Settings
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="inAppNotifications" className="flex items-center">
                    <Bell className="w-4 h-4 mr-2" />
                    In-App Notifications
                  </Label>
                  <p className="text-sm text-gray-600">
                    Show notifications within the app
                  </p>
                </div>
                <Switch
                  id="inAppNotifications"
                  checked={preferences.inAppNotifications}
                  onCheckedChange={() => handleToggle('inAppNotifications')}
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="emailNotifications" className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Email Notifications
                  </Label>
                  <p className="text-sm text-gray-600">
                    Send notifications via email
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={preferences.emailNotifications}
                  onCheckedChange={() => handleToggle('emailNotifications')}
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="pushNotifications" className="flex items-center">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Push Notifications
                  </Label>
                  <p className="text-sm text-gray-600">
                    Send push notifications to your device
                  </p>
                </div>
                <Switch
                  id="pushNotifications"
                  checked={preferences.pushNotifications}
                  onCheckedChange={() => handleToggle('pushNotifications')}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Message Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Messages
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="messageNotifications" className="flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Direct Messages
                  </Label>
                  <p className="text-sm text-gray-600">
                    Notify me about new messages
                  </p>
                </div>
                <Switch
                  id="messageNotifications"
                  checked={preferences.messageNotifications}
                  onCheckedChange={() => handleToggle('messageNotifications')}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Hangout Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Hangouts
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="hangoutNotifications" className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Hangout Updates
                  </Label>
                  <p className="text-sm text-gray-600">
                    Notify me about hangout changes, votes, and RSVPs
                  </p>
                </div>
                <Switch
                  id="hangoutNotifications"
                  checked={preferences.hangoutNotifications}
                  onCheckedChange={() => handleToggle('hangoutNotifications')}
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="reminderNotifications" className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Reminders
                  </Label>
                  <p className="text-sm text-gray-600">
                    Send reminders before hangouts and events
                  </p>
                </div>
                <Switch
                  id="reminderNotifications"
                  checked={preferences.reminderNotifications}
                  onCheckedChange={() => handleToggle('reminderNotifications')}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Event Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Events
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="eventNotifications" className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Event Updates
                  </Label>
                  <p className="text-sm text-gray-600">
                    Notify me about events I'm interested in
                  </p>
                </div>
                <Switch
                  id="eventNotifications"
                  checked={preferences.eventNotifications}
                  onCheckedChange={() => handleToggle('eventNotifications')}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* System Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              System
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="systemNotifications" className="flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    System Updates
                  </Label>
                  <p className="text-sm text-gray-600">
                    Notify me about app updates and maintenance
                  </p>
                </div>
                <Switch
                  id="systemNotifications"
                  checked={preferences.systemNotifications}
                  onCheckedChange={() => handleToggle('systemNotifications')}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSaving}
              className="flex items-center"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
            
            <div className="text-sm text-gray-500">
              Changes are saved automatically
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
