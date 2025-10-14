'use client'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
export interface ShareData {
  title: string
  description?: string
  image?: string
  url: string
  type: 'hangout' | 'event' | 'content'
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
}
export interface ShareOptions {
  includeImage?: boolean
  includeDescription?: boolean
  customMessage?: string
}
export class SharingService {
  private static instance: SharingService
  private baseUrl: string
  constructor() {
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  }
  static getInstance(): SharingService {
    if (!SharingService.instance) {
      SharingService.instance = new SharingService()
    }
    return SharingService.instance
  }
  /**
   * Generate a shareable URL for content
   */
  generateShareUrl(contentId: string, type: 'hangout' | 'event' | 'content'): string {
    if (type === 'hangout') {
      return `${this.baseUrl}/hangouts/public/${contentId}`
    } else if (type === 'event') {
      return `${this.baseUrl}/events/public/${contentId}`
    }
    return `${this.baseUrl}/${type}/${contentId}`
  }
  /**
   * Generate rich share data with Open Graph meta tags
   */
  generateShareData(data: ShareData): ShareData {
    return {
      ...data,
      url: this.generateShareUrl(data.url.split('/').pop() || '', data.type)
    }
  }
  /**
   * Share content using native Web Share API with fallback
   */
  async shareContent(
    shareData: ShareData,
    options: ShareOptions = {}
  ): Promise<boolean> {
    try {
      const { title, description, image, url, type } = shareData
      const { includeImage = true, includeDescription = true, customMessage } = options
      // Check if native sharing is supported
      if (navigator.share && navigator.canShare) {
        const sharePayload: any = {
          title: customMessage || `Come check out ${title} hangout`,
          text: includeDescription && description
            ? `Come check out ${title} hangout\n\n${description}\n\nJoin us for this ${type}!`
            : `Come check out ${title} hangout! Join us for this ${type}!`,
          url: url
        }
        // Note: We don't include image files in native sharing
        // Rich previews are handled by Open Graph meta tags instead
        if (navigator.canShare(sharePayload)) {
          await navigator.share(sharePayload)
          this.trackShareEvent(shareData, 'native')
          return true
        }
      }
      // Fallback: Copy to clipboard
      await this.copyToClipboard(url, title)
      return true
    } catch (error) {
      logger.error('Share failed:', error);
      // Fallback: Copy to clipboard
      try {
        await this.copyToClipboard(shareData.url, shareData.title)
        return true
      } catch (fallbackError) {
        logger.error('Fallback share also failed:', fallbackError);
        toast.error('Unable to share. Please copy the link manually.')
        return false
      }
    }
  }
  /**
   * Copy content link to clipboard
   */
  async copyLink(contentId: string, type: 'hangout' | 'event' | 'content'): Promise<boolean> {
    try {
      const url = this.generateShareUrl(contentId, type)
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!')
      this.trackShareEvent({ url, type, title: '', privacyLevel: 'PUBLIC' }, 'copy')
      return true
    } catch (error) {
      logger.error('Copy failed:', error);
      toast.error('Failed to copy link')
      return false
    }
  }
  /**
   * Toggle interest/save status for content
   */
  async toggleInterest(
    contentId: string,
    type: 'hangout' | 'event' | 'content',
    isCurrentlySaved: boolean
  ): Promise<boolean> {
    try {
      if (false) {
        toast.error('Please sign in to save content')
        return false
      }
      const response = await fetch(`/api/content/${contentId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({
          action: isCurrentlySaved ? 'unsave' : 'save',
          type: type
        })
      })
      const data = await response.json()
      if (data.success) {
        toast.success(isCurrentlySaved ? 'Removed from saved' : 'Added to saved!')
        this.trackInterestEvent(contentId, type, !isCurrentlySaved)
        return true
      } else {
        toast.error(data.error || 'Failed to save content')
        return false
      }
    } catch (error) {
      logger.error('Interest toggle failed:', error);
      toast.error('Failed to save content')
      return false
    }
  }
  /**
   * Copy to clipboard with fallback
   */
  private async copyToClipboard(url: string, title: string): Promise<void> {
    const text = `Come check out ${title} hangout\n\n${url}`
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    toast.success('Link copied to clipboard!')
  }
  /**
   * Track sharing events for analytics
   */
  private trackShareEvent(shareData: ShareData, method: 'native' | 'copy'): void {
    // TODO: Implement analytics tracking
    // console.log('Share event:', { shareData, method }); // Removed for production
  }
  /**
   * Track interest events for analytics
   */
  private trackInterestEvent(contentId: string, type: string, isSaved: boolean): void {
    // TODO: Implement analytics tracking
    // console.log('Interest event:', { contentId, type, isSaved }); // Removed for production
  }
  /**
   * Generate Open Graph meta tags for a page
   */
  generateOpenGraphTags(shareData: ShareData): Record<string, string> {
    return {
      'og:title': shareData.title,
      'og:description': shareData.description || '',
      'og:image': shareData.image || '',
      'og:url': shareData.url,
      'og:type': 'website',
      'og:site_name': 'Hangouts 3.0',
      'twitter:card': 'summary_large_image',
      'twitter:title': shareData.title,
      'twitter:description': shareData.description || '',
      'twitter:image': shareData.image || '',
      'twitter:url': shareData.url
    }
  }
  /**
   * Check if content can be shared publicly
   */
  canSharePublicly(privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'): boolean {
    return privacyLevel === 'PUBLIC'
  }
  /**
   * Get appropriate message for privacy-restricted content
   */
  getPrivacyMessage(privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'): string {
    switch (privacyLevel) {
      case 'FRIENDS_ONLY':
        return 'This is a friends-only hangout. Sign in and make sure you are friends with the host to join this event.'
      case 'PRIVATE':
        return 'This is a private hangout. You need to be invited to view this event.'
      default:
        return ''
    }
  }
}
export const sharingService = SharingService.getInstance()