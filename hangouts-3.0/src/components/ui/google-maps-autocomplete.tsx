'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, Search, Loader2, X } from 'lucide-react'
import { Input } from './input'
import { logger } from '@/lib/logger'

interface GoogleMapsAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect?: (place: { formatted_address: string; place_id?: string }) => void
  placeholder?: string
  className?: string
}

interface Suggestion {
  description: string
  place_id?: string
  structured_formatting?: {
    main_text: string
    secondary_text: string
  }
}

/**
 * Google Maps Places Autocomplete
 * Uses server-side Places API to avoid client-side blocking issues
 */
export function GoogleMapsAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Search for a location...",
  className = ""
}: GoogleMapsAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [suggestionsPosition, setSuggestionsPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const justSelectedRef = useRef(false) // Track if we just selected a suggestion to prevent reopening

  // Unique instance ID and dynamic z-index for multiple component support
  // Use useState with lazy initializer to ensure these are only generated on the client
  const [instanceId] = useState(() => {
    if (typeof window === 'undefined') return 'gmap-ssr'
    return `gmap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  })
  const [baseZIndex] = useState(() => {
    if (typeof window === 'undefined') return 1000
    return 1000 + Math.floor(Math.random() * 900) // Range: 1000-1900
  })


  // Fetch suggestions from server-side API
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setApiError(null)

    try {
      const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`, {
        signal: abortControllerRef.current.signal
      })
      const data = await response.json()

      // Check if request was aborted (double-check with null check)
      if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
        return
      }

      if (response.ok && data.success && (data.predictions?.length > 0 || data.suggestions?.length > 0)) {
        // Handle both new and legacy API formats
        const predictions = data.predictions || data.suggestions || []
        setSuggestions(predictions)
        // Always open dropdown when we have suggestions
        if (predictions.length > 0) {
          setIsOpen(true)
        }
        setApiError(null)
      } else {
        // Check for specific error messages
        if (data.error) {
          logger.warn('Places API error:', data.error)
          if (data.error.includes('not authorized') || data.error.includes('API key')) {
            setApiError('Places API not enabled. Please enable Places API in Google Cloud Console.')
          } else {
            setApiError(null) // Don't show generic errors, just allow manual input
          }
        }
        setSuggestions([])
        setIsOpen(false)
      }
    } catch (error: any) {
      // Don't log or handle aborted requests
      if (error.name === 'AbortError') {
        return
      }

      logger.error('Error fetching suggestions:', error)
      setSuggestions([])
      setIsOpen(false)
      setApiError('Failed to load suggestions. Please type location manually.')
    } finally {
      setIsLoading(false)
      // Clean up abort controller after request completes
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        abortControllerRef.current = null
      }
    }
  }, [])

  // Update suggestions position when suggestions change
  useEffect(() => {
    if (isOpen && suggestions.length > 0 && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setSuggestionsPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }, [isOpen, suggestions.length])
  

  // Simplified modal handling - only close on blur or outside click
  // Removed aggressive modal detection that was causing freezing

  // Track suggestions length with ref to avoid dependency issues
  const suggestionsLengthRef = useRef(suggestions.length)
  useEffect(() => {
    suggestionsLengthRef.current = suggestions.length
  }, [suggestions.length])

  // Debounced input handler - optimized for performance
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // If input is cleared, close suggestions immediately and cleanup
    if (newValue.length === 0) {
      setSuggestions([])
      setIsOpen(false)
      setIsLoading(false)
      // Cleanup pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      return
    }

    // Show suggestions immediately if we have cached ones
    if (suggestionsLengthRef.current > 0 && newValue.length > 0) {
      setIsOpen(true)
    }

    // Debounce API calls - start showing suggestions after 2 characters
    if (newValue.length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(newValue)
      }, 200) // Faster response for better UX
    } else if (newValue.length < 2) {
      // Clear suggestions for very short inputs
      setSuggestions([])
      setIsOpen(false)
      setIsLoading(false)
    }
  }, [onChange, fetchSuggestions])

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((suggestion: Suggestion) => {
    const address = suggestion.description || suggestion.structured_formatting?.main_text || ''
    
    // Mark that we just selected a suggestion to prevent reopening
    justSelectedRef.current = true
    
    onChange(address)
    setIsOpen(false)
    setSuggestions([])

    // Keep input focused for further editing, but clear the flag after a delay
    setTimeout(() => {
      inputRef.current?.focus()
      // Clear the flag after focus to allow future suggestions
      setTimeout(() => {
        justSelectedRef.current = false
      }, 300)
    }, 10)

    if (onPlaceSelect) {
      onPlaceSelect({
        formatted_address: address,
        place_id: suggestion.place_id
      })
    }
  }, [onChange, onPlaceSelect])

  // Close suggestions on outside click - using container-scoped detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    // Use container-level event listener instead of document-level
    const container = containerRef.current
    if (container) {
      container.addEventListener('mousedown', handleClickOutside)
      return () => {
        container.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [])

  // Close on Escape key - using container-scoped detection
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    // Use container-level event listener instead of document-level
    const container = containerRef.current
    if (container) {
      container.addEventListener('keydown', handleEscape)
      return () => {
        container.removeEventListener('keydown', handleEscape)
      }
    }
  }, [])

  // Get current location
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoading(true)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `/api/locations/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            )
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.location) {
                onChange(data.location.formatted_address || data.location.address)
                setIsLoading(false)
                return
              }
            }
            onChange(`${position.coords.latitude}, ${position.coords.longitude}`)
          } catch (error) {
            logger.error('Reverse geocoding error:', error)
            onChange(`${position.coords.latitude}, ${position.coords.longitude}`)
          } finally {
            setIsLoading(false)
          }
        },
        (error) => {
          logger.error('Geolocation error:', error)
          setIsLoading(false)
        }
      )
    }
  }

  // Comprehensive cleanup - timers, requests, and event listeners
  useEffect(() => {
    return () => {
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }

      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }

      // Close suggestions if open
      setIsOpen(false)
      setSuggestions([])
      setIsLoading(false)
    }
  }, [])

  // Additional cleanup on unmount to ensure no memory leaks
  useEffect(() => {
    const cleanup = () => {
      // Final cleanup of any lingering state
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }

    // Cleanup on component unmount
    return cleanup
  }, [])

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ zIndex: baseZIndex }}>
      {apiError && (
        <div className="mb-2 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded text-yellow-400 text-xs">
          ⚠️ {apiError}
        </div>
      )}
      <div className="relative" style={{ zIndex: 999999 }}>
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            // Don't reopen if we just selected a suggestion
            if (justSelectedRef.current) {
              return
            }
            
            // If we have suggestions, show them
            if (suggestions.length > 0) {
              setIsOpen(true)
            }
            // If we have text but no suggestions, fetch them
            if (value.length >= 2 && suggestions.length === 0) {
              fetchSuggestions(value)
            }
          }}
          placeholder={placeholder}
          disabled={isLoading}
          className="pl-10 pr-24 bg-black border-gray-600 text-white min-h-[44px] text-base disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="absolute right-10 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-300 text-xs font-medium px-2 py-1 rounded z-10"
          title="Use current location"
        >
          📍
        </button>
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          </div>
        )}
        {!isLoading && value && (
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
        )}
      </div>

      {/* Custom suggestions dropdown - High z-index to appear above everything */}
      {isOpen && suggestions.length > 0 && (
        typeof window !== 'undefined' && suggestionsPosition && suggestionsPosition.width > 0 ? (
          createPortal(
            <div
              ref={suggestionsRef}
              className="fixed bg-[#1a1a1a] border border-gray-600 rounded-lg shadow-2xl max-h-60 overflow-y-auto"
              data-instance-id={instanceId}
              style={{
                position: 'fixed',
                top: `${suggestionsPosition.top}px`,
                left: `${suggestionsPosition.left}px`,
                width: `${suggestionsPosition.width}px`,
                zIndex: 999999, // Very high z-index to ensure visibility above all other elements
                marginTop: '0.5rem'
              }}
            >
              {suggestions.map((suggestion, index) => {
                const mainText = suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0]
                const secondaryText = suggestion.structured_formatting?.secondary_text || suggestion.description.split(',').slice(1).join(',')

                return (
                  <button
                    key={suggestion.place_id || index}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full text-left px-4 py-3 hover:bg-[#2a2a2a] transition-colors border-b border-gray-700 last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm">{mainText}</div>
                        {secondaryText && (
                          <div className="text-gray-400 text-xs mt-0.5 truncate">{secondaryText}</div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>,
            document.body
          )
        ) : (
          <div
            ref={suggestionsRef}
            className="absolute w-full mt-2 bg-[#1a1a1a] border border-gray-600 rounded-lg shadow-2xl max-h-60 overflow-y-auto"
            data-instance-id={instanceId.current}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 999999, // Very high z-index to ensure visibility above all other elements
              marginTop: '0.5rem'
            }}
          >
            {suggestions.map((suggestion, index) => {
              const mainText = suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0]
              const secondaryText = suggestion.structured_formatting?.secondary_text || suggestion.description.split(',').slice(1).join(',')

              return (
                <button
                  key={suggestion.place_id || index}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-[#2a2a2a] transition-colors border-b border-gray-700 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm">{mainText}</div>
                      {secondaryText && (
                        <div className="text-gray-400 text-xs mt-0.5 truncate">{secondaryText}</div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}


