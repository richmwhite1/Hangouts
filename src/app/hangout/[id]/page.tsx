'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { HANGOUT_STATES, getVoteCount, hasUserVotedFor, categorizeAttendance, checkMandatoryRSVP } from '@/lib/hangout-flow'
import { CheckCircle, XCircle, HelpCircle, MapPin, Clock, DollarSign, Camera, MessageSquare, Users, ChevronDown, ChevronUp, Calendar, Edit } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import SimpleTaskManager from '@/components/hangout/SimpleTaskManager'

interface Hangout {
  id: string
  title: string
  description?: string
  image?: string
  location?: string
  startTime: string
  endTime: string
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
  creatorId: string
  creator: {
    id: string
    username: string
    name: string
    avatar?: string
  }
  participants: Array<{
    id: string
    user: {
      id: string
      username: string
      name: string
      avatar?: string
    }
    rsvpStatus: 'PENDING' | 'YES' | 'NO' | 'MAYBE'
    role: string
    canEdit: boolean
  }>
  photos: Array<{
    id: string
    caption: string
    originalUrl: string
    thumbnailUrl: string
    createdAt: string
    creator: {
      id: string
      name: string
      username: string
      avatar?: string
    }
  }>
  messages: Array<{
    id: string
    text: string
    senderName: string
    createdAt: string
  }>
  _count: {
    content_participants: number
    comments: number
    content_likes: number
    content_shares: number
    messages: number
  }
  // New flow fields
  state: string
  finalizedOption?: any
  requiresVoting: boolean
  requiresRSVP: boolean
  votes: Record<string, string>
  votingDeadline?: string
  options: Array<{
    id: string
    title: string
    description?: string
    location?: string
    dateTime?: string
    price?: number
    hangoutUrl?: string
  }>
}

