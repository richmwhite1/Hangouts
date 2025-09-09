'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
// import { useHangouts } from '@/contexts/HangoutsContext'
// import { useSocket } from '@/contexts/SocketContext'
// import Layout from '@/components/layout/Layout'
// import SimpleMap from '@/components/location/SimpleMap'
// import WeatherCard from '@/components/weather/WeatherCard'
// import PollingSection from '@/components/hangouts/PollingSection'
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Check, 
  X, 
  HelpCircle,
  ArrowLeft,
  Settings,
  UserPlus
} from 'lucide-react'

export default function HangoutDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { getHangout, updateRSVP, currentHangout, isLoading } = useHangouts()
  const { joinHangout, leaveHangout, onRSVPUpdated, offRSVPUpdated } = useSocket()
  const [isUpdatingRSVP, setIsUpdatingRSVP] = useState(false)

  const hangoutId = params.id as string

  useEffect(() => {
    if (hangoutId) {
      getHangout(hangoutId).catch(console.error)
      joinHangout(hangoutId)
    }

    return () => {
      if (hangoutId) {
        leaveHangout(hangoutId)
      }
    }
  }, [hangoutId, getHangout, joinHangout, leaveHangout])

  // Listen for real-time RSVP updates
  useEffect(() => {
    const handleRSVPUpdate = (data: any) => {
      if (data.hangoutId === hangoutId) {
        // Refresh hangout data when RSVP is updated
        getHangout(hangoutId).catch(console.error)
      }
    }

    onRSVPUpdated(handleRSVPUpdate)

    return () => {
      offRSVPUpdated(handleRSVPUpdate)
    }
  }, [hangoutId, getHangout, onRSVPUpdated, offRSVPUpdated])

  if (isLoading) {
    return (
      <Layout>
        <div className="mobile-container">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading hangout...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!currentHangout) {
    return (
      <Layout>
        <div className="mobile-container">
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-dark-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Hangout not found
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              This hangout may have been deleted or you don't have access
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const getUserRSVP = () => {
    if (!user) return null
    return currentHangout.participants.find(p => p.user.id === user.id)
  }

  const handleRSVP = async (status: 'YES' | 'NO' | 'MAYBE') => {
    setIsUpdatingRSVP(true)
    try {
      await updateRSVP(hangoutId, status)
    } catch (error) {
      console.error('Failed to update RSVP:', error)
    } finally {
      setIsUpdatingRSVP(false)
    }
  }

  const userRSVP = getUserRSVP()
  const isCreator = currentHangout.creatorId === user?.id
  const canEdit = isCreator || userRSVP?.canEdit

  const getRSVPCounts = () => {
    const counts = { yes: 0, no: 0, maybe: 0, pending: 0 }
    currentHangout.participants.forEach(p => {
      switch (p.rsvpStatus) {
        case 'YES': counts.yes++; break
        case 'NO': counts.no++; break
        case 'MAYBE': counts.maybe++; break
        case 'PENDING': counts.pending++; break
      }
    })
    return counts
  }

  const rsvpCounts = getRSVPCounts()

  return (
    <Layout>
      <div className="mobile-container">
        {/* Header */}
        <div className="flex items-center justify-between py-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-dark-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-lg font-semibold text-dark-900 dark:text-white">
            Hangout Details
          </h1>
          {canEdit && (
            <button className="p-2 hover:bg-dark-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200">
              <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>

        {/* Hangout Info */}
        <div className="card mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-dark-900 dark:text-white mb-2">
              {currentHangout.title}
            </h2>
            {currentHangout.description && (
              <p className="text-gray-600 dark:text-gray-400">
                {currentHangout.description}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-dark-900 dark:text-white">
                  {formatDate(currentHangout.startTime)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatTime(currentHangout.startTime)} - {formatTime(currentHangout.endTime)}
                </p>
              </div>
            </div>

            {currentHangout.location && (
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">
                  {currentHangout.location}
                </p>
              </div>
            )}

            {currentHangout.latitude && currentHangout.longitude && (
              <div className="mt-4">
                <SimpleMap
                  latitude={currentHangout.latitude}
                  longitude={currentHangout.longitude}
                  title={currentHangout.title}
                  className="w-full h-48"
                />
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-gray-600 dark:text-gray-400">
                  {currentHangout._count.participants} participant{currentHangout._count.participants !== 1 ? 's' : ''}
                  {currentHangout.maxParticipants && ` (max ${currentHangout.maxParticipants})`}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {rsvpCounts.yes} yes • {rsvpCounts.maybe} maybe • {rsvpCounts.no} no
                  {rsvpCounts.pending > 0 && ` • ${rsvpCounts.pending} pending`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RSVP Section */}
        {userRSVP && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
              Your Response
            </h3>
            <div className="flex space-x-3">
              <button
                onClick={() => handleRSVP('YES')}
                disabled={isUpdatingRSVP}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 transition-colors duration-200 ${
                  userRSVP.rsvpStatus === 'YES'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                }`}
              >
                <Check className="h-5 w-5" />
                <span className="font-medium">Yes</span>
              </button>
              <button
                onClick={() => handleRSVP('MAYBE')}
                disabled={isUpdatingRSVP}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 transition-colors duration-200 ${
                  userRSVP.rsvpStatus === 'MAYBE'
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                }`}
              >
                <HelpCircle className="h-5 w-5" />
                <span className="font-medium">Maybe</span>
              </button>
              <button
                onClick={() => handleRSVP('NO')}
                disabled={isUpdatingRSVP}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 transition-colors duration-200 ${
                  userRSVP.rsvpStatus === 'NO'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                }`}
              >
                <X className="h-5 w-5" />
                <span className="font-medium">No</span>
              </button>
            </div>
          </div>
        )}

        {/* Participants */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">
              Participants ({currentHangout._count.participants})
            </h3>
            {canEdit && (
              <button className="btn btn-primary btn-sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </button>
            )}
          </div>

          <div className="space-y-3">
            {currentHangout.participants.map((participant) => (
              <div key={participant.id} className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 dark:text-primary-400 font-semibold">
                    {participant.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-dark-900 dark:text-white">
                    {participant.user.name}
                    {participant.role === 'CREATOR' && (
                      <span className="ml-2 text-xs bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 px-2 py-1 rounded">
                        Creator
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    @{participant.user.username}
                  </p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  participant.rsvpStatus === 'YES' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : participant.rsvpStatus === 'MAYBE'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : participant.rsvpStatus === 'NO'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}>
                  {participant.rsvpStatus.toLowerCase()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weather */}
        {currentHangout.latitude && currentHangout.longitude && currentHangout.weatherEnabled && (
          <div className="mb-6">
            <WeatherCard
              latitude={currentHangout.latitude}
              longitude={currentHangout.longitude}
              isOutdoor={true}
              hangoutDate={currentHangout.startTime}
            />
          </div>
        )}

        {/* Polling Section */}
        <div className="mb-6">
          <PollingSection hangoutId={hangoutId} />
        </div>

        {/* Creator Info */}
        <div className="card">
          <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
            Created by
          </h3>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
              <span className="text-primary-600 dark:text-primary-400 font-semibold text-lg">
                {currentHangout.creator.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-dark-900 dark:text-white">
                {currentHangout.creator.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                @{currentHangout.creator.username}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
