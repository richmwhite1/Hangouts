'use client'

import { useState, useEffect } from 'react'
import { Download, X, Bell, Zap, Wifi, Smartphone, Monitor, Tablet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { showInstallPrompt, canInstall, isPWA, setupInstallPrompt } from '@/lib/register-sw'

interface PWAInstallBannerProps {
  className?: string
  variant?: 'hero' | 'banner' | 'card'
  showForAllUsers?: boolean
}

export function PWAInstallBanner({ className, variant = 'hero', showForAllUsers = true }: PWAInstallBannerProps) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown')

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

    // Show for all users on first visit
    if (showForAllUsers) {
      setShowPrompt(true)
    }
  }, [showForAllUsers])

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      // Check if we have a deferred prompt available
      if (canInstall()) {
        const success = await showInstallPrompt()
        if (success) {
          setShowPrompt(false)
        }
      } else {
        // If no deferred prompt, show instructions
        alert(`To install this app:\n\n${platform === 'ios' ? 'Tap the Share button at the bottom of your screen, then select "Add to Home Screen"' : platform === 'android' ? 'Tap the menu button in your browser and select "Add to Home screen" or "Install app"' : 'Look for the install icon in your browser\'s address bar and click it'}`)
      }
    } catch (error) {
      console.error('Install failed:', error)
      // Show fallback instructions
      alert(`To install this app:\n\n${platform === 'ios' ? 'Tap the Share button at the bottom of your screen, then select "Add to Home Screen"' : platform === 'android' ? 'Tap the menu button in your browser and select "Add to Home screen" or "Install app"' : 'Look for the install icon in your browser\'s address bar and click it'}`)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
  }

  if (!showPrompt || isPWA()) {
    return null
  }

  const getPlatformIcon = () => {
    switch (platform) {
      case 'ios':
        return <Smartphone className="w-6 h-6" />
      case 'android':
        return <Smartphone className="w-6 h-6" />
      case 'desktop':
        return <Monitor className="w-6 h-6" />
      default:
        return <Tablet className="w-6 h-6" />
    }
  }

  if (variant === 'hero') {
    return (
      <div className={`bg-gray-800 rounded-lg p-8 border border-gray-700 ${className}`}>
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            {getPlatformIcon()}
            <h3 className="text-3xl font-bold text-white ml-3">Install Plans</h3>
          </div>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto text-lg">
            Get the full experience with instant notifications, offline access, and lightning-fast performance
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-700 border border-gray-600">
              <Bell className="w-8 h-8 text-gray-300" />
              <div className="text-left">
                <div className="font-semibold text-white text-lg">Push Notifications</div>
                <div className="text-sm text-gray-400">Never miss hangout invites or updates</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-700 border border-gray-600">
              <Zap className="w-8 h-8 text-gray-300" />
              <div className="text-left">
                <div className="font-semibold text-white text-lg">3x Faster</div>
                <div className="text-sm text-gray-400">Lightning speed with offline caching</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-700 border border-gray-600">
              <Wifi className="w-8 h-8 text-gray-300" />
              <div className="text-left">
                <div className="font-semibold text-white text-lg">Works Offline</div>
                <div className="text-sm text-gray-400">View your hangouts without internet</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 text-lg border border-gray-600"
              onClick={handleInstall}
              disabled={isInstalling}
            >
              <Download className="w-6 h-6 mr-2" />
              {isInstalling ? 'Installing...' : 'Install App'}
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-gray-600 text-gray-300 hover:bg-gray-700 px-8 py-4 text-lg"
              onClick={handleDismiss}
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <Card className={`bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 ${className}`}>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            {getPlatformIcon()}
            <CardTitle className="text-xl ml-2">Install the App</CardTitle>
          </div>
          <CardDescription>
            Get push notifications and offline access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-50">
              <Bell className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium text-sm">Instant Notifications</div>
                <div className="text-xs text-gray-600">Never miss invites</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-green-50">
              <Zap className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium text-sm">Lightning Fast</div>
                <div className="text-xs text-gray-600">3x faster loading</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-purple-50">
              <Wifi className="w-5 h-5 text-purple-600" />
              <div>
                <div className="font-medium text-sm">Works Offline</div>
                <div className="text-xs text-gray-600">No internet needed</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              {isInstalling ? 'Installing...' : 'Install'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default banner variant
  return (
    <div className={`fixed top-4 left-4 right-4 z-50 ${className}`}>
      <Card className="shadow-lg border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getPlatformIcon()}
              <CardTitle className="text-lg">Install Plans</CardTitle>
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
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">🔔</Badge>
              <span>Push Notifications</span>
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

          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              {isInstalling ? 'Installing...' : 'Install App'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
            >
              Maybe Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
