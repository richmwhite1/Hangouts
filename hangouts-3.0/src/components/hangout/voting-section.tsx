'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, CheckCircle2, Circle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface VotingSectionProps {
    options: Array<{
        id: string
        title: string
        description?: string
        location?: string
        dateTime?: string
        price?: number
    }>
    currentUserVotes?: string[]
    userVotes?: Record<string, string[]>
    votingDeadline?: string
    participants: Array<{
        id: string
        user: {
            id: string
            name: string
            avatar?: string
        }
    }>
    onVote: (optionId: string, action: 'add' | 'remove' | 'toggle') => void
    isVoting?: boolean
}

export function VotingSection({
    options,
    currentUserVotes = [],
    userVotes = {},
    votingDeadline,
    participants,
    onVote,
    isVoting = false
}: VotingSectionProps) {
    const [expandedOption, setExpandedOption] = useState<string | null>(null)

    // Calculate vote counts
    const getVoteCount = (optionId: string) => {
        return Object.values(userVotes).filter(votes => votes.includes(optionId)).length
    }

    // Get voters for an option
    const getVoters = (optionId: string) => {
        const voterIds = Object.entries(userVotes)
            .filter(([_, votes]) => votes.includes(optionId))
            .map(([userId]) => userId)

        return participants
            .filter(p => voterIds.includes(p.user.id))
            .map(p => p.user)
    }

    // Calculate voting progress
    const totalParticipants = participants.length
    const votedCount = Object.keys(userVotes).length
    const votingProgress = totalParticipants > 0 ? (votedCount / totalParticipants) * 100 : 0

    // Get non-voters
    const nonVoters = participants.filter(
        p => !Object.keys(userVotes).includes(p.user.id)
    )

    // Check if deadline is approaching (within 24 hours)
    const isUrgent = votingDeadline
        ? new Date(votingDeadline).getTime() - Date.now() < 24 * 60 * 60 * 1000
        : false

    return (
        <div className="space-y-4">
            {/* Voting Header with Urgency */}
            <Card className={`p-4 ${isUrgent ? 'bg-orange-950/30 border-orange-500/50' : 'bg-gray-900 border-gray-800'}`}>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className={`w-5 h-5 ${isUrgent ? 'text-orange-400' : 'text-blue-400'}`} />
                            <h3 className={`font-semibold ${isUrgent ? 'text-orange-400' : 'text-white'}`}>
                                {votingDeadline ? (
                                    <>VOTE BY {formatDistanceToNow(new Date(votingDeadline), { addSuffix: true }).toUpperCase()}</>
                                ) : (
                                    'VOTING IN PROGRESS'
                                )}
                            </h3>
                        </div>
                        {isUrgent && (
                            <Badge variant="destructive" className="animate-pulse">
                                Urgent
                            </Badge>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">
                                <Users className="w-4 h-4 inline mr-1" />
                                {votedCount}/{totalParticipants} voted
                            </span>
                            <span className="text-gray-400">{Math.round(votingProgress)}%</span>
                        </div>
                        <Progress value={votingProgress} className="h-2" />
                    </div>

                    {/* Waiting for */}
                    {nonVoters.length > 0 && (
                        <div className="text-sm text-gray-400">
                            Waiting for: {nonVoters.map(p => p.user.name).join(', ')}
                        </div>
                    )}
                </div>
            </Card>

            {/* Voting Options */}
            <div className="space-y-3">
                {options.map((option) => {
                    const voteCount = getVoteCount(option.id)
                    const voters = getVoters(option.id)
                    const hasVoted = currentUserVotes.includes(option.id)
                    const isExpanded = expandedOption === option.id
                    const isLeading = voteCount > 0 && voteCount === Math.max(...options.map(o => getVoteCount(o.id)))

                    return (
                        <Card
                            key={option.id}
                            className={`p-4 transition-all ${hasVoted
                                    ? 'border-blue-500 bg-blue-950/20'
                                    : isLeading
                                        ? 'border-green-500/50 bg-green-950/10'
                                        : 'border-gray-800 bg-gray-900'
                                }`}
                        >
                            <div className="space-y-3">
                                {/* Option Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-white">{option.title}</h4>
                                            {isLeading && voteCount > 0 && (
                                                <Badge variant="outline" className="border-green-500 text-green-400">
                                                    Leading
                                                </Badge>
                                            )}
                                        </div>
                                        {option.description && (
                                            <p className="text-sm text-gray-400">{option.description}</p>
                                        )}
                                        {option.location && (
                                            <p className="text-sm text-gray-500 mt-1">📍 {option.location}</p>
                                        )}
                                        {option.dateTime && (
                                            <p className="text-sm text-gray-500">
                                                📅 {new Date(option.dateTime).toLocaleString()}
                                            </p>
                                        )}
                                    </div>

                                    {/* Vote Button */}
                                    <Button
                                        onClick={() => onVote(option.id, 'toggle')}
                                        disabled={isVoting}
                                        variant={hasVoted ? "default" : "outline"}
                                        className={hasVoted ? "bg-blue-600 hover:bg-blue-700" : ""}
                                    >
                                        {hasVoted ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                Voted
                                            </>
                                        ) : (
                                            <>
                                                <Circle className="w-4 h-4 mr-2" />
                                                Vote
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* Vote Count and Voters */}
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => setExpandedOption(isExpanded ? null : option.id)}
                                        className="text-sm text-gray-400 hover:text-white transition-colors"
                                    >
                                        {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                                        {voters.length > 0 && ' • Click to see who voted'}
                                    </button>

                                    {/* Vote percentage */}
                                    {totalParticipants > 0 && (
                                        <span className="text-sm text-gray-500">
                                            {Math.round((voteCount / totalParticipants) * 100)}%
                                        </span>
                                    )}
                                </div>

                                {/* Expanded Voters List */}
                                {isExpanded && voters.length > 0 && (
                                    <div className="pt-3 border-t border-gray-800">
                                        <div className="flex flex-wrap gap-2">
                                            {voters.map((voter) => (
                                                <div
                                                    key={voter.id}
                                                    className="flex items-center gap-2 bg-gray-800 rounded-full px-3 py-1"
                                                >
                                                    {voter.avatar && (
                                                        <img
                                                            src={voter.avatar}
                                                            alt={voter.name}
                                                            className="w-5 h-5 rounded-full"
                                                        />
                                                    )}
                                                    <span className="text-sm text-gray-300">{voter.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