export default function HangoutDetailPage() {
  const { id: hangoutId } = useParams()
  const { token, user } = useAuth()
  const [hangout, setHangout] = useState<Hangout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdatingRSVP, setIsUpdatingRSVP] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [isChatExpanded, setIsChatExpanded] = useState(true)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false)

  const fetchHangout = async () => {
    if (!token || !hangoutId) return

    try {
      const response = await fetch(`/api/hangouts/${hangoutId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('Failed to fetch hangout')
      const data = await response.json()
      setHangout(data.hangout || data)
    } catch (error) {
      console.error('Error fetching hangout:', error)
      setError('Failed to load hangout')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVote = async (optionId: string, action: 'add' | 'remove' | 'preferred' | 'toggle' = 'add') => {
    if (!token || !hangout) return

    try {
      setIsVoting(true)
      setSelectedOption(optionId)
      
      // Optimistic UI update based on action
      setHangout(prev => {
        const currentUserVotes = prev.userVotes?.[user.id] || []
        const currentUserPreferred = prev.userPreferred?.[user.id]
        
        let newUserVotes = [...currentUserVotes]
        let newUserPreferred = currentUserPreferred
        
        if (action === 'add' || action === 'toggle') {
          if (newUserVotes.includes(optionId)) {
            // Toggle off - remove vote
            newUserVotes = newUserVotes.filter(id => id !== optionId)
            if (newUserPreferred === optionId) {
              newUserPreferred = null
            }
          } else {
            // Toggle on - add vote
            newUserVotes.push(optionId)
          }
        } else if (action === 'remove') {
          newUserVotes = newUserVotes.filter(id => id !== optionId)
          if (newUserPreferred === optionId) {
            newUserPreferred = null
          }
        } else if (action === 'preferred') {
          newUserPreferred = newUserPreferred === optionId ? null : optionId
        }
        
        return {
          ...prev,
          userVotes: {
            ...prev.userVotes,
            [user.id]: newUserVotes
          },
          userPreferred: {
            ...prev.userPreferred,
            [user.id]: newUserPreferred
          }
        }
      })
      
      const response = await fetch(`/api/hangouts/${hangoutId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ optionId, action })
      })

      if (response.ok) {
        // Refresh hangout data to get updated vote counts
        await fetchHangout()
        const actionText = action === 'add' ? 'Vote added' : action === 'remove' ? 'Vote removed' : action === 'toggle' ? 'Vote updated' : 'Preferred option updated'
        toast.success(`${actionText} successfully!`)
      } else {
        // Revert optimistic update on error
        await fetchHangout()
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to update vote')
      }
    } catch (error) {
      console.error('Error voting:', error)
      // Revert optimistic update on error
      await fetchHangout()
      toast.error('An unexpected error occurred during voting')
    } finally {
      setIsVoting(false)
    }
  }

  const handleRSVP = async (status: 'YES' | 'NO' | 'MAYBE') => {
    if (!token || !hangoutId) return

    try {
      setIsUpdatingRSVP(true)
      
      // Optimistic UI update
      setHangout(prev => {
        if (!prev) return prev
        const existingRSVP = prev.rsvps?.find(r => r.userId === user?.id)
        if (existingRSVP) {
          // Update existing RSVP
          return {
            ...prev,
            rsvps: prev.rsvps?.map(r => 
              r.userId === user?.id 
                ? { ...r, status, respondedAt: new Date().toISOString() }
                : r
            ) || []
          }
        } else {
          // Add new RSVP
          return {
            ...prev,
            rsvps: [
              ...(prev.rsvps || []),
              {
                id: `rsvp_${Date.now()}`,
                hangoutId: hangoutId,
                userId: user?.id || '',
                status,
                respondedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                user: { id: user?.id || '', name: user?.name || '', username: user?.username || '', avatar: user?.avatar }
              }
            ]
          }
        }
      })
      
      const response = await fetch(`/api/hangouts/${hangoutId}/rsvp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        await fetchHangout() // Refresh hangout data to get server state
        toast.success(`RSVP set to ${status}!`)
      } else {
        // Revert optimistic update on error
        await fetchHangout()
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to update RSVP')
      }
    } catch (error) {
      console.error('Error updating RSVP:', error)
      // Revert optimistic update on error
      await fetchHangout()
      toast.error('An unexpected error occurred while updating RSVP')
    } finally {
      setIsUpdatingRSVP(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !token || !hangoutId) return

    try {
      const response = await fetch(`/api/hangouts/${hangoutId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newMessage })
      })

      if (response.ok) {
        setNewMessage('')
        await fetchHangout() // Refresh hangout data
      } else {
        toast.error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }

  const addToCalendar = (type: 'google' | 'apple') => {
    if (!hangout) return

    const startTime = new Date(hangout.startTime)
    const endTime = new Date(hangout.endTime)
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const start = formatDate(startTime)
    const end = formatDate(endTime)
    const title = encodeURIComponent(hangout.title)
    const description = encodeURIComponent(hangout.description || '')
    const location = encodeURIComponent(hangout.location || '')

    if (type === 'google') {
      const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${description}&location=${location}`
      window.open(googleUrl, '_blank')
    } else if (type === 'apple') {
      // Apple Calendar uses a different format
      const appleUrl = `webcal://calendar.google.com/calendar/event?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${description}&location=${location}`
      window.open(appleUrl, '_blank')
    }
  }

  useEffect(() => {
    if (token && hangoutId) {
      fetchHangout()
    }
  }, [token, hangoutId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-white">Loading hangout...</p>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-gray-400 mb-4">Please sign in to view this hangout</p>
        </div>
      </div>
    )
  }

  if (error || !hangout) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Hangout Not Found</h1>
          <p className="text-gray-400 mb-4">
            {error || 'The hangout you\'re looking for doesn\'t exist or you don\'t have access to it.'}
          </p>
        </div>
      </div>
    )
  }

  const currentState = hangout.state || HANGOUT_STATES.POLLING
  const isCreator = user?.id === hangout.creatorId
  const isHost = isCreator || hangout.participants?.some(p => p.userId === user?.id && p.role === 'CO_HOST')
  const userRSVP = hangout.rsvps?.find(r => r.userId === user?.id)?.status || 'PENDING'
  
  // Check mandatory participant requirements
  const mandatoryCheck = checkMandatoryRSVP(hangout)
  
  // Debug logging
  console.log('Hangout data:', {
    id: hangout.id,
    state: hangout.state,
    currentState,
    options: hangout.options,
    requiresVoting: hangout.requiresVoting,
    type: hangout.type
  })

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-md mx-auto pb-20">
        {/* Status Header - Always Visible */}
        <HangoutStatusHeader hangout={hangout} state={currentState} />
        
        {/* Hangout Title - Above photo */}
        <div className="px-4 py-2">
          <h1 className="text-2xl font-bold text-white text-center">{hangout.title}</h1>
        </div>
        
        {/* Primary Photo - Always show when it exists */}
        {hangout.image && (
          <div className="px-4 py-2">
            <div className="relative group">
              <img 
                src={hangout.image} 
                alt={hangout.title}
                className="w-full h-64 object-cover rounded-xl shadow-lg"
              />
              <div className="absolute top-3 right-3 bg-black/80 text-white px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm">
                📸 Primary
              </div>
            </div>
          </div>
        )}
        
        {/* Hangout Description - Below photo */}
        {hangout.description && (
          <div className="px-4 py-2">
            <p className="text-gray-300 text-sm leading-relaxed text-center">{hangout.description}</p>
          </div>
        )}
        
        {/* Additional Photos Section - Show below primary photo */}
        <PhotosSection hangout={hangout} currentUser={user} />
        
        {/* Stage 1: Polling Interface - Show for poll hangouts */}
        {(currentState === HANGOUT_STATES.POLLING || (hangout.options && hangout.options.length > 1)) && (
          <VotingSection 
            hangout={hangout} 
            currentUser={user} 
            onVote={handleVote} 
            isVoting={isVoting}
            selectedOption={selectedOption}
          />
        )}
        
        {/* Stage 2: Confirmed Plan Interface - Show after decision made */}
        {(currentState === HANGOUT_STATES.CONFIRMED || currentState === HANGOUT_STATES.COMPLETED) && (
          <>
            {/* Mandatory Participant Alert */}
            {!mandatoryCheck.canProceed && (
              <div className="p-4">
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <h3 className="text-red-400 font-bold text-lg mb-2">⚠️ Waiting for Mandatory Participants</h3>
                  <p className="text-red-300 text-sm mb-2">
                    The hangout cannot proceed until these mandatory participants RSVP:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {mandatoryCheck.waitingFor.map((name, index) => (
                      <span key={index} className="bg-red-600 text-white px-3 py-1 rounded-full text-sm">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Plan Details Section - Show complete plan information */}
            {hangout && (
              <div className="p-4">
                {/* Plan Details Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <div className={`w-2 h-2 rounded-full ${currentState === HANGOUT_STATES.CONFIRMED ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span>{currentState === HANGOUT_STATES.CONFIRMED ? 'Plan Confirmed' : 'Plan Details'}</span>
                  </div>
                  {/* Edit button for hosts/co-hosts */}
                  {hangout.participants?.some(p => 
                    p.userId === user?.id && 
                    (p.role === 'HOST' || p.role === 'CO_HOST')
                  ) && (
                    <button
                      onClick={() => setIsEditPlanModalOpen(true)}
                      className="text-gray-400 hover:text-white transition-colors p-1 rounded"
                      title="Edit plan details"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3">
                  {/* Show finalized option if confirmed, otherwise show first option details */}
                  {currentState === HANGOUT_STATES.CONFIRMED && hangout.finalizedOption ? (
                    <>
                      {/* Finalized Option Text */}
                      {(hangout.finalizedOption.optionText || hangout.finalizedOption.title) && (
                    <div>
                      <h3 className="text-lg font-medium text-white mb-2">{hangout.finalizedOption.optionText || hangout.finalizedOption.title}</h3>
                      {(hangout.finalizedOption.optionDescription || hangout.finalizedOption.description) && (
                        <p className="text-gray-300 text-sm">{hangout.finalizedOption.optionDescription || hangout.finalizedOption.description}</p>
                      )}
                    </div>
                  )}

                  {/* Option-specific Date & Time */}
                  {(hangout.finalizedOption.metadata?.dateTime || hangout.finalizedOption.dateTime) && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300 text-sm">
                        {format(new Date(hangout.finalizedOption.metadata?.dateTime || hangout.finalizedOption.dateTime), 'EEEE, MMMM d, yyyy')}
                      </span>
                    </div>
                  )}

                  {/* Option-specific Time */}
                  {(hangout.finalizedOption.metadata?.dateTime || hangout.finalizedOption.dateTime) && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300 text-sm">
                        {format(new Date(hangout.finalizedOption.metadata?.dateTime || hangout.finalizedOption.dateTime), 'h:mm a')}
                      </span>
                    </div>
                  )}

                  {/* Option-specific Location with Map Icon */}
                  {(hangout.finalizedOption.metadata?.location || hangout.finalizedOption.location) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300 text-sm flex-1">{hangout.finalizedOption.metadata?.location || hangout.finalizedOption.location}</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hangout.finalizedOption.metadata?.location || hangout.finalizedOption.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 p-1 rounded"
                        title="Open in Google Maps"
                      >
                        <MapPin className="w-4 h-4" />
                      </a>
                    </div>
                  )}

                  {/* Option-specific Price */}
                  {((hangout.finalizedOption.metadata?.price !== undefined && hangout.finalizedOption.metadata.price > 0) || (hangout.finalizedOption.price !== undefined && hangout.finalizedOption.price > 0)) && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300 text-sm">
                        ${(hangout.finalizedOption.metadata?.price || hangout.finalizedOption.price).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Option-specific Event Image */}
                  {hangout.finalizedOption.metadata?.eventImage && (
                    <div className="mt-3">
                      <img
                        src={hangout.finalizedOption.metadata.eventImage}
                        alt={hangout.finalizedOption.optionText || 'Plan option'}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}

                  {/* Option-specific Hangout URL */}
                  {hangout.finalizedOption.metadata?.hangoutUrl && (
                    <div className="mt-3">
                      <a
                        href={hangout.finalizedOption.metadata.hangoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                      >
                        🔗 Open Hangout Link
                      </a>
                    </div>
                  )}

                  {/* Consensus Info for voted options */}
                  {hangout.finalizedOption.consensusLevel && (
                    <div className="mt-3 p-2 bg-green-900/20 border border-green-700/30 rounded-lg">
                      <p className="text-green-400 text-xs">
                        Consensus reached: {hangout.finalizedOption.consensusLevel.toFixed(1)}% 
                        ({hangout.finalizedOption.totalVotes} votes)
                      </p>
                    </div>
                  )}
                    </>
                  ) : (
                    <>
                      {/* Show first option details during voting */}
                      {hangout.options && hangout.options.length > 0 && (() => {
                        const firstOption = hangout.options[0]
                        return (
                          <>
                            {/* Option Title and Description */}
                            <div>
                              <h3 className="text-lg font-medium text-white mb-2">{firstOption.title}</h3>
                              {firstOption.description && (
                                <p className="text-gray-300 text-sm">{firstOption.description}</p>
                              )}
                            </div>

                            {/* Option Date & Time */}
                            {firstOption.dateTime && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-300 text-sm">
                                  {format(new Date(firstOption.dateTime), 'EEEE, MMMM d, yyyy')}
                                </span>
                              </div>
                            )}

                            {/* Option Time */}
                            {firstOption.dateTime && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-300 text-sm">
                                  {format(new Date(firstOption.dateTime), 'h:mm a')}
                                </span>
                              </div>
                            )}

                            {/* Option Location with Map Icon */}
                            {firstOption.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-300 text-sm flex-1">{firstOption.location}</span>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(firstOption.location)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 p-1 rounded"
                                  title="Open in Google Maps"
                                >
                                  <MapPin className="w-4 h-4" />
                                </a>
                              </div>
                            )}

                            {/* Option Price */}
                            {firstOption.price && firstOption.price > 0 && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-300 text-sm">
                                  ${firstOption.price.toFixed(2)}
                                </span>
                              </div>
                            )}

                            {/* Option Hangout URL */}
                            {firstOption.hangoutUrl && (
                              <div className="flex items-center gap-2">
                                <a
                                  href={firstOption.hangoutUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2"
                                >
                                  <span>🔗</span>
                                  <span>Open Hangout Link</span>
                                </a>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </>
                  )}
                </div>
              </div>
            )}
            
            <RSVPSection 
              hangout={hangout} 
              currentUser={user} 
              onRSVP={handleRSVP} 
              isUpdating={isUpdatingRSVP} 
              userRSVP={userRSVP} 
            />
            
            {/* Calendar Buttons - Smaller and more discreet */}
            <div className="p-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => addToCalendar('google')}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="text-xs">📅</span>
                  <span className="text-xs">Google</span>
                </button>
                <button 
                  onClick={() => addToCalendar('apple')}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="text-xs">📅</span>
                  <span className="text-xs">Apple</span>
                </button>
              </div>
            </div>
          </>
        )}
        
        {/* Task Management Section - Show for POLLING and CONFIRMED states */}
        {(currentState === HANGOUT_STATES.POLLING || currentState === HANGOUT_STATES.CONFIRMED) && (
          <div className="mx-4 mb-6">
            <SimpleTaskManager 
              hangoutId={hangout.id}
              currentUser={user}
              isHost={isHost}
            />
          </div>
        )}
        
        
        {/* Participant Status Section - Always show if has participants */}
        <ParticipantStatusSection hangout={hangout} currentUser={user} />
        
        {/* Chat Section - Always show */}
        <ChatSection 
          hangout={hangout} 
          currentUser={user} 
          newMessage={newMessage} 
          setNewMessage={setNewMessage} 
          onSendMessage={sendMessage}
          isExpanded={isChatExpanded}
          setIsExpanded={setIsChatExpanded}
        />
      </div>
    </div>
  )
}

// Status Header Component - Sophisticated Design
function HangoutStatusHeader({ hangout, state }: { hangout: Hangout, state: string }) {
  const getStatusConfig = () => {
    switch(state) {
      case HANGOUT_STATES.POLLING:
        const votedCount = Object.keys(hangout.votes || {}).length
        const totalParticipants = hangout.participants?.length || 0
        return {
          icon: '🗳️',
          title: 'Voting Phase',
          subtitle: `${votedCount} of ${totalParticipants} participants voted`,
          bgColor: 'bg-gradient-to-r from-purple-900/20 to-blue-900/20',
          borderColor: 'border-purple-500/30',
          textColor: 'text-white',
          iconColor: 'text-purple-400'
        }
        
      case HANGOUT_STATES.CONFIRMED:
        return null // Don't show the prominent status header for confirmed hangouts
        
      case HANGOUT_STATES.COMPLETED:
        return {
          icon: '📸',
          title: 'Completed',
          subtitle: 'Share photos and memories',
          bgColor: 'bg-gradient-to-r from-gray-900/20 to-slate-900/20',
          borderColor: 'border-gray-500/30',
          textColor: 'text-gray-300',
          iconColor: 'text-gray-400'
        }
    }
  }
  
  const config = getStatusConfig()
  
  // Don't render anything if config is null (for confirmed hangouts)
  if (!config) {
    return null
  }
  
  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4 m-4 text-center backdrop-blur-sm`}>
      <div className={`text-2xl mb-2 ${config.iconColor}`}>{config.icon}</div>
      <div className={`text-lg font-semibold ${config.textColor} mb-1`}>{config.title}</div>
      <div className={`text-sm ${config.textColor} opacity-90`}>{config.subtitle}</div>
    </div>
  )
}

// Voting Section Component (Stage 1) - REDESIGNED
function VotingSection({ hangout, currentUser, onVote, isVoting, selectedOption }: { 
  hangout: Hangout, 
  currentUser: any, 
  onVote: (optionId: string) => void,
  isVoting: boolean,
  selectedOption: string | null
}) {
  const votedCount = Object.keys(hangout.votes || {}).length
  const totalParticipants = hangout.participants?.length || 0
  const userVotes = hangout.userVotes?.[currentUser?.id] || []
  const userPreferred = hangout.userPreferred?.[currentUser?.id]

  return (
    <div className="p-4">
      {/* Voting Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Vote for Your Options</h2>
        <p className="text-gray-400 text-sm">
          {votedCount} of {totalParticipants} friends have voted
        </p>
        <p className="text-gray-400 text-xs mt-1">
          You can vote for multiple options and mark one as preferred
        </p>
      </div>
      
      {/* Voting Options */}
      {hangout.options?.map((option, index) => {
        const voteCount = getVoteCount(hangout.votes, option.id)
        const hasUserVoted = userVotes.includes(option.id)
        const isPreferred = userPreferred === option.id
        const votePercentage = totalParticipants > 0 ? (voteCount / totalParticipants * 100) : 0
        
        return (
          <div 
            key={option.id}
            className={`bg-black border-2 rounded-xl mb-4 overflow-hidden ${
              isPreferred ? 'border-yellow-500' : hasUserVoted ? 'border-pink-500' : 'border-gray-600'
            }`}
          >
            {/* Option Image */}
            {(option.hangoutUrl || option.eventImage) && (
              <div className="w-full h-32 bg-gray-800 rounded-lg flex items-center justify-center">
                {option.eventImage ? (
                  <img 
                    src={option.eventImage} 
                    alt={option.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : option.hangoutUrl ? (
                  <a 
                    href={option.hangoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                  >
                    🔗 Open Hangout Link
                  </a>
                ) : null}
              </div>
            )}
            
            {/* Option Content */}
            <div className="p-4">
              <h3 className="text-lg font-bold text-white mb-2">{option.title}</h3>
              
              {option.description && (
                <p className="text-gray-300 text-sm mb-3">{option.description}</p>
              )}
              
              <div className="space-y-1 mb-3">
                {option.location && (
                  <p className="text-gray-400 text-sm">📍 {option.location}</p>
                )}
                {option.dateTime && (
                  <p className="text-gray-400 text-sm">🕒 {format(new Date(option.dateTime), 'MMM d, h:mm a')}</p>
                )}
                {option.price && option.price > 0 && (
                  <p className="text-gray-400 text-sm">💰 ${option.price} per person</p>
                )}
              </div>
              
              {/* Vote Status */}
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <p className="text-gray-400 text-sm mb-1">
                    {voteCount} vote{voteCount !== 1 ? 's' : ''} ({Math.round(votePercentage)}%)
                  </p>
                  
                  {/* Preferred Voters */}
                  {hangout.participants && (() => {
                    const preferredVoters = hangout.participants.filter(p => 
                      hangout.userPreferred?.[p.user.id] === option.id
                    )
                    return preferredVoters.length > 0 && (
                      <div className="mb-2">
                        <p className="text-yellow-400 text-xs font-medium">⭐ Preferred by:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {preferredVoters.map(p => (
                            <span key={p.user.id} className="text-yellow-300 text-xs bg-yellow-900/30 px-2 py-1 rounded-full">
                              {p.user.name || p.user.username}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                  
                  {/* Vote Progress Bar */}
                  <div className="w-full bg-gray-700 rounded-full h-1">
                    <div 
                      className="text-white h-1 rounded-full transition-all duration-300"
                      style={{ width: `${votePercentage}%`, backgroundColor: '#792ADB' }}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => onVote(option.id, 'toggle')}
                    disabled={isVoting}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${
                      hasUserVoted 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-black border text-purple-400'
                    }`}
                    style={!hasUserVoted ? { borderColor: '#792ADB' } : {}}
                  >
                    {hasUserVoted ? '✓ Voted' : 'Tap to Vote'}
                  </button>
                  
                  {hasUserVoted && (
                    <button
                      onClick={() => onVote(option.id, 'preferred')}
                      disabled={isVoting}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${
                        isPreferred 
                          ? 'bg-yellow-600 text-white' 
                          : 'bg-gray-600 text-white hover:bg-yellow-600'
                      }`}
                    >
                      {isPreferred ? '⭐ Preferred' : 'Mark Preferred'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
      
      {/* Voting Progress Summary */}
      <VotingProgressSummary hangout={hangout} />
    </div>
  )
}

// Voting Progress Summary Component
function VotingProgressSummary({ hangout }: { hangout: Hangout }) {
  const votedCount = Object.keys(hangout.votes || {}).length
  const totalParticipants = hangout.participants?.length || 0
  const remainingVotes = totalParticipants - votedCount
  const hoursLeft = hangout.votingDeadline ? 
    Math.max(0, Math.ceil((new Date(hangout.votingDeadline).getTime() - Date.now()) / (1000 * 60 * 60))) : 0
  
  return (
    <div className="bg-black border border-gray-600 rounded-lg p-4 mt-4">
      <h3 className="text-white font-bold mb-2">Voting Progress</h3>
      <p className="text-gray-400 text-sm mb-2">
        {votedCount} of {totalParticipants} friends have voted
      </p>
      {remainingVotes > 0 && (
        <p className="text-gray-400 text-sm mb-2">
          Waiting for {remainingVotes} more vote{remainingVotes !== 1 ? 's' : ''}
        </p>
      )}
      {hoursLeft > 0 && (
        <p className="text-white text-sm">
          Voting ends in {hoursLeft} hours
        </p>
      )}
    </div>
  )
}


// RSVP Section - REDESIGNED with visual feedback
function RSVPSection({ hangout, currentUser, onRSVP, isUpdating, userRSVP }: {
  hangout: Hangout,
  currentUser: any,
  onRSVP: (status: 'YES' | 'NO' | 'MAYBE') => void,
  isUpdating: boolean,
  userRSVP: string
}) {
  return (
    <div className="px-4 py-2">
      <div className="flex gap-1">
        <button 
          className={`flex-1 py-2 px-3 rounded border transition-all duration-200 ${
            userRSVP === 'YES' 
              ? 'bg-green-600/20 border-green-500/50 text-green-400' 
              : 'bg-gray-800/30 border-gray-600/50 text-gray-300 hover:border-green-400/50 hover:bg-green-900/10'
          }`}
          onClick={() => onRSVP('YES')}
          disabled={isUpdating}
        >
          <div className="text-center">
            <div className="text-xs font-medium">Going</div>
          </div>
        </button>
        
        <button 
          className={`flex-1 py-2 px-3 rounded border transition-all duration-200 ${
            userRSVP === 'MAYBE' 
              ? 'bg-yellow-600/20 border-yellow-500/50 text-yellow-400' 
              : 'bg-gray-800/30 border-gray-600/50 text-gray-300 hover:border-yellow-400/50 hover:bg-yellow-900/10'
          }`}
          onClick={() => onRSVP('MAYBE')}
          disabled={isUpdating}
        >
          <div className="text-center">
            <div className="text-xs font-medium">Maybe</div>
          </div>
        </button>
        
        <button 
          className={`flex-1 py-2 px-3 rounded border transition-all duration-200 ${
            userRSVP === 'NO' 
              ? 'bg-red-600/20 border-red-500/50 text-red-400' 
              : 'bg-gray-800/30 border-gray-600/50 text-gray-300 hover:border-red-400/50 hover:bg-red-900/10'
          }`}
          onClick={() => onRSVP('NO')}
          disabled={isUpdating}
        >
          <div className="text-center">
            <div className="text-xs font-medium">Not Going</div>
          </div>
        </button>
      </div>
    </div>
  )
}

// Participant Status Section - Professional Enterprise-Grade Design
function ParticipantStatusSection({ hangout, currentUser }: { hangout: Hangout, currentUser: any }) {
  const currentState = hangout.state || HANGOUT_STATES.POLLING
  const participants = hangout.participants || []
  
  if (participants.length === 0) return null
  
  return (
    <div className="px-4 py-3">
      {/* Large Square Profile Icons Grid with Names and Status */}
      <div className="grid grid-cols-4 gap-3">
        {participants.slice(0, 8).map((participant) => {
          const userVotes = hangout.userVotes?.[participant.user.id] || []
          const userPreferred = hangout.userPreferred?.[participant.user.id]
          const hasVoted = userVotes.length > 0
          const isVotingPhase = currentState === HANGOUT_STATES.POLLING
          
          // Get RSVP status from hangout.rsvps array
          const userRSVP = hangout.rsvps?.find(rsvp => rsvp.userId === participant.user.id)
          const rsvpStatus = userRSVP?.status || 'PENDING'
          
          return (
            <div key={participant.id} className="flex flex-col items-center text-center">
              {/* Large Square Profile Picture */}
              <div className="relative mb-2">
                <img
                  src={participant.user.avatar || '/placeholder-avatar.png'}
                  alt={participant.user.name}
                  className="w-16 h-16 rounded-md border border-gray-600 object-cover group-hover:scale-105 transition-transform"
                />
                {/* Status Indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded border border-gray-900 flex items-center justify-center">
                  <div className={`w-2 h-2 rounded-full ${
                    isVotingPhase ? (hasVoted ? 'bg-green-500' : 'bg-gray-500') :
                    rsvpStatus === 'YES' ? 'bg-green-500' :
                    rsvpStatus === 'MAYBE' ? 'bg-yellow-500' :
                    rsvpStatus === 'NO' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`}></div>
                </div>
              </div>
              
              {/* Name */}
              <p className="text-white font-medium text-xs mb-1 truncate w-full">{participant.user.name}</p>
              
              {/* Status */}
              <div className="text-xs">
                {isVotingPhase ? (
                  <span className={hasVoted ? 'text-green-400' : 'text-gray-400'}>
                    {hasVoted ? 'Voted' : 'Pending'}
                  </span>
                ) : (
                  <span className={
                    rsvpStatus === 'YES' ? 'text-green-400' :
                    rsvpStatus === 'MAYBE' ? 'text-yellow-400' :
                    rsvpStatus === 'NO' ? 'text-red-400' :
                    'text-gray-400'
                  }>
                    {rsvpStatus === 'YES' ? 'Going' :
                     rsvpStatus === 'MAYBE' ? 'Maybe' :
                     rsvpStatus === 'NO' ? 'Not Going' :
                     'Pending'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Chat Section - Professional Enterprise-Grade Design
function ChatSection({ hangout, currentUser, newMessage, setNewMessage, onSendMessage, isExpanded, setIsExpanded }: {
  hangout: Hangout,
  currentUser: any,
  newMessage: string,
  setNewMessage: (msg: string) => void,
  onSendMessage: () => void,
  isExpanded: boolean,
  setIsExpanded: (expanded: boolean) => void
}) {
  const [messages, setMessages] = useState<any[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const messagesCount = messages.length
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch messages when component mounts or hangout changes
  useEffect(() => {
    if (hangout?.id) {
      fetchMessages()
    }
  }, [hangout?.id])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    // Auto-expand when there are messages
    if (messages.length > 0) {
      setIsExpanded(true)
    }
    // Mark as having new messages if chat is collapsed
    if (!isExpanded && messages.length > 0) {
      setHasNewMessages(true)
    }
  }, [messages, isExpanded])

  // Clear new messages indicator when chat is expanded
  useEffect(() => {
    if (isExpanded) {
      setHasNewMessages(false)
    }
  }, [isExpanded])

  const fetchMessages = async () => {
    if (!hangout?.id) return
    
    setIsLoadingMessages(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/hangouts/${hangout.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data.data?.messages || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/hangouts/${hangout.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newMessage })
      })

      if (response.ok) {
        setNewMessage('')
        await fetchMessages() // Refresh messages
        // Expand chat when sending a message
        setIsExpanded(true)
      } else {
        toast.error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }
  
  return (
    <div className="p-4">
      {/* Professional Chat Header */}
      <button 
        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 mb-3 flex justify-between items-center hover:bg-gray-800/50 transition-colors group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">Group Chat</h2>
            <p className="text-gray-400 text-xs">
              {messagesCount} message{messagesCount !== 1 ? 's' : ''}
              {messagesCount === 0 && (
                <span className="text-gray-500 ml-1">(click to start chatting)</span>
              )}
            </p>
          </div>
          {hasNewMessages && !isExpanded && (
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Professional Chat Messages Area */}
      <div className={`bg-gray-900/30 border border-gray-700 rounded-lg transition-all duration-300 overflow-hidden ${
        isExpanded ? 'max-h-80' : 'max-h-40'
      }`}>
        <div 
          className="p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800" 
          style={{ 
            maxHeight: isExpanded ? '18rem' : '8rem',
            scrollBehavior: 'smooth'
          }}
        >
          {isLoadingMessages ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <span className="ml-2 text-gray-400 text-sm">Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-6">
              <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No messages yet</p>
              <p className="text-gray-500 text-xs">Start the conversation below</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map(message => (
                <div key={message.id} className="flex items-start gap-3 group">
                  {/* Professional Avatar */}
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-semibold">
                      {message.senderName?.charAt(0) || '?'}
                    </span>
                  </div>
                  
                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-sm">{message.senderName}</span>
                      <span className="text-gray-500 text-xs">
                        {format(new Date(message.createdAt), 'h:mm a')}
                      </span>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                      <p className="text-white text-sm leading-relaxed break-words">{message.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Professional Message Input */}
      <div className="mt-3">
        <div className="flex items-end gap-2 p-3 bg-gray-900/50 border border-gray-700 rounded-lg">
          <input
            className="flex-1 bg-transparent border-none text-white px-0 py-2 text-sm focus:outline-none placeholder-gray-400"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            maxLength={300}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              newMessage.trim() 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            Send
          </button>
        </div>
        <div className="flex justify-between items-center mt-1 px-1">
          <span className="text-xs text-gray-500">{newMessage.length}/300</span>
          <span className="text-xs text-gray-500">Press Enter to send</span>
        </div>
      </div>
    </div>
  )
}


// Photos Section - REDESIGNED
function PhotosSection({ hangout, currentUser }: { hangout: Hangout, currentUser: any }) {
  const [photos, setPhotos] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  // Fetch photos when component mounts
  useEffect(() => {
    if (hangout?.id) {
      fetchPhotos()
    }
  }, [hangout?.id])

  const fetchPhotos = async () => {
    if (!hangout?.id) return
    
    setIsLoadingPhotos(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/hangouts/${hangout.id}/photos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPhotos(data.data?.photos || [])
      }
    } catch (error) {
      console.error('Error fetching photos:', error)
    } finally {
      setIsLoadingPhotos(false)
    }
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach(file => {
        formData.append('photos', file)
      })

      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/hangouts/${hangout.id}/photos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        await fetchPhotos() // Refresh photos
        toast.success('Photos uploaded successfully!')
      } else {
        toast.error('Failed to upload photos')
      }
    } catch (error) {
      console.error('Error uploading photos:', error)
      toast.error('An error occurred while uploading photos')
    } finally {
      setIsUploading(false)
    }
  }

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
  }

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  return (
    <div className="p-4">
      <div className="flex justify-end items-center mb-4">
        <div className="relative">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          <button 
            className={`px-3 py-1 rounded-lg font-bold text-sm ${
              isUploading 
                ? 'bg-gray-600 text-gray-400' 
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : '+ Add Photos'}
          </button>
        </div>
      </div>
      
      {isLoadingPhotos ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading photos...</p>
        </div>
      ) : photos.length > 0 ? (
        <div className="space-y-4">
          {/* Mobile Carousel */}
          <div className="relative">
            <div className="overflow-hidden rounded-xl">
              <div 
                className="flex transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(-${currentPhotoIndex * 100}%)` }}
              >
                {photos.map((photo, index) => (
                  <div key={photo.id} className="w-full flex-shrink-0 relative">
                    <img
                      src={photo.originalUrl || photo.thumbnailUrl}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-48 object-cover"
                    />
                    {/* Photo Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white text-sm">
                        by {photo.users?.name || 'Unknown'}
                      </p>
                      {photo.caption && (
                        <p className="text-gray-300 text-xs mt-1">{photo.caption}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                >
                  ←
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                >
                  →
                </button>
              </>
            )}
            
            {/* Dots Indicator */}
            {photos.length > 1 && (
              <div className="flex justify-center mt-2 space-x-2">
                {photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentPhotoIndex ? 'bg-purple-500' : 'bg-gray-500'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

// Edit Plan Modal Component
function EditPlanModal({ hangout, onClose, onSave }: {
  hangout: Hangout | null
  onClose: () => void
  onSave: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    title: hangout?.finalizedOption?.optionText || hangout?.title || '',
    description: hangout?.finalizedOption?.optionDescription || hangout?.description || '',
    location: hangout?.finalizedOption?.metadata?.location || hangout?.location || '',
    dateTime: hangout?.finalizedOption?.metadata?.dateTime || hangout?.startTime || '',
    price: hangout?.finalizedOption?.metadata?.price || hangout?.priceMin || 0,
    hangoutUrl: hangout?.finalizedOption?.metadata?.hangoutUrl || hangout?.ticketUrl || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  if (!hangout) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Edit Plan Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Plan Title
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="Enter plan title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2"
                placeholder="Enter plan description"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Location
              </label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="Enter location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date & Time
              </label>
              <Input
                type="datetime-local"
                value={formData.dateTime ? new Date(formData.dateTime).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dateTime: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Price ($)
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Hangout URL
              </label>
              <Input
                value={formData.hangoutUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, hangoutUrl: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="https://..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}