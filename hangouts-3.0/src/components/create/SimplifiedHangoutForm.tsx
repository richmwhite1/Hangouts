'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { SimpleDateTimePicker } from '@/components/ui/simple-datetime-picker'
import { GoogleMapsAutocomplete } from '@/components/ui/google-maps-autocomplete'
import { Mic, Sparkles, Users, Clock, MapPin, Calendar as CalendarIcon, X } from 'lucide-react'
import { AIAutoComplete } from '@/components/create/AIAutoComplete'
import { InviteFriendsBar } from '@/components/create/InviteFriendsBar'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { logger } from '@/lib/logger'

interface Friend {
  id: string
  name: string
  username: string
  avatar: string
}

interface SimplifiedHangoutFormProps {
  onSubmit: (data: any) => void
  isLoading?: boolean
  onDataChange?: (data: { title: string; dateTime: string; location: string; participants: string[] }) => void
}

/**
 * Simplified Hangout Form - Progressive Disclosure Design
 * 
 * Flow:
 * 1. Single input: "What are you planning?"
 * 2. Quick suggestions appear
 * 3. Essential fields shown (When, Where, Who)
 * 
 * Goal: 30 seconds, 3-4 taps to create
 */
export function SimplifiedHangoutForm({ onSubmit, isLoading = false, onDataChange }: SimplifiedHangoutFormProps) {
  const { getToken } = useAuth()
  
  // Core state - only essentials
  const [title, setTitle] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [location, setLocation] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  
  // UI state
  const [stage, setStage] = useState<'input' | 'details' | 'complete'>('input')
  const [isVoiceRecording, setIsVoiceRecording] = useState(false)
  const [allFriends, setAllFriends] = useState<Friend[]>([])
  const [recentTitles, setRecentTitles] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false)

  // Quick templates
  const quickTemplates = [
    { emoji: '☕', title: 'Coffee catch-up', icon: 'coffee' },
    { emoji: '🍽️', title: 'Dinner plans', icon: 'utensils' },
    { emoji: '🍺', title: 'Friday drinks', icon: 'beer' },
    { emoji: '🎮', title: 'Game night', icon: 'gamepad' },
    { emoji: '🏃', title: 'Weekend hike', icon: 'mountain' },
    { emoji: '🎬', title: 'Movie night', icon: 'film' },
  ]

  // Load friends on mount
  useEffect(() => {
    fetchFriends()
    loadRecentTitles()
    setSmartDefaults()
  }, [])

  const fetchFriends = async () => {
    try {
      const token = await getToken()
      const response = await fetch('/api/friends', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        const friendsMap = new Map<string, Friend>()
        
        // Process friends and deduplicate by friend.id
        ;(data.friends || []).forEach((f: any) => {
          // The API returns { id, friend: {}, status, createdAt }
          if (f.friend && f.friend.id && !friendsMap.has(f.friend.id)) {
            friendsMap.set(f.friend.id, {
              id: f.friend.id,
              name: f.friend.name || '',
              username: f.friend.username || '',
              avatar: f.friend.avatar || ''
            })
          }
        })
        
        const uniqueFriends = Array.from(friendsMap.values())
        logger.info('Friends loaded:', { total: data.friends?.length || 0, unique: uniqueFriends.length })
        setAllFriends(uniqueFriends)
      }
    } catch (error) {
      logger.error('Error fetching friends:', error)
    }
  }

  const loadRecentTitles = () => {
    // Load from localStorage
    const recent = localStorage.getItem('recentHangoutTitles')
    if (recent) {
      setRecentTitles(JSON.parse(recent).slice(0, 3))
    }
  }

  const setSmartDefaults = () => {
    // Default: Tomorrow at 7pm
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(19, 0, 0, 0)
    setDateTime(tomorrow.toISOString())

    // Try to get user's location for suggestions
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // Location obtained - can be used for suggestions later
        },
        () => {
          // Silently fail - not critical
        }
      )
    }
  }

  const handleTitleChange = (value: string) => {
    setTitle(value)
    setShowSuggestions(value.length > 0)
    
    // Auto-advance when title is substantial
    if (value.length > 3 && stage === 'input') {
      setTimeout(() => setStage('details'), 300)
    }
    
    // Notify parent of data changes
    if (onDataChange) {
      onDataChange({ title: value, dateTime, location, participants: selectedFriends })
    }
  }

  const handleDateTimeChange = (value: string) => {
    setDateTime(value)
    if (onDataChange) {
      onDataChange({ title, dateTime: value, location, participants: selectedFriends })
    }
  }

  const handleLocationChange = (value: string) => {
    setLocation(value)
    if (onDataChange) {
      onDataChange({ title, dateTime, location: value, participants: selectedFriends })
    }
  }

  const handleQuickTemplate = (template: string) => {
    setTitle(template)
    setStage('details')
    setShowSuggestions(false)
    if (onDataChange) {
      onDataChange({ title: template, dateTime, location, participants: selectedFriends })
    }
  }

  const handleVoiceInput = async () => {
    setIsVoiceRecording(true)
    
    try {
      // Check if browser supports speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      
      if (!SpeechRecognition) {
        toast.error('Voice input not supported in this browser')
        setIsVoiceRecording(false)
        return
      }

      const recognition = new SpeechRecognition()
      recognition.lang = 'en-US'
      recognition.interimResults = false
      recognition.maxAlternatives = 1

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setTitle(transcript)
        setStage('details')
        toast.success('Voice input captured!')
      }

      recognition.onerror = (event: any) => {
        logger.error('Speech recognition error:', event.error)
        toast.error('Could not capture voice input')
      }

      recognition.onend = () => {
        setIsVoiceRecording(false)
      }

      recognition.start()
      toast.info('Listening... speak now!')
    } catch (error) {
      logger.error('Voice input error:', error)
      toast.error('Voice input failed')
      setIsVoiceRecording(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    if (!dateTime) {
      toast.error('Please select a date and time')
      return
    }

    // Save to recent titles
    const recent = [title, ...recentTitles.filter(t => t !== title)].slice(0, 5)
    localStorage.setItem('recentHangoutTitles', JSON.stringify(recent))

    // Trigger celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    })

    // Submit with simplified data structure
    onSubmit({
      title,
      location: location || null,
      participants: selectedFriends,
      type: 'quick_plan', // Default to simple plan, not voting
      privacyLevel: 'PUBLIC',
      options: [{
        id: `option_${Date.now()}`,
        title: title,
        location: location || '',
        dateTime: dateTime,
        description: '',
        price: 0
      }]
    })
  }

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => {
      const updated = prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
      
      // Notify parent of data changes
      if (onDataChange) {
        onDataChange({ title, dateTime, location, participants: updated })
      }
      
      return updated
    })
  }

  const removeFriend = (friendId: string) => {
    setSelectedFriends(prev => prev.filter(id => id !== friendId))
  }

  // Get invited friends with details for InviteFriendsBar
  const invitedFriendsWithDetails = allFriends.filter(friend => selectedFriends.includes(friend.id))

  const progress = () => {
    let completed = 0
    let total = 3 // title, dateTime, and at least viewing the form
    
    if (title.trim()) completed++
    if (dateTime) completed++
    if (location || selectedFriends.length > 0) completed++
    
    return { completed, total, percentage: Math.round((completed / total) * 100) }
  }

  const progressData = progress()

  return (
    <>
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-6 pb-64 sm:pb-0">
      {/* Stage 1: Initial Input - The "Magic" Entry Point */}
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">What are you planning?</h2>
          </div>
          
          <div className="relative">
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g., Coffee tomorrow, Weekend brunch, Game night..."
              className="bg-black/40 border-purple-500/50 text-white placeholder:text-gray-400 text-lg h-14 pr-14"
              autoFocus
              disabled={isLoading}
            />
            
            {/* Voice Input Button */}
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={isVoiceRecording || isLoading}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${
                isVoiceRecording 
                  ? 'bg-red-500 animate-pulse' 
                  : 'bg-purple-600 hover:bg-purple-500'
              }`}
              title="Voice input"
            >
              <Mic className="w-5 h-5 text-white" />
            </button>
            
            {/* AI Auto-Complete */}
            <AIAutoComplete
              input={title}
              onSelect={(suggestion) => {
                setTitle(suggestion)
                setStage('details')
                setShowSuggestions(false)
              }}
              enabled={title.length >= 3 && stage === 'input'}
            />
          </div>

          {/* Quick Templates - Always visible when no title */}
          {!title && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Quick ideas:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {quickTemplates.map((template) => (
                  <button
                    key={template.title}
                    type="button"
                    onClick={() => handleQuickTemplate(template.title)}
                    className="flex items-center gap-2 p-3 bg-black/40 hover:bg-purple-600/20 border border-gray-700 hover:border-purple-500/50 rounded-lg transition-colors text-left"
                  >
                    <span className="text-2xl">{template.emoji}</span>
                    <span className="text-sm text-white">{template.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Titles - Show when typing */}
          {showSuggestions && recentTitles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Recent hangouts:</p>
              <div className="flex flex-wrap gap-2">
                {recentTitles.map((recent, idx) => (
                  <Badge
                    key={idx}
                    onClick={() => handleQuickTemplate(recent)}
                    className="cursor-pointer bg-gray-800 hover:bg-purple-600 text-white border-gray-700 hover:border-purple-500"
                  >
                    {recent}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Stage 2: Essential Details - Only show after title is entered */}
      {stage !== 'input' && (
        <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
          {/* When */}
          <Card className="bg-black border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-blue-400" />
              <label className="text-white font-medium">When?</label>
            </div>
            <SimpleDateTimePicker
              value={dateTime}
              onChange={handleDateTimeChange}
              placeholder="Select date and time"
              className="w-full"
            />
          </Card>

          {/* Where - Moved before Who so suggestions are visible */}
          <Card className="bg-black border-gray-700 p-4 relative" style={{ zIndex: 100 }}>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-green-400" />
              <label className="text-white font-medium">Where?</label>
              <span className="text-sm text-gray-400">(optional)</span>
            </div>
            <div className="relative" style={{ zIndex: 1000 }}>
              <GoogleMapsAutocomplete
                value={location}
                onChange={handleLocationChange}
                placeholder="Search for a location..."
                className="w-full"
              />
            </div>
            {/* Note: Google Maps autocomplete shows suggestions automatically */}
          </Card>

          {/* Who */}
          <Card className="bg-black border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <label className="text-white font-medium">Who's invited?</label>
                <span className="text-sm text-gray-400">(optional)</span>
              </div>
              <Badge variant="secondary" className="bg-purple-600/20 text-purple-400">
                {selectedFriends.length} selected
              </Badge>
            </div>
            
            {allFriends.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {allFriends.slice(0, 12).map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => toggleFriend(friend.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                      selectedFriends.includes(friend.id)
                        ? 'bg-purple-600/20 border-purple-500'
                        : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    <img
                      src={friend.avatar || '/placeholder-avatar.png'}
                      alt={friend.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-sm text-white truncate">{friend.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                No friends yet. Add friends to invite them!
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Submit Button - Fixed at bottom */}
      {stage !== 'input' && (
        <div 
          className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-700 p-4 space-y-3 z-[60] shadow-2xl sm:relative sm:border-t-0 sm:bg-transparent sm:mt-6 sm:z-auto" 
          style={{ 
            paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom) + 12px))',
            bottom: '0px' // Ensure it's at the very bottom
          }}
        >
          {/* Progress Indicator */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Almost done!</span>
              <span>{progressData.completed} of {progressData.total} complete</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressData.percentage}%` }}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !title || !dateTime}
            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading ? 'Creating...' : 'Create Hangout 🎉'}
          </Button>
        </div>
      )}
    </form>

    {/* Floating Invite Friends Bar - Positioned above submit button on mobile */}
    {stage !== 'input' && (
      <div className="fixed left-0 right-0 z-[55] sm:hidden" style={{ bottom: 'calc(220px + env(safe-area-inset-bottom, 0px))' }}>
        <InviteFriendsBar
          invitedFriends={invitedFriendsWithDetails}
          onOpenModal={() => setIsFriendModalOpen(true)}
          onRemoveFriend={removeFriend}
          mandatoryParticipants={[]}
          coHosts={[]}
        />
      </div>
    )}
    {/* Invite Friends Bar - Desktop version */}
    {stage !== 'input' && (
      <div className="hidden sm:block">
        <InviteFriendsBar
          invitedFriends={invitedFriendsWithDetails}
          onOpenModal={() => setIsFriendModalOpen(true)}
          onRemoveFriend={removeFriend}
          mandatoryParticipants={[]}
          coHosts={[]}
        />
      </div>
    )}

    {/* Friend Selection Modal */}
    {isFriendModalOpen && (
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setIsFriendModalOpen(false)}
      >
        <div
          className="bg-black border border-gray-700 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Invite Friends</h2>
            <button
              type="button"
              onClick={() => setIsFriendModalOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {allFriends.length > 0 ? (
              <div className="space-y-2">
                {allFriends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => {
                      toggleFriend(friend.id)
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedFriends.includes(friend.id)
                        ? 'bg-purple-600/20 border-purple-500'
                        : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    <img
                      src={friend.avatar || '/placeholder-avatar.png'}
                      alt={friend.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">{friend.name}</p>
                      {friend.username && (
                        <p className="text-sm text-gray-400">@{friend.username}</p>
                      )}
                    </div>
                    {selectedFriends.includes(friend.id) && (
                      <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                        <X className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">
                No friends yet. Add friends to invite them!
              </p>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-700">
            <Button
              type="button"
              onClick={() => setIsFriendModalOpen(false)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
