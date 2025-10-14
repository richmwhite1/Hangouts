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
import { Camera, X, UserPlus, Users, Plus, Trash2 } from 'lucide-react'

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
  pollOptions: string[]
  image?: File
  selectedFriends: string[]
}

// Mock recent friends data
const recentFriends = [
  { id: '1', name: 'Alice Johnson', username: 'alice', avatar: null },
  { id: '2', name: 'Bob Smith', username: 'bob', avatar: null },
  { id: '3', name: 'Charlie Brown', username: 'charlie', avatar: null },
  { id: '4', name: 'Diana Prince', username: 'diana', avatar: null },
  { id: '5', name: 'Eve Wilson', username: 'eve', avatar: null },
]

export default function ImprovedHangoutForm({ onSubmit, isLoading = false }: HangoutFormProps) {
  const [formData, setFormData] = useState<HangoutFormData>({
    title: '',
    description: '',
    location: '',
    startTime: new Date(),
    isPoll: false,
    pollOptions: ['', ''],
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

  const addPollOption = () => {
    handleInputChange('pollOptions', [...formData.pollOptions, ''])
  }

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...formData.pollOptions]
    newOptions[index] = value
    handleInputChange('pollOptions', newOptions)
  }

  const removePollOption = (index: number) => {
    if (formData.pollOptions.length > 2) {
      const newOptions = formData.pollOptions.filter((_, i) => i !== index)
      handleInputChange('pollOptions', newOptions)
    }
  }

  const getSelectedFriendsData = () => {
    return recentFriends.filter(friend => formData.selectedFriends.includes(friend.id))
  }

  const validPollOptions = formData.pollOptions.filter(option => option.trim() !== '')

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

            {/* Date and Time - Mobile Friendly */}
            <div className="space-y-2">
              <Label>When?</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Date</Label>
                  <input
                    type="date"
                    value={formData.startTime.toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value)
                      newDate.setHours(formData.startTime.getHours(), formData.startTime.getMinutes())
                      handleInputChange('startTime', newDate)
                    }}
                    className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Time</Label>
                  <input
                    type="time"
                    value={formData.startTime.toTimeString().slice(0, 5)}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':').map(Number)
                      const newDate = new Date(formData.startTime)
                      newDate.setHours(hours, minutes)
                      handleInputChange('startTime', newDate)
                    }}
                    className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Poll vs Plan Toggle */}
            <div className="space-y-4">
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

              {/* Poll Options */}
              {formData.isPoll && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <Label>Poll Options</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPollOption}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Option
                    </Button>
                  </div>
                  {formData.pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updatePollOption(index, e.target.value)}
                        className="flex-1"
                      />
                      {formData.pollOptions.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removePollOption(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {validPollOptions.length < 2 && (
                    <p className="text-sm text-destructive">
                      Please add at least 2 poll options
                    </p>
                  )}
                </div>
              )}
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

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || (formData.isPoll && validPollOptions.length < 2)}
            >
              {isLoading ? 'Creating...' : 'Create Hangout'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}



















