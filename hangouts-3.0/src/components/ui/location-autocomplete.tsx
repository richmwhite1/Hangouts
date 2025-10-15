'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MapPin, Search } from 'lucide-react'
import { Input } from './input'
import { Button } from './button'

import { logger } from '@/lib/logger'
interface LocationSuggestion {
  display_name: string
  lat: string
  lon: string
  address: {
    house_number?: string
    road?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
  }
}

interface LocationAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onLocationSelect?: (location: LocationSuggestion) => void
  placeholder?: string
  className?: string
}

export function LocationAutocomplete({ 
  value, 
  onChange, 
  onLocationSelect,
  placeholder = "Search for a location...", 
  className = "" 
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Debounced search function
  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      // Using our proxy API to avoid CORS issues
      const response = await fetch(
        `/api/locations/search?q=${encodeURIComponent(query)}&limit=5`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSuggestions(data.locations)
          setIsOpen(true)
        }
      }
    } catch (error) {
      logger.error('Location search error:', error);
    } finally {
      setIsLoading(false)
    }
  }

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    onChange(query)
    
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    // Set new timeout
    debounceRef.current = setTimeout(() => {
      searchLocations(query)
    }, 300)
  }

  // Handle location selection
  const handleLocationSelect = (location: LocationSuggestion) => {
    const fullAddress = formatAddress(location)
    onChange(fullAddress)
    setIsOpen(false)
    setSuggestions([])
    
    if (onLocationSelect) {
      onLocationSelect(location)
    }
  }

  // Format address for display
  const formatAddress = (location: LocationSuggestion): string => {
    const { address } = location
    const parts = []
    
    if (address.house_number) parts.push(address.house_number)
    if (address.road) parts.push(address.road)
    if (address.city) parts.push(address.city)
    if (address.state) parts.push(address.state)
    if (address.postcode) parts.push(address.postcode)
    if (address.country) parts.push(address.country)
    
    return parts.join(', ')
  }

  // Create clickable map link
  const createMapLink = (location: LocationSuggestion): string => {
    return `https://www.google.com/maps?q=${location.lat},${location.lon}`
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className={`relative ${className}`} ref={inputRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-10 pr-10 bg-black border-gray-600 text-white"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
          </div>
        )}
        {!isLoading && value && (
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-black border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((location, index) => (
            <button
              key={index}
              onClick={() => handleLocationSelect(location)}
              className="w-full text-left p-3 hover:bg-gray-800 border-b border-gray-700 last:border-b-0"
            >
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {formatAddress(location)}
                  </p>
                  <p className="text-gray-400 text-xs truncate">
                    {location.display_name}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected Location Link */}
      {value && suggestions.length === 0 && !isOpen && (
        <div className="mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              // Try to create a map link from the current value
              const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`
              window.open(mapLink, '_blank')
            }}
            className="text-xs border-gray-600 text-white hover:bg-gray-700"
          >
            <MapPin className="mr-1 h-3 w-3" />
            Open in Maps
          </Button>
        </div>
      )}
    </div>
  )
}





















