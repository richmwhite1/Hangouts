"use client"

import { useEffect } from 'react'

export function TestUseEffect() {
  useEffect(() => {
    console.log('🎯 Test useEffect is running!')
  }, [])

  return <div>Test useEffect component</div>
}

