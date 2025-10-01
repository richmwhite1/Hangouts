"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PreferencesAndPlaces } from "@/components/profile/preferences-and-places"
import { useState, useEffect, useRef } from "react"
import { useProfile } from "@/hooks/use-profile"
import { useAuth } from "@/contexts/auth-context"
import { useImageUpload } from "@/hooks/use-image-upload"
import { Loader2, Upload, X, Save, Edit, Users, Calendar, MapPin, Coffee, Moon, TreePine, Gamepad2 } from "lucide-react"
import Image from "next/image"

export function ProfilePage() {
  const [currentHangoutIndex, setCurrentHangoutIndex] = useState(0)
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
  const [userPreferences, setUserPreferences] = useState<Array<{id: string, name: string, icon?: React.ReactNode, color?: string, isCustom?: boolean}>>([
    { id: 'coffee-lover', name: 'Coffee Lover', icon: <Coffee className="w-3 h-3" />, isCustom: true },
    { id: 'night-owl', name: 'Night Owl', icon: <Moon className="w-3 h-3" />, isCustom: true },
    { id: 'outdoor-adventurer', name: 'Outdoor Adventurer', icon: <TreePine className="w-3 h-3" />, isCustom: true },
    { id: 'gaming-enthusiast', name: 'Gaming Enthusiast', icon: <Gamepad2 className="w-3 h-3" />, isCustom: true }
  ])
  const [favoritePlaces, setFavoritePlaces] = useState<Array<{id: string, title: string, mapLink?: string}>>([
    { id: 'place_1', title: 'Central Park', mapLink: 'https://www.google.com/maps/search/?api=1&query=Central+Park' },
    { id: 'place_2', title: 'Blue Bottle Coffee', mapLink: 'https://www.google.com/maps/search/?api=1&query=Blue+Bottle+Coffee' },
    { id: 'place_3', title: 'Brooklyn Bridge', mapLink: 'https://www.google.com/maps/search/?api=1&query=Brooklyn+Bridge' }
  ])
  const { isAuthenticated, isLoading: authLoading, signOut } = useAuth()
  const { profile, userHangouts, isLoading, error, refetch } = useProfile()
  const { uploadImage, updateProfile, isUploading, error: uploadError, clearError } = useImageUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize edit form when profile loads
  useEffect(() => {
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
  }, [profile])

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

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-gray-400">{authLoading ? 'Authenticating...' : 'Loading profile...'}</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Please sign in to view your profile</p>
          <p className="text-gray-400">You need to be logged in to see your profile and hangouts.</p>
          <div className="mt-6 space-x-4">
            <a 
              href="/signin" 
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Sign In
            </a>
            <a 
              href="/signup" 
              className="inline-flex items-center px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800"
            >
              Sign Up
            </a>
          </div>
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
    clearError()
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
      console.warn('Invalid file type selected')
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      console.warn('File too large')
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
          console.error('Failed to update profile')
        }
      } else {
        console.error('Failed to upload image')
      }
    } catch (error) {
      console.error('Upload error:', error)
    }
  }

  const cancelUpload = () => {
    setShowUploadModal(null)
    setUploadPreview(null)
    clearError()
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
      const updatedUser = await updateProfile({
        name: editForm.name,
        bio: editForm.bio,
        location: editForm.location,
        zodiac: editForm.zodiac,
        enneagram: editForm.enneagram,
        bigFive: editForm.bigFive,
        loveLanguage: editForm.loveLanguage
      })

      if (updatedUser) {
        // Refresh profile data
        await refetch()
        setShowEditModal(false)
        // Success - no popup needed
      } else {
        console.error('Failed to update profile')
      }
    } catch (error) {
      console.error('Profile update error:', error)
    } finally {
      setIsSaving(false)
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

  const nextHangout = () => {
    setCurrentHangoutIndex((prev) => (prev + 1) % recentHangouts.length)
  }

  const prevHangout = () => {
    setCurrentHangoutIndex((prev) => (prev - 1 + recentHangouts.length) % recentHangouts.length)
  }

  const currentHangout = recentHangouts.length > 0 ? recentHangouts[currentHangoutIndex] : null

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
              console.error('Background image failed to load:', profile.backgroundImage)
              e.currentTarget.style.display = 'none'
            }}
            onLoad={() => console.log('Background image loaded successfully:', profile.backgroundImage)}
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
                <p className="mb-2">{profile.bio || 'No bio yet'}</p>
                
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
                onClick={() => {
                  signOut()
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

      {/* Hangout Preferences & Favorite Places */}
      <div className="max-w-2xl mx-auto px-4">
        <PreferencesAndPlaces 
          userPreferences={userPreferences}
          favoritePlaces={favoritePlaces}
          onPreferencesChange={setUserPreferences}
          onPlacesChange={setFavoritePlaces}
        />
      </div>

      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Recent Activity</h3>
          {recentHangouts.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="flex space-x-4 pb-2" style={{ width: 'max-content' }}>
                {recentHangouts.slice(0, 6).map((hangout, index) => (
                  <div key={index} className="group hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden bg-card border-border relative transform hover:scale-[1.02] flex-shrink-0" style={{ width: '300px' }}>
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
