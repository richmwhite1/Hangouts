'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Calendar, 
  MapPin, 
  Clock, 
  DollarSign, 
  Camera, 
  X, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Upload,
  Image as ImageIcon
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface EventFormData {
  // Step 1: Basic Information
  title: string
  description: string
  category: string
  coverImage: File | null
  coverImagePreview: string | null

  // Step 2: Location & Venue
  venue: string
  address: string
  city: string
  state: string
  zipCode: string
  latitude: number | null
  longitude: number | null

  // Step 3: Date & Time
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  timezone: string

  // Step 4: Pricing & Details
  priceMin: number
  priceMax: number | null
  currency: string
  ticketUrl: string
  attendeeCount: number
  additionalImages: File[]
  additionalImagePreviews: string[]

  // Step 5: Tags & Visibility
  tags: string[]
  isPublic: boolean
}

const categories = [
  'MUSIC', 'SPORTS', 'FOOD', 'NIGHTLIFE', 'ARTS', 'OUTDOORS',
  'TECHNOLOGY', 'BUSINESS', 'EDUCATION', 'HEALTH', 'FAMILY', 'OTHER'
]

const commonTags = [
  'concert', 'festival', 'conference', 'workshop', 'networking',
  'free', 'family-friendly', 'outdoor', 'indoor', 'live music',
  'dance', 'art', 'food', 'drinks', 'sports', 'fitness'
]

