"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { useAuth } from "@/contexts/auth-context"
import { apiClient, CreateHangoutData } from "@/lib/api-client"
import { useFriends } from "@/hooks/use-friends"
import { useImageUpload } from "@/hooks/use-image-upload"
import { useDraft } from "@/hooks/use-draft"
import { getOptimizedImageUrl, ImageSizes } from "@/lib/image-utils"
import { CreateHangoutSkeleton } from "@/components/loading-skeletons"
import { BusinessLocationSearch } from "@/components/business-location-search"
import { CalendarPopup } from "@/components/calendar-popup"
import { DraftIndicator } from "@/components/draft-indicator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { GeocodeResult } from "@/lib/location"

// Mock data removed - now using real data from useFriends hook

const activityPills = [
  { id: "coffee", label: "☕ Coffee", category: "food" },
  { id: "lunch", label: "🍽️ Lunch", category: "food" },
  { id: "dinner", label: "🍻 Dinner", category: "food" },
  { id: "movies", label: "🎬 Movies", category: "entertainment" },
  { id: "hiking", label: "🥾 Hiking", category: "outdoor" },
  { id: "drinks", label: "🍸 Drinks", category: "social" },
]

const quickDates = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "weekend", label: "This Weekend" },
  { id: "next-week", label: "Next Week" },
]

const quickTimes = [
  { id: "morning", label: "Morning", time: "9:00 AM" },
  { id: "afternoon", label: "Afternoon", time: "2:00 PM" },
  { id: "evening", label: "Evening", time: "7:00 PM" },
]

