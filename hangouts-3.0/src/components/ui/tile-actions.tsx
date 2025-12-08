'use client'

import { useState } from 'react'
import { Heart, Share2, Link2, Lock } from 'lucide-react'
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
      <button
        onClick={handleSave}
        disabled={!canInteract}
        className={`p-1.5 rounded-full transition-colors group ${
          !canInteract 
            ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
            : saved 
              ? 'bg-red-500/80 text-white hover:bg-red-500' 
              : 'hover:bg-gray-700/50 text-gray-400 group-hover:text-red-400'
        }`}
        title={!canInteract ? 'Sign in to save content' : saved ? 'Remove from saved' : 'Save content'}
      >
        <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
      </button>

      {/* Share Button */}
      <button
        onClick={handleShare}
        disabled={!canInteract}
        className={`p-1.5 rounded-full transition-colors group ${
          !canInteract 
            ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
            : 'hover:bg-gray-700/50 text-gray-400 group-hover:text-blue-400'
        }`}
        title={!canInteract ? sharingService.getPrivacyMessage(privacyLevel) : 'Share content'}
      >
        {!canInteract ? (
          <Lock className="w-4 h-4" />
        ) : (
          <Share2 className="w-4 h-4" />
        )}
      </button>

      {/* Copy Link Button */}
      <button
        onClick={handleCopyLink}
        disabled={!canInteract}
        className={`p-1.5 rounded-full transition-colors group ${
          !canInteract 
            ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
            : 'hover:bg-gray-700/50 text-gray-400 group-hover:text-green-400'
        }`}
        title={!canInteract ? sharingService.getPrivacyMessage(privacyLevel) : 'Copy link'}
      >
        {!canInteract ? (
          <Lock className="w-4 h-4" />
        ) : (
          <Link2 className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}
