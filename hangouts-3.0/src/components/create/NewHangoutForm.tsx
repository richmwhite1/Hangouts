'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Camera, Users, Sparkles } from 'lucide-react'
import { SimpleDateTimePicker } from '@/components/ui/simple-datetime-picker'
import { GoogleMapsAutocomplete } from '@/components/ui/google-maps-autocomplete'
import { EventSelectionModal } from '@/components/ui/event-selection-modal'
import { InviteFriendsBar } from '@/components/create/InviteFriendsBar'
import { ConsensusBanner } from '@/components/create/ConsensusBanner'
import { OptionCard } from '@/components/create/OptionCard'
import { SmartSuggestions } from '@/components/create/SmartSuggestions'
import { SmartPasteModal } from '@/components/create/SmartPasteModal'
import { toast } from 'sonner'
import { HANGOUT_STATES } from '@/lib/hangout-flow'
import { logger } from '@/lib/logger'
import confetti from 'canvas-confetti'
interface NewHangoutFormProps {
  onSubmit: (data: NewHangoutFormData) => void
  isLoading?: boolean
  prefillEvent?: {
    id: string
    title: string
    description: string
    location: string
    dateTime: string
    price: number
    options?: Array<{
      id: string
      title: string
      description?: string
      location?: string
      dateTime?: string
      price?: number
    }>
  }
  prefillFromSimple?: {
    title: string
    dateTime: string
    location: string
    participants: string[]
  } | null
  isEditMode?: boolean
  hangoutState?: string
}

import { Ticket } from 'lucide-react'

export interface NewHangoutFormData {
  title: string
  description: string
  location: string
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
  image?: File | undefined
  participants: string[]
  mandatoryParticipants: string[]
  coHosts: string[]
  consensusPercentage: number
  allowMultipleVotes: boolean
  type: 'quick_plan' | 'multi_option'
  isAllDay: boolean
  isRecurring: boolean
  recurrenceFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  options: Array<{
    id: string
    title: string
    description?: string
    location?: string
    dateTime?: string
    price?: number
    hangoutUrl?: string
  }>
}