export default function CreateHangoutPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const { friends, isLoading: friendsLoading } = useFriends()
  const { uploadImage, isUploading: isUploadingImage, uploadError: imageUploadError } = useImageUpload()
  const { currentDraft, saveDraft, autoSave, clearCurrentDraft } = useDraft()
  
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [participantRoles, setParticipantRoles] = useState<Record<string, { isMandatory: boolean; isCoHost: boolean }>>(
    {},
  )
  const [activity, setActivity] = useState("")
  const [location, setLocation] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<GeocodeResult | null>(null)
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [customDateTime, setCustomDateTime] = useState("")
  const [showCalendar, setShowCalendar] = useState(false)
  const [showCalendarPopup, setShowCalendarPopup] = useState(false)
  const [selectedDateTime, setSelectedDateTime] = useState<{ date: Date; time: string } | null>(null)
  const [isPoll, setIsPoll] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showGroupCreation, setShowGroupCreation] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [groupPhoto, setGroupPhoto] = useState<string | null>(null)
  const [showHangoutSettings, setShowHangoutSettings] = useState(false)
  const [hangoutPhoto, setHangoutPhoto] = useState<{ url: string; filename: string } | null>(null)
  const [privacy, setPrivacy] = useState<"public" | "friends">("friends")
  const [allowFriendsToInvite, setAllowFriendsToInvite] = useState(false)
  const [pollSettings, setPollSettings] = useState({
    allowMultipleVotes: false,
    allowSuggestions: false,
    consensusType: "percentage",
    consensusPercentage: 50,
    minimumParticipants: 2,
  })
  const [rsvpSettings, setRsvpSettings] = useState({ allowSuggestions: false, hostCanEdit: true, coHostCanEdit: false })
  
  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Auto-save draft when form data changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      autoSave({
        activity,
        location,
        selectedLocation,
        selectedDateTime,
        selectedDate,
        selectedTime,
        customDateTime,
        selectedFriends,
        selectedGroups,
        participantRoles,
        privacy,
        allowFriendsToInvite,
        isPoll,
        pollSettings,
        rsvpSettings,
        hangoutPhoto,
      })
    }, 2000) // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId)
  }, [
    activity,
    location,
    selectedLocation,
    selectedDateTime,
    selectedDate,
    selectedTime,
    customDateTime,
    selectedFriends,
    selectedGroups,
    participantRoles,
    privacy,
    allowFriendsToInvite,
    isPoll,
    pollSettings,
    rsvpSettings,
    hangoutPhoto,
    autoSave,
  ])

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) => (prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]))
  }

  const toggleGroup = (groupId: string) => {
    setSelectedGroups((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]))
  }

  const removeFriend = (friendId: string) => {
    setSelectedFriends((prev) => prev.filter((id) => id !== friendId))
    setParticipantRoles((prev) => {
      const updated = { ...prev }
      delete updated[friendId]
      return updated
    })
  }

  const removeGroup = (groupId: string) => {
    setSelectedGroups((prev) => prev.filter((id) => id !== groupId))
  }

  const handleSubmit = async () => {
    // Temporarily bypass authentication check for testing
    // if (!isAuthenticated || !user) {
    //   setSubmitError("You must be logged in to create a hangout")
    //   return
    // }

    if (!activity.trim()) {
      setSubmitError("Please enter an activity")
      return
    }

    if (!selectedDateTime && (!selectedDate || !selectedTime)) {
      setSubmitError("Please select a date and time")
      return
    }

    try {
      setIsSubmitting(true)
      setSubmitError(null)

      // Combine date and time
      let startDateTime: Date
      let endDateTime: Date

      if (selectedDateTime) {
        // Use calendar popup selection
        const [time, period] = selectedDateTime.time.split(' ')
        const [hours, minutes] = time.split(':').map(Number)
        const adjustedHours = period === 'PM' && hours !== 12 ? hours + 12 : period === 'AM' && hours === 12 ? 0 : hours
        
        startDateTime = new Date(selectedDateTime.date)
        startDateTime.setHours(adjustedHours, minutes, 0, 0)
      } else {
        // Use quick selection
        const date = new Date()
        if (selectedDate === "tomorrow") {
          date.setDate(date.getDate() + 1)
        } else if (selectedDate === "next-week") {
          date.setDate(date.getDate() + 7)
        } else if (selectedDate === "next-month") {
          date.setMonth(date.getMonth() + 1)
        }
        
        const timeStr = quickTimes.find((t) => t.id === selectedTime)?.time || selectedTime
        const [time, period] = timeStr.split(' ')
        const [hours, minutes] = time.split(':').map(Number)
        const adjustedHours = period === 'PM' && hours !== 12 ? hours + 12 : period === 'AM' && hours === 12 ? 0 : hours
        
        startDateTime = new Date(date)
        startDateTime.setHours(adjustedHours, minutes, 0, 0)
      }
      
      endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000) // Default 2 hours

      const hangoutData: CreateHangoutData = {
        title: activity,
        description: activity, // Using activity as description for now
        location: selectedLocation?.displayName || location || undefined,
        latitude: selectedLocation?.latitude,
        longitude: selectedLocation?.longitude,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        privacyLevel: privacy === "public" ? "PUBLIC" : "FRIENDS_ONLY",
        maxParticipants: undefined,
        weatherEnabled: false,
        participants: selectedFriends,
      }

      console.log("🚀 Launching hangout with data:", hangoutData)
      
      const { hangout } = await apiClient.createHangout(hangoutData)
      
      console.log("✅ Hangout created successfully:", hangout)
      
      // Send push notifications to invited friends
      if (selectedFriends.length > 0) {
        try {
          await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'HANGOUT_INVITATION',
              title: `🎉 New Hangout: ${activity}`,
              message: `You've been invited to ${activity}${location ? ` at ${location}` : ''}`,
              hangoutId: hangout.id,
              recipientIds: selectedFriends,
              data: {
                hangoutId: hangout.id,
                title: activity,
                location: location,
                startTime: startDateTime.toISOString()
              }
            })
          })
          console.log("📱 Push notifications sent to friends")
        } catch (notificationError) {
          console.warn("Failed to send notifications:", notificationError)
          // Don't fail the hangout creation if notifications fail
        }
      }
      
      // Clear draft after successful creation
      clearCurrentDraft()
      
      // Show success message
      alert(`🎉 Hangout "${activity}" launched successfully! Check your feed to see it.`)
      
      // Redirect to the created hangout
      router.push(`/hangout/${hangout.id}`)
    } catch (error) {
      console.error("Error creating hangout:", error)
      setSubmitError(error instanceof Error ? error.message : "Failed to create hangout")
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleParticipantRole = (friendId: string, role: "mandatory" | "coHost") => {
    setParticipantRoles((prev) => ({
      ...prev,
      [friendId]: {
        isMandatory: role === "mandatory" ? !prev[friendId]?.isMandatory : prev[friendId]?.isMandatory || false,
        isCoHost: role === "coHost" ? !prev[friendId]?.isCoHost : prev[friendId]?.isCoHost || false,
      },
    }))
  }

  const selectedFriendObjects = friends.filter((f) => selectedFriends.includes(f.id))
  const selectedGroupObjects = [] // Groups not yet implemented in backend
  const canCreateGroup = selectedFriends.length >= 2

  // Check if form is valid for submission
  const isFormValid = activity.trim().length > 0 && (selectedDateTime || (selectedDate && selectedTime))
  const isButtonDisabled = isSubmitting || isUploadingImage || !isFormValid

  // Temporarily bypass authentication for testing
  // if (!isAuthenticated) {
  //   return (
  //     <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
  //       <div className="text-center space-y-4">
  //         <h1 className="text-2xl font-bold text-white">Please sign in to create a hangout</h1>
  //         <p className="text-gray-400">You need to be logged in to create and manage hangouts.</p>
  //         <div className="flex gap-3 justify-center">
  //           <Button asChild>
  //             <Link href="/signin">Sign In</Link>
  //           </Button>
  //           <Button variant="outline" asChild>
  //             <Link href="/signup">Sign Up</Link>
  //           </Button>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }

  // Temporarily bypass friends loading for testing
  // if (friendsLoading) {
  //   return <CreateHangoutSkeleton />
  // }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setGroupPhoto(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = () => {
    setGroupPhoto(null)
  }

  const handleHangoutPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const result = await uploadImage(file)
      if (result) {
        setHangoutPhoto({
          url: result.url,
          filename: result.filename
        })
      }
    }
  }

  const removeHangoutPhoto = () => {
    setHangoutPhoto(null)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        const result = await uploadImage(file)
        if (result) {
          setHangoutPhoto({
            url: result.url,
            filename: result.filename
          })
        }
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleLocationSelect = (location: any) => {
    // Convert BusinessResult to GeocodeResult format for compatibility
    const geocodeResult = {
      latitude: location.geometry.location.lat,
      longitude: location.geometry.location.lng,
      displayName: location.name,
      address: {
        city: location.vicinity || '',
        state: '',
        country: '',
        postcode: ''
      }
    }
    setSelectedLocation(geocodeResult)
  }

  const handleCalendarDateSelect = (date: Date, time: string) => {
    setSelectedDateTime({ date, time })
    setSelectedDate("")
    setSelectedTime("")
    setCustomDateTime("")
  }

  const handleSaveDraft = () => {
    saveDraft({
      activity,
      location,
      selectedLocation,
      selectedDateTime,
      selectedDate,
      selectedTime,
      customDateTime,
      selectedFriends,
      selectedGroups,
      participantRoles,
      privacy,
      allowFriendsToInvite,
      isPoll,
      pollSettings,
      rsvpSettings,
      hangoutPhoto,
    })
  }

  const getFormattedDateTime = () => {
    if (selectedDateTime) {
      return selectedDateTime.date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      }) + ` at ${selectedDateTime.time}`
    }

    if (customDateTime) {
      const date = new Date(customDateTime)
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    }

    if (selectedDate && selectedTime) {
      const dateLabel = quickDates.find((d) => d.id === selectedDate)?.label
      const timeLabel = quickTimes.find((t) => t.id === selectedTime)?.time
      return `${dateLabel} at ${timeLabel}`
    }

    return "Select date and time"
  }

  const getMandatoryParticipantsCount = () => {
    return Object.values(participantRoles).filter((role) => role.isMandatory).length
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            ✕
          </Button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-white">{isPoll ? "Create Poll" : "Create Hangout"}</h1>
            {currentDraft && (
              <DraftIndicator 
                isDraft={true} 
                lastUpdated={currentDraft.updatedAt}
                className="justify-center"
              />
            )}
          </div>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleHangoutPhotoUpload}
              className="hidden"
              id="hangout-photo-upload"
            />
            <label
              htmlFor="hangout-photo-upload"
              className="flex items-center justify-center w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-full cursor-pointer transition-colors"
              title="Upload hangout photo"
            >
              📷
            </label>
          </div>
        </div>

        {hangoutPhoto && (
          <div className="mt-4 relative">
            <div className="w-full h-32 bg-gray-800 rounded-lg overflow-hidden relative">
              <img 
                src={hangoutPhoto ? getOptimizedImageUrl(hangoutPhoto.url, ImageSizes.medium) : "/placeholder.svg"} 
                alt="Hangout" 
                className="w-full h-full object-cover" 
              />
              <button
                onClick={removeHangoutPhoto}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm flex items-center justify-center hover:bg-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-24 space-y-8">
        {/* WHO Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">👥 Who's invited?</h2>
            <div className="flex items-center gap-2">
              <Button
                variant={privacy === "friends" ? "default" : "outline"}
                size="sm"
                className={
                  privacy === "friends"
                    ? "bg-primary text-primary-foreground h-7 px-2 text-xs"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 h-7 px-2 text-xs"
                }
                onClick={() => setPrivacy("friends")}
              >
                Friends Only
              </Button>
              <Button
                variant={privacy === "public" ? "default" : "outline"}
                size="sm"
                className={
                  privacy === "public"
                    ? "bg-primary text-primary-foreground h-7 px-2 text-xs"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 h-7 px-2 text-xs"
                }
                onClick={() => setPrivacy("public")}
              >
                Public
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
            <div>
              <div className="text-sm font-medium text-white">Allow friends to invite others</div>
              <div className="text-xs text-gray-400">Friends can add more people to this hangout</div>
            </div>
            <Switch checked={allowFriendsToInvite} onCheckedChange={setAllowFriendsToInvite} />
          </div>

          {/* Selected Friends/Groups */}
          {(selectedFriends.length > 0 || selectedGroups.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {selectedFriendObjects.map((friend) => (
                <Badge
                  key={friend.id}
                  variant="secondary"
                  className="flex items-center gap-2 py-2 px-3 bg-gray-800 text-white relative"
                >
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={friend.avatar || "/placeholder.svg"} alt={friend.name} />
                    <AvatarFallback className="text-xs">{friend.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{friend.name}</span>
                  <div className="flex gap-1">
                    {participantRoles[friend.id]?.isMandatory && (
                      <span className="text-xs bg-red-600 text-white px-1 rounded" title="Mandatory participant">
                        !
                      </span>
                    )}
                    {participantRoles[friend.id]?.isCoHost && (
                      <span className="text-xs bg-primary text-primary-foreground px-1 rounded" title="Co-host">
                        ★
                      </span>
                    )}
                  </div>
                  <button onClick={() => removeFriend(friend.id)} className="text-gray-400 hover:text-white">
                    ×
                  </button>
                </Badge>
              ))}
              {selectedGroupObjects.map((group) => (
                <Badge
                  key={group.id}
                  variant="secondary"
                  className="flex items-center gap-2 py-2 px-3 bg-primary/20 text-primary"
                >
                  <Avatar className="w-4 h-4">
                    <AvatarImage src={group.avatar || "/placeholder.svg"} alt={group.name} />
                    <AvatarFallback className="text-xs">{group.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{group.name}</span>
                  <button onClick={() => removeGroup(group.id)} className="text-primary/70 hover:text-primary">
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {selectedFriends.length > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-medium text-white">Participant Roles</h3>
                <div className="space-y-2">
                  {selectedFriendObjects.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={friend.avatar || "/placeholder.svg"} alt={friend.name} />
                          <AvatarFallback className="text-xs">{friend.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-white">{friend.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={participantRoles[friend.id]?.isMandatory ? "default" : "outline"}
                          size="sm"
                          className={`h-7 px-2 text-xs ${
                            participantRoles[friend.id]?.isMandatory
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                          }`}
                          onClick={() => toggleParticipantRole(friend.id, "mandatory")}
                          title="Mandatory participant - must agree for poll to finalize"
                        >
                          ! Required
                        </Button>
                        <Button
                          variant={participantRoles[friend.id]?.isCoHost ? "default" : "outline"}
                          size="sm"
                          className={`h-7 px-2 text-xs ${
                            participantRoles[friend.id]?.isCoHost
                              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                              : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                          }`}
                          onClick={() => toggleParticipantRole(friend.id, "coHost")}
                          title="Co-host - can edit event details"
                        >
                          ★ Co-host
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>
                    • <strong>Required (!)</strong>: Must agree before poll finalizes
                  </div>
                  <div>
                    • <strong>Co-host (★)</strong>: Can edit event details
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
              Find Friends
            </Button>
            <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
              Select Group
            </Button>
            {canCreateGroup && (
              <Button
                variant="outline"
                size="sm"
                className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                onClick={() => setShowGroupCreation(!showGroupCreation)}
              >
                Create Group
              </Button>
            )}
          </div>

          {/* Group Creation */}
          {showGroupCreation && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-white">Create New Group</h3>

                  {/* Photo Upload Section */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {groupPhoto ? (
                        <div className="relative">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={groupPhoto || "/placeholder.svg"} alt="Group photo" />
                            <AvatarFallback className="bg-gray-700 text-white">
                              {newGroupName.charAt(0) || "G"}
                            </AvatarFallback>
                          </Avatar>
                          <button
                            onClick={removePhoto}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center border-2 border-dashed border-gray-600">
                          <span className="text-2xl">📷</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        id="group-photo-upload"
                      />
                      <label
                        htmlFor="group-photo-upload"
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-md cursor-pointer transition-colors"
                      >
                        📷 {groupPhoto ? "Change Photo" : "Add Photo"}
                      </label>
                      <p className="text-xs text-gray-400 mt-1">Optional group photo</p>
                    </div>
                  </div>

                  {/* Group Name Input */}
                  <Input
                    placeholder="Enter group name..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="bg-gray-900 border-gray-600 text-white"
                  />

                  {/* Selected Friends Preview */}
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400">Members ({selectedFriends.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedFriendObjects.slice(0, 4).map((friend) => (
                        <Avatar key={friend.id} className="w-6 h-6">
                          <AvatarImage src={friend.avatar || "/placeholder.svg"} alt={friend.name} />
                          <AvatarFallback className="text-xs">{friend.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      ))}
                      {selectedFriends.length > 4 && (
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs text-white">
                          +{selectedFriends.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={!newGroupName.trim()}
                  >
                    Create Group
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowGroupCreation(false)
                      setNewGroupName("")
                      setGroupPhoto(null)
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Friend Grid */}
          <div className="grid grid-cols-2 gap-2">
            {friends.map((friend) => (
              <Button
                key={friend.id}
                variant={selectedFriends.includes(friend.id) ? "default" : "outline"}
                className={`flex items-center gap-3 p-3 h-auto justify-start ${
                  selectedFriends.includes(friend.id)
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                }`}
                onClick={() => toggleFriend(friend.id)}
              >
                <div className="relative">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={friend.avatar || "/placeholder.svg"} alt={friend.name} />
                    <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-800 ${
                      friend.status === "online"
                        ? "bg-green-500"
                        : friend.status === "away"
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                    }`}
                  />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">{friend.name}</div>
                  <div className="text-xs opacity-70 capitalize">{friend.status}</div>
                </div>
              </Button>
            ))}
          </div>
        </section>

        {/* WHAT Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">📝 What are we doing?</h2>

          <Input
            placeholder="Coffee, lunch, movie night..."
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white text-lg py-3"
          />

          <div className="flex gap-2 flex-wrap">
            {activityPills.map((pill) => (
              <Button
                key={pill.id}
                variant={activity.toLowerCase().includes(pill.label.toLowerCase().slice(2)) ? "default" : "outline"}
                size="sm"
                className={
                  activity.toLowerCase().includes(pill.label.toLowerCase().slice(2))
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                }
                onClick={() => setActivity(pill.label.slice(2))}
              >
                {pill.label}
              </Button>
            ))}
          </div>
        </section>

        {/* WHERE Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">📍 Where should we meet?</h2>

          <BusinessLocationSearch
            value={location}
            onChange={setLocation}
            onLocationSelect={handleLocationSelect}
            placeholder="Search for a restaurant, park, or venue..."
            className="w-full"
          />
        </section>

        {/* WHEN Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">⏰ When should we hang out?</h2>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{getFormattedDateTime()}</div>
                  <div className="text-sm text-gray-400">
                    {isPoll ? "Participants will vote on time options" : "Tap to change date and time"}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  onClick={() => setShowCalendarPopup(true)}
                >
                  📅
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 flex-wrap">
            {quickDates.map((date) => (
              <Button
                key={date.id}
                variant={selectedDate === date.id ? "default" : "outline"}
                size="sm"
                className={
                  selectedDate === date.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                }
                onClick={() => {
                  setSelectedDate(date.id)
                  setCustomDateTime("")
                }}
              >
                {date.label}
              </Button>
            ))}
          </div>

          {selectedDate && (
            <div className="flex gap-2 flex-wrap">
              {quickTimes.map((time) => (
                <Button
                  key={time.id}
                  variant={selectedTime === time.id ? "default" : "outline"}
                  size="sm"
                  className={
                    selectedTime === time.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  }
                  onClick={() => setSelectedTime(time.id)}
                >
                  {time.label}
                  <span className="text-xs opacity-70 ml-1">({time.time})</span>
                </Button>
              ))}
            </div>
          )}

          {showCalendar && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-medium text-white">Custom Date & Time</h3>
                <Input
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => {
                    setCustomDateTime(e.target.value)
                    setSelectedDate("")
                    setSelectedTime("")
                  }}
                  className="bg-gray-900 border-gray-600 text-white"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCalendar(false)}
                  className="text-gray-400 hover:text-white"
                >
                  Done
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Poll Toggle */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white">Make this a poll instead</h3>
              <p className="text-sm text-gray-400">Let everyone vote on options</p>
            </div>
            <Switch checked={isPoll} onCheckedChange={setIsPoll} />
          </div>

          {/* Hangout Settings */}
          <div className="space-y-4">
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white p-0 h-auto text-sm"
              onClick={() => setShowHangoutSettings(!showHangoutSettings)}
            >
              ⚙️ Hangout Settings {showHangoutSettings ? "▼" : "▶"}
            </Button>

            {showHangoutSettings && (
              <div className="space-y-4 pl-4 border-l-2 border-gray-700">
                {isPoll ? (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4 space-y-4">
                      <h3 className="font-medium text-white">Poll Settings</h3>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-white">Allow multiple votes</div>
                            <div className="text-xs text-gray-400">Participants can vote for multiple options</div>
                          </div>
                          <Switch
                            checked={pollSettings.allowMultipleVotes}
                            onCheckedChange={(checked) =>
                              setPollSettings((prev) => ({ ...prev, allowMultipleVotes: checked }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-white">Allow suggestions</div>
                            <div className="text-xs text-gray-400">Participants can suggest other options</div>
                          </div>
                          <Switch
                            checked={pollSettings.allowSuggestions}
                            onCheckedChange={(checked) =>
                              setPollSettings((prev) => ({ ...prev, allowSuggestions: checked }))
                            }
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="text-sm font-medium text-white">Auto-finalize when:</div>

                          {getMandatoryParticipantsCount() > 0 && (
                            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
                              <div className="text-sm text-red-300 font-medium">Mandatory Participants</div>
                              <div className="text-xs text-red-400">
                                {getMandatoryParticipantsCount()} required participant(s) must agree before
                                auto-finalizing
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                id="percentage"
                                name="consensus"
                                checked={pollSettings.consensusType === "percentage"}
                                onChange={() => setPollSettings((prev) => ({ ...prev, consensusType: "percentage" }))}
                                className="text-primary"
                              />
                              <label htmlFor="percentage" className="text-sm text-white flex-1">
                                {pollSettings.consensusPercentage}% of participants agree
                              </label>
                            </div>

                            {pollSettings.consensusType === "percentage" && (
                              <div className="ml-6 space-y-2">
                                <Slider
                                  value={[pollSettings.consensusPercentage]}
                                  onValueChange={([value]) =>
                                    setPollSettings((prev) => ({ ...prev, consensusPercentage: value }))
                                  }
                                  max={100}
                                  min={50}
                                  step={5}
                                  className="w-full"
                                />
                                <div className="text-xs text-gray-400">
                                  Auto-finalize when {pollSettings.consensusPercentage}% vote for the same option
                                  {getMandatoryParticipantsCount() > 0 && " (including all required participants)"}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                id="minimum"
                                name="consensus"
                                checked={pollSettings.consensusType === "minimum"}
                                onChange={() => setPollSettings((prev) => ({ ...prev, consensusType: "minimum" }))}
                                className="text-primary"
                              />
                              <label htmlFor="minimum" className="text-sm text-white flex-1">
                                Minimum {pollSettings.minimumParticipants} participants agree
                              </label>
                            </div>

                            {pollSettings.consensusType === "minimum" && (
                              <div className="ml-6 space-y-2">
                                <Input
                                  type="number"
                                  min="2"
                                  max="20"
                                  value={pollSettings.minimumParticipants}
                                  onChange={(e) =>
                                    setPollSettings((prev) => ({
                                      ...prev,
                                      minimumParticipants: Number.parseInt(e.target.value) || 2,
                                    }))
                                  }
                                  className="bg-gray-900 border-gray-600 text-white w-20"
                                />
                                <div className="text-xs text-gray-400">
                                  Auto-finalize when {pollSettings.minimumParticipants} people vote for the same option
                                  {getMandatoryParticipantsCount() > 0 && " (including all required participants)"}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4 space-y-4">
                      <h3 className="font-medium text-white">Event Settings</h3>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-white">Allow suggestions</div>
                            <div className="text-xs text-gray-400">Participants can suggest changes to the plan</div>
                          </div>
                          <Switch
                            checked={rsvpSettings.allowSuggestions}
                            onCheckedChange={(checked) =>
                              setRsvpSettings((prev) => ({ ...prev, allowSuggestions: checked }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm font-medium text-white">Who can edit this event:</div>
                          <div className="space-y-2 ml-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="host-edit"
                                checked={rsvpSettings.hostCanEdit}
                                onChange={(e) =>
                                  setRsvpSettings((prev) => ({ ...prev, hostCanEdit: e.target.checked }))
                                }
                                className="text-primary"
                              />
                              <label htmlFor="host-edit" className="text-sm text-white">
                                Host (you)
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="cohost-edit"
                                checked={rsvpSettings.coHostCanEdit}
                                onChange={(e) =>
                                  setRsvpSettings((prev) => ({ ...prev, coHostCanEdit: e.target.checked }))
                                }
                                className="text-primary"
                              />
                              <label htmlFor="cohost-edit" className="text-sm text-white">
                                Co-hosts
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Advanced Features */}
        <section className="space-y-4">
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white p-0 h-auto"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            + Advanced Options
          </Button>

          {showAdvanced && (
            <div className="space-y-4 pl-4 border-l-2 border-gray-800">
              <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                + Add Tasks
              </Button>
              <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                + Add Agenda
              </Button>
              <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                + Event Settings
              </Button>
            </div>
          )}
        </section>

        {/* Live Preview */}
        <section className="space-y-4">
          <h3 className="font-medium text-white">Preview</h3>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="relative">
                <div 
                  className={`w-full h-32 bg-gray-700 rounded-lg mb-4 border-2 border-dashed transition-colors cursor-pointer ${
                    isDragOver 
                      ? 'border-blue-400 bg-blue-900/20' 
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onClick={() => document.getElementById('hangout-photo-upload')?.click()}
                >
                  {hangoutPhoto ? (
                    <div className="w-full h-full overflow-hidden rounded-lg">
                      <img 
                        src={getOptimizedImageUrl(hangoutPhoto.url, ImageSizes.medium)} 
                        alt="Hangout" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <div className="text-4xl mb-2">🎉</div>
                      <p className="text-sm">
                        {isDragOver ? 'Drop photo here' : 'Click or drag to upload photo'}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Image Upload Error */}
                {imageUploadError && (
                  <div className="absolute top-2 left-2 right-2">
                    <Alert variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3" />
                      <AlertDescription>{imageUploadError}</AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Photo Upload/Remove Buttons */}
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <input
                    type="file"
                    id="hangout-photo-upload"
                    accept="image/*"
                    onChange={handleHangoutPhotoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                    onClick={() => document.getElementById('hangout-photo-upload')?.click()}
                    disabled={isUploadingImage}
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      hangoutPhoto ? '📷 Change' : '📷 Upload'
                    )}
                  </Button>
                  {hangoutPhoto && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red-500/80 hover:bg-red-600/80 text-white"
                      onClick={removeHangoutPhoto}
                    >
                      ✕ Remove
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>You</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-white">
                      {activity || (isPoll ? "New Poll" : "New Hangout")}
                      {isPoll && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          POLL
                        </Badge>
                      )}
                      <Badge variant="outline" className="ml-2 text-xs border-gray-600 text-gray-400">
                        {privacy === "public" ? "🌍 Public" : "👥 Friends"}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-400">{getFormattedDateTime()}</div>
                  </div>
                </div>
                {location && <div className="text-sm text-gray-400">📍 {location}</div>}
                <div className="flex gap-2">
                  {isPoll ? (
                    <>
                      <Button size="sm" className="bg-primary text-primary-foreground">
                        Vote
                      </Button>
                      {pollSettings.allowSuggestions && (
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 bg-transparent">
                          + Suggest
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                        ✓ Going
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-white bg-transparent"
                      >
                        ? Maybe
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white bg-transparent"
                      >
                        ✗ Can't
                      </Button>
                      {rsvpSettings.allowSuggestions && (
                        <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 bg-transparent">
                          💡 Suggest
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Error Display */}
      {submitError && (
        <div className="fixed top-4 left-4 right-4 z-50">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 pb-8 space-y-4">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            onClick={handleSaveDraft}
          >
            Save Draft
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isButtonDisabled}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              isPoll ? "Create Poll" : "🚀 Launch Hangout"
            )}
          </Button>
        </div>
      </div>

      {/* Calendar Popup */}
      <CalendarPopup
        isOpen={showCalendarPopup}
        onClose={() => setShowCalendarPopup(false)}
        onDateSelect={handleCalendarDateSelect}
        selectedDate={selectedDateTime?.date}
        selectedTime={selectedDateTime?.time}
      />
    </div>
  )
}
