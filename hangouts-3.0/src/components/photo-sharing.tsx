'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Share2, Users, Globe, Link, Copy, Check, X, Clock, Download, MessageCircle } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useFriends } from '@/hooks/use-friends'

import { logger } from '@/lib/logger'
interface PhotoSharingProps {
  photoId: string
  onClose: () => void
}

interface ShareOption {
  id: string
  type: 'user' | 'group' | 'public'
  name: string
  avatar?: string
  memberCount?: number
}

export function PhotoSharing({ photoId, onClose }: PhotoSharingProps) {
  const { user } = useAuth()
  const { friends, groups } = useFriends()
  const [shareType, setShareType] = useState<'users' | 'groups' | 'public'>('users')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [allowDownload, setAllowDownload] = useState(true)
  const [allowComments, setAllowComments] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [shareResult, setShareResult] = useState<any>(null)

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  const handleShare = async () => {
    if (shareType === 'users' && selectedUsers.length === 0) {
      logger.warn('Please select at least one user to share with');
      return
    }

    if (shareType === 'groups' && selectedGroups.length === 0) {
      logger.warn('Please select at least one group to share with');
      return
    }

    try {
      setSharing(true)
      
      let action = ''
      let data: any = {
        message: message || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        allowDownload,
        allowComments
      }

      if (shareType === 'users') {
        action = 'share_with_users'
        data.userIds = selectedUsers
      } else if (shareType === 'groups') {
        action = 'share_with_groups'
        data.groupIds = selectedGroups
      } else {
        action = 'create_public_link'
      }

      const response = await fetch(`/api/photos/${photoId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action,
          ...data
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setShareResult(result.data)
      } else {
        logger.error('Failed to share photo:', result.error);
      }
    } catch (error) {
      logger.error('Error sharing photo:', error);
    } finally {
      setSharing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (shareResult) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Share Successful!</span>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shareResult.publicUrl && (
              <div>
                <Label className="text-sm font-medium">Public Link</Label>
                <div className="flex space-x-2 mt-1">
                  <Input
                    value={shareResult.publicUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(shareResult.publicUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {shareResult.shareToken && (
              <div>
                <Label className="text-sm font-medium">Share Token</Label>
                <div className="flex space-x-2 mt-1">
                  <Input
                    value={shareResult.shareToken}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(shareResult.shareToken)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600">
              {shareResult.shares && `${shareResult.shares.length} share${shareResult.shares.length !== 1 ? 's' : ''} created`}
            </div>

            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Share Photo</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Share Type Selection */}
          <div>
            <Label className="text-sm font-medium">Share with</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button
                variant={shareType === 'users' ? 'default' : 'outline'}
                onClick={() => setShareType('users')}
                className="flex items-center space-x-2"
              >
                <Users className="h-4 w-4" />
                <span>Users</span>
              </Button>
              <Button
                variant={shareType === 'groups' ? 'default' : 'outline'}
                onClick={() => setShareType('groups')}
                className="flex items-center space-x-2"
              >
                <Users className="h-4 w-4" />
                <span>Groups</span>
              </Button>
              <Button
                variant={shareType === 'public' ? 'default' : 'outline'}
                onClick={() => setShareType('public')}
                className="flex items-center space-x-2"
              >
                <Globe className="h-4 w-4" />
                <span>Public</span>
              </Button>
            </div>
          </div>

          {/* User Selection */}
          {shareType === 'users' && (
            <div>
              <Label className="text-sm font-medium">Select Users</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 mt-2 space-y-2">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => handleUserToggle(friend.id)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={friend.avatar} />
                      <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{friend.name}</p>
                      <p className="text-xs text-gray-500">@{friend.username}</p>
                    </div>
                    {selectedUsers.includes(friend.id) && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                ))}
              </div>
              {selectedUsers.length > 0 && (
                <div className="mt-2">
                  <Badge variant="secondary">
                    {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Group Selection */}
          {shareType === 'groups' && (
            <div>
              <Label className="text-sm font-medium">Select Groups</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 mt-2 space-y-2">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => handleGroupToggle(group.id)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={group.avatar} />
                      <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{group.name}</p>
                      <p className="text-xs text-gray-500">{group.memberCount} members</p>
                    </div>
                    {selectedGroups.includes(group.id) && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                ))}
              </div>
              {selectedGroups.length > 0 && (
                <div className="mt-2">
                  <Badge variant="secondary">
                    {selectedGroups.length} group{selectedGroups.length !== 1 ? 's' : ''} selected
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Message */}
          <div>
            <Label htmlFor="message" className="text-sm font-medium">
              Message (optional)
            </Label>
            <Textarea
              id="message"
              placeholder="Add a message with your photo..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Expiration */}
          <div>
            <Label htmlFor="expiresAt" className="text-sm font-medium">
              Expires (optional)
            </Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Permissions */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Permissions</Label>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span className="text-sm">Allow download</span>
              </div>
              <Switch
                checked={allowDownload}
                onCheckedChange={setAllowDownload}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">Allow comments</span>
              </div>
              <Switch
                checked={allowComments}
                onCheckedChange={setAllowComments}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleShare}
              disabled={sharing || (shareType === 'users' && selectedUsers.length === 0) || (shareType === 'groups' && selectedGroups.length === 0)}
              className="flex-1"
            >
              {sharing ? 'Sharing...' : 'Share Photo'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
