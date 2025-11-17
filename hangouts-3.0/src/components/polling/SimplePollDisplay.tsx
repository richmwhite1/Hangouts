'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Users, Clock, Plus } from 'lucide-react'
import { AddPollOptionModal } from './AddPollOptionModal'

import { logger } from '@/lib/logger'
interface SimplePollDisplayProps {
  poll: {
    id: string
    title: string
    description?: string
    options?: Array<{
      id: string
      what: string
      where: string
      when: string
      voteCount: number
      percentage: number
      votes?: Array<{
        userId: string
        user?: {
          id: string
          name: string
          avatar?: string
        }
      }>
    }>
    pollOptions?: Array<{
      id: string
      text: string
      description?: string
      what: string
      where: string
      when: string
      voteCount: number
      percentage: number
      metadata?: {
        date?: string
        time?: string
        location?: string
        latitude?: number
        longitude?: number
      }
      votes?: Array<{
        userId: string
        user?: {
          id: string
          name: string
          avatar?: string
        }
      }>
    }>
    totalVotes: number
    participantCount: number
    consensusReached: boolean
    isActive: boolean
    allowAddOptions?: boolean
    participants?: Array<{
      userId: string
      status: string
      user?: {
        id: string
        name: string
        avatar?: string
      }
    }>
  }
  onVote: (pollId: string, optionId: string) => void
  onOptionAdded?: (option: any) => void
  userVote?: string | null
  currentUserId?: string
}

