'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { SimplePollDisplay } from '@/components/polling/SimplePollDisplay'
import { SimpleChat } from '@/components/simple-chat'
import { PhotoGallery } from '@/components/PhotoGallery'
import { EnhancedPhotoUpload } from '@/components/EnhancedPhotoUpload'
import { Calendar, Clock, Users, Camera, BarChart3 } from 'lucide-react'

export default function HangoutDetailPage() {
  const { id: hangoutId } = useParams()
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState('plan')
  const [currentHangout, setCurrentHangout] = useState<any>(null)
  const [polls, setPolls] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdatingRSVP, setIsUpdatingRSVP] = useState(false)
  const [finalPlan, setFinalPlan] = useState<any>(null)
  const [rsvps, setRsvps] = useState<any[]>([])
  const [isLoadingFinalPlan, setIsLoadingFinalPlan] = useState(false)

  const fetchHangout = async () => {
    if (!token || !hangoutId) return

    try {
      const response = await fetch(`/api/hangouts/${hangoutId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('Failed to fetch hangout')
      const data = await response.json()
      setCurrentHangout(data.hangout || data)
    } catch (error) {
      console.error('Error fetching hangout:', error)
      setError('Failed to load hangout')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPolls = async () => {
    console.log('🔄 fetchPolls called with:', { token: !!token, hangoutId })
    if (!token || !hangoutId) {
      console.log('❌ fetchPolls skipped - missing token or hangoutId')
      return
    }

    try {
      console.log('🌐 Fetching polls from:', `/api/hangouts/${hangoutId}/polls-simple`)
      const response = await fetch(`/api/hangouts/${hangoutId}/polls-simple`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      console.log('📡 Polls response status:', response.status, response.ok)
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Polls API Response:', data)
        console.log('📊 Setting polls to:', data.polls || [])
        setPolls(data.polls || [])
      } else {
        console.error('❌ Polls API error:', response.status, response.statusText)
        const errorData = await response.json()
        console.error('❌ Polls API error details:', errorData)
      }
    } catch (error) {
      console.error('❌ Polls fetch error:', error)
    }
  }

  const handleVote = async (pollId: string, optionId: string) => {
    if (!token) return

    console.log('🗳️ Voting on poll:', pollId, 'option:', optionId)
    
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

      console.log('📡 Vote response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Vote successful:', result)
        await fetchPolls()
      } else {
        const errorData = await response.json()
        console.error('❌ Vote failed:', errorData)
      }
    } catch (error) {
      console.error('❌ Vote error:', error)
    }
  }


  const handlePhotoUpload = async (files: File[]) => {
    if (!files || files.length === 0 || !hangoutId || !token) {
      return
    }

    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append('photo', file)

        const response = await fetch(`/api/hangouts/${hangoutId}/photos`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        })

        if (response.ok) {
          await fetchHangout()
        }
      } catch (error) {
        console.error('Error uploading photo:', error)
      }
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!token) return

    try {
      const response = await fetch(`/api/hangouts/${hangoutId}/photos/${photoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        await fetchHangout()
      }
    } catch (error) {
      console.error('Error deleting photo:', error)
    }
  }

  const handleOptionAdded = async (option: any) => {
    console.log('Option added:', option)
    // Refresh polls to show the new option
    await fetchPolls()
  }

  const fetchFinalPlan = async () => {
    if (!token || !hangoutId) return

    try {
      setIsLoadingFinalPlan(true)
      const response = await fetch(`/api/hangouts/${hangoutId}/final-plan`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setFinalPlan(data.finalPlan)
      } else if (response.status === 404) {
        setFinalPlan(null) // No final plan yet
      } else {
        throw new Error('Failed to fetch final plan')
      }
    } catch (error) {
      console.error('Error fetching final plan:', error)
      setFinalPlan(null)
    } finally {
      setIsLoadingFinalPlan(false)
    }
  }

  const fetchRsvps = async () => {
    if (!token || !hangoutId) return

    try {
      const response = await fetch(`/api/hangouts/${hangoutId}/rsvp`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setRsvps(data.rsvps)
      } else {
        throw new Error('Failed to fetch RSVPs')
      }
    } catch (error) {
      console.error('Error fetching RSVPs:', error)
      setRsvps([])
    }
  }

  const handleRSVP = async (status: 'YES' | 'NO' | 'MAYBE') => {
    if (!token || !hangoutId) return

    try {
      setIsUpdatingRSVP(true)
      const response = await fetch(`/api/hangouts/${hangoutId}/rsvp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        await fetchRsvps() // Refresh RSVPs
      } else {
        throw new Error('Failed to update RSVP')
      }
    } catch (error) {
      console.error('Error updating RSVP:', error)
    } finally {
      setIsUpdatingRSVP(false)
    }
  }

  useEffect(() => {
    if (token && hangoutId) {
      fetchHangout()
      fetchPolls()
      fetchFinalPlan()
      fetchRsvps()
    }
  }, [token, hangoutId])

  const getUserRSVP = () => {
    const participant = currentHangout.participants?.find((p: any) => p.user.id === user?.id)
    return participant?.rsvpStatus || 'PENDING'
  }

  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <div className="px-4 pb-24">
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Loading hangout...
          </p>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="px-4 pb-24">
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Please sign in to view this hangout
          </p>
          <p className="text-gray-500 text-sm">
            <a href="/fix-auth-frontend.html" className="text-blue-400 hover:text-blue-300">
              Click here to fix authentication
            </a>
          </p>
        </div>
      </div>
    )
  }


  if (error || !currentHangout) {
    return (
      <div className="px-4 pb-24">
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {error || 'Hangout not found'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      <div className="px-4 pb-24">
        {/* Primary Photo at Top */}
        <div className="relative w-full h-80 rounded-lg overflow-hidden mb-6">
          <img
            src={currentHangout?.image || '/default-hangout-icon.jpg'}
            alt={currentHangout?.title || 'Hangout'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute bottom-4 left-4 text-white">
            <h1 className="text-3xl font-bold">{currentHangout?.title || 'Hangout'}</h1>
            {currentHangout?.description && currentHangout.description !== 'Choose your preferred option' && (
              <p className="text-lg opacity-90">{currentHangout.description}</p>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mb-6">
          {[
            { id: 'plan', label: 'The Plan', icon: '📋' },
            { id: 'chat', label: 'Chat', icon: '💬' },
            { id: 'photos', label: 'Photos', icon: '📸' },
            { id: 'people', label: 'People', icon: '👥' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            {/* Final Plan - Show when consensus is reached */}
            {finalPlan && (
              <div className="bg-green-900 border border-green-700 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="text-2xl mr-3">✅</div>
                  <div>
                    <h3 className="text-xl font-bold text-green-100">Plan Finalized!</h3>
                    <p className="text-green-200 text-sm">
                      Consensus reached with {finalPlan.consensusLevel}% agreement
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <h4 className="text-lg font-semibold text-white mb-2">{finalPlan.title}</h4>
                  <p className="text-gray-300 mb-3">{finalPlan.description}</p>
                  
                  <div className="bg-gray-700 rounded-lg p-3">
                    <h5 className="font-semibold text-white mb-2">Selected Option:</h5>
                    <p className="text-white text-lg font-medium">{finalPlan.optionText}</p>
                    {finalPlan.optionDescription && (
                      <p className="text-gray-300 text-sm mt-1">{finalPlan.optionDescription}</p>
                    )}
                    {finalPlan.metadata && (
                      <div className="mt-2 text-sm text-gray-400">
                        {finalPlan.metadata.date && finalPlan.metadata.time && (
                          <p>📅 {finalPlan.metadata.date} at {finalPlan.metadata.time}</p>
                        )}
                        {finalPlan.metadata.location && (
                          <p>📍 {finalPlan.metadata.location}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* RSVP Section */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h5 className="font-semibold text-white mb-3">RSVP Status</h5>
                  <div className="space-y-2">
                    {rsvps.map((rsvp) => (
                      <div key={rsvp.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <img
                            src={rsvp.user.avatar || '/placeholder-avatar.png'}
                            alt={rsvp.user.name}
                            className="w-8 h-8 rounded-full mr-3"
                          />
                          <span className="text-white">{rsvp.user.name}</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          rsvp.status === 'YES' ? 'bg-green-600 text-white' :
                          rsvp.status === 'NO' ? 'bg-red-600 text-white' :
                          rsvp.status === 'MAYBE' ? 'bg-yellow-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {rsvp.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* RSVP Buttons for current user */}
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-gray-300 text-sm mb-3">Your response:</p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleRSVP('YES')}
                        disabled={isUpdatingRSVP}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                      >
                        {isUpdatingRSVP ? 'Updating...' : 'Yes'}
                      </button>
                      <button
                        onClick={() => handleRSVP('MAYBE')}
                        disabled={isUpdatingRSVP}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                      >
                        {isUpdatingRSVP ? 'Updating...' : 'Maybe'}
                      </button>
                      <button
                        onClick={() => handleRSVP('NO')}
                        disabled={isUpdatingRSVP}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                      >
                        {isUpdatingRSVP ? 'Updating...' : 'No'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Polls Section - Show when no final plan exists */}
            {!finalPlan && (
              <>
                {/* Hangout Details - Always show at top */}
                {(currentHangout.title || currentHangout.description) && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Hangout Details</h3>
                    {currentHangout.title && (
                      <h4 className="text-lg font-semibold text-white mb-2">{currentHangout.title}</h4>
                    )}
                    {currentHangout.description && currentHangout.description !== 'Choose your preferred option' && (
                      <p className="text-gray-300">{currentHangout.description}</p>
                    )}
                  </div>
                )}

                {/* Polls Section - Show all polls */}
                {polls.length > 0 && (
                  <div className="space-y-6">
                    {polls.map((poll) => {
                      console.log('🎯 Rendering poll:', poll.id, 'with options:', poll.pollOptions?.length || 0)
                      return (
                        <div key={poll.id} className="bg-gray-800 rounded-lg p-6">
                          <SimplePollDisplay 
                            poll={poll} 
                            onVote={handleVote} 
                            onOptionAdded={handleOptionAdded}
                            userVote={poll?.pollOptions?.find(option => 
                              option.votes?.some(vote => vote.userId === user?.id)
                            )?.id || null} 
                            currentUserId={user?.id || ''} 
                          />
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Show message if no polls exist */}
                {polls.length === 0 && (
                  <div className="bg-gray-800 rounded-lg p-6 text-center">
                    <div className="text-4xl mb-4">🗳️</div>
                    <h3 className="text-xl font-bold text-white mb-2">No Polls Yet</h3>
                    <p className="text-gray-300">Polls will appear here when they are created.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="space-y-6">
            <SimpleChat
              hangoutId={hangoutId as string}
              user={user}
              token={token}
            />
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Photos</h3>
              </div>
              
              {/* Enhanced Photo Upload */}
              <div className="mb-6">
                <EnhancedPhotoUpload
                  onUpload={handlePhotoUpload}
                  maxFiles={10}
                  maxFileSize={10}
                />
              </div>

              {/* Photo Gallery */}
              {currentHangout.photos && currentHangout.photos.length > 0 ? (
                <PhotoGallery
                  photos={currentHangout.photos}
                  onDelete={handleDeletePhoto}
                  canDelete={true}
                />
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Camera className="h-12 w-12 mx-auto mb-4" />
                  <p>No photos yet. Upload some to get started!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'people' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">People</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentHangout.participants?.map((participant: any) => (
                  <div key={participant.id} className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-2">
                      <img
                        src={participant.user.avatar || '/placeholder-avatar.png'}
                        alt={participant.user.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        participant.rsvpStatus === 'YES' ? 'bg-green-600 text-white' :
                        participant.rsvpStatus === 'NO' ? 'bg-red-600 text-white' :
                        participant.rsvpStatus === 'MAYBE' ? 'bg-yellow-600 text-white' :
                        'bg-gray-600 text-gray-300'
                      }`}>
                        {participant.rsvpStatus}
                      </div>
                    </div>
                    <div className="text-sm text-gray-300">{participant.user.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
