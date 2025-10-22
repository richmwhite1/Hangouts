"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, MessageSquare, Heart, Share2 } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { logger } from '@/lib/logger'

interface SearchResult {
  id: string
  type: 'hangout' | 'event'
  title: string
  description?: string
  location?: string
  startTime?: string
  endTime?: string
  image?: string
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
  creator: {
    id: string
    username: string
    name?: string
    avatar?: string
  }
  participants: number
  comments: number
  likes: number
  shares: number
  messages: number
}

interface SearchResultsProps {
  query: string
  onClose: () => void
}

export function SearchResults({ query, onClose }: SearchResultsProps) {
  const [results, setResults] = useState<{ hangouts: SearchResult[], events: SearchResult[] }>({ hangouts: [], events: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ hangouts: [], events: [] })
      return
    }

    const searchContent = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (!response.ok) {
          throw new Error('Search failed')
        }
        
        const data = await response.json()
        setResults(data.results)
      } catch (err) {
        logger.error('Search error:', err)
        setError('Failed to search. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(searchContent, 300) // Debounce search
    return () => clearTimeout(timeoutId)
  }, [query])

  const getPrivacyBadge = (privacyLevel: string) => {
    switch (privacyLevel) {
      case 'PUBLIC':
        return <Badge variant="secondary" className="text-xs">Public</Badge>
      case 'FRIENDS_ONLY':
        return <Badge variant="outline" className="text-xs">Friends Only</Badge>
      case 'PRIVATE':
        return <Badge variant="destructive" className="text-xs">Private</Badge>
      default:
        return null
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD'
    try {
      return format(new Date(dateString), 'MMM d, yyyy')
    } catch {
      return 'TBD'
    }
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return ''
    try {
      return format(new Date(dateString), 'h:mm a')
    } catch {
      return ''
    }
  }

  if (isLoading) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Searching...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50">
        <div className="p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  if (!query || query.trim().length < 2) {
    return null
  }

  const allResults = [...results.hangouts, ...results.events]

  if (allResults.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50">
        <div className="p-4 text-center">
          <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
      <div className="p-2">
        <div className="text-xs text-muted-foreground mb-2 px-2">
          Found {allResults.length} result{allResults.length !== 1 ? 's' : ''} for "{query}"
        </div>
        
        {allResults.map((result) => (
          <Link
            key={`${result.type}-${result.id}`}
            href={`/${result.type}/${result.id}`}
            onClick={onClose}
          >
            <Card className="mb-2 hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="p-3">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-10 h-10 rounded-lg flex-shrink-0">
                    <AvatarImage src={result.image || "/placeholder-hangout.png"} />
                    <AvatarFallback className="rounded-lg">
                      {result.type === 'hangout' ? 'H' : 'E'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm truncate">{result.title}</h4>
                      {getPrivacyBadge(result.privacyLevel)}
                    </div>
                    
                    {result.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {result.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-3 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(result.startTime)}</span>
                        {result.startTime && (
                          <span>{formatTime(result.startTime)}</span>
                        )}
                      </div>
                      
                      {result.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{result.location}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{result.participants}</span>
                      </div>
                      
                      {result.messages > 0 && (
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>{result.messages}</span>
                        </div>
                      )}
                      
                      {result.likes > 0 && (
                        <div className="flex items-center space-x-1">
                          <Heart className="w-3 h-3" />
                          <span>{result.likes}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-2">
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={result.creator.avatar || "/placeholder-avatar.png"} />
                        <AvatarFallback className="text-xs">
                          {result.creator.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        by {result.creator.username}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}







