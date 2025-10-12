'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeOff, 
  Trash2, 
  RotateCcw,
  Filter,
  Search,
  Calendar,
  User,
  Flag,
  Shield
} from 'lucide-react'
import { useAuth } from '@clerk/nextjs'

import { logger } from '@/lib/logger'
interface PhotoModeration {
  id: string
  photoId: string
  moderatorId: string
  action: 'FLAGGED' | 'APPROVED' | 'REJECTED' | 'HIDDEN' | 'DELETED' | 'RESTORED'
  reason: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  notes: string | null
  createdAt: string
  moderator: {
    id: string
    name: string
    username: string
    avatar: string
  }
}

interface Photo {
  id: string
  caption: string
  originalUrl: string
  thumbnailUrl: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'HIDDEN' | 'DELETED'
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
  _count: {
    moderations: number
  }
}

export default function PhotoModerationPage() {
  const { user } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [moderationHistory, setModerationHistory] = useState<PhotoModeration[]>([])
  const [showModerationForm, setShowModerationForm] = useState(false)
  const [moderationAction, setModerationAction] = useState<'approve' | 'reject' | 'hide' | 'delete' | 'restore'>('approve')
  const [moderationReason, setModerationReason] = useState('')
  const [moderationSeverity, setModerationSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('LOW')
  const [moderationNotes, setModerationNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchPhotos()
  }, [filterStatus, searchQuery])

  const fetchPhotos = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/moderation/photos?${params}`)
      const data = await response.json()

      if (data.success) {
        setPhotos(data.data)
      }
    } catch (error) {
      logger.error('Error fetching photos:', error);
    } finally {
      setLoading(false)
    }
  }

  const fetchModerationHistory = async (photoId: string) => {
    try {
      const response = await fetch(`/api/photos/${photoId}/moderate`)
      const data = await response.json()

      if (data.success) {
        setModerationHistory(data.data.moderations)
      }
    } catch (error) {
      logger.error('Error fetching moderation history:', error);
    }
  }

  const handleModeratePhoto = async () => {
    if (!selectedPhoto) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/photos/${selectedPhoto.id}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: moderationAction,
          reason: moderationReason,
          severity: moderationSeverity,
          notes: moderationNotes
        })
      })

      const data = await response.json()
      if (data.success) {
        setShowModerationForm(false)
        setSelectedPhoto(null)
        setModerationReason('')
        setModerationNotes('')
        fetchPhotos()
      } else {
        alert(data.error || 'Failed to moderate photo')
      }
    } catch (error) {
      logger.error('Error moderating photo:', error);
      alert('Failed to moderate photo')
    } finally {
      setSubmitting(false)
    }
  }

  const openModerationForm = (photo: Photo, action: typeof moderationAction) => {
    setSelectedPhoto(photo)
    setModerationAction(action)
    setModerationReason('')
    setModerationNotes('')
    setShowModerationForm(true)
    fetchModerationHistory(photo.id)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      case 'FLAGGED': return 'bg-orange-100 text-orange-800'
      case 'HIDDEN': return 'bg-gray-100 text-gray-800'
      case 'DELETED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-green-100 text-green-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading photos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Photo Moderation</h1>
          <p className="text-gray-600">Review and moderate photos for content policy compliance</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search photos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Photos</SelectItem>
                  <SelectItem value="PENDING">Pending Review</SelectItem>
                  <SelectItem value="FLAGGED">Flagged</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="HIDDEN">Hidden</SelectItem>
                  <SelectItem value="DELETED">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Photos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map(photo => (
            <Card key={photo.id} className="overflow-hidden">
              <div className="relative">
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.caption}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge className={getStatusColor(photo.status)}>
                    {photo.status}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={photo.creator.avatar} />
                    <AvatarFallback>{photo.creator.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{photo.creator.name}</span>
                  <span className="text-xs text-gray-500">@{photo.creator.username}</span>
                </div>
                
                {photo.caption && (
                  <p className="text-sm text-gray-700 mb-2 line-clamp-2">{photo.caption}</p>
                )}
                
                {photo.hangout && (
                  <Badge variant="outline" className="mb-2">
                    {photo.hangout.title}
                  </Badge>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>{new Date(photo.createdAt).toLocaleDateString()}</span>
                  <span>{photo._count.moderations} moderation{photo._count.moderations !== 1 ? 's' : ''}</span>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openModerationForm(photo, 'approve')}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openModerationForm(photo, 'reject')}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openModerationForm(photo, 'hide')}
                  >
                    <EyeOff className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openModerationForm(photo, 'delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {photos.length === 0 && (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos to moderate</h3>
            <p className="text-gray-500">
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'All photos have been reviewed'
              }
            </p>
          </div>
        )}

        {/* Moderation Form Modal */}
        {showModerationForm && selectedPhoto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Moderate Photo</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowModerationForm(false)}>
                    ×
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Photo Preview */}
                <div className="flex gap-4">
                  <img
                    src={selectedPhoto.thumbnailUrl}
                    alt={selectedPhoto.caption}
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium mb-2">{selectedPhoto.caption || 'No caption'}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedPhoto.creator.avatar} />
                        <AvatarFallback>{selectedPhoto.creator.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{selectedPhoto.creator.name}</span>
                    </div>
                    <Badge className={getStatusColor(selectedPhoto.status)}>
                      {selectedPhoto.status}
                    </Badge>
                  </div>
                </div>

                {/* Action Selection */}
                <div>
                  <Label className="text-sm font-medium">Action</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      variant={moderationAction === 'approve' ? 'default' : 'outline'}
                      onClick={() => setModerationAction('approve')}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant={moderationAction === 'reject' ? 'default' : 'outline'}
                      onClick={() => setModerationAction('reject')}
                      className="flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      variant={moderationAction === 'hide' ? 'default' : 'outline'}
                      onClick={() => setModerationAction('hide')}
                      className="flex items-center gap-2"
                    >
                      <EyeOff className="h-4 w-4" />
                      Hide
                    </Button>
                    <Button
                      variant={moderationAction === 'delete' ? 'default' : 'outline'}
                      onClick={() => setModerationAction('delete')}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <Label htmlFor="reason" className="text-sm font-medium">
                    Reason {moderationAction !== 'approve' && '*'}
                  </Label>
                  <Input
                    id="reason"
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    placeholder="Enter reason for moderation action..."
                    className="mt-1"
                  />
                </div>

                {/* Severity */}
                {moderationAction !== 'approve' && (
                  <div>
                    <Label htmlFor="severity" className="text-sm font-medium">Severity</Label>
                    <Select value={moderationSeverity} onValueChange={(value: any) => setModerationSeverity(value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label htmlFor="notes" className="text-sm font-medium">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={moderationNotes}
                    onChange={(e) => setModerationNotes(e.target.value)}
                    placeholder="Additional notes for moderation action..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {/* Moderation History */}
                {moderationHistory.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Moderation History</Label>
                    <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                      {moderationHistory.map((mod) => (
                        <div key={mod.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <Badge className={getSeverityColor(mod.severity)}>
                            {mod.action}
                          </Badge>
                          <span className="text-sm">{mod.reason}</span>
                          <span className="text-xs text-gray-500">
                            by {mod.moderator.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(mod.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowModerationForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleModeratePhoto}
                    disabled={submitting || (moderationAction !== 'approve' && !moderationReason.trim())}
                    className="flex-1"
                  >
                    {submitting ? 'Processing...' : 'Submit Moderation'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}



