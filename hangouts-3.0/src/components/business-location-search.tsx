"use client"

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Search, X, Loader2, Star, Clock, Phone } from 'lucide-react'

import { logger } from '@/lib/logger'
interface BusinessResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  rating?: number
  user_ratings_total?: number
  price_level?: number
  types: string[]
  vicinity?: string
  business_status?: string
  opening_hours?: {
    open_now: boolean
  }
  photos?: Array<{
    photo_reference: string
    height: number
    width: number
  }>
}

interface BusinessLocationSearchProps {
  value: string
  onChange: (location: string) => void
  onLocationSelect: (location: BusinessResult) => void
  placeholder?: string
  className?: string
}

// Free service that provides Google-like business search
const searchBusinesses = async (query: string, userLocation?: { lat: number; lng: number }): Promise<BusinessResult[]> => {
  try {
    // Using a combination of services for better results
    const searchQuery = encodeURIComponent(query)
    
    // Try multiple search strategies in parallel
    const searches = [
      // Strategy 1: Overpass API for detailed business search
      searchWithOverpass(query, userLocation),
      // Strategy 2: Nominatim with business focus
      searchWithNominatim(query, userLocation),
      // Strategy 3: Simple text search for any matching places
      searchWithSimpleText(query, userLocation)
    ]
    
    const results = await Promise.allSettled(searches)
    const allResults: BusinessResult[] = []
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        allResults.push(...result.value)
      }
    })
    
    // Remove duplicates and sort by relevance
    const uniqueResults = removeDuplicateBusinesses(allResults)
    return uniqueResults.slice(0, 10)
    
  } catch (error) {
    logger.error('Business search error:', error);
    return await searchWithFallback(query, userLocation)
  }
}

