/**
 * Generate optimized image URLs with dynamic resizing
 */

interface ImageSize {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
}

/**
 * Generate an optimized image URL with dynamic resizing
 * @param baseUrl - The base image URL (e.g., "/uploads/images/abc123.webp")
 * @param options - Resize and optimization options
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(baseUrl: string, options: ImageSize = {}): string {
  const { width, height, quality = 75, format = 'webp' } = options
  
  // If no optimization needed, return original URL
  if (!width && !height && quality === 75 && format === 'webp') {
    return baseUrl
  }
  
  // Build query parameters
  const params = new URLSearchParams()
  
  if (width) params.set('w', width.toString())
  if (height) params.set('h', height.toString())
  if (quality !== 75) params.set('q', quality.toString())
  if (format !== 'webp') params.set('f', format)
  
  // Return resize API URL
  return `/api/image/resize?src=${encodeURIComponent(baseUrl)}&${params.toString()}`
}

/**
 * Predefined image sizes for common use cases
 */
export const ImageSizes = {
  // Thumbnail for feed cards
  thumbnail: { width: 300, quality: 60 },
  
  // Medium for expanded views
  medium: { width: 800, quality: 75 },
  
  // Large for full-screen viewing
  large: { width: 1200, quality: 85 },
  
  // Avatar/profile images
  avatar: { width: 100, height: 100, quality: 80 },
  
  // Small avatar
  avatarSmall: { width: 40, height: 40, quality: 70 }} as const

/**
 * Generate image URLs for different contexts
 */
export function getImageUrls(baseUrl: string) {
  return {
    original: baseUrl,
    thumbnail: getOptimizedImageUrl(baseUrl, ImageSizes.thumbnail),
    medium: getOptimizedImageUrl(baseUrl, ImageSizes.medium),
    large: getOptimizedImageUrl(baseUrl, ImageSizes.large),
    avatar: getOptimizedImageUrl(baseUrl, ImageSizes.avatar),
    avatarSmall: getOptimizedImageUrl(baseUrl, ImageSizes.avatarSmall)}
}

/**
 * Generate responsive image srcset
 */
export function getResponsiveSrcSet(baseUrl: string, sizes: number[] = [300, 600, 900, 1200]): string {
  return sizes
    .map(size => `${getOptimizedImageUrl(baseUrl, { width: size })} ${size}w`)
    .join(', ')
}

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): boolean {
  if (typeof window === 'undefined') return true
  
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
}

/**
 * Get the best format for the current browser
 */
export function getBestFormat(): 'webp' | 'jpeg' {
  return supportsWebP() ? 'webp' : 'jpeg'
}





































