'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreVertical, 
  Download, 
  Eye,
  Calendar,
  User,
  Tag,
  Grid3X3,
  List,
  Filter,
  Search,
  Plus,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PhotoLightbox } from './photo-lightbox'
import { PhotoSharing } from './photo-sharing'

interface Photo {
  id: string
  caption?: string
  isPublic: boolean
  originalUrl: string
  thumbnailUrl: string
  smallUrl: string
  mediumUrl: string
  largeUrl: string
  originalWidth: number
  originalHeight: number
  fileSize: number
  createdAt: string
  creator: {
    id: string
    name: string
    username: string
    avatar?: string
  }
  hangout?: {
    id: string
    title: string
  }
  album?: {
    id: string
    name: string
  }
  tags: Array<{
    id: string
    name: string
  }>
  likes: Array<{
    id: string
    user: {
      id: string
      name: string
      username: string
      avatar?: string
    }
  }>
  _count: {
    likes: number
    comments: number
  }
}

interface PhotoGalleryProps {
  photos: Photo[]
  onPhotoClick?: (photo: Photo) => void
  onLike?: (photoId: string) => void
  onComment?: (photoId: string) => void
  onShare?: (photoId: string) => void
  onDownload?: (photoId: string) => void
  showActions?: boolean
  layout?: 'grid' | 'masonry' | 'list'
  columns?: number
  className?: string
}

export function PhotoGallery({
  photos,
  onPhotoClick,
  onLike,
  onComment,
  onShare,
  onDownload,
  showActions = true,
  layout = 'grid',
  columns = 3,
  className
}: PhotoGalleryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'masonry' | 'list'>(layout)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [showSharing, setShowSharing] = useState(false)
  const [sharingPhotoId, setSharingPhotoId] = useState<string | null>(null)

  // Get all unique tags
  const allTags = Array.from(new Set(photos.flatMap(photo => photo.tags.map(tag => tag.name))))

  // Filter photos based on search and tags
  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = !searchQuery || 
      photo.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.hangout?.title.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesTags = filterTags.length === 0 || 
      filterTags.every(tag => photo.tags.some(photoTag => photoTag.name === tag))
    
    return matchesSearch && matchesTags
  })

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo)
    onPhotoClick?.(photo)
  }

  const handleTagClick = (tag: string) => {
    setFilterTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterTags([])
  }

  const handleShare = (photoId: string) => {
    setSharingPhotoId(photoId)
    setShowSharing(true)
  }

  const handleCloseSharing = () => {
    setShowSharing(false)
    setSharingPhotoId(null)
  }

  if (layout === 'list') {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search photos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Tags */}
        {showFilters && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={filterTags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleTagClick(tag)}
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
            
            {(searchQuery || filterTags.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500"
              >
                <X className="w-4 h-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Photos List */}
        <div className="space-y-4">
          {filteredPhotos.map(photo => (
            <Card key={photo.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="flex">
                {/* Photo */}
                <div className="w-32 h-32 flex-shrink-0">
                  <img
                    src={photo.mediumUrl}
                    alt={photo.caption || 'Photo'}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => handlePhotoClick(photo)}
                  />
                </div>
                
                {/* Content */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src={photo.creator.avatar || '/default-avatar.png'}
                          alt={photo.creator.name}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="font-medium text-sm">{photo.creator.name}</span>
                        <span className="text-gray-500 text-sm">@{photo.creator.username}</span>
                        <span className="text-gray-400 text-sm">•</span>
                        <span className="text-gray-500 text-sm">
                          {new Date(photo.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {photo.caption && (
                        <p className="text-gray-700 mb-2">{photo.caption}</p>
                      )}
                      
                      {photo.hangout && (
                        <Badge variant="secondary" className="mb-2">
                          {photo.hangout.title}
                        </Badge>
                      )}
                      
                      {photo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {photo.tags.map(tag => (
                            <Badge key={tag.id} variant="outline" className="text-xs">
                              #{tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    {showActions && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onLike?.(photo.id)}
                        >
                          <Heart className="w-4 h-4 mr-1" />
                          {photo._count.likes}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onComment?.(photo.id)}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          {photo._count.comments}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShare(photo.id)}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownload?.(photo.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Grid and Masonry layouts
  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search photos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'masonry' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('masonry')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Tags */}
      {showFilters && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <Badge
                key={tag}
                variant={filterTags.includes(tag) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleTagClick(tag)}
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
          
          {(searchQuery || filterTags.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-500"
            >
              <X className="w-4 h-4 mr-1" />
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Photos Grid */}
      <div className={cn(
        'grid gap-4',
        viewMode === 'grid' ? `grid-cols-${columns}` : 'masonry-grid'
      )}>
        {filteredPhotos.map(photo => (
          <Card key={photo.id} className="overflow-hidden group hover:shadow-lg transition-all duration-200">
            <div className="relative">
              <img
                src={viewMode === 'masonry' ? photo.mediumUrl : photo.thumbnailUrl}
                alt={photo.caption || 'Photo'}
                className="w-full h-64 object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200"
                onClick={() => handlePhotoClick(photo)}
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                  {showActions && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onLike?.(photo.id)
                        }}
                      >
                        <Heart className="w-4 h-4 mr-1" />
                        {photo._count.likes}
                      </Button>
                      
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onComment?.(photo.id)
                        }}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {photo._count.comments}
                      </Button>
                      
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleShare(photo.id)
                        }}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Photo Info */}
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <img
                  src={photo.creator.avatar || '/default-avatar.png'}
                  alt={photo.creator.name}
                  className="w-6 h-6 rounded-full"
                />
                <span className="font-medium text-sm">{photo.creator.name}</span>
                <span className="text-gray-500 text-sm">
                  {new Date(photo.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              {photo.caption && (
                <p className="text-sm text-gray-700 mb-2 line-clamp-2">{photo.caption}</p>
              )}
              
              {photo.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {photo.tags.slice(0, 3).map(tag => (
                    <Badge key={tag.id} variant="outline" className="text-xs">
                      #{tag.name}
                    </Badge>
                  ))}
                  {photo.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{photo.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredPhotos.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Grid3X3 className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || filterTags.length > 0 
              ? 'Try adjusting your search or filters'
              : 'Start by uploading some photos'
            }
          </p>
          {(searchQuery || filterTags.length > 0) && (
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <PhotoLightbox
          photos={[selectedPhoto]}
          currentIndex={0}
          onClose={() => setSelectedPhoto(null)}
        />
      )}

      {/* Photo Sharing Modal */}
      {showSharing && sharingPhotoId && (
        <PhotoSharing
          photoId={sharingPhotoId}
          onClose={handleCloseSharing}
        />
      )}
    </div>
  )
}