export function SimplePollDisplay({ poll, onVote, onOptionAdded, userVote, currentUserId }: SimplePollDisplayProps) {
  const [isVoting, setIsVoting] = useState(false)
  const [userVotes, setUserVotes] = useState<string[]>([])
  
      // Debug logging
      // console.log('🎯 SimplePollDisplay rendered with:', {
      //   pollId: poll?.id,
      //   pollTitle: poll?.title,
      //   optionsCount: poll?.options?.length || poll?.pollOptions?.length || 0,
      //   userVote,
      //   currentUserId
      // }); // Removed for production

  // Initialize user votes from userVote prop
  useEffect(() => {
    if (userVote) {
      // If userVote is a string, convert to array
      if (typeof userVote === 'string') {
        setUserVotes([userVote])
      } else if (Array.isArray(userVote)) {
        setUserVotes(userVote)
      }
    } else {
      setUserVotes([])
    }
  }, [userVote])

  // Helper function to get options from either structure
  const getOptions = () => {
    if (poll.pollOptions && poll.pollOptions.length > 0) {
      return poll.pollOptions
    }
    return poll.options || []
  }

  const options = getOptions()

  const handleVote = async (optionId: string) => {
    if (isVoting || poll.consensusReached) return
    
    setIsVoting(true)
    try {
      // Toggle vote locally first for immediate feedback
      setUserVotes(prev => {
        if (prev.includes(optionId)) {
          return prev.filter(id => id !== optionId)
        } else {
          return [...prev, optionId]
        }
      })
      
      await onVote(poll.id, optionId)
    } catch (error) {
      logger.error('Vote failed:', error);
      // Revert local state on error
      setUserVotes(prev => {
        if (prev.includes(optionId)) {
          return prev.filter(id => id !== optionId)
        } else {
          return [...prev, optionId]
        }
      })
    } finally {
      setIsVoting(false)
    }
  }

  const getConsensusProgress = () => {
    if (poll.consensusReached) return 100
    if (options.length === 0) return 0
    const maxPercentage = Math.max(...options.map(opt => opt.percentage))
    return maxPercentage
  }

  const getWinningOption = () => {
    if (options.length === 0) return null
    return options.reduce((max, current) => 
      current.voteCount > max.voteCount ? current : max
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{poll.title}</CardTitle>
          <div className="flex items-center gap-2">
            {poll.consensusReached ? (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Consensus Reached!</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-blue-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Voting Active</span>
              </div>
            )}
          </div>
        </div>
        
        {poll.description && (
          <p className="text-sm text-gray-600">{poll.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Consensus Progress</span>
            <span>{getConsensusProgress().toFixed(0)}%</span>
          </div>
          <Progress 
            value={getConsensusProgress()} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{poll.totalVotes} votes</span>
            <span>{poll.participantCount} participants</span>
          </div>
        </div>

        {/* Voting Options */}
        <div className="space-y-2">
          {options.map((option) => {
            const winningOption = getWinningOption()
            const isWinning = poll.consensusReached && winningOption && option.id === winningOption.id
            const isUserVote = userVotes.includes(option.id)
            
            return (
              <div
                key={option.id}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  isWinning
                    ? 'border-green-500 bg-green-900/20 text-green-100'
                    : isUserVote
                    ? 'border-blue-500 bg-blue-900/20 text-blue-100'
                    : poll.consensusReached
                    ? 'border-gray-600 bg-gray-700 text-gray-300'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-600 cursor-pointer'
                }`}
                onClick={() => !poll.consensusReached && handleVote(option.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-white">{option.what}</div>
                    {option.where && (
                      <div className="text-sm text-gray-300 mt-1">
                        📍 {option.where}
                      </div>
                    )}
                    {option.when && (
                      <div className="text-sm text-gray-300">
                        🕐 {option.when}
                      </div>
                    )}
                    <div className="text-sm text-gray-400 mt-2">
                      {option.voteCount} votes ({option.percentage.toFixed(1)}%)
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isWinning && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {isUserVote && !isWinning && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                  </div>
                </div>
                
                {/* Vote Bar */}
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        isWinning ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${option.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Mark Preferred Button - Only show when user has voted on multiple options */}
        {userVotes.length > 1 && !poll.consensusReached && (
          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full border-blue-500 text-blue-400 hover:border-blue-400 hover:text-blue-300"
              onClick={() => {
                // TODO: Implement mark preferred functionality
                // console.log('Mark preferred clicked for votes:', userVotes); // Removed for production
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Preferred ({userVotes.length} selected)
            </Button>
          </div>
        )}

        {/* Add Option Button */}
        {poll.allowAddOptions && !poll.consensusReached && onOptionAdded && (
          <div className="mt-4">
            <AddPollOptionModal
              pollId={poll.id}
              onOptionAdded={onOptionAdded}
            >
              <Button
                variant="outline"
                className="w-full border-dashed border-gray-400 text-gray-400 hover:border-gray-300 hover:text-gray-300"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </AddPollOptionModal>
          </div>
        )}

        {/* Consensus Message */}
        {poll.consensusReached && (
          <div className="p-3 bg-green-900/20 border border-green-500 rounded-lg">
            <div className="flex items-center gap-2 text-green-100">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">The group has decided!</span>
            </div>
            <p className="text-sm text-green-200 mt-1">
              <strong>{getWinningOption().what}</strong> won with {getWinningOption().percentage.toFixed(1)}% of the votes.
            </p>
          </div>
        )}

        {/* Participant Status */}
        {poll.participants && poll.participants.length > 0 && (
          <div className="mt-4 p-3 bg-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Participants ({poll.participants.length})</h4>
            <div className="flex flex-wrap gap-2">
              {poll.participants.map((participant) => {
                const hasVoted = participant.status === 'VOTED'
                const isCurrentUser = currentUserId === participant.userId
                
                return (
                  <div
                    key={participant.userId}
                    className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${
                      hasVoted 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    } ${isCurrentUser ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    {participant.user?.avatar ? (
                      <img
                        src={participant.user.avatar}
                        alt={participant.user.name}
                        className="w-4 h-4 rounded-full"
                      />
                    ) : (
                      <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-xs">👤</span>
                      </div>
                    )}
                    <span className="truncate max-w-20">
                      {participant.user?.name || 'Unknown'}
                    </span>
                    {hasVoted && <CheckCircle className="w-3 h-3" />}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Voting Instructions */}
        {!poll.consensusReached && poll.totalVotes === 0 && (
          <div className="text-center text-sm text-gray-500 py-4">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>Be the first to vote!</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
