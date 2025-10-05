'use client'

import { useState } from 'react'
import { Heart, Share2, Link2 } from 'lucide-react'
import { TouchButton } from './touch-button'
import { useVisualFeedback } from '@/hooks/use-visual-feedback'

interface TileActionsProps {
  itemId: string
  itemType: 'event' | 'hangout' | 'content'
  isSaved?: boolean
  onSave?: (itemId: string, itemType: string) => void
  onUnsave?: (itemId: string, itemType: string) => void
  className?: string
}

export function TileActions({ 
  itemId, 
  itemType, 
  isSaved = false, 
  onSave, 
  onUnsave,
  className = '' 
}: TileActionsProps) {
  const [saved, setSaved] = useState(isSaved)
  const { triggerHaptic } = useVisualFeedback()

  const handleSave = async () => {
    triggerHaptic('light')
    setSaved(!saved)
    
    if (saved && onUnsave) {
      onUnsave(itemId, itemType)
    } else if (!saved && onSave) {
      onSave(itemId, itemType)
    }
  }

  const handleShare = async () => {
    triggerHaptic('light')
    
    const url = `${window.location.origin}/${itemType}/${itemId}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out this ${itemType}`,
          url: url
        })
      } catch (err) {
        console.log('Share cancelled or failed:', err)
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url)
      // You could show a toast notification here
    }
  }

  const handleCopyLink = async () => {
    triggerHaptic('light')
    
    const url = `${window.location.origin}/${itemType}/${itemId}`
    
    try {
      await navigator.clipboard.writeText(url)
      // You could show a toast notification here
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Heart/Save Button */}
      <TouchButton
        onClick={handleSave}
        className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
          saved 
            ? 'bg-red-500 text-white' 
            : 'bg-black/20 text-white hover:bg-black/40'
        }`}
        hapticType="light"
      >
        <Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
      </TouchButton>

      {/* Share Button */}
      <TouchButton
        onClick={handleShare}
        className="h-8 w-8 rounded-full bg-black/20 text-white hover:bg-black/40 flex items-center justify-center transition-colors"
        hapticType="light"
      >
        <Share2 className="h-4 w-4" />
      </TouchButton>

      {/* Copy Link Button */}
      <TouchButton
        onClick={handleCopyLink}
        className="h-8 w-8 rounded-full bg-black/20 text-white hover:bg-black/40 flex items-center justify-center transition-colors"
        hapticType="light"
      >
        <Link2 className="h-4 w-4" />
      </TouchButton>
    </div>
  )
}
