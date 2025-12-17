'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
import {
  Calendar,
  MapPin,
  Users,
  Check,
  X,
  HelpCircle,
  ArrowLeft,
  Settings,
  UserPlus,
  Loader2,
  Camera,
  MessageSquare,
  Send,
  Image as ImageIcon,
  Share2,
  Heart,
  MoreHorizontal,
  Clock,
  Globe,
  Lock,
  Users2,
  ChevronRight,
  Star,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Info,
  Plus
} from 'lucide-react'
// Removed api-client import - using direct fetch calls
import { Button } from '@/components/ui/button'
// Removed IntelligentRSVP import - using simple RSVP instead
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MobileModal } from '@/components/ui/mobile-modal'
import { logger } from '@/lib/logger'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Confetti } from '@/components/celebrations/confetti'
import { ShareModal } from '@/components/share/share-modal'

interface Hangout {
  id: string
  title: string
  type: 'quick_plan' | 'multi_option'
  description?: string
  location?: string
  startTime: string
  endTime: string
  creatorId: string
  creator: {
    name: string
    username: string
    avatar?: string
  }
  participants: Array<{
    id: string
    userId: {
      id: string
      name: string
      username: string
      avatar?: string
    }
    rsvpStatus: 'YES' | 'NO' | 'MAYBE' | 'PENDING'
    role: 'CREATOR' | 'CO_ORGANIZER' | 'MEMBER'
    canEdit: boolean
  }>
  _count: { participants: number }
  latitude?: number
  longitude?: number
  weatherEnabled: boolean
  maxParticipants?: number
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
  image?: string
  photos?: string[]
  isPolling?: boolean
  pollOptions?: Array<{
    id: string
    text: string
    votes: number
    voters: string[]
  }>
  consensusReached?: boolean
  consensusThreshold?: number
}

interface Comment {
  id: string
  content: string
  createdAt: string
  userId: {
    id: string
    name: string
    username: string
    avatar?: string
  }
}

interface HangoutDetailModernProps {
  hangout: Hangout
  onRSVP?: (status: 'YES' | 'NO' | 'MAYBE') => Promise<void>
  onVote?: (optionId: string) => Promise<void>
  onAddPhoto?: (file: File) => Promise<void>
  onAddComment?: () => Promise<void>
  onInvite?: () => void
  onEdit?: () => void
  onShare?: () => void
  isUpdatingRSVP?: boolean
  isUploadingPhoto?: boolean
  isSubmittingComment?: boolean
  comments?: Comment[]
  newComment?: string
  setNewComment?: (comment: string) => void
  showRSVP?: boolean
  showEventDetails?: boolean
}

