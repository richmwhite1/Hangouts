'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { UserPlus, Search, X, Users } from 'lucide-react'
import { toast } from 'sonner'

interface Friend {
  id: string
  name: string
  username: string
  avatar?: string
  bio?: string
  location?: string
}

interface InviteModalProps {
  hangoutId: string
  onInvite: (friendIds: string[]) => Promise<void>
  children: React.ReactNode
}

export function InviteModal({ hangoutId, onInvite, children }: InviteModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInviting, setIsInviting] = useState(false)

  // Fetch friends when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchFriends()
    }
  }, [isOpen])

  const fetchFriends = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/friends')
      if (response.ok) {
        const data = await response.json()
        const friendsList = data.friends?.map((friendship: any) => ({
          id: friendship.friend.id,
          name: friendship.friend.name,
          username: friendship.friend.username,
          avatar: friendship.friend.avatar,
          bio: friendship.friend.bio,
          location: friendship.friend.location
        })) || []
        setFriends(friendsList)
      } else {
        console.error('Failed to fetch friends')
        toast.error('Failed to load friends')
      }
    } catch (error) {
      console.error('Error fetching friends:', error)
      toast.error('Failed to load friends')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    )
  }

  const handleInvite = async () => {
    if (selectedFriends.length === 0) {
      toast.error('Please select friends to invite')
      return
    }

    try {
      setIsInviting(true)
      await onInvite(selectedFriends)
      toast.success(`Invited ${selectedFriends.length} friend(s)`)
      setIsOpen(false)
      setSelectedFriends([])
      setSearchQuery('')
    } catch (error) {
      console.error('Error inviting friends:', error)
      toast.error('Failed to invite friends')
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Friends
          </DialogTitle>
          <DialogDescription>
            Select friends to invite to this hangout. They'll receive a notification and can join the conversation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search friends by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Selected Friends */}
          {selectedFriends.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selected ({selectedFriends.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedFriends.map(friendId => {
                  const friend = friends.find(f => f.id === friendId)
                  if (!friend) return null
                  
                  return (
                    <Badge key={friendId} variant="secondary" className="flex items-center gap-1">
                      <img
                        src={friend.avatar || '/placeholder-avatar.png'}
                        alt={friend.name}
                        className="w-4 h-4 rounded-full"
                      />
                      {friend.name}
                      <button
                        onClick={() => toggleFriend(friendId)}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
          
          {/* Friends List */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-500">Loading friends...</p>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">
                  {searchQuery ? 'No friends found matching your search' : 'No friends found'}
                </p>
              </div>
            ) : (
              filteredFriends.map(friend => (
                <Card 
                  key={friend.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedFriends.includes(friend.id) 
                      ? 'bg-primary/10 border-primary' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleFriend(friend.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={friend.avatar} />
                        <AvatarFallback>
                          {friend.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{friend.name}</h3>
                        <p className="text-sm text-gray-500 truncate">@{friend.username}</p>
                        {friend.bio && (
                          <p className="text-xs text-gray-400 truncate mt-1">{friend.bio}</p>
                        )}
                      </div>
                      {selectedFriends.includes(friend.id) && (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <X className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={selectedFriends.length === 0 || isInviting}
            >
              {isInviting ? 'Inviting...' : `Invite ${selectedFriends.length} Friend${selectedFriends.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
