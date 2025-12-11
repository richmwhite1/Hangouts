'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { logger } from '@/lib/logger'

interface AIAutoCompleteProps {
  input: string
  onSelect: (suggestion: string) => void
  enabled?: boolean
  minLength?: number
  debounceMs?: number
}

/**
 * AI-powered auto-complete component
 * 
 * Provides intelligent suggestions as user types using Google Gemini AI
 * Features:
 * - Real-time suggestions
 * - Smart debouncing
 * - Contextual awareness
 * - Minimal API calls
 */
export function AIAutoComplete({
  input,
  onSelect,
  enabled = true,
  minLength = 3,
  debounceMs = 500
}: AIAutoCompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const lastFetchedInput = useRef<string>('')

  useEffect(() => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Reset if input is too short
    if (input.length < minLength) {
      setSuggestions([])
      setIsVisible(false)
      return
    }

    // Don't fetch if we just got suggestions for this input
    if (input === lastFetchedInput.current) {
      return
    }

    // Debounce the API call
    debounceTimer.current = setTimeout(() => {
      if (enabled) {
        fetchSuggestions(input)
      }
    }, debounceMs)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [input, enabled, minLength, debounceMs])

  const fetchSuggestions = async (searchInput: string) => {
    if (!searchInput || searchInput === lastFetchedInput.current) return

    try {
      setIsLoading(true)
      lastFetchedInput.current = searchInput

      const response = await fetch('/api/ai/complete-hangout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: searchInput,
          action: 'autocomplete'
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.suggestions) {
          setSuggestions(data.suggestions)
          setIsVisible(data.suggestions.length > 0)
        } else {
          setSuggestions([])
          setIsVisible(false)
        }
      } else {
        logger.error('Failed to fetch AI suggestions')
        setSuggestions([])
        setIsVisible(false)
      }
    } catch (error) {
      logger.error('Error fetching AI suggestions:', error)
      setSuggestions([])
      setIsVisible(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (suggestion: string) => {
    onSelect(suggestion)
    setIsVisible(false)
    setSuggestions([])
    lastFetchedInput.current = suggestion
  }

  if (!enabled || (!isLoading && !isVisible)) {
    return null
  }

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-gray-900 border border-purple-500/30 rounded-lg shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-purple-400 font-medium">AI Suggestions</span>
        </div>
        <Badge variant="secondary" className="bg-purple-600/20 text-purple-400 text-xs">
          Powered by Gemini
        </Badge>
      </div>

      {/* Suggestions */}
      <div className="max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            <span className="ml-2 text-sm text-gray-400">Thinking...</span>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="py-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSelect(suggestion)}
                className="w-full text-left px-4 py-3 hover:bg-purple-600/10 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0 group-hover:animate-pulse" />
                  <div className="flex-1">
                    <p className="text-white text-sm leading-relaxed">{suggestion}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-6 px-4 text-center">
            <p className="text-sm text-gray-500">No suggestions available</p>
          </div>
        )}
      </div>

      {/* Footer hint */}
      {!isLoading && suggestions.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-800 bg-gray-950/50">
          <p className="text-xs text-gray-500 text-center">
            Click to use suggestion or keep typing
          </p>
        </div>
      )}
    </div>
  )
}


