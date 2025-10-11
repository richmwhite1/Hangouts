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
import { MobileFullScreenModal } from '@/components/ui/mobile-modal'
import { logger } from '@/lib/logger'
import {
  Calendar,
  MapPin,
  DollarSign,
  Camera,
  X,
  Plus,
  Image as ImageIcon,
  Globe,
  Download,
  Loader2
} from 'lucide-react'
interface EventFormData {
  title: string
  description: string
  categories: string[]
  venue: string
  address: string
  city: string
  state: string
  zipCode: string
  latitude: number | null
  longitude: number | null
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  timezone: string
  priceMin: number
  priceMax: number | null
  currency: string
  ticketUrl: string
  attendeeCount: number
  coverImage: File | null
  coverImagePreview: string | null
  additionalImages: File[]
  additionalImagePreviews: string[]
  tags: string[]
  isPublic: boolean
  eventUrl: string
}
const availableCategories = [
  'MUSIC', 'SPORTS', 'FOOD', 'NIGHTLIFE', 'ARTS',
  'TECHNOLOGY', 'BUSINESS', 'EDUCATION', 'HEALTH', 'FAMILY', 'OTHER'
]
const commonTags = [
  'concert', 'festival', 'conference', 'workshop', 'networking',
  'free', 'family-friendly', 'outdoor', 'indoor', 'live music',
  'dance', 'art', 'food', 'drinks', 'sports', 'fitness'
]
export function ImprovedCreateEventModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isScraping, setIsScraping] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const [locationResults, setLocationResults] = useState<any[]>([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [showLocationResults, setShowLocationResults] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const additionalImagesRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    categories: [],
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
    priceMin: null,
    priceMax: null,
    currency: 'USD',
    ticketUrl: '',
    attendeeCount: 0,
    coverImage: null,
    coverImagePreview: null,
    additionalImages: [],
    additionalImagePreviews: [],
    tags: [],
    isPublic: true,
    eventUrl: ''
  })
  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  // Convert 12-hour format to 24-hour format for HTML5 time inputs
  const convertTo24Hour = (time12h: string): string => {
    if (!time12h) return ''
    const time12hFormatRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i
    const match = time12h.match(time12hFormatRegex)
    if (!match || match.length < 4) {
      // If already in 24-hour format or invalid, return as is
      return time12h
    }
    const [, hours, minutes, period] = match
    let hour24 = parseInt(hours || '0', 10)
    if (period && period.toUpperCase() === 'PM' && hour24 !== 12) {
      hour24 += 12
    } else if (period && period.toUpperCase() === 'AM' && hour24 === 12) {
      hour24 = 0
    }
    return `${hour24.toString().padStart(2, '0')}:${minutes}`
  }
  const handleCategoryToggle = (category: string) => {
    setFormData(prev => {
      const newCategories = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category].slice(0, 5) // Limit to 5 categories
      return { ...prev, categories: newCategories }
    })
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
    const newImages: File[] = []
    const newPreviews: string[] = []
    files.forEach(file => {
      newImages.push(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string)
        if (newPreviews.length === files.length) {
          setFormData(prev => ({
            ...prev,
            additionalImages: [...prev.additionalImages, ...newImages],
            additionalImagePreviews: [...prev.additionalImagePreviews, ...newPreviews]
          }))
        }
      }
      reader.readAsDataURL(file)
    })
  }
  const removeAdditionalImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalImages: prev.additionalImages.filter((_, i) => i !== index),
      additionalImagePreviews: prev.additionalImagePreviews.filter((_, i) => i !== index)
    }))
  }
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }
  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }
  const handleScrapeUrl = async () => {
    if (!formData.eventUrl.trim()) return
    
    setIsScraping(true)
    try {
      const response = await fetch('/api/scrape-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: formData.eventUrl })
      })
      
      if (response.ok) {
        const { data } = await response.json()
        
        // Populate form with scraped data
        setFormData(prev => ({
          ...prev,
          title: data.title || prev.title,
          description: data.description || prev.description,
          venue: data.venue || prev.venue,
          address: data.address || prev.address,
          city: data.city || prev.city,
          state: data.state || prev.state,
          zipCode: data.zipCode || prev.zipCode,
          startDate: data.startDate || prev.startDate,
          startTime: data.startTime ? convertTo24Hour(data.startTime) : prev.startTime,
          endTime: data.endTime ? convertTo24Hour(data.endTime) : prev.endTime,
          priceMin: data.priceMin || prev.priceMin,
          priceMax: data.priceMax || prev.priceMax,
          currency: data.currency || prev.currency,
          coverImagePreview: data.coverImage || prev.coverImagePreview,
          categories: data.categories || prev.categories
        }))
        
        // Show success message
        // console.log('Event data scraped successfully'); // Removed for production
      } else {
        logger.error('Failed to scrape URL');
        // Show error message to user
        alert('Failed to scrape event data from URL. Please fill in the details manually.')
      }
    } catch (error) {
      logger.error('Error scraping URL:', error);
      // Show error message to user
      alert('Error scraping event data. Please fill in the details manually.')
    } finally {
      setIsScraping(false)
    }
  }
  const handleLocationSearch = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setLocationResults([])
      setShowLocationResults(false)
      return
    }
    setIsSearchingLocation(true)
    try {
      // Use our proxy API to avoid CORS issues
      const response = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}&limit=5`)
      const data = await response.json()
      if (data.success) {
        setLocationResults(data.locations)
        setShowLocationResults(true)
      }
    } catch (error) {
      logger.error('Error searching locations:', error);
      setLocationResults([])
    } finally {
      setIsSearchingLocation(false)
    }
  }
  const handleLocationSelect = (location: any) => {
    const address = location.displayName || location.display_name || ''
    const parts = address ? address.split(', ') : []
    
    setFormData(prev => ({
      ...prev,
      venue: location.name || parts[0] || '',
      address: address,
      city: location.address?.city || location.address?.town || location.address?.village || '',
      state: location.address?.state || location.address?.county || '',
      zipCode: location.address?.postcode || '',
      latitude: location.lat ? parseFloat(location.lat) : null,
      longitude: location.lon ? parseFloat(location.lon) : null
    }))
    
    setLocationSearch('')
    setLocationResults([])
    setShowLocationResults(false)
  }
  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      // Upload cover image if provided
      let coverImageUrl = formData.coverImagePreview
      if (formData.coverImage) {
        const formData_upload = new FormData()
        formData_upload.append('image', formData.coverImage)
        const uploadResponse = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData_upload
        })
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          coverImageUrl = uploadResult.url
        }
      }
      // Upload additional images
      const additionalImageUrls: string[] = []
      for (const image of formData.additionalImages) {
        const formData_upload = new FormData()
        formData_upload.append('image', image)
        const uploadResponse = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData_upload
        })
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          additionalImageUrls.push(uploadResult.url)
        }
      }
      // Create event
      const eventData = {
        title: formData.title,
        description: formData.description,
        categories: formData.categories,
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
        additionalImages: additionalImageUrls,
        eventUrl: formData.eventUrl
      }
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      if (response.ok) {
        const result = await response.json()
        // console.log('Event created successfully:', result); // Removed for production
        setIsOpen(false)
        // Reset form
        setFormData({
          title: '',
          description: '',
          categories: [],
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
          coverImage: null,
          coverImagePreview: null,
          additionalImages: [],
          additionalImagePreviews: [],
          tags: [],
          isPublic: true,
          eventUrl: ''
        })
      } else {
        const error = await response.json()
        logger.error('Failed to create event:', error);
      }
    } catch (error) {
      logger.error('Error creating event:', error);
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-purple-600 hover:bg-purple-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Event
      </Button>
      <MobileFullScreenModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create New Event"
        className="bg-gray-900"
        closeOnBackdropClick={true}
        closeOnEscape={true}
        preventBodyScroll={true}
      >
        <div className="p-4 pb-6 flex-1 overflow-y-auto">
          <div className="text-center text-gray-300 text-sm mb-4">
            Fill out the form below to create a new event. You can also scrape data from an existing event URL.
          </div>
          <div className="space-y-4">
          {/* URL Scraping Section */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white text-sm">
                <Globe className="w-4 h-4" />
                Event URL (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/event"
                  value={formData.eventUrl}
                  onChange={(e) => handleInputChange('eventUrl', e.target.value)}
                  className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <Button
                  onClick={handleScrapeUrl}
                  disabled={!formData.eventUrl.trim() || isScraping}
                  variant="outline"
                >
                  {isScraping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isScraping ? 'Scraping...' : 'Fetch Data'}
                </Button>
              </div>
              {/* Display scraped event image */}
              {formData.coverImagePreview && (
                <div className="mt-4">
                  <Label className="text-sm font-medium text-gray-700">Scraped Event Image</Label>
                  <div className="mt-2 relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={formData.coverImagePreview}
                      alt="Scraped event"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Basic Information */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div>
                <Label htmlFor="title" className="text-white text-sm">Event Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter event title"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-white text-sm">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your event"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-white text-sm">Categories (Select up to 5)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1 mt-1">
                  {availableCategories.map((category) => (
                    <div key={category} className="flex items-center space-x-1">
                      <input
                        type="checkbox"
                        id={category}
                        checked={formData.categories.includes(category)}
                        onChange={() => handleCategoryToggle(category)}
                        disabled={!formData.categories.includes(category) && formData.categories.length >= 5}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <Label htmlFor={category} className="text-xs text-white">
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Selected: {formData.categories.length}/5
                </p>
              </div>
            </CardContent>
          </Card>
          {/* Location & Venue */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white text-sm">
                <MapPin className="w-4 h-4" />
                Location & Venue
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="relative">
                <Label htmlFor="location" className="text-white">Venue & Location</Label>
                <Input
                  id="location"
                  value={locationSearch || `${formData.venue}${formData.address ? ', ' + formData.address : ''}`}
                  onChange={(e) => {
                    setLocationSearch(e.target.value)
                    handleLocationSearch(e.target.value)
                  }}
                  onFocus={() => {
                    if (locationResults.length > 0) {
                      setShowLocationResults(true)
                    }
                  }}
                  placeholder="Search for venue or location..."
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                {/* Location search results */}
                {showLocationResults && locationResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {locationResults.map((location, index) => (
                      <div
                        key={index}
                        className="px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                        onClick={() => handleLocationSelect(location)}
                      >
                        <div className="font-medium text-white">
                          {location.name || (location.displayName ? location.displayName.split(',')[0] : 'Unknown Location')}
                        </div>
                        <div className="text-sm text-gray-300">
                          {location.displayName || location.display_name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {isSearchingLocation && (
                  <div className="absolute right-3 top-8">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city" className="text-white">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="City"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="state" className="text-white">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="State"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode" className="text-white">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    placeholder="ZIP"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Date & Time */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="w-5 h-5" />
                Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate" className="text-white">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white relative z-50"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-white">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white relative z-50"
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
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="endTime" className="text-white">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Pricing */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <DollarSign className="w-5 h-5" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="priceMin" className="text-white">Min Price</Label>
                  <Input
                    id="priceMin"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.priceMin || ''}
                    onChange={(e) => handleInputChange('priceMin', e.target.value ? parseFloat(e.target.value) : null)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="priceMax" className="text-white">Max Price</Label>
                  <Input
                    id="priceMax"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.priceMax || ''}
                    onChange={(e) => handleInputChange('priceMax', e.target.value ? parseFloat(e.target.value) : null)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="currency" className="text-white">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    placeholder="USD"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="ticketUrl" className="text-white">Ticket URL</Label>
                <Input
                  id="ticketUrl"
                  value={formData.ticketUrl}
                  onChange={(e) => handleInputChange('ticketUrl', e.target.value)}
                  placeholder="https://tickets.example.com"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
            </CardContent>
          </Card>
          {/* Images */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Camera className="w-5 h-5" />
                Images
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white">Cover Image</Label>
                <div className="mt-2">
                  {formData.coverImagePreview ? (
                    <div className="relative w-32 h-32">
                      <img
                        src={formData.coverImagePreview}
                        alt="Cover preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute -top-2 -right-2 w-6 h-6 p-0"
                        onClick={() => handleInputChange('coverImagePreview', null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="w-32 h-32 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-500"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="w-8 h-8 text-gray-400" />
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
                <Label className="text-white">Additional Images</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {formData.additionalImagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Additional ${index + 1}`}
                        className="w-full h-20 object-cover rounded"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute -top-2 -right-2 w-5 h-5 p-0"
                        onClick={() => removeAdditionalImage(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <div
                    className="w-full h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-gray-400"
                    onClick={() => additionalImagesRef.current?.click()}
                  >
                    <Plus className="w-6 h-6 text-gray-400" />
                  </div>
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
            </CardContent>
          </Card>
          {/* Tags */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <Button onClick={addTag} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
              <div>
                <Label className="text-white">Common Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {commonTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-700 text-white border-gray-600 hover:border-gray-500"
                      onClick={() => {
                        if (!formData.tags.includes(tag)) {
                          setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))
                        }
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
        {/* Fixed Footer */}
        <div className="flex justify-end gap-4 p-4 border-t border-gray-700 bg-gray-900">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.title.trim() || !formData.startDate}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Event'
            )}
          </Button>
        </div>
      </MobileFullScreenModal>
    </>
  )
}