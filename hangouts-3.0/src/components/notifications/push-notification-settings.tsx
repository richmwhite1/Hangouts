'use client'

import { useState } from 'react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Bell, BellOff, Smartphone, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PushNotificationSettingsProps {
  className?: string
}

export function PushNotificationSettings({ className }: PushNotificationSettingsProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    testNotification
  } = usePushNotifications()

  const [isTesting, setIsTesting] = useState(false)

  const handleToggleSubscription = async () => {
    if (isSubscribed) {
      const success = await unsubscribe()
      if (success) {
        toast.success('Push notifications disabled')
      } else {
        toast.error('Failed to disable push notifications')
      }
    } else {
      const success = await subscribe()
      if (success) {
        toast.success('Push notifications enabled')
      } else {
        toast.error('Failed to enable push notifications')
      }
    }
  }

  const handleTestNotification = async () => {
    setIsTesting(true)
    const success = await testNotification()
    if (success) {
      toast.success('Test notification sent!')
    } else {
      toast.error('Failed to send test notification')
    }
    setIsTesting(false)
  }

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Granted</Badge>
      case 'denied':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Denied</Badge>
      default:
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Not Set</Badge>
    }
  }

  const getSubscriptionStatus = () => {
    if (isSubscribed) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Subscribed</Badge>
    } else {
      return <Badge variant="secondary"><BellOff className="w-3 h-3 mr-1" />Not Subscribed</Badge>
    }
  }

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Configure push notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Push notifications are not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive notifications even when the app is closed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Permission Status</span>
              {getPermissionBadge()}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Subscription Status</span>
              {getSubscriptionStatus()}
            </div>
          </div>
        </div>

        <Separator />

        {/* Main Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              <span className="font-medium">Enable Push Notifications</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Receive notifications for hangouts, messages, and friend requests
            </p>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggleSubscription}
            disabled={isLoading || permission === 'denied'}
          />
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Permission Denied Warning */}
        {permission === 'denied' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Push notifications are blocked. Please enable them in your browser settings:
              <br />
              <strong>Chrome:</strong> Click the lock icon in the address bar → Notifications → Allow
              <br />
              <strong>Firefox:</strong> Click the shield icon → Permissions → Notifications → Allow
              <br />
              <strong>Safari:</strong> Safari → Preferences → Websites → Notifications → Allow
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {permission === 'default' && !isSubscribed && (
            <Button
              onClick={requestPermission}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Bell className="w-4 h-4 mr-2" />
              )}
              Request Permission
            </Button>
          )}

          {isSubscribed && (
            <Button
              onClick={handleTestNotification}
              disabled={isTesting || isLoading}
              variant="outline"
              className="flex-1"
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Bell className="w-4 h-4 mr-2" />
              )}
              Send Test Notification
            </Button>
          )}
        </div>

        {/* Browser Compatibility Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Supported browsers:</strong> Chrome 42+, Firefox 44+, Safari 16.4+, Edge 17+</p>
          <p><strong>Mobile:</strong> Chrome Android, Safari iOS 16.4+, Samsung Internet</p>
          <p><strong>Note:</strong> iOS Safari requires iOS 16.4+ for push notifications</p>
        </div>
      </CardContent>
    </Card>
  )
}
