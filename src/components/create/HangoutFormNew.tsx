'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { Camera, X, UserPlus, Users } from 'lucide-react'

interface HangoutFormProps {
  onSubmit: (data: HangoutFormData) => void
  isLoading?: boolean
}

export interface HangoutFormData {
  title: string
  description: string
  location: string
  startTime: Date
  isPoll: boolean
  image?: File
  selectedFriends: string[]
}

// Mock recent friends data - in real app this would come from API
const recentFriends = [
  { id: '1', name: 'Alice Johnson', username: 'alice', avatar: null },
  { id: '2', name: 'Bob Smith', username: 'bob', avatar: null },
  { id: '3', name: 'Charlie Brown', username: 'charlie', avatar: null },
  { id: '4', name: 'Diana Prince', username: 'diana', avatar: null },
  { id: '5', name: 'Eve Wilson', username: 'eve', avatar: null },
]

export default function HangoutFormNew({ onSubmit, isLoading = false }: HangoutFormProps) {
  const [formData, setFormData] = useState<HangoutFormData>({
    title: '',
    description: '',
    location: '',
    startTime: new Date(),
    isPoll: false,
    image: undefined,
    selectedFriends: []
  })

  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleInputChange = (field: keyof HangoutFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleInputChange('image', file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    handleInputChange('image', undefined)
    setImagePreview(null)
  }

  const addFriend = (friend: { id: string; name: string; username: string }) => {
    if (!formData.selectedFriends.includes(friend.id)) {
      handleInputChange('selectedFriends', [...formData.selectedFriends, friend.id])
    }
  }

  const removeFriend = (friendId: string) => {
    const newFriends = formData.selectedFriends.filter(id => id !== friendId)
    handleInputChange('selectedFriends', newFriends)
  }

  const getSelectedFriendsData = () => {
    return recentFriends.filter(friend => formData.selectedFriends.includes(friend.id))
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header with Photo Upload */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-foreground">Create New Hangout</h1>
          <div className="flex items-center gap-4">
            {/* Photo Upload */}
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <Camera className="w-4 h-4" />
                Upload Photo
              </label>
            </div>
          </div>
        </div>

        {/* Photo Preview */}
        {imagePreview && (
          <div className="mb-6">
            <div className="relative w-full h-64 rounded-lg overflow-hidden">
              <img
                src={imagePreview}
                alt="Hangout preview"
                className="w-full h-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={removeImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Hangout Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">What are you planning?</Label>
              <Input
                id="title"
                placeholder="Coffee, lunch, movie night..."
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Tell your friends more about this hangout..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Where?</Label>
              <Input
                id="location"
                placeholder="Enter location..."
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </div>

            {/* Date and Time */}
            <div className="space-y-2">
              <Label>When?</Label>
              <DateTimePicker
                value={formData.startTime}
                onChange={(date) => handleInputChange('startTime', date)}
                placeholder="Select date and time"
              />
            </div>

            {/* Recent Friends */}
            <div className="space-y-2">
              <Label>Recent Friends</Label>
              <div className="flex flex-wrap gap-2">
                {recentFriends.map((friend) => (
                  <Button
                    key={friend.id}
                    type="button"
                    variant={formData.selectedFriends.includes(friend.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => addFriend(friend)}
                    className="flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    {friend.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Selected Friends */}
            {formData.selectedFriends.length > 0 && (
              <div className="space-y-2">
                <Label>Invited Friends</Label>
                <div className="flex flex-wrap gap-2">
                  {getSelectedFriendsData().map((friend) => (
                    <Badge key={friend.id} variant="secondary" className="flex items-center gap-1">
                      {friend.name}
                      <button
                        type="button"
                        onClick={() => removeFriend(friend.id)}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Poll Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Make it a Poll</Label>
                <p className="text-sm text-muted-foreground">
                  Let friends vote on options instead of direct RSVP
                </p>
              </div>
              <Switch
                checked={formData.isPoll}
                onCheckedChange={(checked) => handleInputChange('isPoll', checked)}
              />
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Hangout'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}











