"use client"

import { useState, useEffect } from 'react'

export default function TestHangoutsPage() {
  const [hangouts, setHangouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchHangouts = async () => {
      try {
        const response = await fetch('/api/hangouts')
        const data = await response.json()
        console.log('Fetched hangouts:', data)
        setHangouts(data.hangouts || [])
      } catch (err) {
        console.error('Error fetching hangouts:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchHangouts()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading hangouts...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Test Hangouts Page</h1>
      <p className="mb-4">Found {hangouts.length} hangouts</p>
      
      <div className="space-y-4">
        {hangouts.map((hangout: any) => (
          <div key={hangout.id} className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold">{hangout.title}</h2>
            <p className="text-gray-300">{hangout.description}</p>
            <p className="text-sm text-gray-400">Location: {hangout.location}</p>
            <p className="text-sm text-gray-400">Start: {new Date(hangout.startTime).toLocaleString()}</p>
            <p className="text-sm text-gray-400">Privacy: {hangout.privacyLevel}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
