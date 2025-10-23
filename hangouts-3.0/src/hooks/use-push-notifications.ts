'use client'

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/logger'

export interface PushSubscriptionState {
  isSupported: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
}

export interface UsePushNotificationsReturn extends PushSubscriptionState {
  requestPermission: () => Promise<boolean>
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
  testNotification: () => Promise<boolean>
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: false,
    error: null
  })

  // Check browser support and current state
  useEffect(() => {
    const checkSupport = () => {
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
      const permission = isSupported ? Notification.permission : 'denied'
      
      setState(prev => ({
        ...prev,
        isSupported,
        permission
      }))

      // Check if already subscribed
      if (isSupported) {
        checkSubscriptionStatus()
      }
    }

    checkSupport()
  }, [])

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        setState(prev => ({ ...prev, isSubscribed: false }))
        return
      }

      const subscription = await registration.pushManager.getSubscription()
      setState(prev => ({ ...prev, isSubscribed: !!subscription }))
    } catch (error) {
      logger.error('Error checking subscription status:', error)
      setState(prev => ({ ...prev, error: 'Failed to check subscription status' }))
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Push notifications not supported' }))
      return false
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const permission = await Notification.requestPermission()
      setState(prev => ({ ...prev, permission, isLoading: false }))
      
      return permission === 'granted'
    } catch (error) {
      logger.error('Error requesting permission:', error)
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to request permission' 
      }))
      return false
    }
  }, [state.isSupported])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Push notifications not supported' }))
      return false
    }

    if (state.permission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) {
        return false
      }
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      // Get service worker registration
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        throw new Error('Service worker not registered')
      }

      // Get VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured')
      }

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(subscription.getKey('auth')!)
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to save subscription')
      }

      setState(prev => ({ 
        ...prev, 
        isSubscribed: true, 
        isLoading: false 
      }))

      logger.info('Push subscription successful')
      return true

    } catch (error) {
      logger.error('Error subscribing to push notifications:', error)
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to subscribe' 
      }))
      return false
    }
  }, [state.isSupported, state.permission, requestPermission])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Push notifications not supported' }))
      return false
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      // Get current subscription
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        throw new Error('Service worker not registered')
      }

      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        setState(prev => ({ 
          ...prev, 
          isSubscribed: false, 
          isLoading: false 
        }))
        return true
      }

      // Unsubscribe from push manager
      await subscription.unsubscribe()

      // Remove from server
      const response = await fetch(`/api/push/unsubscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        logger.warn('Failed to remove subscription from server, but local unsubscribe succeeded')
      }

      setState(prev => ({ 
        ...prev, 
        isSubscribed: false, 
        isLoading: false 
      }))

      logger.info('Push unsubscription successful')
      return true

    } catch (error) {
      logger.error('Error unsubscribing from push notifications:', error)
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to unsubscribe' 
      }))
      return false
    }
  }, [state.isSupported])

  const testNotification = useCallback(async (): Promise<boolean> => {
    if (!state.isSubscribed) {
      setState(prev => ({ ...prev, error: 'Not subscribed to push notifications' }))
      return false
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test Notification',
          message: 'This is a test push notification!'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to send test notification')
      }

      setState(prev => ({ ...prev, isLoading: false }))
      logger.info('Test notification sent successfully')
      return true

    } catch (error) {
      logger.error('Error sending test notification:', error)
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to send test notification' 
      }))
      return false
    }
  }, [state.isSubscribed])

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    testNotification
  }
}

// Utility functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}
