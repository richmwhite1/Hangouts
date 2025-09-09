"use client"

import { useState, useEffect } from "react"
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

export function DiscoveryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [locationFilter, setLocationFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [sortBy, setSortBy] = useState("trending")
  
  // Fetch hangouts from API directly
  const [hangouts, setHangouts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const fetchHangouts = async () => {
      try {
        console.log('🚀 Fetching hangouts...')
        setIsLoading(true)
        setError(null)
        
        const response = await fetch('/api/hangouts')
        console.log('📡 Response status:', response.status)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('✅ Fetched hangouts data:', data)
        console.log('📊 Number of hangouts:', data.hangouts?.length || 0)
        
        setHangouts(data.hangouts || [])
        console.log('🎯 State updated with hangouts')
      } catch (err) {
        console.error('❌ Error fetching hangouts:', err)
        setError(err.message)
      } finally {
        console.log('🏁 Setting isLoading to false')
        setIsLoading(false)
      }
    }

    fetchHangouts()
  }, [])
  
  // Debug logging
  console.log('DiscoveryPage render:', { hangouts: hangouts?.length, isLoading, error })

  // Convert API hangouts to display format
  const displayHangouts = (hangouts || []).map(hangout => ({
    id: hangout.id,
    title: hangout.title,
    description: hangout.description,
    location: hangout.location,
    startTime: hangout.startTime,
    endTime: hangout.endTime,
    maxParticipants: hangout.maxParticipants,
    currentParticipants: hangout.currentParticipants || 0,
    privacyLevel: hangout.privacyLevel,
    weatherEnabled: hangout.weatherEnabled,
    category: getCategoryFromTitle(hangout.title),
    image: hangout.image || '/placeholder.jpg',
    creator: hangout.creator || { name: 'Anonymous', avatar: '/placeholder-user.jpg' }
  }))

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

  const filteredHangouts = displayHangouts.filter((hangout) => {
    const matchesSearch =
      hangout.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hangout.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || hangout.category.toLowerCase().includes(selectedCategory)
    const matchesLocation = !locationFilter || hangout.location.toLowerCase().includes(locationFilter.toLowerCase())

    return matchesSearch && matchesCategory && matchesLocation
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading events...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">Error loading events</p>
          <p className="text-gray-400">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
            {filteredHangouts.length} found
          </h2>
          <Select value={sortBy} onValueChange={setSortBy}>
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

        {filteredHangouts.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No hangouts found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters
            </p>
            <Button onClick={() => {
              setSearchQuery("")
              setSelectedCategory("all")
              setLocationFilter("")
            }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredHangouts.map((hangout) => (
              <HangoutCard key={hangout.id} hangout={hangout} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}