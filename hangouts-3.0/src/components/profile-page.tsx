"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useEffect, useRef } from "react"
import { useProfile } from "@/hooks/use-profile"
import { useAuth } from "@clerk/nextjs"
import { useImageUpload } from "@/hooks/use-image-upload"
import { Loader2, Upload, X, Save, Edit, Users, Calendar, MapPin, Coffee, Moon, TreePine, Gamepad2, Plus } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { logger } from '@/lib/logger'
export function ProfilePage() {
  const [mounted, setMounted] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState<'profile' | 'background' | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    location: '',
    zodiac: '',
    enneagram: '',
    bigFive: '',
    loveLanguage: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [userPreferences, setUserPreferences] = useState<Array<{id: string, name: string, icon?: React.ReactNode, color?: string, isCustom?: boolean}>>([])
  const [favoritePlaces, setFavoritePlaces] = useState<Array<{id: string, title: string, mapLink?: string}>>([])
  const [newPreference, setNewPreference] = useState("")
  const [newPlace, setNewPlace] = useState("")
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { isSignedIn, isLoaded, signOut } = useAuth()
  const { profile, userHangouts, isLoading, error, refetch, updateProfile } = useProfile()
  const { uploadImage, updateProfile: updateProfileImage, isUploading, error: uploadError, clearError } = useImageUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect non-authenticated users to home page
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = '/'
    }
  }, [isSignedIn, isLoaded])

  // Initialize edit form when profile loads
  useEffect(() => {
    if (profile) {
      // Parse bio field for activities and places
      let bioData: { text?: string; favoriteActivities?: string[]; favoritePlaces?: string[] } = {}
      let bioText = ''
      
      try {
        bioData = profile.bio ? JSON.parse(profile.bio) : {}
        bioText = bioData.text || ''
      } catch (e) {
        // If bio is not JSON, treat it as plain text
        bioText = profile.bio || ''
        bioData = { text: bioText }
      }

      setEditForm({
        name: profile.name || '',
        bio: bioText,
        location: profile.location || '',
        zodiac: profile.zodiac || '',
        enneagram: profile.enneagram || '',
        bigFive: profile.bigFive || '',
        loveLanguage: profile.loveLanguage || ''
      })
      
      // Initialize favorite activities and places from bio data
      console.log('🔍 Loading profile data from bio:', {
        bioData,
        bioText
      })
      
      if (bioData.favoriteActivities && Array.isArray(bioData.favoriteActivities)) {
        const activities = bioData.favoriteActivities.map((activity: string, index: number) => ({
          id: `activity_${index}`,
          name: activity,
          isCustom: true
        }))
        console.log('🔍 Setting activities from bio:', activities)
        setUserPreferences(activities)
      }
      
      if (bioData.favoritePlaces && Array.isArray(bioData.favoritePlaces)) {
        const places = bioData.favoritePlaces.map((place: string, index: number) => ({
          id: `place_${index}`,
          title: place,
          mapLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
        }))
        console.log('🔍 Setting places from bio:', places)
        setFavoritePlaces(places)
      }
    }
  }, [profile])

  // Early return for non-authenticated users - must be after all hooks
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please sign in to view your profile</h2>
          <p className="text-gray-400 mb-6">Redirecting to home page...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-gray-400">{!isLoaded ? 'Authenticating...' : 'Loading profile...'}</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load profile</p>
          <p className="text-gray-400">There was an error loading your profile data.</p>
          <div className="mt-6">
            <button 
              onClick={() => window.location.reload()} 
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const recentHangouts = (Array.isArray(userHangouts) ? userHangouts : []).slice(0, 6).map(hangout => ({
    id: hangout.id,
    title: hangout.title,
    location: hangout.location,
    time: new Date(hangout.startTime).toLocaleDateString(),
    participants: hangout.participants,
    status: hangout.creatorId === profile.id ? "hosted" : "attended",
    image: hangout.image || "/default-hangout-friends.png",
    _count: hangout._count
  }))

  const handlePhotoUpload = (type: "profile" | "background") => {
    setShowUploadModal(type)
    setUploadPreview(null)
    if (clearError) {
      clearError()
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      logger.warn('Invalid file type selected');
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      logger.warn('File too large');
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setUploadPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file || !showUploadModal) return

    try {
      const result = await uploadImage(file, showUploadModal)
      if (result) {
        // Update profile with new image
        const updateData = showUploadModal === 'profile' 
          ? { avatar: result.url }
          : { backgroundImage: result.url }
        
        const updatedUser = await updateProfile(updateData)
        if (updatedUser) {
          // Refresh profile data
          await refetch()
          setShowUploadModal(null)
          setUploadPreview(null)
          // Success - no popup needed
        } else {
          logger.error('Failed to update profile');
        }
      } else {
        logger.error('Failed to upload image');
      }
    } catch (error) {
      logger.error('Upload error:', error);
    }
  }

  const cancelUpload = () => {
    setShowUploadModal(null)
    setUploadPreview(null)
    if (clearError) {
      clearError()
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleEditProfile = () => {
    setShowEditModal(true)
  }

  const handleSaveProfile = async () => {
    if (!profile) return

    setIsSaving(true)
    try {
      const activities = userPreferences.map(p => p.name)
      const places = favoritePlaces.map(p => p.title)
      
      // Create bio data with activities and places
      const bioData = {
        text: editForm.bio,
        favoriteActivities: activities,
        favoritePlaces: places
      }
      
      console.log('🔍 Saving profile with bio data:', {
        bioData,
        activities,
        places
      })
      
      const updatedUser = await updateProfile({
        name: editForm.name,
        bio: JSON.stringify(bioData),
        location: editForm.location,
        zodiac: editForm.zodiac,
        enneagram: editForm.enneagram,
        bigFive: editForm.bigFive,
        loveLanguage: editForm.loveLanguage,
        favoriteActivities: activities,
        favoritePlaces: places
      })

      if (updatedUser) {
        // Refresh profile data
        await refetch()
        setShowEditModal(false)
        // Success - no popup needed
      } else {
        logger.error('Failed to update profile');
      }
    } catch (error) {
      logger.error('Profile update error:', error);
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deleteConfirmed) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/profile/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirmed: true })
      })

      const data = await response.json()

      if (data.success) {
        // Show success message briefly before sign out
        alert(`Account deletion scheduled. You have 30 days to change your mind.`)
        // Clerk will handle sign out via their deletion
        window.location.href = '/'
      } else {
        alert(data.message || 'Failed to delete account. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('An error occurred while deleting your account. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirmation(false)
      setDeleteConfirmed(false)
    }
  }

  const handleCancelEdit = () => {
    if (profile) {
      setEditForm({
        name: profile.name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        zodiac: profile.zodiac || '',
        enneagram: profile.enneagram || '',
        bigFive: profile.bigFive || '',
        loveLanguage: profile.loveLanguage || ''
      })
    }
    setShowEditModal(false)
  }

  const handleAddPreference = () => {
    if (newPreference.trim()) {
      const newPref = {
        id: `custom_${Date.now()}`,
        name: newPreference.trim(),
        isCustom: true,
        color: 'bg-gray-600'
      }
      setUserPreferences([...userPreferences, newPref])
      setNewPreference("")
    }
  }

  const handleAddPlace = () => {
    if (newPlace.trim()) {
      const newPlaceObj = {
        id: `place_${Date.now()}`,
        title: newPlace.trim(),
        mapLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(newPlace.trim())}`
      }
      setFavoritePlaces([...favoritePlaces, newPlaceObj])
      setNewPlace("")
    }
  }


  return (
    <div className="space-y-6">
      {/* Full-width background image */}
      <div className="relative h-64 w-full overflow-hidden">
        {profile.backgroundImage ? (
          <img
            src={profile.backgroundImage}
            alt="Background"
            className="w-full h-full object-cover"
            onError={(e) => {
              logger.error('Background image failed to load:', profile.backgroundImage);
              e.currentTarget.style.display = 'none'
            }}
            onLoad={() => {
              // console.log('Background image loaded successfully:', profile.backgroundImage); // Removed for production
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
        )}
        <button
          onClick={() => handlePhotoUpload("background")}
          className="absolute top-4 right-4 text-xs text-white/70 hover:text-white bg-black/20 hover:bg-black/40 px-2 py-1 rounded flex items-center gap-1"
        >
          <Upload className="w-3 h-3" />
          Background
        </button>
      </div>

      {/* Profile content in centered container */}
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardContent className="p-6 text-center -mt-48 relative">
            <div className="relative inline-block">
              <Avatar className="w-72 h-72 mx-auto mb-4 border-4 border-background rounded-lg">
                <AvatarImage src={profile.avatar || "/placeholder-avatar.png"} alt={profile.name} className="rounded-lg" />
                <AvatarFallback className="text-6xl rounded-lg">{profile.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => handlePhotoUpload("profile")}
                className="absolute bottom-4 right-4 text-sm bg-primary hover:bg-primary/90 text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>

            <h1 className="text-2xl font-bold mb-1">{profile.name}</h1>
            <p className="text-muted-foreground text-sm mb-3">@{profile.username}</p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="text-sm max-w-md text-center">
                <p className="mb-2">{editForm.bio || 'No bio yet'}</p>
                
                {/* Personality Information */}
                {(profile.zodiac || profile.enneagram || profile.bigFive || profile.loveLanguage) && (
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    {profile.zodiac && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
                        ♈ {profile.zodiac}
                      </span>
                    )}
                    {profile.enneagram && (
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-500/30">
                        🔢 {profile.enneagram}
                      </span>
                    )}
                    {profile.bigFive && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                        🧠 {profile.bigFive}
                      </span>
                    )}
                    {profile.loveLanguage && (
                      <span className="px-2 py-1 bg-pink-500/20 text-pink-300 text-xs rounded-full border border-pink-500/30">
                        💕 {profile.loveLanguage}
                      </span>
                    )}
                  </div>
                )}

                {/* Favorite Activities */}
                {userPreferences.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 text-center">Favorite Activities</h4>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {userPreferences.map((pref) => (
                        <span key={pref.id} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                          {pref.icon} {pref.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Favorite Places */}
                {favoritePlaces.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 text-center">Favorite Places</h4>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {favoritePlaces.map((place) => (
                        <span 
                          key={place.id} 
                          className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/30 transition-colors"
                          onClick={() => place.mapLink && window.open(place.mapLink, '_blank', 'noopener,noreferrer')}
                          title="Click to view on map"
                        >
                          📍 {place.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleEditProfile}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                title="Edit Profile"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>


            <div className="flex justify-center">
              <Button
                onClick={async () => {
                  try {
                    await signOut({ redirectUrl: '/' })
                  } catch (error) {
                    console.error('Sign out error:', error)
                    // Force redirect even if signOut fails
                    window.location.href = '/'
                  }
                }}
                variant="outline"
                size="sm"
                className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>


      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Recent Activity</h3>
          {recentHangouts.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="flex space-x-4 pb-2" style={{ width: 'max-content' }}>
                {recentHangouts.slice(0, 6).map((hangout, index) => (
                  <Link key={index} href={`/hangout/${hangout.id}`}>
                    <div className="group hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden bg-card border-border relative transform hover:scale-[1.02] flex-shrink-0" style={{ width: '300px' }}>
                    {/* Full Image Background with Editorial Overlay */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={hangout.image || "/default-hangout-friends.png"}
                        alt={hangout.title || "Hangout"}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                          if (e.currentTarget.src !== '/default-hangout-friends.png') {
                            e.currentTarget.src = '/default-hangout-friends.png'
                          }
                        }}
                      />
                      
                      {/* Dark gradient overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                      
                      {/* Top Row - Status Badge */}
                      <div className="absolute top-4 right-4">
                        <div className="bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium">
                          {hangout.status === "hosted" ? "👑 Hosted" : "✓ Attended"}
                        </div>
                      </div>

                      {/* Bottom Content Overlay - Editorial Style */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        {/* Title - Large and Bold */}
                        <h4 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-yellow-300 transition-colors drop-shadow-lg">
                          {hangout.title}
                        </h4>
                        
                        {/* Event Details - Horizontal Layout */}
                        <div className="flex items-center space-x-4 mb-2 text-xs">
                          {hangout.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3 text-white/80" />
                              <span className="text-white/90 line-clamp-1">{hangout.location}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-white/80" />
                            <span className="text-white/90">{hangout.time}</span>
                          </div>
                        </div>

                        {/* Bottom Row - Participants */}
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3 text-white/80" />
                            <span className="text-xs text-white/90">
                              {hangout._count?.participants || (Array.isArray(hangout.participants) ? hangout.participants.length : 0)} people
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hangouts yet</p>
              <p className="text-sm">Create your first hangout to get started!</p>
            </div>
          )}
          </CardContent>
        </Card>
      </div>


      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Upload {showUploadModal === 'profile' ? 'Profile' : 'Background'} Photo
              </h3>
              <button
                onClick={cancelUpload}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadPreview ? (
              <div className="space-y-4">
                <div className="relative w-full h-48 rounded-lg overflow-hidden">
                  <Image
                    src={uploadPreview}
                    alt="Preview"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                
                {uploadError && (
                  <div className="text-red-500 text-sm">{uploadError}</div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Upload Photo'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelUpload}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Select an image file to upload
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Supported formats: JPEG, PNG, WebP, GIF</p>
                  <p>• Maximum size: 10MB</p>
                  <p>• Images will be automatically optimized</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full border-2 border-red-500/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-500">Delete Account</h3>
              <button
                onClick={() => {
                  setShowDeleteConfirmation(false)
                  setDeleteConfirmed(false)
                }}
                className="text-muted-foreground hover:text-foreground"
                disabled={isDeleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. Your account will be scheduled for permanent deletion in 30 days.
              </p>

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-sm font-medium text-red-400 mb-2">You will lose:</p>
                <ul className="text-sm text-red-300 space-y-1 list-disc list-inside">
                  <li>All your profile data and settings</li>
                  <li>All events and hangouts you created</li>
                  <li>All messages and conversations</li>
                  <li>All friendships and connections</li>
                  <li>All saved events and RSVPs</li>
                </ul>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <input
                  type="checkbox"
                  id="delete-confirm"
                  checked={deleteConfirmed}
                  onChange={(e) => setDeleteConfirmed(e.target.checked)}
                  className="w-4 h-4 mt-0.5"
                  disabled={isDeleting}
                />
                <label htmlFor="delete-confirm" className="text-sm text-foreground flex-1 cursor-pointer">
                  I understand this action cannot be undone and I want to permanently delete my account
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirmation(false)
                    setDeleteConfirmed(false)
                  }}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  Keep my account
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={!deleteConfirmed || isDeleting}
                  className="flex-1"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete permanently'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Profile Settings</h3>
              <button
                onClick={handleCancelEdit}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Profile Information */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-muted-foreground">Profile Information</h4>
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium mb-2">
                    Name
                  </label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your name"
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="edit-bio" className="block text-sm font-medium mb-2">
                    Bio
                  </label>
                  <Textarea
                    id="edit-bio"
                    value={editForm.bio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself"
                    className="w-full min-h-[80px]"
                  />
                </div>

                <div>
                  <label htmlFor="edit-location" className="block text-sm font-medium mb-2">
                    Location
                  </label>
                  <Input
                    id="edit-location"
                    value={editForm.location}
                    onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Enter your location"
                    className="w-full"
                  />
                </div>

                {/* Personality Fields */}
                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-muted-foreground">Personality (Optional)</h5>
                  
                  <div>
                    <label htmlFor="edit-zodiac" className="block text-sm font-medium mb-2">
                      ♈ Zodiac Sign
                    </label>
                    <Input
                      id="edit-zodiac"
                      value={editForm.zodiac}
                      onChange={(e) => setEditForm(prev => ({ ...prev, zodiac: e.target.value }))}
                      placeholder="e.g., Scorpio, Aquarius, Cancer..."
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-enneagram" className="block text-sm font-medium mb-2">
                      🔢 Enneagram Type
                    </label>
                    <Input
                      id="edit-enneagram"
                      value={editForm.enneagram}
                      onChange={(e) => setEditForm(prev => ({ ...prev, enneagram: e.target.value }))}
                      placeholder="e.g., Type 3, Type 7w8, Type 4w5..."
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-big-five" className="block text-sm font-medium mb-2">
                      🧠 Big 5 Personality
                    </label>
                    <Input
                      id="edit-big-five"
                      value={editForm.bigFive}
                      onChange={(e) => setEditForm(prev => ({ ...prev, bigFive: e.target.value }))}
                      placeholder="e.g., High Openness, Low Neuroticism..."
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-love-language" className="block text-sm font-medium mb-2">
                      💕 Love Language
                    </label>
                    <Input
                      id="edit-love-language"
                      value={editForm.loveLanguage}
                      onChange={(e) => setEditForm(prev => ({ ...prev, loveLanguage: e.target.value }))}
                      placeholder="e.g., Words of Affirmation, Quality Time..."
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Favorite Activities */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-muted-foreground">Favorite Activities</h4>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {userPreferences.map((pref) => (
                      <span key={pref.id} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30 flex items-center gap-1">
                        {pref.icon} {pref.name}
                        <button
                          onClick={() => setUserPreferences(prev => prev.filter(p => p.id !== pref.id))}
                          className="ml-1 hover:text-red-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add activity (e.g., Coffee, Hiking, Music)"
                      value={newPreference}
                      onChange={(e) => setNewPreference(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddPreference()
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddPreference}
                      disabled={!newPreference.trim()}
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Favorite Places */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-muted-foreground">Favorite Places</h4>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {favoritePlaces.map((place) => (
                      <span key={place.id} className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/30 flex items-center gap-1">
                        📍 {place.title}
                        <button
                          onClick={() => setFavoritePlaces(prev => prev.filter(p => p.id !== place.id))}
                          className="ml-1 hover:text-red-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add place (e.g., Central Park, Blue Bottle Coffee)"
                      value={newPlace}
                      onChange={(e) => setNewPlace(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddPlace()
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddPlace}
                      disabled={!newPlace.trim()}
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Privacy Settings */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-muted-foreground">Privacy Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="strangers" defaultChecked className="w-4 h-4" />
                    <label htmlFor="strangers" className="text-sm">Allow strangers to invite you to hangouts</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="friends-of-friends" defaultChecked className="w-4 h-4" />
                    <label htmlFor="friends-of-friends" className="text-sm">Only allow friends of friends to invite you</label>
                  </div>
                </div>
              </div>

              {/* Account Management */}
              <div className="space-y-4 border-t border-border pt-6 mt-6">
                <h4 className="text-md font-medium text-red-500">Danger Zone</h4>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Once you delete your account, there is no going back. This action will:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Permanently remove your profile and personal information</li>
                    <li>Delete all your created events and hangouts</li>
                    <li>Remove you from all conversations and groups</li>
                    <li>Cancel all your RSVPs and saved events</li>
                  </ul>
                  <Button
                    variant="destructive"
                    className="w-full mt-4"
                    onClick={() => setShowDeleteConfirmation(true)}
                  >
                    Delete My Account
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving || !editForm.name.trim()}
                  className="flex-1 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
