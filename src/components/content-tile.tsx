'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Heart, 
  MessageSquare, 
  Share2, 
  MoreVertical,
  Eye,
  UserPlus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BaseContent, ContentType } from '@/types/content'

interface ContentTileProps {
  content: BaseContent
  index: number
  totalCount: number
  variant?: 'magazine' | 'card' | 'compact'
  showActions?: boolean
  onLike?: (contentId: string) => void
  onShare?: (contentId: string) => void
  onJoin?: (contentId: string) => void
}

export function ContentTile({ 
  content, 
  index, 
  totalCount, 
  variant = 'magazine',
  showActions = true,
  onLike,
  onShare,
  onJoin
}: ContentTileProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [isJoined, setIsJoined] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short',
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

  const getContentTypeIcon = (type: ContentType) => {
    switch (type) {
      case 'HANGOUT':
        return '🎉'
      case 'EVENT':
        return '🎪'
      case 'COMMUNITY':
        return '👥'
      default:
        return '📅'
    }
  }

  const getContentTypeColor = (type: ContentType) => {
    switch (type) {
      case 'HANGOUT':
        return 'bg-blue-500/90'
      case 'EVENT':
        return 'bg-purple-500/90'
      case 'COMMUNITY':
        return 'bg-green-500/90'
      default:
        return 'bg-gray-500/90'
    }
  }

  const getContentTypeLabel = (type: ContentType) => {
    switch (type) {
      case 'HANGOUT':
        return 'Hangout'
      case 'EVENT':
        return 'Event'
      case 'COMMUNITY':
        return 'Community'
      default:
        return 'Content'
    }
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
    onLike?.(content.id)
  }

  const handleShare = () => {
    onShare?.(content.id)
  }

  const handleJoin = () => {
    setIsJoined(!isJoined)
    onJoin?.(content.id)
  }

  if (variant === 'magazine') {
    return (
      <Link href={`/${content.type.toLowerCase()}s/${content.id}`}>
        <div 
          className="group relative overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
          style={{
            transform: `translateY(${index * 8}px)`,
            zIndex: totalCount - index,
            marginBottom: `${index * 8}px`
          }}
        >
          {/* Full Image Background with Editorial Overlay */}
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={content.image || '/placeholder-hangout.png'}
              alt={content.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                if (e.currentTarget.src !== '/placeholder-hangout.png') {
                  e.currentTarget.src = '/placeholder-hangout.png'
                }
              }}
              unoptimized="true"
            />
            
            {/* Dark gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            
            {/* Top Row - Badges and Indicators */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <div className="flex items-center space-x-2">
                <Badge className={`${getContentTypeColor(content.type)} text-white border-0 text-xs font-medium px-3 py-1`}>
                  {getContentTypeIcon(content.type)} {getContentTypeLabel(content.type)}
                </Badge>
                <Badge 
                  variant="secondary" 
                  className={`${
                    content.privacyLevel === 'PUBLIC' 
                      ? 'bg-green-500/90 text-white' 
                      : content.privacyLevel === 'FRIENDS_ONLY'
                      ? 'bg-blue-500/90 text-white'
                      : 'bg-gray-500/90 text-white'
                  } border-0 text-xs font-medium px-3 py-1`}
                >
                  {content.privacyLevel === 'PUBLIC' ? 'Public' : 
                   content.privacyLevel === 'FRIENDS_ONLY' ? 'Friends' : 'Private'}
                </Badge>
              </div>
              
              <div className="bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium">
                {index + 1}/{totalCount}
              </div>
            </div>

            {/* Bottom Content Overlay - Editorial Style */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              {/* Title - Large and Bold */}
              <h3 className="text-2xl font-bold mb-3 line-clamp-2 group-hover:text-yellow-300 transition-colors drop-shadow-lg">
                {content.title}
              </h3>
              
              {/* Creator Info */}
              <div className="flex items-center space-x-3 mb-4">
                <Avatar className="h-8 w-8 border-2 border-white/30">
                  <AvatarImage src={content.creator.avatar} alt={content.creator.name} />
                  <AvatarFallback className="text-sm bg-white/20 text-white">
                    {content.creator.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium text-white/90">by {content.creator.name}</div>
                  <div className="text-xs text-white/70">@{content.creator.username}</div>
                </div>
              </div>

              {/* Event Details - Horizontal Layout */}
              <div className="flex items-center space-x-6 mb-4 text-sm">
                {content.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-white/80" />
                    <span className="text-white/90 line-clamp-1">{content.location}</span>
                  </div>
                )}
                
                {content.startTime && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-white/80" />
                    <span className="text-white/90">{formatDate(content.startTime)}</span>
                  </div>
                )}
                
                {content.startTime && (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-white/80" />
                    <span className="text-white/90">{formatTime(content.startTime)}</span>
                  </div>
                )}
              </div>

              {/* Bottom Row - Participants and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-white/80" />
                    <span className="text-sm text-white/90">
                      {content._count.participants} going
                    </span>
                  </div>
                  
                  {content.hashtags.length > 0 && (
                    <div className="flex items-center space-x-1">
                      {content.hashtags.slice(0, 2).map((tag, idx) => (
                        <span key={idx} className="text-xs text-white/70 bg-white/20 px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {showActions && (
                  <div className="flex items-center space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs bg-white/20 border-white/30 text-white hover:bg-white/30"
                      onClick={(e) => {
                        e.preventDefault()
                        handleLike()
                      }}
                    >
                      <Heart className={`h-3 w-3 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                      {content._count.likes}
                    </Button>
                    <Button 
                      size="sm" 
                      className="text-xs bg-white text-black hover:bg-white/90"
                      onClick={(e) => {
                        e.preventDefault()
                        handleJoin()
                      }}
                    >
                      {isJoined ? 'Joined' : 'Join'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Card variant for grid layouts
  if (variant === 'card') {
    return (
      <Link href={`/${content.type.toLowerCase()}s/${content.id}`}>
        <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={content.image || '/placeholder-hangout.png'}
              alt={content.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized="true"
            />
            <div className="absolute top-2 left-2">
              <Badge className={`${getContentTypeColor(content.type)} text-white border-0 text-xs`}>
                {getContentTypeIcon(content.type)} {getContentTypeLabel(content.type)}
              </Badge>
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-2 line-clamp-2">{content.title}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
              <Users className="h-4 w-4" />
              <span>{content._count.participants} participants</span>
            </div>
            {content.startTime && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(content.startTime)}</span>
              </div>
            )}
          </div>
        </Card>
      </Link>
    )
  }

  // Compact variant for lists
  return (
    <Link href={`/${content.type.toLowerCase()}s/${content.id}`}>
      <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={content.image || '/placeholder-hangout.png'}
            alt={content.title}
            className="w-full h-full object-cover"
            unoptimized
          />
          <div className="absolute top-1 left-1">
            <Badge className={`${getContentTypeColor(content.type)} text-white border-0 text-xs px-1 py-0.5`}>
              {getContentTypeIcon(content.type)}
            </Badge>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm line-clamp-1">{content.title}</h3>
          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
            <Users className="h-3 w-3" />
            <span>{content._count.participants}</span>
            {content.startTime && (
              <>
                <span>•</span>
                <span>{formatDate(content.startTime)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
