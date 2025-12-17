'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { HANGOUT_STATES, getVoteCount, checkMandatoryRSVP } from '@/lib/hangout-flow'
import { useHapticFeedback } from '@/hooks/use-haptic-feedback'
import { MapPin, Clock, DollarSign, MessageSquare, ChevronDown, Calendar, Edit, UserPlus, X, Lock } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import SimpleTaskManager from '@/components/hangout/SimpleTaskManager'
import { PublicHangoutViewer } from '@/components/public-hangout-viewer'
import { PrivateHangoutGate } from '@/components/private-hangout-gate'
import EditHangoutModal from '@/components/hangout/EditHangoutModal'
import { TileActions } from '@/components/ui/tile-actions'
import { sharingService } from '@/lib/services/sharing-service'
import { logger } from '@/lib/logger'
import { useAutoJoin } from '@/hooks/use-auto-join'
// import { ShareModal } from '@/components/share/share-modal'
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
  rsvps?: Array<{
    id: string
    userId: string
    status: 'PENDING' | 'YES' | 'NO' | 'MAYBE'
    respondedAt?: string
    user: {
      id: string
      name: string
      username: string
      avatar?: string
    }
  }>
  counts: {
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
  userVotes?: Record<string, string[]>
  currentUserVotes?: string[]
  userPreferred?: Record<string, string>
  votingDeadline?: string
  type?: string
  priceMin?: number
  ticketUrl?: string
  options: Array<{
    id: string
    title: string
    description?: string
    location?: string
    dateTime?: string
    price?: number
    hangoutUrl?: string
    eventImage?: string
  }>
}
export default function HangoutDetailPage() {
  const params = useParams()
  const hangoutId = params?.id as string
  const { userId, getToken, isSignedIn, isLoaded } = useAuth()
  const [hangout, setHangout] = useState<Hangout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  console.log('Hangout detail page - Component initialized with hangoutId:', hangoutId)

  // Fetch hangout data when component mounts or authentication state changes
  useEffect(() => {
    console.log('Hangout detail page - useEffect triggered, hangoutId:', hangoutId, 'isSignedIn:', isSignedIn, 'isLoaded:', isLoaded)
    if (hangoutId && isLoaded) {
      console.log('🔍 Calling fetchHangout and fetchDatabaseUserId')
      fetchHangout()
      if (isSignedIn) {
        console.log('🔍 Calling fetchDatabaseUserId because isSignedIn:', isSignedIn)
        fetchDatabaseUserId()
      } else {
        console.log('🔍 Skipping fetchDatabaseUserId because isSignedIn:', isSignedIn)
      }
    } else {
      console.log('🔍 Skipping fetchHangout because conditions not met:', { hangoutId: !!hangoutId, isLoaded })
    }
  }, [hangoutId, isSignedIn, isLoaded])

  const [isUpdatingRSVP, setIsUpdatingRSVP] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [isChatExpanded, setIsChatExpanded] = useState(true)
  const [, setSelectedOption] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [friends, setFriends] = useState<any[]>([])
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [databaseUserId, setDatabaseUserId] = useState<string | null>(null)
  const [showPrimaryPhotoModal, setShowPrimaryPhotoModal] = useState(false)
  const [availablePhotos, setAvailablePhotos] = useState<any[]>([])
  // const [showShareModal, setShowShareModal] = useState(false)

  // Haptic feedback for mobile devices
  const { hapticSuccess } = useHapticFeedback({ enabled: true })

  // Auto-join functionality for users coming from sign-in
  useAutoJoin({
    hangoutId,
    hangout,
    ...(databaseUserId ? { currentUserId: databaseUserId } : {}),
    onJoinSuccess: () => {
      // Refresh hangout data to show updated participants
      fetchHangout()
    }
  })

  // Fetch database user ID
  const fetchDatabaseUserId = async () => {
    console.log('🔍 fetchDatabaseUserId - Called with isSignedIn:', isSignedIn, 'isLoaded:', isLoaded)

    if (!isSignedIn || !isLoaded) {
      console.log('🔍 fetchDatabaseUserId - Not signed in or not loaded, skipping')
      return
    }

    try {
      console.log('🔍 fetchDatabaseUserId - Starting fetch')
      const token = await getToken()
      console.log('🔍 fetchDatabaseUserId - Got token:', token ? 'YES' : 'NO')
      console.log('🔍 fetchDatabaseUserId - Token preview:', token ? token.substring(0, 20) + '...' : 'null')

      if (!token) {
        console.error('🔍 fetchDatabaseUserId - No token available')
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('🔍 fetchDatabaseUserId - Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('🔍 fetchDatabaseUserId - Response data:', data)
        console.log('🔍 Database user ID fetched:', data.data?.id)
        setDatabaseUserId(data.data?.id)
      } else {
        const errorText = await response.text()
        console.error('🔍 fetchDatabaseUserId - Response not ok:', response.status, response.statusText, errorText)
      }
    } catch (error) {
      console.error('❌ Error fetching database user ID:', error)
    }
  }

  // Load friends for invitation
  const loadFriends = async () => {
    try {
      const token = await getToken()
      const response = await fetch('/api/friends', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        // Transform friends data to match expected format
        const friendsList = data.friends?.map((friendship: any) => ({
          id: friendship.friend.id,
          name: friendship.friend.name,
          username: friendship.friend.username,
          avatar: friendship.friend.avatar,
          email: friendship.friend.email,
          bio: friendship.friend.bio,
          location: friendship.friend.location
        })) || []
        setFriends(friendsList)
      }
    } catch (error) {
      logger.error('Error loading friends:', error);
      toast.error('Failed to load friends')
    }
  }


  const handleRemoveUser = async (participantId: string) => {
    if (!hangoutId) return
    try {
      const token = await getToken()
      const response = await fetch(`/api/hangouts/${hangoutId}/participants/${participantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        toast.success('User removed successfully!')
        // Refresh hangout data
        await fetchHangout()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to remove user')
      }
    } catch (error) {
      logger.error('Error removing user:', error);
      toast.error('Failed to remove user')
    }
  }
  const handleShare = async () => {
    if (!hangout) return
    // setShowShareModal(true)
    await sharingService.shareHangout(hangout.id, hangout.title, hangout.description || '')
  }
  const handleCopyLink = async () => {
    if (!hangout) return
    await sharingService.copyLink(hangoutId, 'hangout')
  }

  const handleInviteFriends = async (friendIds: string[]) => {
    if (!hangoutId) return

    try {
      setIsInviting(true)
      const token = await getToken()
      const response = await fetch(`/api/hangouts/${hangoutId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ friendIds })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        // Refresh hangout data to show new participants
        await fetchHangout()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to invite friends')
      }
    } catch (error) {
      logger.error('Error inviting friends:', error);
      toast.error('Failed to invite friends')
    } finally {
      setIsInviting(false)
    }
  }

  const handleHangoutUpdate = async (_updatedHangout: any) => {
    // Instead of just setting the state, refetch the full hangout data
    // to ensure we have all the latest information including options
    await fetchHangout()
    setShowEditModal(false)
  }

  const handleJoinHangout = async () => {
    if (!userId || !hangout) return

    try {
      const token = await getToken()
      const response = await fetch(`/api/hangouts/${hangout.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        toast.success('Successfully joined the hangout!')
        // Refresh hangout data to show updated participants
        await fetchHangout()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to join hangout')
      }
    } catch (error) {
      logger.error('Error joining hangout:', error);
      toast.error('Failed to join hangout')
    }
  }
  const fetchHangout = async () => {
    if (!hangoutId) return
    try {
      console.log('Hangout detail - Starting fetch for:', hangoutId)
      const token = await getToken()
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      console.log('Hangout detail - Headers:', headers)
      const response = await fetch(`/api/hangouts/${hangoutId}`, { headers })
      console.log('Hangout detail - Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || errorData.error || 'Failed to fetch hangout'
        console.error('Hangout detail - API error:', errorData)

        // Handle specific error types
        if (response.status === 404) {
          setError('Hangout not found. It may have been deleted or you may not have permission to view it.')
        } else if (response.status === 400) {
          setError(errorMessage || 'Invalid hangout ID')
        } else if (response.status === 503) {
          setError('Service temporarily unavailable. Please try again in a moment.')
        } else {
          setError(errorMessage)
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('Hangout detail - API response:', data)

      if (!data.success || !data.data) {
        console.error('Hangout detail - Invalid response format:', data)
        setError('Invalid response from server')
        throw new Error('Invalid response format')
      }

      console.log('Hangout detail - Setting hangout to:', data.data)
      console.log('🔍 Vote data in API response:', {
        votes: data.data?.votes,
        userVotes: data.data?.userVotes,
        currentUserVotes: data.data?.currentUserVotes
      })
      setHangout(data.data || data)
      console.log('Hangout detail - Hangout set successfully')
      // Check if hangout is saved (only for authenticated users)
      if (token) {
        await checkSaveStatus()
      }
    } catch (error) {
      console.error('Hangout detail - Error fetching hangout:', error);
      logger.error('Error fetching hangout:', error);
      setError('Failed to load hangout')
    } finally {
      console.log('Hangout detail - Setting loading to false')
      setIsLoading(false)
    }
  }
  const checkSaveStatus = async () => {
    if (!hangoutId) return
    try {
      console.log('Hangout detail - Checking save status for:', hangoutId)
      const token = await getToken()
      const response = await fetch(`/api/content/${hangoutId}/save`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      console.log('Hangout detail - Save status response:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('Hangout detail - Save status data:', data)
        setIsSaved(data.data?.saved || false)
      } else {
        console.log('Hangout detail - Save status failed, ignoring')
      }
    } catch (error) {
      console.log('Hangout detail - Save status error, ignoring:', error)
      logger.error('Error checking save status:', error);
    }
  }
  const handleVote = async (optionId: string, action: 'add' | 'remove' | 'preferred' | 'toggle' = 'add') => {
    if (!hangout) return

    // Haptic feedback on vote action
    hapticSuccess()

    try {
      setIsVoting(true)
      setSelectedOption(optionId)
      // Optimistic UI update based on action
      setHangout(prev => {
        if (!prev) return prev
        const currentUserVotes = prev.currentUserVotes || []
        const currentUserPreferred = userId ? prev.userPreferred?.[userId] : undefined
        let newUserVotes = [...currentUserVotes]
        let newUserPreferred = currentUserPreferred || undefined
        if (action === 'add' || action === 'toggle') {
          if (newUserVotes.includes(optionId)) {
            // Toggle off - remove vote
            newUserVotes = newUserVotes.filter(id => id !== optionId)
            if (newUserPreferred === optionId) {
              newUserPreferred = undefined
            }
          } else {
            // Toggle on - add vote
            newUserVotes.push(optionId)
          }
        } else if (action === 'remove') {
          newUserVotes = newUserVotes.filter(id => id !== optionId)
          if (newUserPreferred === optionId) {
            newUserPreferred = undefined
          }
        } else if (action === 'preferred') {
          newUserPreferred = newUserPreferred === optionId ? undefined : optionId
        }
        return {
          ...prev,
          currentUserVotes: newUserVotes,
          userPreferred: userId && newUserPreferred ? {
            ...(prev.userPreferred || {}),
            [userId]: newUserPreferred
          } : prev.userPreferred || {}
        }
      })
      const token = await getToken()
      const response = await fetch(`/api/hangouts/${hangoutId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ optionId, action })
      })
      if (response.ok) {
        console.log('🔍 Vote successful, refreshing hangout data...')
        // Refresh hangout data to get updated vote counts
        await fetchHangout()
        console.log('🔍 Hangout data refreshed after vote')
        const actionText = action === 'add' ? 'Vote added' : action === 'remove' ? 'Vote removed' : action === 'toggle' ? 'Vote updated' : 'Preferred option updated'
        toast.success(`${actionText} successfully!`, {
          description: 'Your vote has been recorded and will be visible to others.',
          duration: 3000,
        })
      } else {
        // Revert optimistic update on error
        await fetchHangout()
        const errorData = await response.json()
        toast.error('Failed to update vote', {
          description: errorData.error || 'Please try again. If the problem persists, refresh the page.',
          duration: 4000,
        })
      }
    } catch (error) {
      logger.error('Error voting:', error);
      // Revert optimistic update on error
      await fetchHangout()
      toast.error('An unexpected error occurred during voting')
    } finally {
      setIsVoting(false)
    }
  }
  const handleRSVP = async (status: 'YES' | 'NO' | 'MAYBE') => {
    if (!userId) {
      toast.error('Please sign in to RSVP', {
        action: {
          label: 'Sign In',
          onClick: () => window.location.href = '/signin'
        }
      })
      return
    }

    // Haptic feedback on RSVP action
    hapticSuccess()

    try {
      setIsUpdatingRSVP(true)
      // Optimistic UI update
      setHangout(prev => {
        if (!prev) return prev
        const existingRSVP = prev.rsvps?.find(r => r.user.id === userId)
        if (existingRSVP) {
          // Update existing RSVP
          return {
            ...prev,
            rsvps: prev.rsvps?.map(r =>
              r.user.id === userId
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
                userId: userId || '',
                status,
                respondedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                user: { id: userId || '', name: '', username: '', avatar: '' }
              }
            ]
          }
        }
      })
      const token = await getToken()
      const response = await fetch(`/api/hangouts/${hangoutId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })
      if (response.ok) {
        await fetchHangout() // Refresh hangout data to get server state
        toast.success(`RSVP set to ${status}!`, {
          description: status === 'YES'
            ? 'You\'re going! Others will see your RSVP.'
            : status === 'MAYBE'
              ? 'You marked yourself as maybe. You can change this anytime.'
              : 'You marked yourself as not going.',
          duration: 3000,
        })
      } else {
        // Revert optimistic update on error
        await fetchHangout()
        const errorData = await response.json()
        toast.error('Failed to update RSVP', {
          description: errorData.error || 'Please try again. If the problem persists, refresh the page.',
          duration: 4000,
        })
      }
    } catch (error) {
      logger.error('Error updating RSVP:', error);
      // Revert optimistic update on error
      await fetchHangout()
      toast.error('An unexpected error occurred while updating RSVP')
    } finally {
      setIsUpdatingRSVP(false)
    }
  }
  const addToCalendar = (type: 'google' | 'apple' | 'outlook') => {
    if (!hangout) return
    const startTime = new Date(hangout.startTime)
    const endTime = new Date(hangout.endTime)
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }
    const formatOutlookDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    }
    const start = formatDate(startTime)
    const end = formatDate(endTime)
    const outlookStart = formatOutlookDate(startTime)
    const outlookEnd = formatOutlookDate(endTime)
    const title = encodeURIComponent(hangout.title)
    const description = encodeURIComponent(hangout.description || '')
    const location = encodeURIComponent(hangout.location || '')
    const url = encodeURIComponent(window.location.href)

    if (type === 'google') {
      const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${description}&location=${location}`
      window.open(googleUrl, '_blank')
    } else if (type === 'apple') {
      // Apple Calendar uses a different format
      const appleUrl = `webcal://calendar.google.com/calendar/event?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${description}&location=${location}`
      window.open(appleUrl, '_blank')
    } else if (type === 'outlook') {
      // Outlook Calendar URL format
      const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${description}&location=${location}&startdt=${outlookStart}&enddt=${outlookEnd}&url=${url}`
      window.open(outlookUrl, '_blank')
    }
  }
  // Real-time polling for voting data - more frequent during voting phase
  useEffect(() => {
    if (!hangout || !hangout.requiresVoting) return

    // More frequent polling when in voting phase for real-time feel
    const pollingInterval = hangout.state === HANGOUT_STATES.POLLING ? 5000 : 30000 // 5 seconds for voting, 30 for others

    const interval = setInterval(() => {
      // Only refresh if we're in voting phase and not currently voting
      if ((hangout.state === HANGOUT_STATES.POLLING || hangout.state === HANGOUT_STATES.CONFIRMED) && !isVoting) {
        fetchHangout()
      }
    }, pollingInterval)

    return () => clearInterval(interval)
  }, [hangout, isVoting])
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
  // Show error first if hangout not found
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
  // Check for public access for non-authenticated users
  if (!userId && hangout.privacyLevel === 'PUBLIC') {
    return (
      <PublicHangoutViewer
        hangoutId={hangoutId as string}
        onSignInRequired={() => window.location.href = '/signin'}
      />
    )
  }
  // Show privacy gate for non-authenticated users with private hangouts
  if (!userId && hangout && hangout.privacyLevel !== 'PUBLIC') {
    if (hangout.privacyLevel === 'FRIENDS_ONLY') {
      // Use the dedicated friends-only gate
      return <PrivateHangoutGate hangout={hangout} />
    } else {
      // For truly private hangouts, show generic access denied
      return (
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
          <div className="text-center max-w-md mx-4">
            <div className="text-red-500 mb-4">
              <Lock className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-gray-400 mb-6">
              This is a private hangout. You need to be invited to view this event.
            </p>
            <Button onClick={() => window.location.href = '/signin'} className="w-full">
              Sign In to Continue
            </Button>
          </div>
        </div>
      )
    }
  }

  // Show loading state
  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-white">Loading hangout...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error || !hangout) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-red-500 mb-4">
            <X className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Hangout Not Found</h2>
          <p className="text-gray-400 mb-6">
            {error || 'This hangout may have been deleted or you may not have permission to view it.'}
          </p>
          <Button onClick={() => window.location.href = '/'} className="w-full">
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  const currentState = hangout.state || HANGOUT_STATES.POLLING
  const isCreator = databaseUserId === hangout.creatorId
  const isHost = isCreator || hangout.participants?.some(p => p.user.id === databaseUserId && (p.role === 'CREATOR' || p.role === 'CO_HOST' || p.canEdit))

  // Basic debug logging for hangout structure
  console.log('🔍 Basic Hangout Debug:', {
    hangoutId: hangout.id,
    hangoutState: hangout.state,
    currentState,
    hasOptions: !!hangout.options,
    optionsCount: hangout.options?.length || 0,
    hasVotes: !!hangout.votes,
    votesType: typeof hangout.votes,
    votesKeys: hangout.votes ? Object.keys(hangout.votes) : [],
    hasParticipants: !!hangout.participants,
    participantsCount: hangout.participants?.length || 0
  })

  // Debug logging for host recognition
  console.log('🔍 Host Recognition Debug:', {
    clerkUserId: userId,
    databaseUserId,
    hangoutCreatorId: hangout.creatorId,
    isCreator,
    participants: hangout.participants,
    participantUserIds: hangout.participants?.map(p => p.user.id),
    participantRoles: hangout.participants?.map(p => ({ userId: p.user.id, role: p.role, canEdit: p.canEdit })),
    isHost,
    currentState
  })

  // Debug logging for authentication state
  console.log('🔍 Auth State Debug:', {
    isSignedIn,
    isLoaded,
    userId,
    databaseUserId
  })

  // Debug logging for vote data structure
  console.log('🔍 Vote Data Debug:', {
    hangoutState: hangout.state,
    currentState,
    votes: hangout.votes,
    userVotes: hangout.userVotes,
    currentUserVotes: hangout.currentUserVotes,
    userPreferred: hangout.userPreferred,
    options: hangout.options,
    finalizedOption: hangout.finalizedOption
  })
  const userRSVP = hangout.rsvps?.find(r => r.user.id === databaseUserId)?.status || 'PENDING'
  // Check mandatory participant requirements
  const mandatoryCheck = checkMandatoryRSVP(hangout)
  // Debug logging
  // console.log('Hangout data:', {
  //   id: hangout.id,
  //   state: hangout.state,
  //   currentState,
  //   options: hangout.options,
  //   requiresVoting: hangout.requiresVoting,
  //   type: hangout.type
  // }); // Removed for production
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-md mx-auto pb-20">
        {/* Status Header - Always Visible */}
        <HangoutStatusHeader hangout={hangout} state={currentState} />
        {/* Hangout Title and Action Buttons - Above photo */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-white flex-1 text-center">{hangout.title}</h1>
            <div className="flex items-center gap-2 ml-4">
              <TileActions
                itemId={hangout.id}
                itemType="hangout"
                itemTitle={hangout.title}
                itemDescription={hangout.description || ''}
                itemImage={hangout.image || ''}
                privacyLevel={hangout.privacyLevel}
                isSaved={isSaved}
                onSave={(_id, _type) => {
                  // console.log('Save hangout:', id, type); // Removed for production
                }}
                onUnsave={(_id, _type) => {
                  // console.log('Unsave hangout:', id, type); // Removed for production
                }}
                className="scale-75"
              />
            </div>
          </div>

          {/* Privacy Level Indicator */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300 text-sm">
              {hangout.privacyLevel === 'PUBLIC' ? 'Public' :
                hangout.privacyLevel === 'FRIENDS_ONLY' ? 'Friends Only' :
                  'Private'}
            </span>
          </div>
        </div>
        {/* Primary Photo - Always show when it exists */}
        {hangout.image && (
          <div className="px-4 py-2">
            <div className="relative group">
              <img
                src={hangout.image}
                alt={hangout.title}
                className="w-full h-64 object-cover rounded-xl shadow-lg"
                onError={(e) => {
                  // Handle broken images - especially local file paths that don't exist on Railway
                  const target = e.target as HTMLImageElement
                  const imageUrl = target.src
                  
                  // Check if it's a local file path that won't work in production
                  if (imageUrl.startsWith('/uploads/') || imageUrl.includes('/uploads/')) {
                    logger.warn('Local file path detected in production:', { imageUrl, hangoutId: hangout.id })
                  }
                  
                  target.style.display = 'none'
                  // Show a placeholder or error message
                  const parent = target.parentElement
                  if (parent && !parent.querySelector('.broken-image-placeholder')) {
                    const placeholder = document.createElement('div')
                    placeholder.className = 'broken-image-placeholder w-full h-64 bg-gray-800 rounded-xl flex flex-col items-center justify-center text-gray-400'
                    placeholder.innerHTML = `
                      <div class="text-4xl mb-2">📷</div>
                      <div class="text-sm">Image unavailable</div>
                      <div class="text-xs mt-1 text-gray-500">Click "Change Photo" to upload a new one</div>
                    `
                    parent.appendChild(placeholder)
                  }
                }}
              />
              <div className="absolute top-3 right-3 bg-black/80 text-white px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm">
                📸 Primary
              </div>
              {/* Edit Button - Always Visible in Upper Right */}
              {isHost && (
                <button
                  onClick={async () => {
                    try {
                      const token = await getToken()
                      // Fetch available photos
                      const photosResponse = await fetch(`/api/hangouts/${hangout.id}/photos`, {
                        headers: token ? {
                          'Authorization': `Bearer ${token}`
                        } : {}
                      })
                      if (photosResponse.ok) {
                        const photosData = await photosResponse.json()
                        setAvailablePhotos(photosData.data?.photos || [])
                        setShowPrimaryPhotoModal(true)
                      } else {
                        const errorData = await photosResponse.json().catch(() => ({}))
                        logger.error('Error fetching photos:', { 
                          status: photosResponse.status, 
                          error: errorData 
                        });
                        toast.error(errorData.message || `Failed to load photos (${photosResponse.status})`)
                      }
                    } catch (error: any) {
                      logger.error('Error fetching photos:', error);
                      toast.error(error?.message || 'Failed to load photos. Please try again.')
                    }
                  }}
                  className="absolute top-3 left-3 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-110 z-10"
                  title="Edit primary photo"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              {/* Host/Cohost Controls for Primary Photo - Always Visible */}
              {isHost && (
                <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const token = await getToken()
                        // Fetch available photos
                        const photosResponse = await fetch(`/api/hangouts/${hangout.id}/photos`, {
                          headers: token ? {
                            'Authorization': `Bearer ${token}`
                          } : {}
                        })
                        if (photosResponse.ok) {
                          const photosData = await photosResponse.json()
                          setAvailablePhotos(photosData.data?.photos || [])
                          setShowPrimaryPhotoModal(true)
                        } else {
                          const errorData = await photosResponse.json().catch(() => ({}))
                          logger.error('Error fetching photos:', { 
                            status: photosResponse.status, 
                            error: errorData 
                          });
                          toast.error(errorData.message || `Failed to load photos (${photosResponse.status})`)
                        }
                      } catch (error: any) {
                        logger.error('Error fetching photos:', error);
                        toast.error(error?.message || 'Failed to load photos. Please try again.')
                      }
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium shadow-lg"
                    title="Change primary photo"
                  >
                    ✏️ Change Photo
                  </button>
                  <button
                    onClick={async () => {
                      // Find the photo that matches the primary image and delete it
                      try {
                        const token = await getToken()
                        const photosResponse = await fetch(`/api/hangouts/${hangout.id}/photos`, {
                          headers: token ? {
                            'Authorization': `Bearer ${token}`
                          } : {}
                        })
                        if (photosResponse.ok) {
                          const photosData = await photosResponse.json()
                          const primaryPhoto = photosData.data?.photos?.find((p: any) =>
                            hangout.image === p.originalUrl ||
                            hangout.image === p.thumbnailUrl ||
                            hangout.image === p.smallUrl ||
                            hangout.image === p.mediumUrl ||
                            hangout.image === p.largeUrl
                          )
                          if (primaryPhoto) {
                            if (confirm('Are you sure you want to delete the primary photo?')) {
                              await fetch(`/api/hangouts/${hangout.id}/photos/${primaryPhoto.id}`, {
                                method: 'DELETE',
                                headers: token ? {
                                  'Authorization': `Bearer ${token}`
                                } : {}
                              })
                              toast.success('Primary photo deleted!')
                              await fetchHangout()
                            }
                          } else {
                            // If no matching photo found, just clear the primary image
                            if (confirm('Remove this primary photo?')) {
                              toast.info('Please use the photo gallery below to manage photos')
                            }
                          }
                        }
                      } catch (error) {
                        logger.error('Error deleting primary photo:', error);
                        toast.error('Failed to delete primary photo')
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium shadow-lg"
                    title="Delete primary photo"
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {/* No Primary Photo - Show upload option for hosts */}
        {!hangout.image && isHost && (
          <div className="px-4 py-2">
            <div className="w-full h-64 bg-gray-800 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-600">
              <div className="text-center">
                <p className="text-gray-400 mb-3">No primary photo set</p>
                <button
                  onClick={async () => {
                    try {
                      const token = await getToken()
                      const photosResponse = await fetch(`/api/hangouts/${hangout.id}/photos`, {
                        headers: token ? {
                          'Authorization': `Bearer ${token}`
                        } : {}
                      })
                      if (photosResponse.ok) {
                        const photosData = await photosResponse.json()
                        setAvailablePhotos(photosData.data?.photos || [])
                        setShowPrimaryPhotoModal(true)
                      }
                    } catch (error) {
                      logger.error('Error fetching photos:', error);
                      toast.error('Failed to load photos')
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
                >
                  + Set Primary Photo
                </button>
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
        <PhotosSection
          hangout={hangout}
          isHost={isHost}
          onHangoutUpdate={fetchHangout}
        />
        {/* Stage 1: Polling Interface - Show for poll hangouts */}
        {(currentState === HANGOUT_STATES.POLLING || (hangout.options && hangout.options.length > 1)) && (
          <VotingSection
            hangout={hangout}
            currentUser={userId ? { id: userId } : null}
            onVote={handleVote}
            isVoting={isVoting}
            onRefresh={fetchHangout}
          />
        )}
        {/* Plan Details Section - Only show when confirmed or completed */}
        {hangout && (currentState === HANGOUT_STATES.CONFIRMED || currentState === HANGOUT_STATES.COMPLETED) && (
          <div className="p-4">
            {/* Consensus Celebration Banner */}
            {currentState === HANGOUT_STATES.CONFIRMED && hangout.finalizedOption?.consensusLevel && (
              <div className="mb-4 p-4 bg-gradient-to-r from-green-600/20 to-green-500/10 border border-green-500/50 rounded-lg animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🎉</div>
                  <div className="flex-1">
                    <h3 className="text-green-400 font-bold text-lg mb-1">Consensus Reached!</h3>
                    <p className="text-green-300 text-sm">
                      The group has decided! Time to RSVP and make it happen.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Plan Details Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <div className={`w-2 h-2 rounded-full ${currentState === HANGOUT_STATES.CONFIRMED ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span>{currentState === HANGOUT_STATES.CONFIRMED ? 'Plan Confirmed' : 'Plan Details'}</span>
              </div>
              {/* Edit button for hosts/co-hosts */}
              {(hangout.creatorId === databaseUserId || hangout.participants?.some(p =>
                p.user.id === databaseUserId &&
                (p.role === 'CREATOR' || p.role === 'CO_HOST' || p.canEdit)
              )) && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded"
                    title="Edit plan details"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
            </div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3">
              {/* Show finalized option if confirmed, otherwise show basic hangout details */}
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
                  {/* Show basic hangout details for polling state */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2">{hangout.title}</h3>
                    {hangout.description && (
                      <p className="text-gray-300 text-sm">{hangout.description}</p>
                    )}
                  </div>
                  {/* Basic Date & Time */}
                  {hangout.startTime && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300 text-sm">
                        {format(new Date(hangout.startTime), 'EEEE, MMMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  {/* Basic Time */}
                  {hangout.startTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300 text-sm">
                        {format(new Date(hangout.startTime), 'h:mm a')}
                      </span>
                    </div>
                  )}
                  {/* Basic Location */}
                  {hangout.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300 text-sm flex-1">{hangout.location}</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hangout.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 p-1 rounded"
                        title="Open in Google Maps"
                      >
                        <MapPin className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                  {/* Privacy Level */}
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm">
                      {hangout.privacyLevel === 'PUBLIC' ? 'Public' :
                        hangout.privacyLevel === 'FRIENDS_ONLY' ? 'Friends Only' :
                          'Private'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
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
            <RSVPSection
              onRSVP={handleRSVP}
              isUpdating={isUpdatingRSVP}
              userRSVP={userRSVP}
              hangout={hangout}
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
                <button
                  onClick={() => addToCalendar('outlook')}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="text-xs">📅</span>
                  <span className="text-xs">Outlook</span>
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
              currentUser={databaseUserId ? { id: databaseUserId, name: '', username: '' } : { id: '', name: '', username: '' }}
              isHost={isHost}
            />
          </div>
        )}
        {/* Participant Status Section - Always show if has participants */}
        <ParticipantStatusSection
          hangout={hangout}
          currentUser={databaseUserId ? { id: databaseUserId } : null}
          onOpenInviteModal={() => {
            loadFriends()
            setShowInviteModal(true)
          }}
          onRemoveUser={handleRemoveUser}
          onShare={handleShare}
          onCopyLink={handleCopyLink}
          onJoinHangout={handleJoinHangout}
          onOpenEditModal={() => setShowEditModal(true)}
        />
        {/* Chat Section - Always show */}
        <ChatSection
          hangout={hangout}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          isExpanded={isChatExpanded}
          setIsExpanded={setIsChatExpanded}
        />

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Invite Friends</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {friends.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="text-gray-400 text-sm">No friends to invite</div>
                  </div>
                ) : (
                  friends.map((friend: any) => (
                    <div key={friend.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-700/50">
                      <div className="flex items-center space-x-3">
                        <img
                          src={friend.avatar || '/placeholder-avatar.png'}
                          alt={friend.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <div className="text-white font-medium">{friend.name}</div>
                          <div className="text-gray-400 text-sm">@{friend.username}</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedFriends.includes(friend.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFriends([...selectedFriends, friend.id])
                          } else {
                            setSelectedFriends(selectedFriends.filter((id: string) => id !== friend.id))
                          }
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  onClick={() => {
                    setShowInviteModal(false)
                    setSelectedFriends([])
                  }}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleInviteFriends(selectedFriends)}
                  disabled={isInviting || selectedFriends.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isInviting ? 'Inviting...' : `Invite ${selectedFriends.length} Friend${selectedFriends.length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Hangout Modal */}
        {showEditModal && hangout && (
          <EditHangoutModal
            hangout={hangout}
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onUpdate={handleHangoutUpdate}
          />
        )}

        {/* Share Modal */}
        {/* {showShareModal && hangout && (
          <ShareModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
                name: hangout.creator.name
              },
              _count: {
                participants: hangout.participants?.length || 0
              }
            }}
          />
        )}

        {/* Primary Photo Selection Modal */}
        {showPrimaryPhotoModal && (
          <PrimaryPhotoModal
            hangout={hangout}
            availablePhotos={availablePhotos}
            onClose={() => setShowPrimaryPhotoModal(false)}
            onPhotoSelected={async (photoId: string) => {
              try {
                const token = await getToken()
                const response = await fetch(`/api/hangouts/${hangout.id}/photos/${photoId}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                  },
                  body: JSON.stringify({ setAsPrimary: true })
                })
                if (response.ok) {
                  toast.success('Primary photo updated!')
                  await fetchHangout()
                  setShowPrimaryPhotoModal(false)
                } else {
                  const errorData = await response.json()
                  toast.error(errorData.message || 'Failed to set primary photo')
                }
              } catch (error) {
                logger.error('Error setting primary photo:', error);
                toast.error('An error occurred while setting primary photo')
              }
            }}
            onUploadNew={async (file: File) => {
              try {
                const token = await getToken()
                const formData = new FormData()
                formData.append('photos', file)
                const response = await fetch(`/api/hangouts/${hangout.id}/photos`, {
                  method: 'POST',
                  headers: token ? {
                    'Authorization': `Bearer ${token}`
                  } : {},
                  body: formData
                })
                if (response.ok) {
                  const data = await response.json()
                  const newPhoto = data.data?.photos?.[0]
                  if (newPhoto) {
                    // Set the newly uploaded photo as primary
                    const setPrimaryResponse = await fetch(`/api/hangouts/${hangout.id}/photos/${newPhoto.id}`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                      },
                      body: JSON.stringify({ setAsPrimary: true })
                    })
                    if (setPrimaryResponse.ok) {
                      toast.success('Photo uploaded and set as primary!')
                      await fetchHangout()
                      setShowPrimaryPhotoModal(false)
                    } else {
                      toast.success('Photo uploaded!')
                      await fetchHangout()
                    }
                  }
                } else {
                  toast.error('Failed to upload photo')
                }
              } catch (error) {
                logger.error('Error uploading photo:', error);
                toast.error('An error occurred while uploading photo')
              }
            }}
          />
        )}
      </div>
    </div>
  )
}
// Status Header Component - Sophisticated Design
function HangoutStatusHeader({ hangout, state }: { hangout: Hangout, state: string }) {
  const getStatusConfig = () => {
    switch (state) {
      case HANGOUT_STATES.POLLING:
        const votedCount = Object.keys(hangout.votes || {}).length
        const totalParticipants = hangout.participants?.length || 0
        return {
          icon: '🗳️',
          title: 'Voting Phase',
          subtitle: `${votedCount} of ${totalParticipants} participants voted`,
          bgColor: 'bg-gradient-to-r from-blue-900/20 to-blue-900/20',
          borderColor: 'border-blue-500/30',
          textColor: 'text-white',
          iconColor: 'text-blue-400'
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
      default:
        return {
          icon: '📅',
          title: 'Hangout',
          subtitle: 'Event in progress',
          bgColor: 'bg-gradient-to-r from-blue-900/20 to-indigo-900/20',
          borderColor: 'border-blue-500/30',
          textColor: 'text-white',
          iconColor: 'text-blue-400'
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
function VotingSection({ hangout, currentUser, onVote, isVoting, onRefresh }: {
  hangout: Hangout,
  currentUser: any,
  onVote: (optionId: string, action?: 'add' | 'remove' | 'preferred' | 'toggle') => void,
  isVoting: boolean,
  onRefresh?: () => void
}) {
  console.log('🔍 VotingSection Debug:', {
    hangoutId: hangout.id,
    hasVotes: !!hangout.votes,
    votes: hangout.votes,
    votesType: typeof hangout.votes,
    hasOptions: !!hangout.options,
    optionsCount: hangout.options?.length || 0,
    hasParticipants: !!hangout.participants,
    participantsCount: hangout.participants?.length || 0,
    currentUser: currentUser?.id
  })

  const votedCount = Object.keys(hangout.votes || {}).length
  const totalParticipants = hangout.participants?.length || 0
  const userVotes = hangout.currentUserVotes || []
  const userPreferred = hangout.userPreferred?.[currentUser?.id]
  return (
    <div className="p-4">
      {/* Voting Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Vote for Your Options</h2>
            <span className="flex items-center gap-1 text-green-400 text-xs" aria-live="polite" aria-label="Live updates active">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" aria-hidden="true"></span>
              Live
            </span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              aria-label="Refresh voting data"
              className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded border border-gray-600 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-black"
            >
              🔄 Refresh
            </button>
          )}
        </div>
        <p className="text-gray-400 text-sm">
          {votedCount} of {totalParticipants} friends have voted
        </p>
        <p className="text-gray-400 text-xs mt-1">
          You can vote for multiple options and mark one as preferred
        </p>
        <p className="text-gray-500 text-xs mt-1">
          💡 Updates automatically every 5 seconds
        </p>
      </div>
      {/* Voting Options */}
      {hangout.options?.map((option) => {
        // Use userVotes instead of votes for counting multiple votes per user
        const voteCount = getVoteCount(hangout.userVotes || hangout.votes, option.id)
        const hasUserVoted = userVotes.includes(option.id)
        const isPreferred = userPreferred === option.id
        const votePercentage = totalParticipants > 0 ? (voteCount / totalParticipants * 100) : 0

        // Debug logging for vote counts
        console.log(`🔍 Vote Count Debug for ${option.title}:`, {
          optionId: option.id,
          voteCount,
          totalParticipants,
          votePercentage: Math.round(votePercentage),
          votes: hangout.votes,
          userVotes: hangout.userVotes,
          currentUserVotes: userVotes,
          userPreferred
        })
        return (
          <div
            key={option.id}
            className={`bg-black border-2 rounded-xl mb-4 overflow-hidden ${isPreferred ? 'border-yellow-500' : hasUserVoted ? 'border-pink-500' : 'border-gray-600'
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
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium"
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
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${hasUserVoted
                      ? 'bg-blue-600 text-white'
                      : 'bg-black border text-blue-400'
                      }`}
                    style={!hasUserVoted ? { borderColor: '#2563EB' } : {}}
                  >
                    {hasUserVoted ? '✓ Voted' : 'Tap to Vote'}
                  </button>
                  {hasUserVoted && (
                    <button
                      onClick={() => onVote(option.id, 'preferred')}
                      disabled={isVoting}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${isPreferred
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

  // Calculate consensus progress
  const consensusThreshold = 70 // Default threshold, should come from API in future
  let leadingOptionVotes = 0
  let leadingOptionTitle = ''
  let consensusProgress = 0
  let votesNeededForConsensus = 0

  if (hangout.options && hangout.options.length > 0 && totalParticipants > 0) {
    // Find the leading option by vote count
    const optionVoteCounts = hangout.options.map(option => {
      const voteCount = getVoteCount(hangout.userVotes || hangout.votes, option.id)
      return { option, voteCount }
    })

    const leading = optionVoteCounts.reduce((max, current) =>
      current.voteCount > max.voteCount ? current : max
    )

    leadingOptionVotes = leading.voteCount
    leadingOptionTitle = leading.option.title
    consensusProgress = totalParticipants > 0 ? (leadingOptionVotes / totalParticipants) * 100 : 0

    // Calculate votes needed to reach consensus threshold
    const votesNeeded = Math.ceil((consensusThreshold / 100) * totalParticipants)
    votesNeededForConsensus = Math.max(0, votesNeeded - leadingOptionVotes)
  }

  const isConsensusReached = consensusProgress >= consensusThreshold

  return (
    <div className="bg-black border border-gray-600 rounded-lg p-4 mt-4">
      <h3 className="text-white font-bold mb-3">Voting Progress</h3>

      {/* Consensus Progress Indicator */}
      {hangout.options && hangout.options.length > 1 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300 text-sm font-medium">Consensus Progress</span>
            <span className={`text-sm font-bold ${isConsensusReached ? 'text-green-400' : 'text-yellow-400'}`}>
              {Math.round(consensusProgress)}% / {consensusThreshold}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isConsensusReached ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              style={{ width: `${Math.min(100, (consensusProgress / consensusThreshold) * 100)}%` }}
            />
          </div>

          {/* Leading Option Info */}
          {leadingOptionTitle && (
            <p className="text-gray-400 text-xs mb-1">
              Leading: <span className="text-white font-medium">{leadingOptionTitle}</span> ({leadingOptionVotes} votes)
            </p>
          )}

          {/* Votes Needed */}
          {!isConsensusReached && votesNeededForConsensus > 0 && (
            <p className="text-yellow-400 text-xs font-medium">
              {votesNeededForConsensus} more vote{votesNeededForConsensus !== 1 ? 's' : ''} needed to reach consensus
            </p>
          )}

          {isConsensusReached && (
            <p className="text-green-400 text-xs font-medium">
              ✓ Consensus reached! The plan will be finalized soon.
            </p>
          )}
        </div>
      )}

      {/* General Voting Stats */}
      <div className="border-t border-gray-700 pt-3">
        <p className="text-gray-400 text-sm mb-2">
          {votedCount} of {totalParticipants} friend{totalParticipants !== 1 ? 's' : ''} have voted
        </p>
        {remainingVotes > 0 && (
          <p className="text-gray-400 text-sm mb-2">
            Waiting for {remainingVotes} more vote{remainingVotes !== 1 ? 's' : ''}
          </p>
        )}
        {hoursLeft > 0 && (
          <p className="text-white text-sm">
            Voting ends in {hoursLeft} hour{hoursLeft !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}
// RSVP Section - REDESIGNED with visual feedback and social proof
function RSVPSection({ onRSVP, isUpdating, userRSVP, hangout }: {
  onRSVP: (status: 'YES' | 'NO' | 'MAYBE') => void,
  isUpdating: boolean,
  userRSVP: string,
  hangout: Hangout | null
}) {
  // Calculate RSVP counts
  const rsvpCounts = hangout?.rsvps?.reduce((acc, rsvp) => {
    if (rsvp.status === 'YES') acc.yes++
    else if (rsvp.status === 'MAYBE') acc.maybe++
    else if (rsvp.status === 'NO') acc.no++
    return acc
  }, { yes: 0, maybe: 0, no: 0 }) || { yes: 0, maybe: 0, no: 0 }

  // Get friend avatars for "Going" and "Maybe"
  const goingAvatars = hangout?.rsvps
    ?.filter(r => r.status === 'YES')
    .slice(0, 5)
    .map(r => r.user?.avatar) || []

  const maybeAvatars = hangout?.rsvps
    ?.filter(r => r.status === 'MAYBE')
    .slice(0, 3)
    .map(r => r.user?.avatar) || []

  return (
    <div className="px-4 py-3">
      {/* Social Proof Section */}
      {(rsvpCounts.yes > 0 || rsvpCounts.maybe > 0) && (
        <div className="mb-4 pb-3 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            {rsvpCounts.yes > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {goingAvatars.map((avatar, idx) => (
                    <img
                      key={idx}
                      src={avatar || '/placeholder-avatar.png'}
                      alt=""
                      className="w-6 h-6 rounded-full border-2 border-green-500"
                    />
                  ))}
                </div>
                <span className="text-green-400 text-sm font-medium">
                  {rsvpCounts.yes} going
                </span>
              </div>
            )}
            {rsvpCounts.maybe > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {maybeAvatars.map((avatar, idx) => (
                    <img
                      key={idx}
                      src={avatar || '/placeholder-avatar.png'}
                      alt=""
                      className="w-6 h-6 rounded-full border-2 border-yellow-500"
                    />
                  ))}
                </div>
                <span className="text-yellow-400 text-sm font-medium">
                  {rsvpCounts.maybe} maybe
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Show "Be the first" message when no one has RSVP'd */}
      {rsvpCounts.yes === 0 && rsvpCounts.maybe === 0 && (
        <div className="mb-4 pb-3 border-b border-gray-700">
          <p className="text-gray-400 text-xs text-center">Be the first to RSVP!</p>
        </div>
      )}

      {/* RSVP Buttons */}
      <div className="flex gap-1">
        <button
          className={`flex-1 py-2 px-3 rounded border transition-all duration-200 ${userRSVP === 'YES'
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
          className={`flex-1 py-2 px-3 rounded border transition-all duration-200 ${userRSVP === 'MAYBE'
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
          className={`flex-1 py-2 px-3 rounded border transition-all duration-200 ${userRSVP === 'NO'
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
function ParticipantStatusSection({
  hangout,
  currentUser,
  onOpenInviteModal,
  onRemoveUser,
  onShare: _onShare,
  onCopyLink: _onCopyLink,
  onJoinHangout,
  onOpenEditModal
}: {
  hangout: Hangout,
  currentUser: any,
  onOpenInviteModal: () => void,
  onRemoveUser: (participantId: string) => void,
  onShare: () => void,
  onCopyLink: () => void,
  onJoinHangout: () => void,
  onOpenEditModal: () => void
}) {
  const currentState = hangout.state || HANGOUT_STATES.POLLING
  const participants = hangout.participants || []
  const isCreator = currentUser?.id === hangout.creatorId
  const isHost = isCreator || participants?.some(p => p.user.id === currentUser?.id && (p.role === 'CREATOR' || p.role === 'CO_HOST' || p.canEdit))

  // Always show participants section, even if empty
  return (
    <div className="px-4 py-3">
      {/* Header with Participants Count */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm">
          Participants ({participants.length})
        </h3>
        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Discreet Action Icons */}
          <div className="flex items-center gap-1">
            {/* +People Icon - Only for hosts */}
            {isHost && (
              <button
                onClick={onOpenInviteModal}
                className="p-1.5 rounded-full hover:bg-gray-700/50 transition-colors group"
                title="Invite friends"
              >
                <UserPlus className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
              </button>
            )}

            {/* Join Icon - Only for non-participants on public hangouts */}
            {!participants?.some(p => p.user.id === currentUser?.id) && !isHost && hangout.privacyLevel === 'PUBLIC' && currentUser && (
              <button
                onClick={onJoinHangout}
                className="p-1.5 rounded-full hover:bg-gray-700/50 transition-colors group"
                title="Join hangout"
              >
                <UserPlus className="w-4 h-4 text-gray-400 group-hover:text-green-400" />
              </button>
            )}
          </div>

          {/* Edit Button - Only for hosts/co-hosts */}
          {isHost && (
            <button
              onClick={onOpenEditModal}
              className="p-1.5 rounded-full hover:bg-gray-700/50 transition-colors group"
              title="Edit hangout details"
            >
              <Edit className="w-4 h-4 text-gray-400 group-hover:text-yellow-400" />
            </button>
          )}

          <TileActions
            itemId={hangout.id}
            itemType="hangout"
            itemTitle={hangout.title}
            itemDescription={hangout.description || ''}
            itemImage={hangout.image || ''}
            privacyLevel={hangout.privacyLevel}
          />
        </div>
      </div>


      {/* Show empty state if no participants */}
      {participants.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-gray-500 text-sm mb-3">No participants yet</div>
          {isHost && (
            <Button
              onClick={onOpenInviteModal}
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Friends
            </Button>
          )}
        </div>
      ) : (
        /* Large Square Profile Icons Grid with Names and Status */
        <div className="grid grid-cols-4 gap-3">
          {participants.slice(0, 8).map((participant) => {
            const userVotes = hangout.userVotes?.[participant.user.id] || []
            const hasVoted = userVotes.length > 0
            const isVotingPhase = currentState === HANGOUT_STATES.POLLING
            // Get RSVP status from hangout.rsvps array
            const userRSVP = hangout.rsvps?.find(rsvp => rsvp.user.id === participant.user.id)
            const rsvpStatus = userRSVP?.status || 'PENDING'
            const canRemove = isHost && participant.user.id !== currentUser?.id
            return (
              <div key={participant.id} className="flex flex-col items-center text-center group relative">
                {/* Large Square Profile Picture */}
                <div className="relative mb-2">
                  <img
                    src={participant.user.avatar || '/placeholder-avatar.png'}
                    alt={participant.user.name}
                    className="w-16 h-16 rounded-md border border-gray-600 object-cover group-hover:scale-105 transition-transform"
                  />
                  {/* Status Indicator */}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded border border-gray-900 flex items-center justify-center">
                    <div className={`w-2 h-2 rounded-full ${isVotingPhase ? (hasVoted ? 'bg-green-500' : 'bg-gray-500') :
                      rsvpStatus === 'YES' ? 'bg-green-500' :
                        rsvpStatus === 'MAYBE' ? 'bg-yellow-500' :
                          rsvpStatus === 'NO' ? 'bg-red-500' :
                            'bg-gray-500'
                      }`}></div>
                  </div>
                  {/* Remove Button */}
                  {canRemove && (
                    <button
                      onClick={() => onRemoveUser(participant.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove user"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
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
      )}
    </div>
  )
}
// Chat Section - Professional Enterprise-Grade Design
function ChatSection({ hangout, newMessage, setNewMessage, isExpanded, setIsExpanded }: {
  hangout: Hangout,
  newMessage: string,
  setNewMessage: (msg: string) => void,
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
      const response = await fetch(`/api/hangouts/${hangout.id}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.data?.messages || [])
      }
    } catch (error) {
      logger.error('Error fetching messages:', error);
    } finally {
      setIsLoadingMessages(false)
    }
  }
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    try {
      const response = await fetch(`/api/hangouts/${hangout.id}/messages`, {
        method: 'POST',
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
      logger.error('Error sending message:', error);
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
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
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
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      {/* Professional Chat Messages Area */}
      <div className={`bg-gray-900/30 border border-gray-700 rounded-lg transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-80' : 'max-h-40'
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
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
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
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
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
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${newMessage.trim()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
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
function PhotosSection({
  hangout,
  isHost,
  onHangoutUpdate
}: {
  hangout: Hangout
  isHost: boolean
  onHangoutUpdate: () => Promise<void>
}) {
  const { getToken } = useAuth()
  const [photos, setPhotos] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)
  const [settingPrimaryPhotoId, setSettingPrimaryPhotoId] = useState<string | null>(null)

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
      const token = await getToken()
      const response = await fetch(`/api/hangouts/${hangout.id}/photos`, {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      })
      if (response.ok) {
        const data = await response.json()
        setPhotos(data.data?.photos || [])
      }
    } catch (error) {
      logger.error('Error fetching photos:', error);
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
      const token = await getToken()
      const response = await fetch(`/api/hangouts/${hangout.id}/photos`, {
        method: 'POST',
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {},
        body: formData
      })
      if (response.ok) {
        const data = await response.json()
        await fetchPhotos() // Refresh photos
        await onHangoutUpdate() // Refresh hangout to ensure image is updated
        const uploadedCount = data.data?.photos?.length || files.length
        toast.success(`Photo${uploadedCount > 1 ? 's' : ''} uploaded successfully!`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || errorData.error || 'Failed to upload photos'
        logger.error('Photo upload failed:', { status: response.status, error: errorMessage })
        toast.error(errorMessage)
      }
    } catch (error: any) {
      logger.error('Error uploading photos:', error);
      const errorMessage = error?.message || 'An error occurred while uploading photos'
      toast.error(errorMessage)
    } finally {
      setIsUploading(false)
      // Reset file input
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) {
      return
    }

    setDeletingPhotoId(photoId)
    try {
      const token = await getToken()
      const response = await fetch(`/api/hangouts/${hangout.id}/photos/${photoId}`, {
        method: 'DELETE',
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      })

      if (response.ok) {
        toast.success('Photo deleted successfully!')
        await fetchPhotos() // Refresh photos
        await onHangoutUpdate() // Refresh hangout to update primary photo if needed
        // Reset carousel if we deleted the current photo
        if (currentPhotoIndex >= photos.length - 1) {
          setCurrentPhotoIndex(Math.max(0, photos.length - 2))
        }
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || 'Failed to delete photo')
      }
    } catch (error) {
      logger.error('Error deleting photo:', error);
      toast.error('An error occurred while deleting photo')
    } finally {
      setDeletingPhotoId(null)
    }
  }

  const handleSetAsPrimary = async (photoId: string) => {
    setSettingPrimaryPhotoId(photoId)
    try {
      const token = await getToken()
      const response = await fetch(`/api/hangouts/${hangout.id}/photos/${photoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ setAsPrimary: true })
      })

      if (response.ok) {
        toast.success('Primary photo updated!')
        await onHangoutUpdate() // Refresh hangout to show new primary photo
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || 'Failed to set primary photo')
      }
    } catch (error) {
      logger.error('Error setting primary photo:', error);
      toast.error('An error occurred while setting primary photo')
    } finally {
      setSettingPrimaryPhotoId(null)
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
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-semibold text-sm">Additional Photos</h3>
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
            className={`px-3 py-1 rounded-lg font-bold text-sm ${isUploading
              ? 'bg-gray-600 text-gray-400'
              : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : '+ Add Photos'}
          </button>
        </div>
      </div>
      {isLoadingPhotos ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
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
                {photos.map((photo, index) => {
                  const isPhotoPrimary = hangout.image === photo.originalUrl ||
                    hangout.image === photo.thumbnailUrl ||
                    hangout.image === photo.smallUrl ||
                    hangout.image === photo.mediumUrl ||
                    hangout.image === photo.largeUrl

                  // Use the best available image URL
                  const imageUrl = photo.mediumUrl || photo.largeUrl || photo.originalUrl || photo.smallUrl || photo.thumbnailUrl

                  return (
                    <div key={photo.id} className="w-full flex-shrink-0 relative group">
                      <img
                        src={imageUrl}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-48 object-cover rounded-xl"
                        onError={(e) => {
                          // Try fallback URLs if primary fails
                          const target = e.target as HTMLImageElement
                          if (target.src !== photo.thumbnailUrl) {
                            target.src = photo.thumbnailUrl || photo.smallUrl || photo.originalUrl || ''
                          } else {
                            target.style.display = 'none'
                          }
                        }}
                      />
                      {/* Host/Cohost Controls - Show on hover/tap */}
                      {isHost && (
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                          {!isPhotoPrimary && (
                            <button
                              onClick={() => handleSetAsPrimary(photo.id)}
                              disabled={settingPrimaryPhotoId === photo.id}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium disabled:opacity-50"
                              title="Set as primary photo"
                            >
                              {settingPrimaryPhotoId === photo.id ? '...' : '⭐ Set Primary'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePhoto(photo.id)}
                            disabled={deletingPhotoId === photo.id}
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium disabled:opacity-50"
                            title="Delete photo"
                          >
                            {deletingPhotoId === photo.id ? '...' : '🗑️ Delete'}
                          </button>
                        </div>
                      )}
                      {/* Photo Info Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 rounded-b-xl">
                        <p className="text-white text-sm">
                          by {photo.users?.name || photo.creator?.name || 'Unknown'}
                        </p>
                        {photo.caption && (
                          <p className="text-gray-300 text-xs mt-1">{photo.caption}</p>
                        )}
                        {isPhotoPrimary && (
                          <p className="text-yellow-400 text-xs mt-1 font-medium">⭐ Primary Photo</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors z-10"
                >
                  ←
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors z-10"
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
                    className={`w-2 h-2 rounded-full transition-colors ${index === currentPhotoIndex ? 'bg-blue-500' : 'bg-gray-500'
                      }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-800/50 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">No additional photos yet</p>
          <p className="text-gray-500 text-xs">Upload photos to share with participants</p>
        </div>
      )}

    </div>
  )
}

// Primary Photo Selection Modal
function PrimaryPhotoModal({
  hangout,
  availablePhotos,
  onClose,
  onPhotoSelected,
  onUploadNew
}: {
  hangout: Hangout
  availablePhotos: any[]
  onClose: () => void
  onPhotoSelected: (photoId: string) => Promise<void>
  onUploadNew: (file: File) => Promise<void>
}) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentPrimaryPhotoId = availablePhotos.find((p: any) =>
    hangout.image === p.originalUrl ||
    hangout.image === p.thumbnailUrl ||
    hangout.image === p.smallUrl ||
    hangout.image === p.mediumUrl ||
    hangout.image === p.largeUrl
  )?.id

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (50MB max to match backend)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is 50MB`)
      return
    }

    setIsUploading(true)
    try {
      await onUploadNew(file)
    } catch (error) {
      logger.error('Error uploading file:', error);
      toast.error('Failed to upload file. Please try again.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Change Primary Photo</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Upload New Photo Section */}
        <div className="mb-6">
          <label className="block text-white font-medium mb-2">Upload New File</label>
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            <button
              className={`w-full px-4 py-3 rounded-lg font-medium text-sm ${isUploading
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? 'Uploading...' : '+ Upload New File'}
            </button>
          </div>
        </div>

        {/* Select from Existing Photos */}
        {availablePhotos.length > 0 && (
          <div>
            <label className="block text-white font-medium mb-2">Select from Existing Photos</label>
            <div className="grid grid-cols-3 gap-3">
              {availablePhotos.map((photo: any) => {
                const isCurrentPrimary = photo.id === currentPrimaryPhotoId
                return (
                  <div
                    key={photo.id}
                    className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 ${isCurrentPrimary ? 'border-yellow-500' : 'border-gray-600 hover:border-blue-500'
                      }`}
                    onClick={() => {
                      if (!isCurrentPrimary) {
                        onPhotoSelected(photo.id)
                      }
                    }}
                  >
                    <img
                      src={photo.thumbnailUrl || photo.originalUrl}
                      alt="Photo"
                      className="w-full h-32 object-cover"
                    />
                    {isCurrentPrimary && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                        Current
                      </div>
                    )}
                    {!isCurrentPrimary && (
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100">
                          Select
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {availablePhotos.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400">No photos available. Upload a new photo to set as primary.</p>
          </div>
        )}
      </div>
    </div>
  )
}