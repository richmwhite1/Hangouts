import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  MapPin,
  TrendingUp,
  Coffee,
  Utensils,
  Mountain,
  Music,
  Camera,
  Dumbbell,
  Users,
  Clock,
} from "lucide-react"
import { HangoutCard } from "@/components/hangout-card"

async function getHangouts() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/hangouts`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data.hangouts || []
  } catch (error) {
    console.error('Error fetching hangouts:', error)
    return []
  }
}

// Helper function to determine category from title
function getCategoryFromTitle(title) {
  const lowerTitle = title.toLowerCase()
  if (lowerTitle.includes('coffee') || lowerTitle.includes('cafe')) return 'food'
  if (lowerTitle.includes('hiking') || lowerTitle.includes('outdoor')) return 'outdoor'
  if (lowerTitle.includes('game') || lowerTitle.includes('gaming')) return 'gaming'
  if (lowerTitle.includes('music') || lowerTitle.includes('concert')) return 'music'
  if (lowerTitle.includes('photo') || lowerTitle.includes('camera')) return 'photography'
  if (lowerTitle.includes('workout') || lowerTitle.includes('gym')) return 'fitness'
  return 'social'
}

export async function DiscoveryPageServer() {
  const hangouts = await getHangouts()

  // Ensure hangouts is an array
  const safeHangouts = Array.isArray(hangouts) ? hangouts : []

  // Convert API hangouts to display format
  const displayHangouts = safeHangouts.map(hangout => {
    const startDate = new Date(hangout.startTime)
    const endDate = new Date(hangout.endTime)
    
    return {
      id: hangout.id,
      title: hangout.title,
      description: hangout.description,
      location: hangout.location,
      latitude: hangout.latitude,
      longitude: hangout.longitude,
      startTime: hangout.startTime,
      endTime: hangout.endTime,
      maxParticipants: hangout.maxParticipants,
      currentParticipants: hangout.currentParticipants || 0,
      privacyLevel: hangout.privacyLevel,
      weatherEnabled: hangout.weatherEnabled,
      category: getCategoryFromTitle(hangout.title),
      image: hangout.image || '/placeholder.jpg',
      // Convert creator to host format expected by HangoutCard
      host: {
        name: hangout.creator?.name || 'Anonymous',
        avatar: hangout.creator?.avatar || '/placeholder-user.jpg'
      },
      // Convert startTime/endTime to date/time format expected by HangoutCard
      date: startDate.toLocaleDateString(),
      time: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      // Add participants array (empty for now since API doesn't provide this)
      participants: []
    }
  })

  const categories = [
    { value: "all", label: "All Categories", icon: TrendingUp },
    { value: "food", label: "Food & Drink", icon: Coffee },
    { value: "outdoor", label: "Outdoor", icon: Mountain },
    { value: "gaming", label: "Gaming", icon: Users },
    { value: "music", label: "Music", icon: Music },
    { value: "photography", label: "Photography", icon: Camera },
    { value: "fitness", label: "Fitness", icon: Dumbbell },
    { value: "social", label: "Social", icon: Users },
  ]

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
        <p className="text-muted-foreground text-sm">Find events near you</p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search hangouts, friends, or places..."
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    <div className="flex items-center gap-2">
                      <category.icon className="w-4 h-4" />
                      {category.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="cursor-pointer">
            <MapPin className="w-3 h-3 mr-1" />
            San Francisco
          </Badge>
          <Badge variant="outline" className="cursor-pointer">
            <Clock className="w-3 h-3 mr-1" />
            This Week
          </Badge>
          <Badge variant="outline" className="cursor-pointer">
            <Users className="w-3 h-3 mr-1" />
            Friends Only
          </Badge>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {displayHangouts.length} found
          </h2>
          <Select defaultValue="trending">
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trending">Trending</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="closest">Closest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {displayHangouts.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No hangouts found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters
            </p>
            <Button>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayHangouts.map((hangout) => (
              <HangoutCard key={hangout.id} hangout={hangout} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
