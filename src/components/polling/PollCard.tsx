"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Clock, Users, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react'
import { usePolling } from '@/contexts/realtime-context'

interface PollCardProps {
  poll: {
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
  onVote?: (pollId: string, optionId: string) => void
  onViewDetails?: (pollId: string) => void
}

export function PollCard({ poll, onVote, onViewDetails }: PollCardProps) {
  const [isVoting, setIsVoting] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const { castVote, isConnected } = usePolling()

  const handleVote = async (optionId: string) => {
    if (!isConnected || isVoting) return
    
    setIsVoting(true)
    setSelectedOption(optionId)
    
    try {
      await castVote(poll.id, {
        optionId,
        voteType: 'SINGLE',
        sentiment: 'positive'
      })
      onVote?.(poll.id, optionId)
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

  return (
    <Card className="w-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
              {poll.title}
            </CardTitle>
            {poll.description && (
              <p className="text-sm text-gray-600 mb-2">{poll.description}</p>
            )}
          </div>
          <Badge className={`${getStatusColor(poll.status)} flex items-center gap-1`}>
            {getStatusIcon(poll.status)}
            {poll.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Consensus Progress */}
        {poll.consensus && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Consensus Progress</span>
              <span className="font-medium">
                {poll.consensus.level.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={poll.consensus.level} 
              className="h-2"
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{poll.consensus.totalVotes} votes</span>
              <span>{poll.consensus.participantCount} participants</span>
            </div>
          </div>
        )}

        {/* Leading Option */}
        {poll.consensus?.leadingOption && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800 font-medium">
                Leading: {poll.consensus.leadingOption}
              </span>
            </div>
          </div>
        )}

        {/* Time to Consensus */}
        {poll.consensus?.timeToConsensus && poll.consensus.timeToConsensus > 0 && (
          <div className="flex items-center gap-2 text-sm text-orange-600">
            <Clock className="w-4 h-4" />
            <span>
              Est. {formatTimeToConsensus(poll.consensus.timeToConsensus)} to consensus
            </span>
          </div>
        )}

        {/* Voting Options */}
        {poll.status === 'ACTIVE' && poll.pollOptions && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Vote Options</h4>
            <div className="space-y-2">
              {poll.pollOptions.map((option) => (
                <div
                  key={option.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedOption === option.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !isVoting && handleVote(option.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {option.text}
                      </p>
                      {option.description && (
                        <p className="text-xs text-gray-600 mt-1">
                          {option.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {option.voteCount} votes
                      </div>
                      <div className="text-xs text-gray-500">
                        {option.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  {option.voteCount > 0 && (
                    <div className="mt-2">
                      <Progress value={option.percentage} className="h-1" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Poll Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{poll.consensus?.participantCount || 0} participants</span>
            </div>
            {poll.creator && (
              <span>by {poll.creator.username}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(poll.id)}
                className="text-xs"
              >
                View Details
              </Button>
            )}
            <span>
              {new Date(poll.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