// Overpass API search for detailed business data
const searchWithOverpass = async (query: string, userLocation?: { lat: number; lng: number }): Promise<BusinessResult[]> => {
  try {
    const overpassQuery = `
      [out:json][timeout:10];
      (
        node["name"~"${query}",i]["amenity"~"restaurant|cafe|bar|fast_food|food_court|pub|ice_cream|food_court"];
        node["name"~"${query}",i]["shop"~"restaurant|cafe|bar|fast_food|supermarket|bakery|butcher|seafood"];
        node["name"~"${query}",i]["leisure"~"park|garden|playground|sports_centre|fitness_centre"];
        node["name"~"${query}",i]["tourism"~"attraction|museum|gallery|zoo|aquarium|theme_park"];
        way["name"~"${query}",i]["amenity"~"restaurant|cafe|bar|fast_food|food_court|pub|ice_cream|food_court"];
        way["name"~"${query}",i]["shop"~"restaurant|cafe|bar|fast_food|supermarket|bakery|butcher|seafood"];
        way["name"~"${query}",i]["leisure"~"park|garden|playground|sports_centre|fitness_centre"];
        way["name"~"${query}",i]["tourism"~"attraction|museum|gallery|zoo|aquarium|theme_park"];
      );
      out center;
    `

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(overpassQuery)}`
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.elements?.map((element: { id: number; lat?: number; lon?: number; center?: { lat: number; lng: number }; tags?: { name?: string; [key: string]: string }; address?: { [key: string]: string } }) => {
      const lat = element.lat || element.center?.lat || 0
      const lng = element.lon || element.center?.lng || 0
      
      return {
        place_id: element.id.toString(),
        name: element.tags?.name || 'Unnamed Place',
        formatted_address: formatAddress(element.tags, element.address),
        geometry: { location: { lat, lng } },
        rating: 0,
        user_ratings_total: 0,
        price_level: getPriceLevel(element.tags),
        types: getBusinessTypes(element.tags),
        vicinity: element.tags?.['addr:city'] || element.tags?.['addr:town'] || '',
        business_status: 'OPERATIONAL',
        opening_hours: element.tags?.opening_hours ? { open_now: true } : undefined
      }
    }) || []
  } catch (error) {
    logger.error('Overpass search error:', error);
    return []
  }
}

// Nominatim search with business focus
const searchWithNominatim = async (query: string, userLocation?: { lat: number; lng: number }): Promise<BusinessResult[]> => {
  try {
    const searchQuery = encodeURIComponent(query)
    const locationParam = userLocation ? `&lat=${userLocation.lat}&lon=${userLocation.lng}` : ''
    
    const response = await fetch(
      `/api/locations/search?q=${searchQuery}&limit=5${locationParam}`
    )

    if (!response.ok) return []

    const data = await response.json()
    if (!data.success) return []

    return data.locations.map((place: any) => ({
      place_id: place.id,
      name: place.displayName.split(',')[0],
      formatted_address: place.displayName,
      geometry: {
        location: {
          lat: place.lat,
          lng: place.lon
        }
      },
      rating: 0,
      user_ratings_total: 0,
      price_level: 0,
      types: [place.type || 'business'],
      vicinity: place.address?.city || place.address?.town || place.address?.village || '',
      business_status: 'OPERATIONAL',
      opening_hours: undefined
    }))
  } catch (error) {
    logger.error('Nominatim search error:', error);
    return []
  }
}

// Simple text search for any matching places
const searchWithSimpleText = async (query: string, userLocation?: { lat: number; lng: number }): Promise<BusinessResult[]> => {
  try {
    const searchQuery = encodeURIComponent(query)
    const locationParam = userLocation ? `&lat=${userLocation.lat}&lon=${userLocation.lng}` : ''
    
    const response = await fetch(
      `/api/locations/search?q=${searchQuery}&limit=3${locationParam}`
    )

    if (!response.ok) return []

    const data = await response.json()
    if (!data.success) return []

    return data.locations.map((place: any) => ({
      place_id: place.id,
      name: place.displayName.split(',')[0],
      formatted_address: place.displayName,
      geometry: {
        location: {
          lat: place.lat,
          lng: place.lon
        }
      },
      rating: 0,
      user_ratings_total: 0,
      price_level: 0,
      types: ['business'],
      vicinity: place.address?.city || place.address?.town || place.address?.village || '',
      business_status: 'OPERATIONAL',
      opening_hours: undefined
    }))
  } catch (error) {
    logger.error('Simple text search error:', error);
    return []
  }
}

// Helper functions
const formatAddress = (tags: { [key: string]: string }, address: { [key: string]: string }) => {
  if (address?.full) return address.full
  const parts = []
  if (tags?.['addr:street']) parts.push(tags['addr:street'])
  if (tags?.['addr:city']) parts.push(tags['addr:city'])
  if (tags?.['addr:state']) parts.push(tags['addr:state'])
  return parts.join(', ') || 'Address not available'
}

const getPriceLevel = (tags: { [key: string]: string }) => {
  if (tags?.fee === 'yes') return 2
  if (tags?.fee === 'no') return 1
  return 0
}

const getBusinessTypes = (tags: { [key: string]: string }) => {
  const types = []
  if (tags?.amenity) types.push(tags.amenity)
  if (tags?.shop) types.push(tags.shop)
  if (tags?.leisure) types.push(tags.leisure)
  if (tags?.tourism) types.push(tags.tourism)
  return types.length > 0 ? types : ['business']
}

const removeDuplicateBusinesses = (businesses: BusinessResult[]) => {
  const seen = new Set()
  return businesses.filter(business => {
    const key = `${business.name}-${business.geometry.location.lat}-${business.geometry.location.lng}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Fallback search using a different free service
const searchWithFallback = async (query: string, userLocation?: { lat: number; lng: number }): Promise<BusinessResult[]> => {
  try {
    // Simple fallback using our proxy API
    const searchQuery = encodeURIComponent(query)
    const locationParam = userLocation ? `&lat=${userLocation.lat}&lon=${userLocation.lng}` : ''
    
    const response = await fetch(
      `/api/locations/search?q=${searchQuery}&limit=5${locationParam}`
    )

    if (!response.ok) {
      throw new Error('Fallback search request failed')
    }

    const data = await response.json()
    if (!data.success) return []
    
    return data.locations.map((place: any) => ({
      place_id: place.id,
      name: place.displayName.split(',')[0],
      formatted_address: place.displayName,
      geometry: {
        location: {
          lat: place.lat,
          lng: place.lon
        }
      },
      rating: 0,
      user_ratings_total: 0,
      price_level: 0,
      types: ['business'],
      vicinity: place.address?.city || place.address?.town || place.address?.village || '',
      business_status: 'OPERATIONAL',
      opening_hours: undefined
    }))
  } catch (error) {
    logger.error('Fallback search error:', error);
    return []
  }
}

export function BusinessLocationSearch({ 
  value, 
  onChange, 
  onLocationSelect, 
  placeholder = "Search for a restaurant, park, or venue...",
  className = ""
}: BusinessLocationSearchProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<BusinessResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<BusinessResult | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)

  // Get user's current location for proximity-based search
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          // console.log('Geolocation error:', error); // Removed for production
        }
      )
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (value.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    // If user is typing and we have a selected location, clear it
    if (selectedLocation && value !== selectedLocation.name) {
      setSelectedLocation(null)
    }

    // Don't search if we have a selected location and the value matches it
    if (selectedLocation && value === selectedLocation.name) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchBusinesses(value, userLocation || undefined)
        setSearchResults(results)
        setShowResults(true)
      } catch (error) {
        logger.error('Search error:', error);
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [value, userLocation])

  const handleLocationSelect = (location: BusinessResult) => {
    setSelectedLocation(location)
    onChange(location.name)
    onLocationSelect(location)
    setShowResults(false)
    setSearchResults([]) // Clear search results
    // Don't blur immediately to prevent onBlur from interfering
    setTimeout(() => {
      inputRef.current?.blur()
    }, 100)
  }

  const handleClear = () => {
    setSelectedLocation(null)
    onChange('')
    setSearchResults([])
    setShowResults(false)
    inputRef.current?.focus()
  }

  const getPriceLevel = (level?: number) => {
    if (!level) return ''
    return '$'.repeat(level)
  }

  const getBusinessType = (types: string[]) => {
    const businessTypes = types.filter(type => 
      ['restaurant', 'cafe', 'bar', 'park', 'museum', 'gallery', 'attraction'].includes(type.toLowerCase())
    )
    return businessTypes[0] || 'Business'
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowResults(searchResults.length > 0)}
          onBlur={() => {
            // Delay hiding results to allow for click events
            setTimeout(() => {
              if (!selectedLocation) {
                setShowResults(false)
              }
            }, 200)
          }}
          className="bg-gray-800 border-gray-700 text-white pl-10 pr-10"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {isSearching && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          {value && !isSearching && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {showResults && searchResults.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 bg-gray-800 border-gray-700 max-h-80 overflow-y-auto">
          <CardContent className="p-2">
            <div className="space-y-1">
              {searchResults.map((result) => (
                <Button
                  key={result.place_id}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto p-3 hover:bg-gray-700"
                  onClick={() => handleLocationSelect(result)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">
                        {result.name}
                      </div>
                      <div className="text-sm text-gray-400 truncate">
                        {result.formatted_address}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {getBusinessType(result.types)}
                        </Badge>
                        {result.rating && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {result.rating.toFixed(1)}
                            {result.user_ratings_total && (
                              <span>({result.user_ratings_total})</span>
                            )}
                          </div>
                        )}
                        {result.price_level && (
                          <div className="text-xs text-gray-400">
                            {getPriceLevel(result.price_level)}
                          </div>
                        )}
                        {result.opening_hours && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            {result.opening_hours.open_now ? 'Open now' : 'Closed'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Location Display */}
      {selectedLocation && (
        <Card className="mt-3 bg-gray-800 border-gray-700">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-gray-300" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-white">
                  {selectedLocation.name}
                </div>
                <div className="text-sm text-gray-400">
                  {selectedLocation.formatted_address}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {getBusinessType(selectedLocation.types)}
                  </Badge>
                  {selectedLocation.rating && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {selectedLocation.rating.toFixed(1)}
                    </div>
                  )}
                  {selectedLocation.price_level && (
                    <div className="text-xs text-gray-400">
                      {getPriceLevel(selectedLocation.price_level)}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
