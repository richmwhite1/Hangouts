"use client"

import { useState, useEffect } from 'react'

interface Hangout {
  id: string
  title: string
  description: string
  location: string
  startTime: string
  creator: {
    name: string
    username: string
  }
  participants: any[]
  _count: {
    participants: number
  }
}

export function SimpleHangoutList() {
  const [hangouts, setHangouts] = useState<Hangout[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    console.log('🎯 SimpleHangoutList useEffect running!')
    
    const fetchHangouts = async () => {
      try {
        console.log('🚀 Fetching hangouts...')
        const response = await fetch('/api/hangouts')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        console.log('✅ Got hangouts:', data.hangouts?.length || 0)
        setHangouts(data.hangouts || [])
      } catch (error) {
        console.error('❌ Error fetching hangouts:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchHangouts()
  }, [])
  
  if (loading) {
    return <div className="p-4">Loading hangouts...</div>
  }
  
  if (hangouts.length === 0) {
    return <div className="p-4">No hangouts found.</div>
  }
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Hangouts ({hangouts.length})</h2>
      {hangouts.map((hangout) => (
        <div key={hangout.id} className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold">{hangout.title}</h3>
          <p className="text-gray-600">{hangout.description}</p>
          <p className="text-sm text-gray-500">📍 {hangout.location}</p>
          <p className="text-sm text-gray-500">👤 by {hangout.creator.name}</p>
          <p className="text-sm text-gray-500">👥 {hangout._count.participants} participants</p>
          <p className="text-sm text-gray-500">🕐 {new Date(hangout.startTime).toLocaleString()}</p>
        </div>
      ))}
    </div>
  )
}

