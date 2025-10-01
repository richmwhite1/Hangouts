'use client'

import { useState, useEffect } from 'react'
import { ContentTile } from './content-tile'
import { BaseContent, ContentFilter, ContentSort } from '@/types/content'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Calendar,
  MapPin,
  Users,
  Hash
} from 'lucide-react'

interface ContentFeedProps {
  initialContent?: BaseContent[]
  onContentUpdate?: (content: BaseContent[]) => void
  showFilters?: boolean
  showSearch?: boolean
  variant?: 'magazine' | 'grid' | 'list'
  maxItems?: number
}

export function ContentFeed({ 
  initialContent = [],
  onContentUpdate,
  showFilters = true,
  showSearch = true,
  variant = 'magazine',
  maxItems = 20
}: ContentFeedProps) {
  const [content, setContent] = useState<BaseContent[]>(initialContent)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [viewMode, setViewMode] = useState<'magazine' | 'grid' | 'list'>('magazine')
  const [currentMaxItems, setCurrentMaxItems] = useState(maxItems)

  // Mock data for demonstration
  useEffect(() => {
    const mockContent: BaseContent[] = [
      {
        id: '1',
        type: 'HANGOUT',
        title: 'Weekend Hiking Adventure',
        description: 'Join us for an amazing hiking trip to the mountains!',
        image: '/placeholder-hangout.png',
        location: 'Mountain Trail, CA',
        startTime: '2024-01-15T09:00:00Z',
        endTime: '2024-01-15T17:00:00Z',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        creatorId: 'user1',
        creator: {
          id: 'user1',
          name: 'Sarah Johnson',
          username: 'sarahj',
          avatar: '/placeholder-avatar.png'
        },
        createdAt: '2024-01-10T10:00:00Z',
        updatedAt: '2024-01-10T10:00:00Z',
        participants: [],
        likes: [],
        comments: [],
        shares: [],
        hashtags: ['hiking', 'outdoor', 'weekend'],
        _count: {
          participants: 12,
          likes: 45,
          comments: 8,
          shares: 3
        }
      },
      {
        id: '2',
        type: 'EVENT',
        title: 'Tech Conference 2024',
        description: 'The biggest tech conference of the year!',
        image: '/placeholder-hangout.png',
        location: 'Convention Center, SF',
        startTime: '2024-02-20T09:00:00Z',
        endTime: '2024-02-22T18:00:00Z',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        creatorId: 'user2',
        creator: {
          id: 'user2',
          name: 'Mike Chen',
          username: 'mikec',
          avatar: '/placeholder-avatar.png'
        },
        createdAt: '2024-01-08T14:00:00Z',
        updatedAt: '2024-01-08T14:00:00Z',
        participants: [],
        likes: [],
        comments: [],
        shares: [],
        hashtags: ['tech', 'conference', 'networking'],
        _count: {
          participants: 250,
          likes: 120,
          comments: 25,
          shares: 15
        }
      },
      {
        id: '3',
        type: 'COMMUNITY',
        title: 'Photography Enthusiasts',
        description: 'A community for photography lovers to share and learn!',
        image: '/placeholder-hangout.png',
        location: 'Global',
        status: 'PUBLISHED',
        privacyLevel: 'PUBLIC',
        creatorId: 'user3',
        creator: {
          id: 'user3',
          name: 'Emma Davis',
          username: 'emmad',
          avatar: '/placeholder-avatar.png'
        },
        createdAt: '2024-01-05T16:00:00Z',
        updatedAt: '2024-01-05T16:00:00Z',
        participants: [],
        likes: [],
        comments: [],
        shares: [],
        hashtags: ['photography', 'art', 'creative'],
        _count: {
          participants: 1500,
          likes: 300,
          comments: 50,
          shares: 20
        }
      }
    ]
    
    setContent(mockContent)
  }, [])

  const filteredContent = content.filter(item => {
    // Search filter
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.description?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.hashtags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return false
    }

    // Type filter
    if (selectedType !== 'all' && item.type !== selectedType) {
      return false
    }

    // Category filter (simplified)
    if (selectedCategory !== 'all') {
      // This would be more sophisticated in a real app
      return true
    }

    return true
  }).slice(0, currentMaxItems)

  const handleLike = (contentId: string) => {
    setContent(prev => prev.map(item => 
      item.id === contentId 
        ? { 
            ...item, 
            _count: { 
              ...item._count, 
              likes: item._count.likes + 1 
            } 
          }
        : item
    ))
  }

  const handleShare = (contentId: string) => {
    setContent(prev => prev.map(item => 
      item.id === contentId 
        ? { 
            ...item, 
            _count: { 
              ...item._count, 
              shares: item._count.shares + 1 
            } 
          }
        : item
    ))
  }

  const handleJoin = (contentId: string) => {
    setContent(prev => prev.map(item => 
      item.id === contentId 
        ? { 
            ...item, 
            _count: { 
              ...item._count, 
              participants: item._count.participants + 1 
            } 
          }
        : item
    ))
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="space-y-4">
          {/* Search Bar */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search content, hashtags, or creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Filters */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-4">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Content Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="HANGOUT">Hangouts</SelectItem>
                  <SelectItem value="EVENT">Events</SelectItem>
                  <SelectItem value="COMMUNITY">Communities</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="tech">Technology</SelectItem>
                  <SelectItem value="art">Art & Creative</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="participants">Most Participants</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-1 ml-auto">
                <Button
                  variant={viewMode === 'magazine' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('magazine')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Active Filters */}
          {(searchQuery || selectedType !== 'all' || selectedCategory !== 'all') && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Search className="h-3 w-3" />
                  "{searchQuery}"
                </Badge>
              )}
              {selectedType !== 'all' && (
                <Badge variant="secondary">
                  {selectedType}
                </Badge>
              )}
              {selectedCategory !== 'all' && (
                <Badge variant="secondary">
                  {selectedCategory}
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading content...</p>
          </div>
        </div>
      ) : filteredContent.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No content found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className={
          viewMode === 'magazine' 
            ? 'space-y-4' 
            : viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-2'
        }>
          {filteredContent.map((item, index) => (
            <ContentTile
              key={item.id}
              content={item}
              index={index}
              totalCount={filteredContent.length}
              variant={viewMode}
              onLike={handleLike}
              onShare={handleShare}
              onJoin={handleJoin}
            />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {filteredContent.length >= currentMaxItems && (
        <div className="text-center">
          <Button variant="outline" onClick={() => setCurrentMaxItems(prev => prev + 20)}>
            Load More Content
          </Button>
        </div>
      )}
    </div>
  )
}