export default function NewHangoutForm({ onSubmit, isLoading = false, prefillEvent, prefillFromSimple, isEditMode = false, hangoutState }: NewHangoutFormProps) {
  const { getToken } = useAuth()
  const [formData, setFormData] = useState<NewHangoutFormData>({
    title: '',
    description: '',
    location: '',
    privacyLevel: 'PUBLIC',
    image: undefined,
    participants: [],
    mandatoryParticipants: [],
    coHosts: [],
    consensusPercentage: 70,
    allowMultipleVotes: true,
    type: 'quick_plan',
    isAllDay: false,
    isRecurring: false,
    recurrenceFrequency: 'WEEKLY',
    options: [
      { id: `option_${Date.now()}_1`, title: '', description: '', location: '', dateTime: '', price: 0, hangoutUrl: '' }
    ]
  })

  const [allFriends, setAllFriends] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false)
  const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false)

  const handleSmartPaste = (data: { title?: string; location?: string; dateTime?: string; description?: string }) => {
    setFormData(prev => ({
      ...prev,
      title: data.title || prev.title,
      description: data.description || prev.description,
      options: prev.options.map((opt, idx) => idx === 0 ? {
        ...opt,
        title: data.title || opt.title,
        location: data.location || opt.location || '',
        dateTime: data.dateTime || opt.dateTime || '' // Note: This might need ISO conversion in real app
      } : opt)
    }))
  }

  // Vote preview state (simulated for UI preview)
  const [votePreview, setVotePreview] = useState<{ [optionId: string]: number }>({})
  const [lockedOptionId, setLockedOptionId] = useState<string | null>(null)

  // Calculate form completion progress
  const calculateProgress = () => {
    let completed = 0
    let total = 0

    // Title (required)
    total++
    if (formData.title.trim()) completed++

    // Options validation
    const validOptions = formData.options.filter(option => option.title.trim() !== '')
    const minOptions = formData.type === 'multi_option' ? 2 : 1

    // Count required options
    for (let i = 0; i < minOptions; i++) {
      total++ // Each option needs title
      if (validOptions[i]) {
        completed++ // Title is filled

        // Each option also needs dateTime
        total++
        if (validOptions[i]?.dateTime && validOptions[i]?.dateTime?.trim() !== '') {
          completed++
        }
      }
    }

    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }

  const progress = calculateProgress()

  // Set smart defaults on mount (if not editing and no prefill event)
  useEffect(() => {
    if (!isEditMode && !prefillEvent) {
      // Set default date/time to tomorrow at 7pm
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(19, 0, 0, 0) // 7pm
      const defaultDateTime = tomorrow.toISOString()

      // Try to get user's location from browser
      const getLocation = async () => {
        if (navigator.geolocation) {
          try {
            const _position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
            })

            // Reverse geocode to get address (simplified - in production, use a geocoding service)
            // For now, we'll just set a placeholder that user can update
            setFormData(prev => ({
              ...prev,
              options: prev.options.map((opt, idx) =>
                idx === 0 ? { ...opt, dateTime: defaultDateTime } : opt
              )
            }))
          } catch (error) {
            // If geolocation fails, just set the date/time
            setFormData(prev => ({
              ...prev,
              options: prev.options.map((opt, idx) =>
                idx === 0 ? { ...opt, dateTime: defaultDateTime } : opt
              )
            }))
          }
        } else {
          // No geolocation support, just set date/time
          setFormData(prev => ({
            ...prev,
            options: prev.options.map((opt, idx) =>
              idx === 0 ? { ...opt, dateTime: defaultDateTime } : opt
            )
          }))
        }
      }

      // Set default date/time immediately
      setFormData(prev => ({
        ...prev,
        options: prev.options.map((opt, idx) =>
          idx === 0 ? { ...opt, dateTime: defaultDateTime } : opt
        )
      }))

      // Try to get location (non-blocking)
      getLocation()
    }
  }, [isEditMode, prefillEvent])

  // Prefill form with event data if provided
  useEffect(() => {
    if (prefillEvent) {
      // Determine if this is RSVP mode (confirmed state) or voting mode (polling state)
      const isRSVPMode = hangoutState === HANGOUT_STATES.CONFIRMED || hangoutState === 'confirmed'
      const isVotingMode = hangoutState === HANGOUT_STATES.POLLING || hangoutState === 'polling'

      setFormData(prev => ({
        ...prev,
        title: isEditMode ? prefillEvent.title : `Hangout: ${prefillEvent.title}`,
        description: prefillEvent.description,
        location: prefillEvent.location,
        // Set the appropriate type based on hangout state
        type: isRSVPMode ? 'quick_plan' : (isVotingMode ? 'multi_option' : 'quick_plan'),
        options: isRSVPMode ? [
          // RSVP mode: Only one option (the main plan)
          {
            id: `option_${Date.now()}_1`,
            title: prefillEvent.title,
            description: prefillEvent.description,
            location: prefillEvent.location,
            dateTime: prefillEvent.dateTime,
            price: prefillEvent.price,
            hangoutUrl: ''
          }
        ] : [
          // Voting mode: Use existing options if available, otherwise create one from current plan
          ...(prefillEvent.options && prefillEvent.options.length > 0 ? prefillEvent.options.map(option => ({
            id: option.id || `option_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: option.title,
            description: option.description || '',
            location: option.location || '',
            dateTime: option.dateTime || '',
            price: option.price || 0,
            hangoutUrl: ''
          })) : [{
            id: `option_${Date.now()}_1`,
            title: prefillEvent.title,
            description: prefillEvent.description,
            location: prefillEvent.location,
            dateTime: prefillEvent.dateTime,
            price: prefillEvent.price,
            hangoutUrl: ''
          }])
          // Note: In edit mode, users can add more options if they want, but it's not required
        ]
      }))
    }
  }, [prefillEvent, hangoutState, isEditMode])

  // Prefill form with data from simple form when switching to advanced mode
  useEffect(() => {
    if (prefillFromSimple && !prefillEvent) {
      // Only prefill if we have meaningful data and we're not in edit mode
      const hasData = prefillFromSimple.title || prefillFromSimple.dateTime || prefillFromSimple.location || prefillFromSimple.participants.length > 0
      
      if (hasData) {
        setFormData(prev => ({
          ...prev,
          title: prefillFromSimple.title || prev.title,
          location: prefillFromSimple.location || prev.location,
          participants: prefillFromSimple.participants.length > 0 ? prefillFromSimple.participants : prev.participants,
          options: prev.options.map((opt, idx) => 
            idx === 0 ? {
              ...opt,
              title: prefillFromSimple.title || opt.title,
              location: prefillFromSimple.location || opt.location,
              dateTime: prefillFromSimple.dateTime || opt.dateTime
            } : opt
          )
        }))
      }
    }
  }, [prefillFromSimple, prefillEvent])

  // Fetch friends on component mount
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setIsLoadingFriends(true)

        // Fetch all friends
        const token = await getToken()
        const friendsResponse = await fetch('/api/friends', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (friendsResponse.ok) {
          const friendsData = await friendsResponse.json()
          const friends = friendsData.friends || []
          // console.log('Friends fetched:', friends.length, friends); // Removed for production
          // Transform friends to match expected format
          const transformedFriends = friends.map((friendship: any) => ({
            id: friendship.friend.id,
            name: friendship.friend.name,
            username: friendship.friend.username,
            avatar: friendship.friend.avatar,
            bio: friendship.friend.bio,
            location: friendship.friend.location
          }))
          setAllFriends(transformedFriends)
        } else {
          logger.error('Friends fetch failed:', friendsResponse.status);
        }
      } catch (error) {
        logger.error('Error fetching friends:', error);
      } finally {
        setIsLoadingFriends(false)
      }
    }

    fetchFriends()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }

    if (formData.type === 'multi_option') {
      const validOptions = formData.options.filter(option => option.title.trim() !== '')

      // In edit mode, allow editing existing options without requiring more
      if (isEditMode) {
        if (validOptions.length < 1) {
          toast.error('Please keep at least one option')
          return
        }
      } else {
        // In create mode, require at least 2 options for polls
        if (validOptions.length < 2) {
          toast.error('Please add at least two options for the poll')
          return
        }
      }

      // Validate that all valid options have date/time
      const optionsWithoutDateTime = validOptions.filter(option => !option.dateTime || option.dateTime.trim() === '')
      if (optionsWithoutDateTime.length > 0) {
        toast.error('Please select date and time for all options')
        return
      }
    } else {
      // For quick plan, ensure at least one option
      const validOptions = formData.options.filter(option => option.title.trim() !== '')
      if (validOptions.length < 1) {
        toast.error('Please add at least one option')
        return
      }

      // Validate that the option has date/time
      const optionWithoutDateTime = validOptions.filter(option => !option.dateTime || option.dateTime.trim() === '')
      if (optionWithoutDateTime.length > 0) {
        toast.error('Please select date and time for the plan')
        return
      }
    }

    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    })

    onSubmit(formData)
  }

  const handleInputChange = (field: keyof NewHangoutFormData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }

      // If switching to quick_plan, ensure only one option
      if (field === 'type' && value === 'quick_plan') {
        newData.options = [prev.options[0] ? { ...prev.options[0], id: prev.options[0].id || `option_${Date.now()}_1` } : { id: `option_${Date.now()}_1`, title: '', description: '', location: '', dateTime: '', price: 0, hangoutUrl: '' }]
      }

      // If switching to multi_option, ensure at least two options
      if (field === 'type' && value === 'multi_option') {
        if (prev.options.length < 2) {
          newData.options = [
            ...prev.options,
            { id: `option_${Date.now()}_2`, title: '', description: '', location: '', dateTime: '', price: 0, hangoutUrl: '' }
          ]
        }
      }

      return newData
    })
  }

  const handleOptionChange = (index: number, field: keyof NewHangoutFormData['options'][0], value: any) => {
    const newOptions = [...formData.options]
    const updatedOption = { ...newOptions[index], [field]: value }
    // Ensure id is always defined
    if (!updatedOption.id) {
      updatedOption.id = `option_${Date.now()}_${index}`
    }
    newOptions[index] = updatedOption as NewHangoutFormData['options'][0]
    handleInputChange('options', newOptions)
  }

  const addOption = () => {
    // Only allow adding options for multi_option type
    if (formData.type !== 'multi_option') return

    const newOption: NewHangoutFormData['options'][0] = {
      id: `option_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: '',
      description: '',
      location: '',
      dateTime: '',
      price: 0,
      hangoutUrl: ''
    }
    handleInputChange('options', [...formData.options, newOption])
  }

  const removeOption = (index: number) => {
    // For multi_option, require at least 2 options
    if (formData.type === 'multi_option' && formData.options.length <= 2) return

    // For quick_plan, don't allow removing the only option
    if (formData.type === 'quick_plan' && formData.options.length <= 1) return

    const newOptions = formData.options.filter((_, i) => i !== index)
    handleInputChange('options', newOptions)
  }

  const addParticipant = (friendId: string) => {
    if (friendId && !formData.participants.includes(friendId)) {
      handleInputChange('participants', [...formData.participants, friendId])
    }
  }

  // Filter friends based on search query
  const filteredFriends = allFriends
    .filter(friend =>
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
    // Deduplicate by friend ID to prevent duplicate React keys
    .filter((friend, index, self) =>
      index === self.findIndex(f => f.id === friend.id)
    )

  const removeParticipant = (friendId: string) => {
    handleInputChange('participants', formData.participants.filter(p => p !== friendId))
    // Also remove from mandatory and co-host lists
    handleInputChange('mandatoryParticipants', formData.mandatoryParticipants.filter(p => p !== friendId))
    handleInputChange('coHosts', formData.coHosts.filter(p => p !== friendId))
  }

  const toggleMandatory = (friendId: string) => {
    if (formData.mandatoryParticipants.includes(friendId)) {
      handleInputChange('mandatoryParticipants', formData.mandatoryParticipants.filter(p => p !== friendId))
    } else {
      handleInputChange('mandatoryParticipants', [...formData.mandatoryParticipants, friendId])
    }
  }

  const toggleCoHost = (friendId: string) => {
    if (formData.coHosts.includes(friendId)) {
      handleInputChange('coHosts', formData.coHosts.filter(p => p !== friendId))
    } else {
      handleInputChange('coHosts', [...formData.coHosts, friendId])
    }
  }

  const handleSelectEvent = (event: any) => {
    // Combine venue, address, and city for location
    const locationParts = [event.venue, event.address, event.city].filter(Boolean)
    const location = locationParts.join(', ') || ''

    // Combine startDate and startTime for dateTime
    let dateTime = ''
    if (event.startDate) {
      const date = new Date(event.startDate)
      if (event.startTime) {
        const [hours, minutes] = event.startTime.split(':')
        date.setHours(parseInt(hours), parseInt(minutes))
      }
      dateTime = date.toISOString()
    }

    // Get price from event price object
    const price = event.price?.min || 0

    const newOption = {
      id: `option_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: event.title,
      description: event.description || '',
      location: location,
      dateTime: dateTime,
      price: price,
      hangoutUrl: event.ticketUrl || ''
    }

    handleInputChange('options', [...formData.options, newOption])
    toast.success('Event added as option')
  }

  // Image resizing function
  const resizeImage = (file: File, maxWidth: number = 1200, maxHeight: number = 1200, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        // Set canvas dimensions
        canvas.width = width
        canvas.height = height

        // Draw and resize image
        ctx?.drawImage(img, 0, 0, width, height)

        // Convert to blob and then to file
        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(resizedFile)
          } else {
            resolve(file) // Fallback to original file
          }
        }, file.type, quality)
      }

      img.src = URL.createObjectURL(file)
    })
  }

  // Friend Selection Modal State is declared at the top with other state variables


  const getLeadingOption = () => {
    if (formData.type !== 'multi_option' || formData.participants.length === 0) return null
    const options = formData.options.filter(opt => opt.title.trim() !== '')
    if (options.length === 0) return null
    let maxVotes = 0, leadingOption = null
    options.forEach(option => {
      const votes = votePreview[option.id] || 0
      if (votes > maxVotes) { maxVotes = votes; leadingOption = option }
    })
    if (!leadingOption) return null
    const totalVoters = Math.max(formData.participants.length, 1)
    return {
      id: leadingOption.id,
      title: leadingOption.title,
      voteCount: maxVotes,
      votePercentage: Math.round((maxVotes / totalVoters) * 100)
    }
  }

  const handleLockOption = (optionId: string) => {
    const option = formData.options.find(opt => opt.id === optionId)
    if (!option) return
    setLockedOptionId(optionId)
    handleInputChange('type', 'quick_plan')
    handleInputChange('options', [option])
    toast.success('🎉 Poll locked!')
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } })
  }

  const invitedFriendsWithDetails = useMemo(
    () => formData.participants.map(id => allFriends.find(f => f.id === id)).filter(Boolean) as any[],
    [formData.participants, allFriends]
  )

  return (
    <div className="w-full relative overflow-x-hidden">
      <form onSubmit={handleSubmit} className="w-full max-w-full px-4 sm:px-6 pt-4 sm:pt-6 pb-40 sm:pb-12 space-y-6 sm:space-y-8">
        {/* Photo Upload */}
        <div className="flex justify-end">
          <input
            type="file"
            accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.svg"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) {
                // Validate file type
                const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml']
                if (!validTypes.includes(file.type)) {
                  alert('Please select a valid image file (JPG, PNG, GIF, WebP, BMP, TIFF, SVG)')
                  return
                }

                // Validate file size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                  alert('File size must be less than 10MB')
                  return
                }

                try {
                  // Resize image if it's too large
                  const resizedFile = await resizeImage(file)
                  handleInputChange('image', resizedFile)
                } catch (error) {
                  logger.error('Error resizing image:', error);
                  handleInputChange('image', file) // Fallback to original file
                }
              }
            }}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 border border-dashed border-gray-600 rounded-md cursor-pointer hover:bg-gray-800/50 hover:text-white transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            {formData.image ? formData.image.name : 'Upload Photo'}
          </label>
          {formData.image && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleInputChange('image', undefined)}
              className="ml-2 text-gray-300 border-gray-600 hover:bg-gray-800/50 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {formData.image && (
          <div className="mb-4 w-full overflow-hidden">
            <img
              src={URL.createObjectURL(formData.image)}
              alt="Hangout Preview"
              className="w-full h-48 sm:h-64 object-cover rounded-lg shadow-md"
            />
          </div>
        )}

        <Card className="bg-black border-gray-600">
          <CardHeader>
            <CardTitle className="text-white">Hangout Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Event Attachment Button */}
            <div className="flex justify-center mb-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEventModalOpen(true)}
                className="w-full border-dashed border-gray-600 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-900/10 h-12 text-sm sm:text-base"
              >
                <Ticket className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Attach an Event <span className="hidden sm:inline">(Ticketmaster, Meetup, etc.)</span></span>
              </Button>
            </div>

            <EventSelectionModal
              isOpen={isEventModalOpen}
              onClose={() => setIsEventModalOpen(false)}
              onSelectEvent={(event) => {
                // Auto-fill form with event details
                setFormData(prev => ({
                  ...prev,
                  title: event.title,
                  description: event.description || prev.description,
                  location: [event.venue, event.address, event.city].filter(Boolean).join(', ') || prev.location,
                  options: prev.options.map((opt, idx) =>
                    idx === 0 ? {
                      ...opt,
                      title: event.title,
                      description: event.description || '',
                      location: [event.venue, event.address, event.city].filter(Boolean).join(', '),
                      dateTime: event.startDate ? new Date(event.startDate + (event.startTime ? 'T' + event.startTime : '')).toISOString() : (opt.dateTime || ''),
                      hangoutUrl: (event as any).ticketUrl || ''
                    } : opt
                  )
                }))
                toast.success('Event attached successfully!')
              }}
              currentOptions={formData.options}
            />

            <div className="mb-4">
              <Label htmlFor="title" className="text-white mb-2">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Board Game Night"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="bg-black border-gray-600 text-white"
                required
              />
            </div>

            <div className="mb-4">
              <Label htmlFor="description" className="text-white mb-2">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Tell more about your hangout..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="bg-black border-gray-600 text-white"
              />
            </div>


            <div className="mb-4">
              <Label className="text-white mb-2">Privacy Level</Label>
              <div className="flex flex-wrap gap-2">
                {(['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE'] as const).map((level) => (
                  <Button
                    key={level}
                    type="button"
                    variant={formData.privacyLevel === level ? 'default' : 'outline'}
                    onClick={() => handleInputChange('privacyLevel', level)}
                    className={`flex-1 min-w-[100px] sm:flex-initial ${formData.privacyLevel === level ? 'text-white text-black' : 'border-gray-600 text-white'}`}
                  >
                    {level.toLowerCase().replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Smart Suggestions - AI-powered recommendations */}
        <SmartSuggestions
          invitedFriends={invitedFriendsWithDetails}
          currentDateTime={formData.options[0]?.dateTime}
          currentLocation={formData.options[0]?.location}
          hangoutTitle={formData.title}
          onSelectTime={(dateTime) => {
            if (formData.options.length > 0) {
              handleOptionChange(0, 'dateTime', dateTime)
              // Delay toast to ensure state update is visible
              setTimeout(() => {
                toast.success('✨ Time suggestion applied to Option 1!')
              }, 100)
            }
          }}
          onSelectLocation={(location) => {
            if (formData.options.length > 0) {
              handleOptionChange(0, 'location', location)
              // Delay toast to ensure state update is visible
              setTimeout(() => {
                toast.success('📍 Location suggestion applied to Option 1!')
              }, 100)
            }
          }}
        />


        {/* Flow Type Selection - Simplified */}
        <Card className="bg-black border-gray-600">
          <CardHeader>
            <CardTitle className="text-white">How do you want to plan?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => handleInputChange('type', 'quick_plan')}
                aria-label="Select Simple Plan option"
                aria-pressed={formData.type === 'quick_plan'}
                className={`p-4 rounded-lg border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-black ${formData.type === 'quick_plan'
                  ? 'border-[#2563EB] bg-[#2563EB]/10'
                  : 'border-gray-600 hover:border-gray-500'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${formData.type === 'quick_plan' ? 'border-[#2563EB] bg-[#2563EB]' : 'border-gray-500'
                    }`}>
                    {formData.type === 'quick_plan' && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold mb-1">Simple Plan</div>
                    <div className="text-gray-400 text-sm">
                      Create a single confirmed plan. Friends RSVP directly - no voting needed.
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleInputChange('type', 'multi_option')}
                aria-label="Select Let Friends Vote option"
                aria-pressed={formData.type === 'multi_option'}
                className={`p-4 rounded-lg border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-black ${formData.type === 'multi_option'
                  ? 'border-[#2563EB] bg-[#2563EB]/10'
                  : 'border-gray-600 hover:border-gray-500'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${formData.type === 'multi_option' ? 'border-[#2563EB] bg-[#2563EB]' : 'border-gray-500'
                    }`}>
                    {formData.type === 'multi_option' && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold mb-1">Let Friends Vote</div>
                    <div className="text-gray-400 text-sm">
                      Add multiple options and let friends vote to decide together.
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Consensus Banner - Shows leading option */}
        {formData.type === 'multi_option' && getLeadingOption() && (
          <ConsensusBanner
            leadingOption={getLeadingOption()}
            consensusThreshold={formData.consensusPercentage}
            totalVoters={formData.participants.length}
            onLockOption={handleLockOption}
            isLocked={lockedOptionId !== null}
          />
        )}


        {/* Consensus Settings - Only for multi_option, hidden by default */}
        {formData.type === 'multi_option' && (
          <Card className="bg-black border-gray-600">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Advanced Options</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="text-gray-400 hover:text-white"
                >
                  {showAdvancedOptions ? 'Hide' : 'Show'} Advanced
                </Button>
              </div>
            </CardHeader>
            {showAdvancedOptions && (
              <CardContent className="space-y-5">
                <div>
                  <Label className="text-white text-sm mb-2 block">
                    Consensus Required: {formData.consensusPercentage}%
                  </Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.consensusPercentage}
                    onChange={(e) => handleInputChange('consensusPercentage', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #792ADB 0%, #792ADB ${formData.consensusPercentage}%, #374151 ${formData.consensusPercentage}%, #374151 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                  <p className="text-gray-400 text-xs mt-2">
                    The poll will be finalized when {formData.consensusPercentage}% of participants have voted
                  </p>
                </div>

                {/* Multiple Votes Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white text-sm">Allow Multiple Votes</Label>
                    <p className="text-gray-400 text-xs">Users can vote for multiple options</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInputChange('allowMultipleVotes', !formData.allowMultipleVotes)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.allowMultipleVotes ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.allowMultipleVotes ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Options */}
        <Card className="bg-black border-gray-600">
          <CardHeader>
            <CardTitle className="text-white">
              {formData.type === 'quick_plan' ? 'Plan Details' : 'Poll Options'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {formData.options.map((option, index) => (
              <div key={option.id} className="p-4 sm:p-5 border border-gray-600 rounded-lg space-y-3 w-full overflow-hidden">
                <div className="flex justify-between items-center gap-2">
                  <Label className="text-white text-sm sm:text-base">Option {index + 1}</Label>
                  {((formData.type === 'multi_option' && formData.options.length > 2) ||
                    (formData.type === 'quick_plan' && formData.options.length > 1)) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOption(index)}
                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                </div>

                <Input
                  placeholder="Option title"
                  value={option.title}
                  onChange={(e) => handleOptionChange(index, 'title', e.target.value)}
                  className="bg-black border-gray-600 text-white"
                  required
                />

                <Textarea
                  placeholder="Description (optional)"
                  value={option.description}
                  onChange={(e) => handleOptionChange(index, 'description', e.target.value)}
                  className="bg-black border-gray-600 text-white"
                />

                <div className="space-y-3">
                  <GoogleMapsAutocomplete
                    value={option.location || ''}
                    onChange={(value) => handleOptionChange(index, 'location', value)}
                    placeholder="Search for a location..."
                    className="w-full"
                  />

                  {/* Advanced Date/Time Controls */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <Label className="text-xs text-gray-400">Date & Time</Label>
                      {index === 0 && (
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="all-day" className="text-xs text-gray-400">All Day</Label>
                            <Switch
                              id="all-day"
                              checked={formData.isAllDay}
                              onCheckedChange={(checked) => handleInputChange('isAllDay', checked)}
                              className="scale-75"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor="recurring" className="text-xs text-gray-400">Recurring</Label>
                            <Switch
                              id="recurring"
                              checked={formData.isRecurring}
                              onCheckedChange={(checked) => handleInputChange('isRecurring', checked)}
                              className="scale-75"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <SimpleDateTimePicker
                      value={option.dateTime || ''}
                      onChange={(value) => handleOptionChange(index, 'dateTime', value)}
                      placeholder={formData.isAllDay ? "Select date" : "Select date and time"}
                      className="w-full"
                    />

                    {/* Recurrence Frequency Selector */}
                    {index === 0 && formData.isRecurring && (
                      <div className="mt-2 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                        <Label className="text-xs text-gray-400 mb-2 block">Repeat</Label>
                        <div className="flex flex-wrap gap-2">
                          {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((freq) => (
                            <Button
                              key={freq}
                              type="button"
                              variant={formData.recurrenceFrequency === freq ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleInputChange('recurrenceFrequency', freq)}
                              className={`flex-1 min-w-[80px] text-xs ${formData.recurrenceFrequency === freq ? 'bg-blue-600 text-white' : 'border-gray-600 text-gray-300'}`}
                            >
                              {freq.charAt(0) + freq.slice(1).toLowerCase()}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Price (optional)"
                    value={option.price || ''}
                    onChange={(e) => handleOptionChange(index, 'price', parseFloat(e.target.value) || 0)}
                    className="bg-black border-gray-600 text-white"
                  />
                  <Input
                    placeholder="Hangout URL (optional)"
                    value={option.hangoutUrl || ''}
                    onChange={(e) => handleOptionChange(index, 'hangoutUrl', e.target.value)}
                    className="bg-black border-gray-600 text-white"
                  />
                </div>
              </div>
            ))}

            <div className="flex flex-col sm:flex-row gap-2">
              {formData.type === 'multi_option' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addOption}
                  className="w-full sm:flex-1 border-blue-500 text-white hover:bg-blue-500 hover:text-white h-12"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Option
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEventModalOpen(true)}
                className="w-full sm:flex-1 border-blue-500 text-white hover:bg-blue-500 hover:text-white h-12"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Participants */}
        <Card className="bg-black border-gray-600">
          <CardHeader>
            <CardTitle className="text-white">Invite Friends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Search Friends - Moved to Top */}
            <div className="flex gap-2">
              <Input
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-black border-gray-600 text-white"
              />
            </div>

            {/* Friends List */}
            {isLoadingFriends ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-400 text-sm">Loading friends...</p>
              </div>
            ) : allFriends.length > 0 ? (
              <div>
                <Label className="text-white text-sm mb-2 block">
                  {searchQuery ? 'Search Results' : 'All Friends'} ({filteredFriends.length})
                </Label>
                <div className="flex flex-wrap gap-2 mb-4 max-h-40 overflow-y-auto bg-gray-900 p-3 rounded-lg w-full">
                  {filteredFriends.map((friend) => {
                    const isSelected = formData.participants.includes(friend.id)
                    const isMandatory = formData.mandatoryParticipants.includes(friend.id)
                    const isCoHost = formData.coHosts.includes(friend.id)

                    return (
                      <div key={friend.id} className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => addParticipant(friend.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isSelected
                            ? 'bg-blue-600 border-blue-500'
                            : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                            } border`}
                        >
                          <img
                            src={friend.avatar || '/placeholder-avatar.png'}
                            alt={friend.name || friend.username}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-white text-sm">{friend.name || friend.username}</span>
                        </button>

                        {isSelected && (
                          <div className="flex gap-1 mt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleMandatory(friend.id)
                              }}
                              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${isMandatory
                                ? 'bg-red-600 text-white border border-red-500'
                                : 'bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white border border-gray-600'
                                }`}
                              title={isMandatory ? 'Required to attend' : 'Mark as required'}
                            >
                              {isMandatory ? '★ Required' : '☆ Optional'}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleCoHost(friend.id)
                              }}
                              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${isCoHost
                                ? 'bg-yellow-600 text-white border border-yellow-500'
                                : 'bg-gray-700 text-gray-300 hover:bg-yellow-600 hover:text-white border border-gray-600'
                                }`}
                              title={isCoHost ? 'Co-host can edit hangout' : 'Make co-host'}
                            >
                              {isCoHost ? '👑 Co-host' : '👤 Member'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No friends found</p>
                <p className="text-gray-500 text-xs">Add friends to invite them to hangouts</p>
              </div>
            )}

            {formData.participants.length > 0 && (
              <div className="w-full">
                <Label className="text-white text-sm mb-2 block">Selected Friends</Label>
                <div className="flex flex-wrap gap-2 w-full">
                  {formData.participants.map((participantId) => {
                    const friend = allFriends.find(f => f.id === participantId)
                    const isMandatory = formData.mandatoryParticipants.includes(participantId)
                    const isCoHost = formData.coHosts.includes(participantId)

                    return (
                      <div key={participantId} className="flex items-center gap-1">
                        <Badge
                          variant="secondary"
                          className={`text-white flex items-center gap-1 ${isMandatory ? 'bg-red-600' : isCoHost ? 'bg-yellow-600' : 'bg-blue-600'
                            }`}
                        >
                          <img
                            src={friend?.avatar || '/placeholder-avatar.png'}
                            alt={friend?.name || participantId}
                            className="w-4 h-4 rounded-full"
                          />
                          {friend ? friend.name : participantId}
                          {isMandatory && <span className="text-xs">★</span>}
                          {isCoHost && <span className="text-xs">👑</span>}
                          <button
                            type="button"
                            onClick={() => removeParticipant(participantId)}
                            className="ml-1 hover:bg-black/20 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sticky Submit Button with Progress */}
        <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-600 p-4 z-50 shadow-lg sm:sticky sm:relative sm:shadow-none sm:pb-4 sm:mt-6" style={{ paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom) + 12px))', paddingTop: 'max(16px, calc(env(safe-area-inset-bottom) + 12px))' }}>
          {/* Progress Indicator */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-400 text-xs">Form Progress</span>
              <span className="text-gray-400 text-xs">{progress.completed} of {progress.total} required fields</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-[#2563EB] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-white font-bold mt-4"
            style={{ backgroundColor: '#792ADB' }}
            disabled={isLoading || progress.completed < progress.total}
          >
            {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Hangout' : 'Create Hangout')}
          </Button>
        </div>
      </form>


      {/* Floating Invite Friends Bar - Positioned above submit button */}
      <InviteFriendsBar
        invitedFriends={invitedFriendsWithDetails}
        onOpenModal={() => setIsFriendModalOpen(true)}
        onRemoveFriend={removeParticipant}
        mandatoryParticipants={formData.mandatoryParticipants}
        coHosts={formData.coHosts}
      />

      {/* Event Selection Modal */}
      <EventSelectionModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSelectEvent={handleSelectEvent}
        currentOptions={formData.options}
      />

      {/* Friend Selection Modal (Simplified for now) */}
      {isFriendModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Invite Friends</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsFriendModalOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4 border-b border-gray-800">
              <Input
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black border-gray-700 text-white"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {isLoadingFriends ? (
                <div className="text-center py-8 text-gray-500">Loading friends...</div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No friends found</div>
              ) : (
                <div className="space-y-1">
                  {filteredFriends.map(friend => {
                    const isSelected = formData.participants.includes(friend.id)
                    return (
                      <button
                        key={friend.id}
                        type="button"
                        onClick={() => isSelected ? removeParticipant(friend.id) : addParticipant(friend.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${isSelected ? 'bg-blue-900/20 border border-blue-900/50' : 'hover:bg-gray-800'}`}
                      >
                        <div className="relative">
                          <img
                            src={friend.avatar || '/placeholder-avatar.png'}
                            alt={friend.name}
                            className="w-10 h-10 rounded-full"
                          />
                          {isSelected && (
                            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border-2 border-gray-900">
                              <Plus className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <div className="text-left flex-1">
                          <div className={`font-medium ${isSelected ? 'text-blue-400' : 'text-white'}`}>{friend.name}</div>
                          <div className="text-xs text-gray-500">@{friend.username}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-800">
              <Button className="w-full bg-white text-black hover:bg-gray-200" onClick={() => setIsFriendModalOpen(false)}>
                Done ({formData.participants.length} selected)
              </Button>
            </div>
          </div>
        </div>
      )}
      <SmartPasteModal
        isOpen={isSmartPasteOpen}
        onClose={() => setIsSmartPasteOpen(false)}
        onParsed={handleSmartPaste}
      />
    </div>
  )
}
