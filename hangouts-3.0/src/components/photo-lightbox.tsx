'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  MessageCircle, 
  Share2, 
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Tag,
  Calendar,
  User,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface PhotoLightboxProps {
  photos: Photo[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onNext: () => void
  onPrev: () => void
  onLike?: (photoId: string) => void
  onComment?: (photoId: string) => void
  onShare?: (photoId: string) => void
  onDownload?: (photoId: string) => void
}

export function PhotoLightbox({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onNext,
  onPrev,
  onLike,
  onComment,
  onShare,
  onDownload
}: PhotoLightboxProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [showInfo, setShowInfo] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)

  const currentPhoto = photos[currentIndex]

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          onPrev()
          break
        case 'ArrowRight':
          onNext()
          break
        case '+':
        case '=':
          setZoom(prev => Math.min(prev + 0.25, 3))
          break
        case '-':
          setZoom(prev => Math.max(prev - 0.25, 0.5))
          break
        case 'r':
          setRotation(prev => (prev + 90) % 360)
          break
        case 'i':
          setShowInfo(prev => !prev)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, onNext, onPrev])

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const handleImageError = () => {
    setImageLoaded(false)
  }

  const resetZoom = () => {
    setZoom(1)
    setRotation(0)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!isOpen || !currentPhoto) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center">
      {/* Close Button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 z-10 text-white hover:bg-white hover:bg-opacity-20"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Navigation Buttons */}
      {photos.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:bg-white hover:bg-opacity-20"
            onClick={onPrev}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:bg-white hover:bg-opacity-20"
            onClick={onNext}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}

      {/* Zoom Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white hover:bg-opacity-20"
          onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white hover:bg-opacity-20"
          onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white hover:bg-opacity-20"
          onClick={() => setRotation(prev => (prev + 90) % 360)}
        >
          <RotateCw className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white hover:bg-opacity-20"
          onClick={resetZoom}
        >
          Reset
        </Button>
      </div>

      {/* Photo Counter */}
      {photos.length > 1 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 text-white text-sm">
          {currentIndex + 1} of {photos.length}
        </div>
      )}

      {/* Main Photo */}
      <div className="relative max-w-full max-h-full p-4">
        <img
          src={currentPhoto.largeUrl}
          alt={currentPhoto.caption || 'Photo'}
          className={cn(
            'max-w-full max-h-full object-contain transition-all duration-200',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center'
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        
        {!imageLoaded && (
          <div className="flex items-center justify-center w-full h-64 text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {/* Photo Info Panel */}
      {showInfo && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 text-white p-4 max-h-64 overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src={currentPhoto.creator.avatar || '/default-avatar.png'}
                alt={currentPhoto.creator.name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <h3 className="font-medium">{currentPhoto.creator.name}</h3>
                <p className="text-sm text-gray-300">@{currentPhoto.creator.username}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white hover:bg-opacity-20"
                onClick={() => onLike?.(currentPhoto.id)}
              >
                <Heart className="w-4 h-4 mr-1" />
                {currentPhoto._count.likes}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white hover:bg-opacity-20"
                onClick={() => onComment?.(currentPhoto.id)}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                {currentPhoto._count.comments}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white hover:bg-opacity-20"
                onClick={() => onShare?.(currentPhoto.id)}
              >
                <Share2 className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white hover:bg-opacity-20"
                onClick={() => onDownload?.(currentPhoto.id)}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {currentPhoto.caption && (
            <p className="mb-4 text-sm">{currentPhoto.caption}</p>
          )}
          
          <div className="flex flex-wrap gap-2 mb-4">
            {currentPhoto.tags.map(tag => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                <Tag className="w-3 h-3 mr-1" />
                {tag.name}
              </Badge>
            ))}
          </div>
          
          <div className="flex flex-wrap gap-4 text-xs text-gray-300">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(currentPhoto.createdAt).toLocaleDateString()}
            </div>
            
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {currentPhoto.creator.name}
            </div>
            
            {currentPhoto.hangout && (
              <div className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                {currentPhoto.hangout.title}
              </div>
            )}
            
            <div className="flex items-center gap-1">
              {currentPhoto.originalWidth} × {currentPhoto.originalHeight}
            </div>
            
            <div className="flex items-center gap-1">
              {formatFileSize(currentPhoto.fileSize)}
            </div>
          </div>
        </div>
      )}

      {/* Toggle Info Button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute bottom-4 right-4 z-10 text-white hover:bg-white hover:bg-opacity-20"
        onClick={() => setShowInfo(prev => !prev)}
      >
        {showInfo ? 'Hide Info' : 'Show Info'}
      </Button>
    </div>
  )
}
























