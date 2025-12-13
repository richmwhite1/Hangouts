'use client'

import { Users, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SocialProofStatsProps {
  participantCount: number
  rsvpYesCount?: number
  rsvpMaybeCount?: number
  spotsRemaining?: number
  trendingScore?: number
  className?: string
}

/**
 * Displays social proof statistics to build trust and encourage conversion
 * Shows metrics like participation rates, trending status, and availability
 */
export function SocialProofStats({
  participantCount,
  rsvpYesCount = 0,
  rsvpMaybeCount = 0,
  spotsRemaining,
  trendingScore,
  className = ''
}: SocialProofStatsProps) {
  const totalResponses = rsvpYesCount + rsvpMaybeCount
  const yesPercentage = totalResponses > 0 
    ? Math.round((rsvpYesCount / totalResponses) * 100) 
    : 0

  const isTrending = (trendingScore && trendingScore > 0.7) || participantCount > 10
  const isFillingFast = spotsRemaining !== undefined && spotsRemaining < 5
  const highCommitment = yesPercentage > 75

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Participant Count */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Going</span>
          </div>
          <p className="text-2xl font-bold text-white">{participantCount}</p>
        </div>

        {/* Commitment Rate */}
        {totalResponses > 0 && (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Confirmed</span>
            </div>
            <p className="text-2xl font-bold text-white">{yesPercentage}%</p>
          </div>
        )}
      </div>

      {/* Badges & Indicators */}
      <div className="flex flex-wrap gap-2">
        {isTrending && (
          <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
            <TrendingUp className="w-3 h-3 mr-1" />
            Trending
          </Badge>
        )}

        {isFillingFast && (
          <Badge variant="secondary" className="bg-red-500/20 text-red-300 border-red-500/30">
            <Clock className="w-3 h-3 mr-1" />
            {spotsRemaining} spots left
          </Badge>
        )}

        {highCommitment && totalResponses >= 5 && (
          <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            High interest
          </Badge>
        )}
      </div>

      {/* Descriptive Text */}
      {participantCount > 0 && (
        <div className="text-sm text-gray-400">
          {participantCount === 1 && <p>Be the second person to join!</p>}
          {participantCount >= 2 && participantCount < 5 && (
            <p>Small group - great for intimate hangouts</p>
          )}
          {participantCount >= 5 && participantCount < 15 && (
            <p>Popular hangout with {participantCount} people already going</p>
          )}
          {participantCount >= 15 && (
            <p>🔥 This is a popular event! Join {participantCount} others</p>
          )}
        </div>
      )}

      {/* Urgency Message */}
      {isFillingFast && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
          <p className="text-sm text-orange-300 font-medium">
            ⚡ Filling fast! Only {spotsRemaining} {spotsRemaining === 1 ? 'spot' : 'spots'} remaining
          </p>
        </div>
      )}
    </div>
  )
}










