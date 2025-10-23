'use client'

import { useState, useEffect } from 'react'
import { Download, X, Smartphone, Monitor, Tablet, Bell, Zap, Wifi, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { showInstallPrompt, canInstall, isPWA, setupInstallPrompt } from '@/lib/register-sw'

interface InstallPromptProps {
  className?: string
  variant?: 'banner' | 'modal' | 'inline'
  showForAllUsers?: boolean
}

export function InstallPrompt({ className, variant = 'banner', showForAllUsers = true }: InstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown')
  const [visitCount, setVisitCount] = useState(0)

  useEffect(() => {
    // Setup install prompt listener
    setupInstallPrompt()

    // Check if already installed as PWA
    if (isPWA()) {
      return
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

    // Track visit count and show prompt based on smart timing
    const visitKey = 'pwa-visit-count'
    const dismissedKey = 'pwa-install-dismissed'
    const neverShowKey = 'pwa-install-never-show'
    
    const currentVisits = parseInt(localStorage.getItem(visitKey) || '0') + 1
    localStorage.setItem(visitKey, currentVisits.toString())
    setVisitCount(currentVisits)

    // Check if user has permanently dismissed
    const neverShow = localStorage.getItem(neverShowKey)
    if (neverShow === 'true') {
      setDismissed(true)
      return
    }

    // Smart timing: Show prompt after 2nd visit, then every 5 visits
    const shouldShow = showForAllUsers && (
      currentVisits === 2 || 
      (currentVisits > 2 && currentVisits % 5 === 0)
    )

    if (shouldShow) {
      // Check if recently dismissed (within last 24 hours)
      const dismissedTime = localStorage.getItem(dismissedKey)
      if (dismissedTime) {
        const dismissedDate = new Date(dismissedTime)
        const now = new Date()
        const hoursSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60)
        
        // If dismissed less than 24 hours ago, don't show
        if (hoursSinceDismissed < 24) {
          setDismissed(true)
          return
        }
      }
      
      setShowPrompt(true)
    }
  }, [showForAllUsers])

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
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
  }

  const handleDontShowAgain = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
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
          {/* Enhanced Benefits */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Why install the app?</div>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-50">
                <Bell className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-sm">Instant Notifications</div>
                  <div className="text-xs text-gray-600">Never miss hangout invites or updates</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-green-50">
                <Zap className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-sm">Lightning Fast</div>
                  <div className="text-xs text-gray-600">3x faster loading with offline access</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-purple-50">
                <Wifi className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="font-medium text-sm">Works Offline</div>
                  <div className="text-xs text-gray-600">View your hangouts even without internet</div>
                </div>
              </div>
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
