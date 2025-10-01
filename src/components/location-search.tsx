"use client"

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Search, X, Loader2 } from 'lucide-react'
import { geocodeAddress, GeocodeResult } from '@/lib/location'

interface LocationSearchProps {
  value: string
  onChange: (location: string) => void
  onLocationSelect: (location: GeocodeResult) => void
  placeholder?: string
  className?: string
}

export function LocationSearch({ 
  value, 
  onChange, 
  onLocationSelect, 
  placeholder = "Search for a location...",
  className = ""
}: LocationSearchProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<GeocodeResult | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (value.length < 3) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    // Don't search if we have a selected location and the value matches it
    if (selectedLocation && value === selectedLocation.displayName) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await geocodeAddress(value)
        setSearchResults(results)
        setShowResults(true)
      } catch (error) {
        console.error('Location search error:', error)
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
  }, [value, selectedLocation])

  const handleLocationSelect = (location: GeocodeResult) => {
    setSelectedLocation(location)
    onChange(location.displayName)
    onLocationSelect(location)
    setShowResults(false)
    inputRef.current?.blur()
  }

  const handleClear = () => {
    setSelectedLocation(null)
    onChange('')
    setSearchResults([])
    setShowResults(false)
    inputRef.current?.focus()
  }

  const formatLocationName = (location: GeocodeResult): string => {
    const parts = []
    if (location.address.city) parts.push(location.address.city)
    if (location.address.state) parts.push(location.address.state)
    if (location.address.country) parts.push(location.address.country)
    return parts.join(', ') || location.displayName
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
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 bg-gray-800 border-gray-700 max-h-60 overflow-y-auto">
          <CardContent className="p-2">
            <div className="space-y-1">
              {searchResults.map((location, index) => (
                <Button
                  key={`${location.latitude}-${location.longitude}-${index}`}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto p-3 hover:bg-gray-700"
                  onClick={() => handleLocationSelect(location)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">
                        {formatLocationName(location)}
                      </div>
                      <div className="text-sm text-gray-400 truncate">
                        {location.displayName}
                      </div>
                      {location.address.postcode && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {location.address.postcode}
                        </Badge>
                      )}
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
                  {formatLocationName(selectedLocation)}
                </div>
                <div className="text-sm text-gray-400">
                  {selectedLocation.address.city && selectedLocation.address.state 
                    ? `${selectedLocation.address.city}, ${selectedLocation.address.state}`
                    : selectedLocation.displayName
                  }
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  📍 {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
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



