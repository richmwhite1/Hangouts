'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Heart, MessageCircle, Share2, Download, Tag, ThumbsUp } from 'lucide-react'
import { PhotoLightbox } from '@/components/photo-lightbox'
import { PhotoGallery } from '@/components/photo-gallery'

interface SharedPhoto {
  id: string
  originalUrl: string
  thumbnailUrl: string
  caption: string
  isPublic: boolean
  createdAt: string
  creator: {
    id: string
    name: string
    username: string
    avatar: string
  }
  hangout?: {
    id: string
    title: string
  }
  share: {
    id: string
    message: string
    allowDownload: boolean
    allowComments: boolean
    expiresAt: string | null
  }
  stats: {
    totalComments: number
    totalLikes: number
    totalTags: number
  }
  comments: Array<{
    id: string
    content: string
    createdAt: string
    user: {
      id: string
      name: string
      username: string
      avatar: string
    }
  }>
  reactions: Record<string, Array<{
    id: string
    name: string
    username: string
    avatar: string
  }>>
  tags: Array<{
    id: string
    x: number
    y: number
    user: {
      id: string
      name: string
      username: string
      avatar: string
    }
  }>
}

export default function SharedPhotoPage() {
  const params = useParams()
  const token = params.token as string
  
  const [photo, setPhoto] = useState<SharedPhoto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLightbox, setShowLightbox] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  useEffect(() => {
    fetchSharedPhoto()
  }, [token])

  const fetchSharedPhoto = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/shared/photo/${token}`)
      const data = await response.json()

      if (data.success) {
        setPhoto(data.data)
      } else {
        setError(data.error || 'Failed to load photo')
      }
    } catch (err) {
      setError('Failed to load photo')
      console.error('Error fetching shared photo:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleComment = async () => {
    if (!newComment.trim() || !photo) return

    try {
      setSubmittingComment(true)
      const response = await fetch(`/api/photos/${photo.id}/collaborate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'add_comment',
          content: newComment
        })
      })

      const data = await response.json()
      if (data.success) {
        setNewComment('')
        fetchSharedPhoto() // Refresh to get new comment
      }
    } catch (err) {
      console.error('Error adding comment:', err)
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleReaction = async (reaction: string) => {
    if (!photo) return

    try {
      const response = await fetch(`/api/photos/${photo.id}/collaborate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'add_reaction',
          content: reaction
        })
      })

      const data = await response.json()
      if (data.success) {
        fetchSharedPhoto() // Refresh to get new reaction
      }
    } catch (err) {
      console.error('Error adding reaction:', err)
    }
  }

  const handleDownload = () => {
    if (!photo) return
    
    const link = document.createElement('a')
    link.href = photo.originalUrl
    link.download = `photo-${photo.id}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this photo',
          text: photo?.caption || 'Shared photo',
          url: window.location.href
        })
      } catch (err) {
        console.error('Error sharing:', err)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading photo...</p>
        </div>
      </div>
    )
  }

  if (error || !photo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">📷</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Photo Not Found</h1>
            <p className="text-gray-600 mb-6">
              {error || 'This photo may have been removed or the link is invalid.'}
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isExpired = photo.share.expiresAt && new Date(photo.share.expiresAt) < new Date()

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-gray-500 text-6xl mb-4">⏰</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
            <p className="text-gray-600 mb-6">
              This photo link has expired and is no longer available.
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={photo.creator.avatar} />
                <AvatarFallback>{photo.creator.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg font-semibold">{photo.creator.name}</h1>
                <p className="text-sm text-gray-500">@{photo.creator.username}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Photo */}
        <Card className="mb-6 overflow-hidden">
          <div className="relative">
            <img
              src={photo.originalUrl}
              alt={photo.caption || 'Shared photo'}
              className="w-full h-auto cursor-pointer"
              onClick={() => setShowLightbox(true)}
            />
            
            {/* Tags overlay */}
            {photo.tags.map((tag) => (
              <div
                key={tag.id}
                className="absolute bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  left: `${tag.x}%`,
                  top: `${tag.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <Tag className="h-3 w-3 inline mr-1" />
                {tag.user.name}
              </div>
            ))}
          </div>

          {/* Photo info */}
          <CardContent className="p-4">
            {photo.caption && (
              <p className="text-gray-900 mb-4">{photo.caption}</p>
            )}

            {photo.hangout && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">
                  From hangout: {photo.hangout.title}
                </p>
              </div>
            )}

            {photo.share.message && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{photo.share.message}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReaction('like')}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  {photo.stats.totalLikes}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLightbox(true)}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {photo.stats.totalComments}
                </Button>
              </div>

              {photo.share.allowDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>

            {/* Reactions */}
            {Object.keys(photo.reactions).length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(photo.reactions).map(([reaction, users]) => (
                    <div key={reaction} className="flex items-center space-x-1">
                      <span className="text-sm font-medium">{reaction}</span>
                      <span className="text-sm text-gray-500">({users.length})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments */}
        {photo.share.allowComments && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Comments ({photo.stats.totalComments})</h3>
              
              {/* Add comment */}
              <div className="mb-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                  />
                  <Button
                    onClick={handleComment}
                    disabled={!newComment.trim() || submittingComment}
                    size="sm"
                  >
                    {submittingComment ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              </div>

              {/* Comments list */}
              <div className="space-y-4">
                {photo.comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.user.avatar} />
                      <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-sm font-medium">{comment.user.name}</p>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lightbox */}
        {showLightbox && (
          <PhotoLightbox
            photos={[{
              id: photo.id,
              originalUrl: photo.originalUrl,
              thumbnailUrl: photo.thumbnailUrl,
              caption: photo.caption
            }]}
            currentIndex={0}
            onClose={() => setShowLightbox(false)}
          />
        )}
      </div>
    </div>
  )
}






















