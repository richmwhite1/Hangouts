"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Clock, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  BarChart3, 
  MessageSquare,
  User,
  Calendar,
  Target,
  Activity
} from 'lucide-react'
import { usePolling } from '@/contexts/realtime-context'

interface PollDetailsProps {
  pollId: string
  onClose?: () => void
}

interface PollDetails {
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
    threshold: number
    algorithm: string
    confidence: number
    optionBreakdown: Array<{
      optionId: string
      text: string
      voteCount: number
      percentage: number
      isLeading: boolean
    }>
  }
  pollOptions?: Array<{
    id: string
    text: string
    description?: string
    voteCount: number
    percentage: number
    votes?: Array<{
      userId: string
      voteType: string
      sentiment?: string
      comment?: string
      createdAt: string
    }>
  }>
  participants?: Array<{
    id: string
    userId: string
    status: string
    canVote: boolean
    canDelegate: boolean
    user: {
      id: string
      username: string
      name: string
      avatar?: string
    }
  }>
  creator?: {
    id: string
    username: string
    name: string
    avatar?: string
  }
  createdAt: string
  expiresAt?: string
  consensusHistory?: Array<{
    id: string
    consensusLevel: number
    totalVotes: number
    participantCount: number
    leadingOption?: string
    timeToConsensus?: number
    velocity: number
    createdAt: string
  }>
}

export function PollDetails({ pollId, onClose }: PollDetailsProps) {
  const [poll, setPoll] = useState<PollDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isVoting, setIsVoting] = useState(false)
  const { castVote, isConnected } = usePolling()

  // Fetch poll details
  const fetchPollDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`http://localhost:3000/api/polls/test/${pollId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch poll: ${response.status}`)
      }
      
      const data = await response.json()
      setPoll(data)
    } catch (err) {
      console.error('Error fetching poll details:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch poll details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPollDetails()
  }, [pollId])

  // Real-time updates
  useEffect(() => {
    if (!isConnected || !poll) return

    const handleVoteCast = (data: any) => {
      if (data.pollId === pollId) {
        fetchPollDetails() // Refresh poll data
      }
    }

    const handleConsensusProgress = (data: any) => {
      if (data.pollId === pollId) {
        setPoll(prev => prev ? {
          ...prev,
          consensus: {
            ...prev.consensus,
            level: data.consensusLevel,
            totalVotes: data.totalVotes,
            participantCount: data.participantCount,
            leadingOption: data.leadingOption,
            timeToConsensus: data.timeToConsensus,
            velocity: data.velocity
          }
        } : null)
      }
    }

    const handleConsensusReached = (data: any) => {
      if (data.pollId === pollId) {
        setPoll(prev => prev ? {
          ...prev,
          status: 'CONSENSUS_REACHED',
          consensus: {
            ...prev.consensus,
            level: data.consensusLevel,
            isConsensusReached: true
          }
        } : null)
      }
    }

    // Note: In a real implementation, these would be set up with the polling context
    // For now, we'll just show the static data

    return () => {
      // Cleanup event listeners
    }
  }, [isConnected, pollId, poll])

  const handleVote = async (optionId: string) => {
    if (!isConnected || isVoting || poll?.status !== 'ACTIVE') return
    
    setIsVoting(true)
    setSelectedOption(optionId)
    
    try {
      await castVote(pollId, {
        optionId,
        voteType: 'SINGLE',
        sentiment: 'positive'
      })
    } catch (error) {
      console.error('Error casting vote:', error)
    } finally {
      setIsVoting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800'
      case 'CLOSED': return 'bg-gray-100 text-gray-800'
      case 'CONSENSUS_REACHED': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <TrendingUp className="w-4 h-4" />
      case 'PAUSED': return <AlertCircle className="w-4 h-4" />
      case 'CLOSED': return <CheckCircle className="w-4 h-4" />
      case 'CONSENSUS_REACHED': return <CheckCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  const formatTimeToConsensus = (minutes: number | null) => {
    if (!minutes) return null
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-100 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 rounded animate-pulse" />
      </div>
    )
  }

  if (error || !poll) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error || 'Poll not found'}</p>
        <Button onClick={fetchPollDetails}>Try Again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{poll.title}</h1>
          {poll.description && (
            <p className="text-gray-600 mb-4">{poll.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>by {poll.creator?.username}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(poll.createdAt).toLocaleDateString()}</span>
            </div>
            <Badge className={`${getStatusColor(poll.status)} flex items-center gap-1`}>
              {getStatusIcon(poll.status)}
              {poll.status}
            </Badge>
          </div>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Consensus Overview */}
      {poll.consensus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Consensus Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {poll.consensus.level.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Consensus Level</div>
                <Progress value={poll.consensus.level} className="mt-2" />
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {poll.consensus.totalVotes}
                </div>
                <div className="text-sm text-gray-600">Total Votes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {poll.consensus.participantCount}
                </div>
                <div className="text-sm text-gray-600">Participants</div>
              </div>
            </div>

            {poll.consensus.leadingOption && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">
                    Leading Option: {poll.consensus.leadingOption}
                  </span>
                </div>
              </div>
            )}

            {poll.consensus.timeToConsensus && poll.consensus.timeToConsensus > 0 && (
              <div className="flex items-center gap-2 text-orange-600">
                <Clock className="w-4 h-4" />
                <span>
                  Estimated {formatTimeToConsensus(poll.consensus.timeToConsensus)} to consensus
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Algorithm</div>
                <div className="font-medium">{poll.consensus.algorithm}</div>
              </div>
              <div>
                <div className="text-gray-600">Threshold</div>
                <div className="font-medium">{poll.consensus.threshold}%</div>
              </div>
              <div>
                <div className="text-gray-600">Velocity</div>
                <div className="font-medium">{poll.consensus.velocity.toFixed(1)} votes/min</div>
              </div>
              <div>
                <div className="text-gray-600">Confidence</div>
                <div className="font-medium">{(poll.consensus.confidence * 100).toFixed(1)}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="voting" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="voting">Voting</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
        </TabsList>

        {/* Voting Tab */}
        <TabsContent value="voting" className="space-y-4">
          {poll.status === 'ACTIVE' && poll.pollOptions ? (
            <Card>
              <CardHeader>
                <CardTitle>Cast Your Vote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {poll.pollOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedOption === option.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !isVoting && handleVote(option.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{option.text}</h3>
                        {option.description && (
                          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {option.voteCount} votes
                        </div>
                        <div className="text-sm text-gray-500">
                          {option.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    {option.voteCount > 0 && (
                      <div className="mt-3">
                        <Progress value={option.percentage} className="h-2" />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Poll is not active
                </h3>
                <p className="text-gray-600">
                  This poll is currently {poll.status.toLowerCase()} and cannot accept votes.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Detailed Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {poll.consensus?.optionBreakdown.map((option) => (
                <div key={option.optionId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{option.text}</span>
                      {option.isLeading && (
                        <Badge variant="default" className="text-xs">
                          Leading
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{option.voteCount} votes</div>
                      <div className="text-sm text-gray-500">
                        {option.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <Progress value={option.percentage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participants ({poll.participants?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {poll.participants && poll.participants.length > 0 ? (
                <div className="space-y-3">
                  {poll.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium">{participant.user.name}</div>
                          <div className="text-sm text-gray-500">
                            @{participant.user.username}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          participant.status === 'VOTED' ? 'default' : 'secondary'
                        }
                      >
                        {participant.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No participants yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
