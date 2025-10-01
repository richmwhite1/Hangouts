'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, Clock, MapPin, Users, Plus, Camera, X, UserPlus } from 'lucide-react'
import { format } from 'date-fns'

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

export default function HangoutForm({ onSubmit, isLoading = false }: HangoutFormProps) {
  const [formData, setFormData] = useState<HangoutFormData>({
    title: '',
    description: '',
    location: '',
    startTime: new Date(),
    isPoll: false,
    image: undefined,
    selectedFriends: []
  })

  const [showCalendar, setShowCalendar] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleInputChange = (field: keyof HangoutFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Create New Hangout
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
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="location"
                placeholder="Enter location..."
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date & Time</Label>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.startTime, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.startTime}
                    onSelect={(date) => {
                      if (date) {
                        handleInputChange('startTime', date)
                        setShowCalendar(false)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date & Time</Label>
              <Popover open={showTimePicker} onOpenChange={setShowTimePicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <Clock className="mr-2 h-4 w-4" />
                    {format(formData.endTime, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.endTime}
                    onSelect={(date) => {
                      if (date) {
                        handleInputChange('endTime', date)
                        setShowTimePicker(false)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Max Participants */}
          <div className="space-y-2">
            <Label htmlFor="maxParticipants">Max Participants (optional)</Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="maxParticipants"
                type="number"
                placeholder="No limit"
                value={formData.maxParticipants || ''}
                onChange={(e) => handleInputChange('maxParticipants', e.target.value ? parseInt(e.target.value) : undefined)}
                className="pl-10"
                min="1"
              />
            </div>
          </div>

          {/* Weather Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Weather Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get weather updates for this hangout
              </p>
            </div>
            <Switch
              checked={formData.weatherEnabled}
              onCheckedChange={(checked) => handleInputChange('weatherEnabled', checked)}
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photo (optional)</Label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleInputChange('image', file)
                  }
                }}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <Camera className="w-4 h-4" />
                {formData.image ? formData.image.name : 'Upload photo'}
              </label>
              {formData.image && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleInputChange('image', undefined)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Friend Selection */}
          <div className="space-y-2">
            <Label>Invite Friends (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search friends..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const value = e.currentTarget.value.trim()
                    if (value && !formData.selectedFriends.includes(value)) {
                      handleInputChange('selectedFriends', [...formData.selectedFriends, value])
                      e.currentTarget.value = ''
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Search friends..."]') as HTMLInputElement
                  const value = input.value.trim()
                  if (value && !formData.selectedFriends.includes(value)) {
                    handleInputChange('selectedFriends', [...formData.selectedFriends, value])
                    input.value = ''
                  }
                }}
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
            {formData.selectedFriends.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.selectedFriends.map((friend, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {friend}
                    <button
                      type="button"
                      onClick={() => {
                        const newFriends = formData.selectedFriends.filter((_, i) => i !== index)
                        handleInputChange('selectedFriends', newFriends)
                      }}
                      className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

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
  )
}
