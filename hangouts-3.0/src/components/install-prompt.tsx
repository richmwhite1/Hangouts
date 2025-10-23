'use client'

import { useState, useEffect } from 'react'
import { Download, X, Smartphone, Monitor, Tablet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { showInstallPrompt, canInstall, isPWA } from '@/lib/register-sw'

interface InstallPromptProps {
  className?: string
}

export function InstallPrompt({ className }: InstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown')

  useEffect(() => {
    // Check if already installed as PWA
    if (isPWA()) {
      return
    }

    // Check if install prompt is available
    if (canInstall()) {
      setShowPrompt(true)
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios')
    } else if (/android/.test(userAgent)) {
      setPlatform('android')
    } else if (/windows|mac|linux/.test(userAgent)) {
      setPlatform('desktop')
    }

    // Check if user has previously dismissed
    const dismissedKey = 'pwa-install-dismissed'
    const dismissedValue = localStorage.getItem(dismissedKey)
    if (dismissedValue) {
      setDismissed(true)
    }
  }, [])

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      const success = await showInstallPrompt()
      if (success) {
        setShowPrompt(false)
      }
    } catch (error) {
      console.error('Install failed:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  const handleDontShowAgain = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
    localStorage.setItem('pwa-install-never-show', 'true')
  }

  if (!showPrompt || dismissed || isPWA()) {
    return null
  }

  const getPlatformIcon = () => {
    switch (platform) {
      case 'ios':
        return <Smartphone className="w-5 h-5" />
      case 'android':
        return <Smartphone className="w-5 h-5" />
      case 'desktop':
        return <Monitor className="w-5 h-5" />
      default:
        return <Tablet className="w-5 h-5" />
    }
  }

  const getInstallInstructions = () => {
    switch (platform) {
      case 'ios':
        return (
          <div className="space-y-2 text-sm">
            <p><strong>To install on iOS:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Tap the Share button <Badge variant="outline">↗</Badge> at the bottom</li>
              <li>Scroll down and tap "Add to Home Screen"</li>
              <li>Tap "Add" to confirm</li>
            </ol>
          </div>
        )
      case 'android':
        return (
          <div className="space-y-2 text-sm">
            <p><strong>To install on Android:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Tap the menu button <Badge variant="outline">⋮</Badge> in your browser</li>
              <li>Select "Add to Home screen" or "Install app"</li>
              <li>Tap "Add" or "Install" to confirm</li>
            </ol>
          </div>
        )
      case 'desktop':
        return (
          <div className="space-y-2 text-sm">
            <p><strong>To install on Desktop:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Look for the install icon <Badge variant="outline">⬇</Badge> in your browser's address bar</li>
              <li>Click it and select "Install"</li>
              <li>Or use the browser menu → "Install Hangouts"</li>
            </ol>
          </div>
        )
      default:
        return (
          <div className="space-y-2 text-sm">
            <p><strong>To install this app:</strong></p>
            <p>Look for an install option in your browser's menu or address bar.</p>
          </div>
        )
    }
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
      <Card className="shadow-lg border-2 border-primary-200 bg-gradient-to-r from-primary-50 to-purple-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getPlatformIcon()}
              <CardTitle className="text-lg">Install Hangouts 3.0</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>
            Get the full app experience with push notifications and offline access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Benefits */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">🔔</Badge>
              <span>Push Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">📱</Badge>
              <span>App-like Experience</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">⚡</Badge>
              <span>Faster Loading</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">📶</Badge>
              <span>Offline Access</span>
            </div>
          </div>

          {/* Install Instructions */}
          {canInstall() ? (
            <div className="space-y-3">
              <Button
                onClick={handleInstall}
                disabled={isInstalling}
                className="w-full"
                size="lg"
              >
                <Download className="w-4 h-4 mr-2" />
                {isInstalling ? 'Installing...' : 'Install App'}
              </Button>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                {getInstallInstructions()}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDontShowAgain}
              className="flex-1"
            >
              Don't Show Again
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="flex-1"
            >
              Maybe Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
