'use client'

import { useEffect } from 'react'
import { initPWANavigationFix } from '@/lib/pwa-navigation-fix'

export function PWANavigationFix() {
  useEffect(() => {
    initPWANavigationFix()
  }, [])

  return null
}
