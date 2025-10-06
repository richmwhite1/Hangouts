"use client"

import React, { useState, useEffect } from 'react'
import { PollCard } from './PollCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Filter, Plus, RefreshCw, AlertCircle } from 'lucide-react'
import { usePolling } from '@/contexts/realtime-context'

interface PollListProps {
  hangoutId?: string
  onCreatePoll?: () => void
  onPollClick?: (pollId: string) => void
}

interface Poll {
  id: string
  title: string
  description?: string
  status: string
  consensus?: {
    level: number
    totalVotes: number
    participantCount: number
    leadingOption?: string
    timeToConsensus?: number
    velocity: number
    isConsensusReached: boolean
  }
  pollOptions?: Array<{
    id: string
    text: string
    description?: string
    voteCount: number
    percentage: number
  }>
  creator?: {
    id: string
    username: string
    name: string
  }
  createdAt: string
  expiresAt?: string
}

export function PollList({ hangoutId, onCreatePoll, onPollClick }: PollListProps) {
  const [polls, setPolls] = useState<Poll[]>([])
  const [filteredPolls, setFilteredPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const { isConnected } = usePolling()

  // Fetch polls
  const fetchPolls = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const url = hangoutId 
        ? `/api/polls?hangoutId=${hangoutId}`
        : '/api/polls'
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch polls: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.polls) {
        setPolls(data.polls)
      } else {
        throw new Error(data.error || 'Failed to fetch polls')
      }
    } catch (err) {
      console.error('Error fetching polls:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch polls')
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort polls
  useEffect(() => {
    let filtered = [...polls]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(poll =>
        poll.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        poll.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        poll.creator?.username.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(poll => poll.status === statusFilter)
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'consensus':
        filtered.sort((a, b) => (b.consensus?.level || 0) - (a.consensus?.level || 0))
        break
      case 'votes':
        filtered.sort((a, b) => (b.consensus?.totalVotes || 0) - (a.consensus?.totalVotes || 0))
        break
      case 'participants':
        filtered.sort((a, b) => (b.consensus?.participantCount || 0) - (a.consensus?.participantCount || 0))
        break
    }

    setFilteredPolls(filtered)
  }, [polls, searchTerm, statusFilter, sortBy])

  // Initial fetch
  useEffect(() => {
    fetchPolls()
  }, [hangoutId])

  // Real-time updates
  useEffect(() => {
    if (!isConnected) return

    const handlePollUpdate = (data: any) => {
      setPolls(prevPolls => 
        prevPolls.map(poll => 
          poll.id === data.pollId ? { ...poll, ...data.poll } : poll
        )
      )
    }

    const handleVoteCast = (data: any) => {
      setPolls(prevPolls => 
        prevPolls.map(poll => {
          if (poll.id === data.pollId) {
            // Update consensus data
            const updatedConsensus = {
              ...poll.consensus,
              level: data.consensusLevel,
              totalVotes: data.voteCount,
              leadingOption: data.leadingOption
            }
            return { ...poll, consensus: updatedConsensus }
          }
          return poll
        })
      )
    }

    const handleConsensusReached = (data: any) => {
      setPolls(prevPolls => 
        prevPolls.map(poll => {
          if (poll.id === data.pollId) {
            return {
              ...poll,
              status: 'CONSENSUS_REACHED',
              consensus: {
                ...poll.consensus,
                level: data.consensusLevel,
                isConsensusReached: true
              }
            }
          }
          return poll
        })
      )
    }

    // Note: In a real implementation, these would be set up with the polling context
    // For now, we'll just show the static data

    return () => {
      // Cleanup event listeners
    }
  }, [isConnected])

  const handleVote = (pollId: string, optionId: string) => {
    // Vote handling is done in PollCard component
    console.log('Vote cast:', { pollId, optionId })
  }

  const handleRefresh = () => {
    fetchPolls()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Polls</h2>
          <Button variant="outline" size="sm" disabled>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Polls</h2>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Polls</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {onCreatePoll && (
            <Button onClick={onCreatePoll}>
              <Plus className="w-4 h-4 mr-2" />
              Create Poll
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search polls..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
            <SelectItem value="CONSENSUS_REACHED">Consensus Reached</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="consensus">Consensus Level</SelectItem>
            <SelectItem value="votes">Most Votes</SelectItem>
            <SelectItem value="participants">Most Participants</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Polls Grid */}
      {filteredPolls.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No polls found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Create your first poll to get started'
            }
          </p>
          {onCreatePoll && (
            <Button onClick={onCreatePoll}>
              <Plus className="w-4 h-4 mr-2" />
              Create Poll
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredPolls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              onVote={handleVote}
              onViewDetails={onPollClick}
            />
          ))}
        </div>
      )}

      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              Disconnected from real-time updates
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