export function CreateEventModal() {
  const { user, token } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [newTag, setNewTag] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const additionalImagesRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    category: 'OTHER',
    coverImage: null,
    coverImagePreview: null,
    venue: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    latitude: null,
    longitude: null,
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    priceMin: 0,
    priceMax: null,
    currency: 'USD',
    ticketUrl: '',
    attendeeCount: 0,
    additionalImages: [],
    additionalImagePreviews: [],
    tags: [],
    isPublic: true
  })

  const totalSteps = 5

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCoverImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          coverImage: file,
          coverImagePreview: e.target?.result as string
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAdditionalImagesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      const newImages = [...formData.additionalImages, ...files]
      const newPreviews = [...formData.additionalImagePreviews]
      
      files.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          newPreviews.push(e.target?.result as string)
          setFormData(prev => ({
            ...prev,
            additionalImages: newImages,
            additionalImagePreviews: newPreviews
          }))
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeAdditionalImage = (index: number) => {
    const newImages = formData.additionalImages.filter((_, i) => i !== index)
    const newPreviews = formData.additionalImagePreviews.filter((_, i) => i !== index)
    setFormData(prev => ({
      ...prev,
      additionalImages: newImages,
      additionalImagePreviews: newPreviews
    }))
  }

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }))
    }
    setNewTag('')
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (!token) {
      alert('Please sign in to create an event')
      return
    }

    setIsLoading(true)
    try {
      // Upload cover image
      let coverImageUrl = formData.coverImagePreview || '/placeholder.jpg'
      if (formData.coverImage) {
        const coverFormData = new FormData()
        coverFormData.append('image', formData.coverImage)
        coverFormData.append('type', 'event-cover')
        
        const coverResponse = await fetch('/api/upload/image', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: coverFormData
        })
        
        if (coverResponse.ok) {
          const coverResult = await coverResponse.json()
          coverImageUrl = coverResult.url
        }
      }

      // Upload additional images
      const additionalImageUrls: string[] = []
      for (const image of formData.additionalImages) {
        const imageFormData = new FormData()
        imageFormData.append('image', image)
        imageFormData.append('type', 'event-gallery')
        
        const imageResponse = await fetch('/api/upload/image', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: imageFormData
        })
        
        if (imageResponse.ok) {
          const imageResult = await imageResponse.json()
          additionalImageUrls.push(imageResult.url)
        }
      }

      // Create event
      const eventData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        venue: formData.venue,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        latitude: formData.latitude,
        longitude: formData.longitude,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        startTime: formData.startTime,
        endTime: formData.endTime,
        timezone: formData.timezone,
        priceMin: formData.priceMin,
        priceMax: formData.priceMax,
        currency: formData.currency,
        ticketUrl: formData.ticketUrl,
        coverImage: coverImageUrl,
        isPublic: formData.isPublic,
        attendeeCount: formData.attendeeCount,
        tags: formData.tags,
        additionalImages: additionalImageUrls
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Event created:', result.event)
        setIsOpen(false)
        setCurrentStep(1)
        setFormData({
          title: '',
          description: '',
          category: 'OTHER',
          coverImage: null,
          coverImagePreview: null,
          venue: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          latitude: null,
          longitude: null,
          startDate: '',
          endDate: '',
          startTime: '',
          endTime: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          priceMin: 0,
          priceMax: null,
          currency: 'USD',
          ticketUrl: '',
          attendeeCount: 0,
          additionalImages: [],
          additionalImagePreviews: [],
          tags: [],
          isPublic: true
        })
        // TODO: Refresh events list or redirect
        window.location.reload()
      } else {
        const error = await response.json()
        console.error('❌ Event creation failed:', error)
        alert('Failed to create event: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('❌ Event creation error:', error)
      alert('Failed to create event')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="title" className="text-white">Event Title *</Label>
        <Input
          id="title"
          placeholder="Arctic Monkeys Concert"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>

      <div>
        <Label htmlFor="category" className="text-white">Category *</Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {categories.map(category => (
            <Button
              key={category}
              type="button"
              variant={formData.category === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleInputChange('category', category)}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-white">Cover Image *</Label>
        <div className="mt-2">
          {formData.coverImagePreview ? (
            <div className="relative">
              <img
                src={formData.coverImagePreview}
                alt="Cover preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => handleInputChange('coverImagePreview', null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div
              className="w-full h-48 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-500"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-12 h-12 text-gray-400 mb-2" />
              <p className="text-gray-400">Click to upload cover image</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverImageUpload}
            className="hidden"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description" className="text-white">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your event..."
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="bg-gray-800 border-gray-700 text-white"
          rows={4}
        />
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="venue" className="text-white">Venue Name *</Label>
        <Input
          id="venue"
          placeholder="Madison Square Garden"
          value={formData.venue}
          onChange={(e) => handleInputChange('venue', e.target.value)}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>

      <div>
        <Label htmlFor="address" className="text-white">Address *</Label>
        <Input
          id="address"
          placeholder="4 Pennsylvania Plaza, New York, NY 10001"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city" className="text-white">City *</Label>
          <Input
            id="city"
            placeholder="New York"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <div>
          <Label htmlFor="state" className="text-white">State</Label>
          <Input
            id="state"
            placeholder="NY"
            value={formData.state}
            onChange={(e) => handleInputChange('state', e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="zipCode" className="text-white">ZIP Code</Label>
        <Input
          id="zipCode"
          placeholder="10001"
          value={formData.zipCode}
          onChange={(e) => handleInputChange('zipCode', e.target.value)}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate" className="text-white">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <div>
          <Label htmlFor="endDate" className="text-white">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => handleInputChange('endDate', e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime" className="text-white">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => handleInputChange('startTime', e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <div>
          <Label htmlFor="endTime" className="text-white">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => handleInputChange('endTime', e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="timezone" className="text-white">Timezone</Label>
        <Input
          id="timezone"
          value={formData.timezone}
          onChange={(e) => handleInputChange('timezone', e.target.value)}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priceMin" className="text-white">Min Price ($)</Label>
          <Input
            id="priceMin"
            type="number"
            min="0"
            step="0.01"
            value={formData.priceMin}
            onChange={(e) => handleInputChange('priceMin', parseFloat(e.target.value) || 0)}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <div>
          <Label htmlFor="priceMax" className="text-white">Max Price ($)</Label>
          <Input
            id="priceMax"
            type="number"
            min="0"
            step="0.01"
            value={formData.priceMax || ''}
            onChange={(e) => handleInputChange('priceMax', e.target.value ? parseFloat(e.target.value) : null)}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="ticketUrl" className="text-white">Ticket URL</Label>
        <Input
          id="ticketUrl"
          type="url"
          placeholder="https://example.com/tickets"
          value={formData.ticketUrl}
          onChange={(e) => handleInputChange('ticketUrl', e.target.value)}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>

      <div>
        <Label htmlFor="attendeeCount" className="text-white">Expected Attendance</Label>
        <Input
          id="attendeeCount"
          type="number"
          min="0"
          value={formData.attendeeCount}
          onChange={(e) => handleInputChange('attendeeCount', parseInt(e.target.value) || 0)}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>

      <div>
        <Label className="text-white">Additional Photos</Label>
        <div className="mt-2">
          <div className="grid grid-cols-3 gap-2">
            {formData.additionalImagePreviews.map((preview, index) => (
              <div key={index} className="relative">
                <img
                  src={preview}
                  alt={`Gallery ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 w-6 h-6 p-0"
                  onClick={() => removeAdditionalImage(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            {formData.additionalImagePreviews.length < 10 && (
              <div
                className="w-full h-24 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-500"
                onClick={() => additionalImagesRef.current?.click()}
              >
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
          <input
            ref={additionalImagesRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleAdditionalImagesUpload}
            className="hidden"
          />
        </div>
      </div>
    </div>
  )

  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-white">Tags</Label>
        <div className="mt-2">
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-purple-600 text-white cursor-pointer"
                onClick={() => removeTag(tag)}
              >
                #{tag} <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag(newTag)}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <Button
              type="button"
              onClick={() => addTag(newTag)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Add
            </Button>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-400 mb-2">Suggested tags:</p>
            <div className="flex flex-wrap gap-1">
              {commonTags.map(tag => (
                <Button
                  key={tag}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(tag)}
                  className="text-xs bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                >
                  #{tag}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={formData.isPublic}
            onChange={(e) => handleInputChange('isPublic', e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="isPublic" className="text-white">Make this event public</Label>
        </div>
      </div>
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      case 4: return renderStep4()
      case 5: return renderStep5()
      default: return renderStep1()
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Basic Information'
      case 2: return 'Location & Venue'
      case 3: return 'Date & Time'
      case 4: return 'Pricing & Details'
      case 5: return 'Tags & Visibility'
      default: return 'Basic Information'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            Create Event - Step {currentStep} of {totalSteps}: {getStepTitle()}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new event that others can discover and add to their hangouts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>

          {/* Step Content */}
          {renderCurrentStep()}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="bg-gray-800 border-gray-700 text-white"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !formData.title || !formData.venue || !formData.address || !formData.city}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? 'Creating...' : 'Create Event'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
