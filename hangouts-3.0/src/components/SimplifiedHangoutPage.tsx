'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SimplePollModal } from '@/components/polling/SimplePollModal'
import { SimplePollDisplay } from '@/components/polling/SimplePollDisplay'
import { useHangoutState } from '@/hooks/use-hangout-state'
import { Calendar, Users, MessageSquare, Camera, CheckCircle, Clock } from 'lucide-react'

interface SimplifiedHangoutPageProps {
  hangoutId: string
}

export function SimplifiedHangoutPage({ hangoutId }: SimplifiedHangoutPageProps) {
  const { state, isLoading, voteOnPoll, updateRSVP } = useHangoutState(hangoutId)
  const [showCreatePoll, setShowCreatePoll] = useState(false)
  const [isUpdatingRSVP, setIsUpdatingRSVP] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading hangout...</p>
        </div>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Failed to load hangout</p>
      </div>
    )
  }

  const isCreator = state.participants.some(p => p.role === 'CREATOR')
  const userRSVP = state.participants.find(p => p.user.id === 'current-user-id')?.rsvpStatus

  const handleVote = async (pollId: string, optionId: string) => {
    await voteOnPoll(pollId, optionId)
  }

  const handleRSVP = async (status: 'YES' | 'NO' | 'MAYBE') => {
    setIsUpdatingRSVP(true)
    try {
      await updateRSVP(status)
    } finally {
      setIsUpdatingRSVP(false)
    }
  }

  const handlePollCreated = () => {
    setShowCreatePoll(false)
    // State will refresh automatically
  }

  return (
    <div className="space-y-6">
      {/* Primary Photo */}
      {state.image && (
        <div className="relative w-full h-64 rounded-lg overflow-hidden">
          <img 
            src={state.image} 
            alt={state.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute bottom-4 left-4 text-white">
            <h1 className="text-2xl font-bold">{state.title}</h1>
            {state.description && (
              <p className="text-lg opacity-90">{state.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Phase-based Content */}
      {state.phase === 'planning' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4" />
                <span>{new Date(state.startTime).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4" />
                <span>{new Date(state.startTime).toLocaleTimeString()}</span>
              </div>
              {state.location && (
                <div className="flex items-center gap-3 md:col-span-2">
                  <span className="w-4 h-4 text-center">📍</span>
                  <span>{state.location}</span>
                </div>
              )}
            </div>
            
            {isCreator && (
              <div className="pt-4 border-t">
                <Button 
                  onClick={() => setShowCreatePoll(true)}
                  className="w-full"
                >
                  Create Poll to Decide Details
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {state.phase === 'voting' && state.activePoll && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-green-600 mb-2">
              🗳️ Time to Vote!
            </h2>
            <p className="text-gray-600">
              Help decide the details for this hangout
            </p>
          </div>
          
          <SimplePollDisplay
            poll={state.activePoll}
            onVote={handleVote}
            userVote={null} // TODO: Track user's vote
          />
        </div>
      )}

      {state.phase === 'consensus' && state.finalPlan && (
        <div className="space-y-4">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                Consensus Reached!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  {state.finalPlan.winningOption}
                </h3>
                <p className="text-green-700">
                  Won with {state.finalPlan.consensusPercentage.toFixed(1)}% of the votes
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Final Plan Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Final Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(state.startTime).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(state.startTime).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-3 md:col-span-2">
                  <span className="w-4 h-4 text-center">📍</span>
                  <span>{state.finalPlan.winningOption}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* RSVP Section - Show in consensus and rsvp phases */}
      {(state.phase === 'consensus' || state.phase === 'rsvp') && (
        <Card>
          <CardHeader>
            <CardTitle>RSVP</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Are you attending this hangout?</p>
            <div className="flex space-x-4">
              <Button
                onClick={() => handleRSVP('YES')}
                disabled={isUpdatingRSVP}
                className={`flex-1 ${
                  userRSVP === 'YES' ? 'bg-green-600' : 'bg-gray-700'
                }`}
              >
                {isUpdatingRSVP ? 'Updating...' : 'Going'}
              </Button>
              <Button
                onClick={() => handleRSVP('MAYBE')}
                disabled={isUpdatingRSVP}
                className={`flex-1 ${
                  userRSVP === 'MAYBE' ? 'bg-yellow-600' : 'bg-gray-700'
                }`}
              >
                Maybe
              </Button>
              <Button
                onClick={() => handleRSVP('NO')}
                disabled={isUpdatingRSVP}
                className={`flex-1 ${
                  userRSVP === 'NO' ? 'bg-red-600' : 'bg-gray-700'
                }`}
              >
                Not Going
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Who's Coming */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Who's Coming ({state.participants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {state.participants.map((participant) => (
              <div key={participant.id} className="text-center">
                <div className="relative w-12 h-12 mx-auto mb-2">
                  <img
                    src={participant.user.avatar || '/placeholder-avatar.png'}
                    alt={participant.user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                  {participant.role === 'CREATOR' && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs px-1 rounded-full">
                      👑
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium">{participant.user.name}</span>
                <div className={`text-xs px-2 py-1 rounded-full mt-1 ${
                  participant.rsvpStatus === 'YES' ? 'bg-green-100 text-green-800' :
                  participant.rsvpStatus === 'NO' ? 'bg-red-100 text-red-800' :
                  participant.rsvpStatus === 'MAYBE' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {participant.rsvpStatus}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Poll Modal */}
      {showCreatePoll && (
        <SimplePollModal
          hangoutId={hangoutId}
          onPollCreated={handlePollCreated}
          onClose={() => setShowCreatePoll(false)}
        />
      )}
    </div>
  )
}
