export default function HangoutDetailModern({
  hangout,
  onRSVP,
  onVote,
  onAddPhoto,
  onAddComment,
  onInvite,
  onEdit,
  onShare,
  isUpdatingRSVP = false,
  isUploadingPhoto = false,
  isSubmittingComment = false,
  comments = [],
  newComment = '',
  setNewComment,
  showRSVP = true,
  showEventDetails = true
}: HangoutDetailModernProps) {
  const { userId } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [friendSearchTerm, setFriendSearchTerm] = useState('')

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
    if (!userId) return null
    return hangout.participants.find(p => p.userId.id === userId)
  }

  const userIdRSVP = getUserRSVP()
  const isCreator = hangout.creatorId === userId
  const canEdit = isCreator || userIdRSVP?.canEdit

  const getRSVPCounts = () => {
    const counts = { yes: 0, no: 0, maybe: 0, pending: 0 }
    hangout.participants.forEach(p => {
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
  const totalVotes = rsvpCounts.yes + rsvpCounts.maybe + rsvpCounts.no
  const consensusPercentage = totalVotes > 0 ? (rsvpCounts.yes / totalVotes) * 100 : 0

  const getPrivacyIcon = () => {
    switch (hangout.privacyLevel) {
      case 'PUBLIC': return <Globe className="h-4 w-4" />
      case 'FRIENDS_ONLY': return <Users2 className="h-4 w-4" />
      case 'PRIVATE': return <Lock className="h-4 w-4" />
    }
  }

  const getPrivacyLabel = () => {
    switch (hangout.privacyLevel) {
      case 'PUBLIC': return 'Public'
      case 'FRIENDS_ONLY': return 'Friends Only'
      case 'PRIVATE': return 'Private'
    }
  }

  const handlePhotoClick = (photo: string) => {
    setSelectedPhoto(photo)
    setShowPhotoModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section with Image */}
      <div className="relative">
        {hangout.image ? (
          <div className="relative h-80 w-full overflow-hidden">
            <img
              src={hangout.image}
              alt={hangout.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => router.back()}
                  className="p-2 bg-black/30 hover:bg-black/50 rounded-full transition-colors duration-200"
                >
                  <ArrowLeft className="h-5 w-5 text-white" />
                </button>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {getPrivacyIcon()}
                    <span className="ml-1">{getPrivacyLabel()}</span>
                  </Badge>
                  {canEdit && (
                    <button
                      onClick={onEdit}
                      className="p-2 bg-black/30 hover:bg-black/50 rounded-full transition-colors duration-200"
                    >
                      <Settings className="h-5 w-5 text-white" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Title Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                {hangout.title}
              </h1>
              {hangout.description && (
                <p className="text-white/90 text-lg line-clamp-2 drop-shadow-md">
                  {hangout.description}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 h-80 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-3xl font-bold mb-2">{hangout.title}</h1>
              {hangout.description && (
                <p className="text-white/90 text-lg">{hangout.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions Bar */}
        <div className="absolute -bottom-6 left-4 right-4">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* RSVP/Voting Section */}
                  {hangout.isPolling && !hangout.consensusReached ? (
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-blue-500" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">Voting</span>
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        {consensusPercentage.toFixed(0)}% consensus
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">RSVP</span>
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        {rsvpCounts.yes} going
                      </Badge>
                    </div>
                  )}

                  {/* Participant Count */}
                  <div className="flex items-center space-x-1 text-gray-500">
                    <Users2 className="h-4 w-4" />
                    <span className="text-sm">{hangout._count.participants}</span>
                    {hangout.maxParticipants && (
                      <span className="text-sm">/ {hangout.maxParticipants}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab('polls')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Polls"
                  >
                    <BarChart3 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => {
                      setIsShareModalOpen(true)
                      onShare?.()
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Share"
                  >
                    <Share2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Chat"
                  >
                    <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confetti Celebration */}
      {hangout.consensusReached && <Confetti duration={4000} particleCount={200} />}

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        hangout={hangout}
      />

      {/* Main Content */}
      <div className="px-6 pt-6 pb-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="overview" className="px-5 py-3">Overview</TabsTrigger>
            <TabsTrigger value="polls" className="px-5 py-3">Polls</TabsTrigger>
            <TabsTrigger value="participants" className="px-5 py-3">People</TabsTrigger>
            <TabsTrigger value="photos" className="px-5 py-3">Photos</TabsTrigger>
            <TabsTrigger value="chat" className="px-5 py-3">Chat</TabsTrigger>
          </TabsList>

          {/* Polls Tab */}
          <TabsContent value="polls" className="space-y-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    Vote for the Plan
                  </h3>
                  {hangout.consensusReached && (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Decided
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {hangout.pollOptions && hangout.pollOptions.length > 0 ? (
                  <div className="space-y-3">
                    {hangout.pollOptions.map((option) => {
                      const totalVotes = hangout.pollOptions?.reduce((acc, opt) => acc + opt.votes, 0) || 0
                      const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0
                      const isVotedByUser = option.voters.includes(userId || '')
                      const isWinning = hangout.consensusReached && option.votes === Math.max(...(hangout.pollOptions?.map(o => o.votes) || [0]))

                      return (
                        <div
                          key={option.id}
                          className={`py-3 px-5 rounded-lg border-2 transition-all cursor-pointer relative overflow-hidden ${isVotedByUser
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                            } ${isWinning ? 'ring-2 ring-green-500 border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}
                          onClick={() => !hangout.consensusReached && onVote?.(option.id)}
                        >
                          {/* Progress Bar Background */}
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-blue-100 dark:bg-blue-900/30 transition-all duration-500 ease-out"
                            style={{ width: `${percentage}%`, opacity: 0.5, zIndex: 0 }}
                          />

                          <div className="relative z-10 flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="font-medium text-lg text-gray-900 dark:text-white flex items-center">
                                {option.text}
                                {isWinning && <CheckCircle2 className="w-5 h-5 text-green-600 ml-2" />}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {option.votes} votes ({percentage.toFixed(0)}%)
                              </div>
                            </div>

                            <div className="flex items-center">
                              {isVotedByUser ? (
                                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                                  <Check className="w-5 h-5" />
                                </div>
                              ) : (
                                !hangout.consensusReached && (
                                  <div className="h-8 w-8 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-300">
                                    <Plus className="w-4 h-4" />
                                  </div>
                                )
                              )}
                            </div>
                          </div>

                          {/* Voters Avatars (Mini) */}
                          {option.voters.length > 0 && (
                            <div className="relative z-10 mt-3 flex gap-3 overflow-hidden pt-1">
                              {option.voters.slice(0, 5).map((voterId, idx) => {
                                const participant = hangout.participants.find(p => p.userId.id === voterId)
                                if (!participant) return null
                                return (
                                  <Avatar key={voterId} className="inline-block h-6 w-6 ring-2 ring-white dark:ring-gray-900">
                                    <AvatarImage src={participant.userId.avatar} />
                                    <AvatarFallback className="text-[10px]">{participant.userId.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                )
                              })}
                              {option.voters.length > 5 && (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-900 bg-gray-100 dark:bg-gray-800 text-[10px] font-medium text-gray-500">
                                  +{option.voters.length - 5}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No polls yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      This hangout doesn't have any voting options.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Event Details Card - Only show if showEventDetails is true */}
            {showEventDetails && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold mb-4">Event Details</h3>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-start space-x-4 mb-3">
                    <Calendar className="h-5 w-5 text-blue-500 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDate(hangout.startTime)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(hangout.startTime)} - {formatTime(hangout.endTime)}
                      </p>
                    </div>
                  </div>

                  {hangout.location && (
                    <div className="flex items-start space-x-4 mb-3">
                      <MapPin className="h-5 w-5 text-red-500 mt-1" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {hangout.location}
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hangout.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600 text-sm mt-1 inline-flex items-center gap-1"
                        >
                          <MapPin className="w-4 h-4" />
                          Open in Google Maps
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start space-x-4">
                    <Users className="h-5 w-5 text-green-500 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {hangout._count.participants} participant{hangout._count.participants !== 1 ? 's' : ''}
                        {hangout.maxParticipants && ` (max ${hangout.maxParticipants})`}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-green-600 dark:text-green-400">
                          {rsvpCounts.yes} going
                        </span>
                        <span className="text-sm text-yellow-600 dark:text-yellow-400">
                          {rsvpCounts.maybe} maybe
                        </span>
                        <span className="text-sm text-red-600 dark:text-red-400">
                          {rsvpCounts.no} not going
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Participants Display - Floating Avatars with RSVP Status */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Who's Coming</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* RSVP Summary */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-green-600 dark:text-green-400">{rsvpCounts.yes} Going</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-yellow-600 dark:text-yellow-400">{rsvpCounts.maybe} Maybe</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-red-600 dark:text-red-400">{rsvpCounts.no} Not Going</span>
                      </div>
                      {rsvpCounts.pending > 0 && (
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                          <span className="text-gray-600 dark:text-gray-400">{rsvpCounts.pending} Pending</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Floating Participant Avatars */}
                  <div className="flex flex-wrap gap-3">
                    {hangout.participants.map((participant) => {
                      const getRSVPColor = (status: string) => {
                        switch (status) {
                          case 'YES': return 'ring-green-500 bg-green-50 dark:bg-green-900/20'
                          case 'MAYBE': return 'ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                          case 'NO': return 'ring-red-500 bg-red-50 dark:bg-red-900/20'
                          default: return 'ring-gray-400 bg-gray-50 dark:bg-gray-900/20'
                        }
                      }

                      const getRSVPIcon = (status: string) => {
                        switch (status) {
                          case 'YES': return <Check className="h-3 w-3 text-green-600" />
                          case 'MAYBE': return <HelpCircle className="h-3 w-3 text-yellow-600" />
                          case 'NO': return <X className="h-3 w-3 text-red-600" />
                          default: return <Clock className="h-3 w-3 text-gray-600" />
                        }
                      }

                      return (
                        <div
                          key={participant.id}
                          className={`relative group cursor-pointer`}
                          title={`${participant.userId.name} - ${participant.rsvpStatus}`}
                        >
                          <div className={`relative w-12 h-12 rounded-md ring-2 ${getRSVPColor(participant.rsvpStatus)} transition-all hover:scale-110`}>
                            <Avatar className="w-full h-full rounded-md">
                              <AvatarImage src={participant.userId.avatar} alt={participant.userId.name} />
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-sm rounded-md">
                                {participant.userId.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>

                            {/* RSVP Status Badge */}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                              {getRSVPIcon(participant.rsvpStatus)}
                            </div>
                          </div>

                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {participant.userId.name}
                            <div className="text-gray-300">
                              {participant.rsvpStatus === 'YES' && 'Going'}
                              {participant.rsvpStatus === 'MAYBE' && 'Maybe'}
                              {participant.rsvpStatus === 'NO' && 'Not Going'}
                              {participant.rsvpStatus === 'PENDING' && 'Pending'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Voting Call to Action - Show when voting is active but no consensus yet */}
            {showRSVP && !hangout.consensusReached && hangout.type !== 'quick_plan' && (
              <Card className="bg-blue-900/20 border-blue-500/50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-blue-100 mb-2">
                      Voting in Progress
                    </h3>
                    <p className="text-blue-200/80 mb-4">
                      Cast your vote to help decide the plan!
                    </p>
                    <Button
                      onClick={() => setActiveTab('polls')}
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                    >
                      Go to Polls
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Simple RSVP System - Only show for Quick Plans or when Consensus is Reached */}
            {showRSVP && userIdRSVP && (hangout.type === 'quick_plan' || hangout.consensusReached) && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-white">RSVP</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-gray-300">
                      Will you be attending this hangout?
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => onRSVP('YES')}
                        disabled={isUpdatingRSVP}
                        className={`flex-1 ${userIdRSVP.rsvpStatus === 'YES'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                      >
                        {isUpdatingRSVP ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Yes'
                        )}
                      </Button>
                      <Button
                        onClick={() => onRSVP('MAYBE')}
                        disabled={isUpdatingRSVP}
                        className={`flex-1 ${userIdRSVP.rsvpStatus === 'MAYBE'
                          ? 'bg-yellow-600 hover:bg-yellow-700'
                          : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                      >
                        Maybe
                      </Button>
                      <Button
                        onClick={() => onRSVP('NO')}
                        disabled={isUpdatingRSVP}
                        className={`flex-1 ${userIdRSVP.rsvpStatus === 'NO'
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                      >
                        No
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Creator Info */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Created by</h3>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={hangout.creator.avatar} alt={hangout.creator.name} />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {hangout.creator.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {hangout.creator.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      @{hangout.creator.username}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants" className="space-y-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Participants ({hangout._count.participants})
                  </h3>
                  {canEdit && (
                    <Button onClick={() => setIsInviteModalOpen(true)} size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {hangout.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={participant.userId.avatar} alt={participant.userId.name} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {participant.userId.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {participant.userId.name}
                          </p>
                          {participant.role === 'CREATOR' && (
                            <Badge variant="secondary" className="text-xs">
                              Creator
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          @{participant.userId.username}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ml-2 ${participant.rsvpStatus === 'YES'
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Photos ({hangout.photos?.length || 0})
                  </h3>
                  {userId && (
                    <label className="btn btn-primary btn-sm cursor-pointer">
                      <Camera className="h-4 w-4 mr-2" />
                      Add Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && onAddPhoto?.(e.target.files[0])}
                        className="hidden"
                        disabled={isUploadingPhoto}
                      />
                    </label>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {hangout.photos && hangout.photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-5 mb-6">
                    {hangout.photos.map((photo, index) => (
                      <div
                        key={index}
                        className="aspect-square overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => handlePhotoClick(photo)}
                      >
                        <img
                          src={photo}
                          alt={`Hangout photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 px-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Capture the Memories
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                      No photos have been shared yet. Be the first to snap a picture and keep the memory alive!
                    </p>
                    {userId && (
                      <label className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all transform hover:scale-105 cursor-pointer shadow-lg shadow-blue-600/20">
                        <Camera className="h-5 w-5 mr-2" />
                        Add First Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && onAddPhoto?.(e.target.files[0])}
                          className="hidden"
                          disabled={isUploadingPhoto}
                        />
                      </label>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-8 mt-8 border-t border-neutral-800 pt-8">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Discussion</h3>
              </CardHeader>
              <CardContent>
                {comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex space-x-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={comment.userId.avatar} alt={comment.userId.name} />
                          <AvatarFallback className="text-xs">
                            {comment.userId.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm text-gray-900 dark:text-white">
                              {comment.userId.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(comment.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 py-2.5 px-4 rounded-2xl max-w-[78%] bg-neutral-900/70">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Start the Conversation
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                      Have a question or just want to say hi? Break the ice and get the chat going!
                    </p>
                  </div>
                )}

                {user && (
                  <div className="mt-4 pt-4 border-t border-neutral-800">
                    <div className="flex items-center gap-3 bg-neutral-900/70 border border-neutral-800 rounded-2xl px-4 py-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.imageUrl} alt={user.fullName || user.username || ''} />
                        <AvatarFallback className="text-xs">
                          {(user.fullName || user.username || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-3">
                        <Input
                          value={newComment}
                          onChange={(e) => setNewComment?.(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 bg-transparent border-0 focus-visible:ring-0"
                        />
                        <Button
                          onClick={() => onAddComment?.()}
                          disabled={!newComment.trim() || isSubmittingComment}
                          size="sm"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Photo Modal */}
      <MobileModal
        isOpen={showPhotoModal && !!selectedPhoto}
        onClose={() => setShowPhotoModal(false)}
        className="bg-black/80"
        showCloseButton={false}
        closeOnBackdropClick={true}
        closeOnEscape={true}
        preventBodyScroll={true}
      >
        <div className="relative max-w-4xl max-h-full">
          <button
            onClick={() => setShowPhotoModal(false)}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={selectedPhoto || ''}
            alt="Hangout photo"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      </MobileModal>

      {/* Invite Modal */}
      <AlertDialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Invite Friends</AlertDialogTitle>
            <AlertDialogDescription>
              Select friends to invite to this hangout. You can search by name or select from groups.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <Input
              placeholder="Search friends by name..."
              value={friendSearchTerm}
              onChange={(e) => setFriendSearchTerm(e.target.value)}
              className="w-full"
            />

            {/* Friends List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {/* Mock friends data - replace with actual friends from API */}
              {[
                { id: '1', name: 'John Doe', userIdname: 'johndoe', avatar: '/placeholder-userId.jpg' },
                { id: '2', name: 'Jane Smith', userIdname: 'janesmith', avatar: '/placeholder-userId.jpg' },
                { id: '3', name: 'Mike Johnson', userIdname: 'mikej', avatar: '/placeholder-userId.jpg' },
                { id: '4', name: 'Sarah Wilson', userIdname: 'sarahw', avatar: '/placeholder-userId.jpg' },
              ]
                .filter(friend =>
                  friend.name.toLowerCase().includes(friendSearchTerm.toLowerCase()) ||
                  friend.userIdname.toLowerCase().includes(friendSearchTerm.toLowerCase())
                )
                .map((friend) => (
                  <div key={friend.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                    <input
                      type="checkbox"
                      id={friend.id}
                      checked={selectedFriends.includes(friend.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFriends([...selectedFriends, friend.id])
                        } else {
                          setSelectedFriends(selectedFriends.filter(id => id !== friend.id))
                        }
                      }}
                      className="rounded"
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={friend.avatar} alt={friend.name} />
                      <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{friend.name}</p>
                      <p className="text-sm text-gray-500">@{friend.userIdname}</p>
                    </div>
                  </div>
                ))}
            </div>

            {/* Selected Count */}
            {selectedFriends.length > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsInviteModalOpen(false)
              setSelectedFriends([])
              setFriendSearchTerm('')
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // TODO: Implement actual invite functionality
                // console.log('Inviting friends:', selectedFriends); // Removed for production
                setIsInviteModalOpen(false)
                setSelectedFriends([])
                setFriendSearchTerm('')
              }}
              disabled={selectedFriends.length === 0}
            >
              Send Invites ({selectedFriends.length})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  )
}
