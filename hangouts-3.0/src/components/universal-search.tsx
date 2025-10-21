'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, Calendar, MapPin, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { logger } from '@/lib/logger'

interface SearchResult {
  id: string
  type: 'hangout' | 'event' | 'user'
  title: string
  description?: string
  location?: string
  date?: string
  time?: string
  image?: string
  avatar?: string
  username?: string
  name?: string
  price?: { min: number; max?: number; currency: string }
  participants?: number
}

interface UniversalSearchProps {
  placeholder?: string
  className?: string
  onResultClick?: (result: SearchResult) => void
}

export function UniversalSearch({ 
  placeholder = "Search hangouts, events, or people...",
  className = "",
  onResultClick
}: UniversalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search function
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setShowResults(false)
      return
    }

    setIsLoading(true)
    try {
      // Search all content types in parallel
      const [hangoutsResponse, eventsResponse, usersResponse] = await Promise.all([
        fetch(`/api/public/content?search=${encodeURIComponent(searchQuery)}&type=HANGOUT&limit=5`),
        fetch(`/api/public/content?search=${encodeURIComponent(searchQuery)}&type=EVENT&limit=5`),
        fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=5`)
      ])

      const allResults: SearchResult[] = []

      // Process hangouts
      if (hangoutsResponse.ok) {
        const hangoutsData = await hangoutsResponse.json()
        const hangouts = hangoutsData.content || []
        hangouts.forEach((hangout: any) => {
          allResults.push({
            id: hangout.id,
            type: 'hangout',
            title: hangout.title,
            description: hangout.description,
            location: hangout.location,
            date: hangout.startTime ? new Date(hangout.startTime).toLocaleDateString() : '',
            time: hangout.startTime ? new Date(hangout.startTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) : '',
            image: hangout.image || (hangout.photos && hangout.photos.length > 0 ? hangout.photos[0]?.mediumUrl || hangout.photos[0]?.originalUrl : null),
            participants: hangout._count?.participants || 0,
            username: hangout.creator?.username,
            name: hangout.creator?.name,
            avatar: hangout.creator?.avatar
          })
        })
      }

      // Process events
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        const events = eventsData.content || []
        events.forEach((event: any) => {
          allResults.push({
            id: event.id,
            type: 'event',
            title: event.title,
            description: event.description,
            location: event.venue || event.city,
            date: event.startTime ? new Date(event.startTime).toLocaleDateString() : '',
            time: event.startTime ? new Date(event.startTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) : '',
            image: event.image || (event.photos && event.photos.length > 0 ? event.photos[0]?.mediumUrl || event.photos[0]?.originalUrl : null),
            price: {
              min: event.priceMin || 0,
              max: event.priceMax,
              currency: 'USD'
            },
            username: event.creator?.username,
            name: event.creator?.name,
            avatar: event.creator?.avatar
          })
        })
      }

      // Process users
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        const users = usersData.users || []
        users.forEach((user: any) => {
          allResults.push({
            id: user.id,
            type: 'user',
            title: user.name || user.username,
            description: user.username,
            username: user.username,
            name: user.name,
            avatar: user.avatar
          })
        })
      }

      setResults(allResults)
      setShowResults(true)
      setSelectedIndex(-1)
    } catch (error) {
      logger.error('Search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle input change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleResultClick(results[selectedIndex])
        }
        break
      case 'Escape':
        setShowResults(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result)
    } else {
      // Default navigation behavior
      switch (result.type) {
        case 'hangout':
          router.push(`/hangouts/public/${result.id}`)
          break
        case 'event':
          router.push(`/events/public/${result.id}`)
          break
        case 'user':
          router.push(`/profile/${result.username}`)
          break
      }
    }
    setShowResults(false)
    setQuery('')
    inputRef.current?.blur()
  }

  // Get icon for result type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hangout':
        return <Users className="w-4 h-4" />
      case 'event':
        return <Calendar className="w-4 h-4" />
      case 'user':
        return <Users className="w-4 h-4" />
      default:
        return <Search className="w-4 h-4" />
    }
  }

  // Get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'hangout':
        return 'Hangout'
      case 'event':
        return 'Event'
      case 'user':
        return 'User'
      default:
        return 'Result'
    }
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setShowResults(true)}
          className="pl-10 bg-input border-border"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-96 overflow-y-auto">
          {results.map((result, index) => (
            <div
              key={`${result.type}-${result.id}-${index}`}
              className={`flex items-center space-x-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
              } ${index === 0 ? 'rounded-t-md' : ''} ${
                index === results.length - 1 ? 'rounded-b-md' : 'border-b border-gray-200 dark:border-gray-600'
              }`}
              onClick={() => handleResultClick(result)}
            >
              {/* Avatar/Image */}
              <div className="flex-shrink-0">
                {result.type === 'user' ? (
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={result.avatar} alt={result.title} />
                    <AvatarFallback className="bg-blue-500 text-white">
                      {result.title.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : result.image ? (
                  <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden">
                    <img 
                      src={result.image} 
                      alt={result.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                        if (nextElement) {
                          nextElement.style.display = 'flex'
                        }
                      }}
                    />
                    <div className="w-full h-full bg-gray-300 flex items-center justify-center" style={{ display: 'none' }}>
                      {getTypeIcon(result.type)}
                    </div>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                    {getTypeIcon(result.type)}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-sm truncate text-gray-900 dark:text-white">{result.title}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {getTypeLabel(result.type)}
                  </Badge>
                </div>
                
                {result.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 truncate mb-1">
                    {result.description}
                  </p>
                )}

                <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                  {result.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{result.location}</span>
                    </div>
                  )}
                  {result.date && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{result.date}</span>
                    </div>
                  )}
                  {result.participants !== undefined && (
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{result.participants} going</span>
                    </div>
                  )}
                  {result.price && result.price.min > 0 && (
                    <span>
                      ${result.price.min}{result.price.max ? `-${result.price.max}` : '+'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {showResults && query && !isLoading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-4">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No results found for "{query}"</p>
          </div>
        </div>
      )}
    </div>
  )
}
