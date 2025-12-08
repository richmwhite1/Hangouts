'use client'

import { useState } from 'react'
import { Heart, Share2, Link2, Lock } from 'lucide-react'
import { TouchButton } from './touch-button'
import { useVisualFeedback } from '@/hooks/use-visual-feedback'
import { useAuth } from '@clerk/nextjs'
import { sharingService, ShareData } from '@/lib/services/sharing-service'
import { toast } from 'sonner'

import { logger } from '@/lib/logger'
interface TileActionsProps {
  itemId: string
  itemType: 'event' | 'hangout' | 'content'
  itemTitle?: string
  itemDescription?: string
  itemImage?: string
  privacyLevel?: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
  isSaved?: boolean
  onSave?: (itemId: string, itemType: string) => void
  onUnsave?: (itemId: string, itemType: string) => void
  className?: string
}

export function TileActions({ 
  itemId, 
  itemType, 
  itemTitle = '',
  itemDescription = '',
  itemImage = '',
  privacyLevel = 'PUBLIC',
  isSaved = false, 
  onSave, 
  onUnsave,
  className = '' 
}: TileActionsProps) {
  const [saved, setSaved] = useState(isSaved)
  const { showFeedback } = useVisualFeedback()
  const { isSignedIn } = useAuth()

  const handleSave = async () => {
    showFeedback('success', 'Saving...')
    
    if (!isSignedIn) {
      toast.error('Please sign in to save content', {
        action: {
          label: 'Sign In',
          onClick: () => window.location.href = '/signin'
        }
      })
      return
    }

    try {
      const success = await sharingService.toggleInterest(itemId, itemType, saved)
      if (success) {
        setSaved(!saved)
        if (saved && onUnsave) {
          onUnsave(itemId, itemType)
        } else if (!saved && onSave) {
          onSave(itemId, itemType)
        }
      }
    } catch (error) {
      logger.error('Error saving content:', error);
    }
  }

  const handleShare = async () => {
    showFeedback('success', 'Sharing...')
    
    if (!sharingService.canSharePublicly(privacyLevel)) {
      if (!isSignedIn) {
        toast.error('Please sign in to share this content', {
          action: {
            label: 'Sign In',
            onClick: () => window.location.href = '/signin'
          }
        })
      } else {
        toast.error(sharingService.getPrivacyMessage(privacyLevel))
      }
      return
    }

    const shareData: ShareData = {
      title: itemTitle || `Check out this ${itemType}!`,
      description: itemDescription,
      image: itemImage,
      url: sharingService.generateShareUrl(itemId, itemType),
      type: itemType,
      privacyLevel
    }

    try {
      await sharingService.shareContent(shareData, {
        includeImage: true,
        includeDescription: true,
        customMessage: `Come check out ${itemTitle} hangout!`
      })
    } catch (error) {
      logger.error('Share failed:', error);
    }
  }

  const handleCopyLink = async () => {
    showFeedback('success', 'Copying...')
    
    if (!sharingService.canSharePublicly(privacyLevel)) {
      toast.error(sharingService.getPrivacyMessage(privacyLevel))
      return
    }

    try {
      await sharingService.copyLink(itemId, itemType)
    } catch (error) {
      logger.error('Copy link failed:', error);
    }
  }

  const canInteract = isSignedIn || privacyLevel === 'PUBLIC'

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Heart/Save Button */}
      <TouchButton
        onClick={handleSave}
        disabled={!canInteract}
        className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
          !canInteract 
            ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
            : saved 
              ? 'bg-red-500 text-white' 
              : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/70'
        }`}
        hapticType="light"
        title={!canInteract ? 'Sign in to save content' : saved ? 'Remove from saved' : 'Save content'}
      >
        <Heart className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
      </TouchButton>

      {/* Share Button */}
      <TouchButton
        onClick={handleShare}
        disabled={!canInteract}
        className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
          !canInteract 
            ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
            : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/70'
        }`}
        hapticType="light"
        title={!canInteract ? sharingService.getPrivacyMessage(privacyLevel) : 'Share content'}
      >
        {!canInteract ? (
          <Lock className="h-5 w-5" />
        ) : (
          <Share2 className="h-5 w-5" />
        )}
      </TouchButton>

      {/* Copy Link Button */}
      <TouchButton
        onClick={handleCopyLink}
        disabled={!canInteract}
        className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
          !canInteract 
            ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
            : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/70'
        }`}
        hapticType="light"
        title={!canInteract ? sharingService.getPrivacyMessage(privacyLevel) : 'Copy link'}
      >
        {!canInteract ? (
          <Lock className="h-5 w-5" />
        ) : (
          <Link2 className="h-5 w-5" />
        )}
      </TouchButton>
    </div>
  )
}
