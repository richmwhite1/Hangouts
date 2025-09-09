"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState } from "react"
import { useProfile } from "@/hooks/use-profile"
import { Loader2 } from "lucide-react"

export function ProfilePage() {
  const [currentHangoutIndex, setCurrentHangoutIndex] = useState(0)
  const { profile, userHangouts, isLoading, error } = useProfile()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
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

  const recentHangouts = userHangouts.slice(0, 3).map(hangout => ({
    id: hangout.id,
    title: hangout.title,
    location: hangout.location,
    time: new Date(hangout.startTime).toLocaleDateString(),
    participants: hangout.participants,
    status: hangout.creatorId === profile.id ? "hosted" : "attended",
    image: "/placeholder-hangout.png",
  }))

  const handlePhotoUpload = (type: "profile" | "background") => {
    // Handle photo upload logic
    console.log(`Upload ${type} photo`)
  }

  const nextHangout = () => {
    setCurrentHangoutIndex((prev) => (prev + 1) % recentHangouts.length)
  }

  const prevHangout = () => {
    setCurrentHangoutIndex((prev) => (prev - 1 + recentHangouts.length) % recentHangouts.length)
  }

  const currentHangout = recentHangouts[currentHangoutIndex]

  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto">
      <Card>
        <CardContent className="p-0">
          <div className="relative h-32 bg-gradient-to-br from-gray-800 to-gray-900 rounded-t-lg">
            <button
              onClick={() => handlePhotoUpload("background")}
              className="absolute top-2 right-2 text-xs text-white/70 hover:text-white bg-black/20 hover:bg-black/40 px-2 py-1 rounded"
            >
              📷
            </button>
          </div>

          <div className="p-6 text-center -mt-12 relative">
            <div className="relative inline-block">
              <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-background">
                <AvatarImage src={profile.avatar || "/placeholder.svg"} alt={profile.name} />
                <AvatarFallback className="text-2xl">{profile.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => handlePhotoUpload("profile")}
                className="absolute bottom-4 right-0 text-xs bg-primary hover:bg-primary/90 text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center"
              >
                📷
              </button>
            </div>

            <h1 className="text-2xl font-bold mb-1">{profile.name}</h1>
            <p className="text-muted-foreground text-sm mb-3">@{profile.username}</p>
            <p className="text-sm mb-4 max-w-md mx-auto">{profile.bio || 'No bio yet'}</p>

            <div className="grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground/70 mb-4">
              <div>
                <div className="font-medium text-xs">{profile.stats.hangoutsHosted}</div>
                <div className="text-xs">Hosted</div>
              </div>
              <div>
                <div className="font-medium text-xs">{profile.stats.friends}</div>
                <div className="text-xs">Friends</div>
              </div>
              <div>
                <div className="font-medium text-xs">{profile.stats.hangoutsAttended}</div>
                <div className="text-xs">Attended</div>
              </div>
              <div>
                <div className="font-medium text-xs">{profile.stats.groups}</div>
                <div className="text-xs">Groups</div>
              </div>
            </div>

            <div className="space-y-2">
              <Button variant="outline" size="sm">
                Edit Profile
              </Button>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="strangers" defaultChecked className="w-3 h-3" />
                  <label htmlFor="strangers">Allow strangers to invite you to hangouts</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="friends-of-friends" defaultChecked className="w-3 h-3" />
                  <label htmlFor="friends-of-friends">Only allow friends of friends to invite you</label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-3">Recent Hangouts</h3>
          <div className="relative">
            <div className="bg-card rounded-lg border overflow-hidden">
              <div className="relative">
                <img
                  src={currentHangout.image || "/placeholder.svg"}
                  alt={currentHangout.title}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {currentHangout.status === "hosted" ? "👑 Hosted" : "✓ Attended"}
                </div>

                {/* Navigation arrows */}
                {recentHangouts.length > 1 && (
                  <>
                    <button
                      onClick={prevHangout}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center"
                    >
                      ←
                    </button>
                    <button
                      onClick={nextHangout}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center"
                    >
                      →
                    </button>
                  </>
                )}
              </div>

              <div className="p-3">
                <h4 className="font-medium text-sm mb-1">{currentHangout.title}</h4>
                <p className="text-xs text-muted-foreground mb-2">{currentHangout.location}</p>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{currentHangout.participants} people</span>
                  <span>{currentHangout.time}</span>
                </div>
              </div>
            </div>

            {/* Dots indicator */}
            {recentHangouts.length > 1 && (
              <div className="flex justify-center mt-2 space-x-1">
                {recentHangouts.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentHangoutIndex(index)}
                    className={`w-2 h-2 rounded-full ${index === currentHangoutIndex ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="opacity-75">
        <CardContent className="p-4">
          <h3 className="font-medium mb-3 text-sm text-muted-foreground">Achievements</h3>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-muted/30 rounded border border-muted">
              <div className="text-lg mb-1">🏆</div>
              <div className="text-xs font-medium">Super Host</div>
            </div>
            <div className="text-center p-2 bg-muted/30 rounded border border-muted">
              <div className="text-lg mb-1">🌟</div>
              <div className="text-xs font-medium">Social Butterfly</div>
            </div>
            <div className="text-center p-2 bg-muted/30 rounded border border-muted">
              <div className="text-lg mb-1">👥</div>
              <div className="text-xs font-medium">Connector</div>
            </div>
            <div className="text-center p-2 bg-muted/30 rounded border border-muted">
              <div className="text-lg mb-1">⚡</div>
              <div className="text-xs font-medium">Quick Responder</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
