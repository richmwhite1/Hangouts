"use client"

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  placeholder?: string
  blurDataURL?: string
  priority?: boolean
  quality?: number
  sizes?: string
  onLoad?: () => void
  onError?: () => void
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  placeholder = '/placeholder-image.jpg',
  blurDataURL,
  priority = false,
  quality = 75,
  sizes = '100vw',
  onLoad,
  onError
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return

    const imgElement = imgRef.current
    if (!imgElement) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observerRef.current?.disconnect()
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    )

    observerRef.current.observe(imgElement)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [priority, isInView])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setIsError(true)
    onError?.()
  }

  // Generate optimized image URL
  const getOptimizedSrc = (originalSrc: string) => {
    // If it's already an optimized URL or external URL, return as is
    if (originalSrc.startsWith('http') && !originalSrc.includes('localhost')) {
      return originalSrc
    }

    // For local images, you could add image optimization here
    // For now, return the original src
    return originalSrc
  }

  const optimizedSrc = getOptimizedSrc(src)
  const displaySrc = isError ? placeholder : optimizedSrc

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden bg-gray-200 dark:bg-gray-700',
        className
      )}
      style={{ width, height }}
    >
      {/* Blur placeholder */}
      {blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      {isInView && (
        <img
          src={displaySrc}
          alt={alt}
          width={width}
          height={height}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg
              className="w-8 h-8 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs">Failed to load</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Image gallery component with lazy loading
interface ImageGalleryProps {
  images: string[]
  className?: string
  itemClassName?: string
  onImageClick?: (index: number) => void
}

export function ImageGallery({
  images,
  className,
  itemClassName,
  onImageClick
}: ImageGalleryProps) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 gap-2', className)}>
      {images.map((src, index) => (
        <div
          key={index}
          className={cn(
            'aspect-square cursor-pointer overflow-hidden rounded-lg',
            itemClassName
          )}
          onClick={() => onImageClick?.(index)}
        >
          <OptimizedImage
            src={src}
            alt={`Gallery image ${index + 1}`}
            className="w-full h-full hover:scale-105 transition-transform duration-200"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        </div>
      ))}
    </div>
  )
}

