'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Photo {
  id: string
  originalUrl: string
  creatorId?: string
  createdAt?: string
}

interface PhotoGalleryProps {
  photos: Photo[]
  onDelete?: (photoId: string) => void
  canDelete?: boolean
}

export function PhotoGallery({ photos, onDelete, canDelete = false }: PhotoGalleryProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen || selectedPhotoIndex === null) return

      switch (e.key) {
        case 'Escape':
          closeFullscreen()
          break
        case 'ArrowLeft':
          goToPrevious()
          break
        case 'ArrowRight':
          goToNext()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, selectedPhotoIndex])

  const openFullscreen = (index: number) => {
    setSelectedPhotoIndex(index)
    setIsFullscreen(true)
    document.body.style.overflow = 'hidden' // Prevent background scrolling
  }

  const closeFullscreen = () => {
    setSelectedPhotoIndex(null)
    setIsFullscreen(false)
    document.body.style.overflow = 'unset'
  }

  const goToPrevious = () => {
    if (selectedPhotoIndex === null) return
    setSelectedPhotoIndex(selectedPhotoIndex > 0 ? selectedPhotoIndex - 1 : photos.length - 1)
  }

  const goToNext = () => {
    if (selectedPhotoIndex === null) return
    setSelectedPhotoIndex(selectedPhotoIndex < photos.length - 1 ? selectedPhotoIndex + 1 : 0)
  }

  const handleSwipe = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const startX = touch.clientX
    const startY = touch.clientY

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const moveTouch = moveEvent.touches[0]
      const deltaX = moveTouch.clientX - startX
      const deltaY = moveTouch.clientY - startY

      // Only handle horizontal swipes
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        moveEvent.preventDefault()
      }
    }

    const handleTouchEnd = (endEvent: TouchEvent) => {
      const endTouch = endEvent.changedTouches[0]
      const deltaX = endTouch.clientX - startX
      const threshold = 50

      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          goToPrevious()
        } else {
          goToNext()
        }
      }

      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
  }

  const handleDownload = (photo: Photo) => {
    const link = document.createElement('a')
    link.href = photo.originalUrl
    link.download = `hangout-photo-${photo.id}.jpg`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-lg font-medium">No photos yet</p>
        <p className="text-sm">Upload the first photo to get started!</p>
      </div>
    )
  }

  return (
    <>
      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative group cursor-pointer"
            onClick={() => openFullscreen(index)}
          >
            <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden">
              <img
                src={photo.originalUrl}
                alt={`Hangout photo ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  console.error('Photo load error:', photo.originalUrl)
                  e.currentTarget.style.display = 'none'
                  const errorDiv = e.currentTarget.nextElementSibling as HTMLElement
                  if (errorDiv) errorDiv.style.display = 'flex'
                }}
              />
              <div 
                className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm"
                style={{ display: 'none' }}
              >
                Failed to load
              </div>
            </div>
            
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(photo)
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
                {canDelete && onDelete && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="bg-red-600/80 hover:bg-red-700/80 text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Delete this photo?')) {
                        onDelete(photo.id)
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && selectedPhotoIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center">
          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
            onClick={closeFullscreen}
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Navigation buttons */}
          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:bg-white/20"
                onClick={goToPrevious}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:bg-white/20"
                onClick={goToNext}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            </>
          )}

          {/* Photo container with swipe support */}
          <div
            className="relative w-full h-full flex items-center justify-center p-8"
            onTouchStart={handleSwipe}
          >
            <img
              src={photos[selectedPhotoIndex].originalUrl}
              alt={`Hangout photo ${selectedPhotoIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                console.error('Fullscreen photo load error:', photos[selectedPhotoIndex].originalUrl)
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>

          {/* Photo counter */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              {selectedPhotoIndex + 1} of {photos.length}
            </div>
          )}

          {/* Action buttons */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              onClick={() => handleDownload(photos[selectedPhotoIndex])}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            {canDelete && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600/80 hover:bg-red-700/80 text-white"
                onClick={() => {
                  if (confirm('Delete this photo?')) {
                    onDelete(photos[selectedPhotoIndex].id)
                    if (photos.length === 1) {
                      closeFullscreen()
                    } else {
                      goToNext()
                    }
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  )
}



















