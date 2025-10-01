'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'

interface HangoutState {
  // Hangout info
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  location?: string
  image?: string
  participants: Array<{
    id: string
    user: {
      id: string
      name: string
      username: string
      avatar?: string
    }
    rsvpStatus: 'YES' | 'NO' | 'MAYBE' | 'PENDING'
    role: string
  }>
  
  // Poll state
  activePoll?: {
    id: string
    title: string
    description?: string
    options: Array<{
      id: string
      text: string
      voteCount: number
      percentage: number
    }>
    totalVotes: number
    participantCount: number
    consensusReached: boolean
    isActive: boolean
  }
  
  // Plan state (after consensus)
  finalPlan?: {
    winningOption: string
    consensusPercentage: number
    totalVotes: number
  }
  
  // UI state
  phase: 'planning' | 'voting' | 'consensus' | 'rsvp'
  isLoading: boolean
  error?: string
}

export function useHangoutState(hangoutId: string) {
  const { token, user } = useAuth()
  const [state, setState] = useState<HangoutState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchHangoutData = async () => {
    if (!token || !hangoutId) return

    try {
      setIsLoading(true)
      
      // Fetch hangout details
      const hangoutResponse = await fetch(`/api/hangouts/${hangoutId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!hangoutResponse.ok) throw new Error('Failed to fetch hangout')
      const hangoutData = await hangoutResponse.json()
      
      // Debug logging
      console.log('Hangout API response:', hangoutData)
      
      // Fetch polls
      const pollsResponse = await fetch(`/api/hangouts/${hangoutId}/polls-simple`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      let activePoll = null
      let polls = []
      let consensusPoll = null
      
      if (pollsResponse.ok) {
        const pollsData = await pollsResponse.json()
        polls = pollsData.polls || []
        activePoll = polls.find((p: any) => p.isActive && !p.consensusReached)
        consensusPoll = polls.find((p: any) => p.consensusReached)
      }
      
      // Determine phase
      let phase: HangoutState['phase'] = 'planning'
      let finalPlan = undefined
      
      if (activePoll) {
        phase = 'voting'
      } else if (consensusPoll) {
        phase = 'consensus'
        const winningOption = consensusPoll.options.reduce((max: any, current: any) => 
          current.voteCount > max.voteCount ? current : max
        )
        finalPlan = {
          winningOption: winningOption.text,
          consensusPercentage: winningOption.percentage,
          totalVotes: consensusPoll.totalVotes
        }
      }
      
      // If we have participants with RSVP status, we're in RSVP phase
      const hangout = hangoutData.hangout || hangoutData
      if (hangout?.participants?.some((p: any) => p.rsvpStatus !== 'PENDING')) {
        phase = 'rsvp'
      }
      
      setState({
        id: hangout.id,
        title: hangout.title,
        description: hangout.description,
        startTime: hangout.startTime,
        endTime: hangout.endTime,
        location: hangout.location,
        image: hangout.image,
        participants: hangout.participants || [],
        activePoll,
        finalPlan,
        phase,
        isLoading: false
      })
      
    } catch (error) {
      console.error('Error fetching hangout data:', error)
      setState(prev => prev ? { ...prev, error: 'Failed to load hangout', isLoading: false } : null)
    } finally {
      setIsLoading(false)
    }
  }

  const voteOnPoll = async (pollId: string, optionId: string) => {
    if (!token) return false

    try {
      const response = await fetch(`/api/polls/${pollId}/vote-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          optionId,
          voteType: 'SINGLE',
          weight: 1.0
        })
      })

      if (response.ok) {
        // Refresh data after voting
        await fetchHangoutData()
        return true
      }
      return false
    } catch (error) {
      console.error('Error voting:', error)
      return false
    }
  }

  const updateRSVP = async (status: 'YES' | 'NO' | 'MAYBE') => {
    if (!token || !user) return false

    try {
      const response = await fetch(`/api/hangouts/${hangoutId}/rsvp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        // Refresh data after RSVP update
        await fetchHangoutData()
        return true
      }
      return false
    } catch (error) {
      console.error('Error updating RSVP:', error)
      return false
    }
  }

  useEffect(() => {
    fetchHangoutData()
  }, [hangoutId, token])

  return {
    state,
    isLoading,
    voteOnPoll,
    updateRSVP,
    refresh: fetchHangoutData
  }
}
