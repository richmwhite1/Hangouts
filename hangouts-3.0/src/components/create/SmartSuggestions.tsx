'use client'

import React, { useEffect, useState } from 'react'
import { Sparkles, MapPin, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    generateTimeSuggestions,
    generateLocationSuggestions,
    formatAvailabilityMessage,
    checkTimeConflicts
} from '@/lib/smart-suggestions'

interface Friend {
    id: string
    name: string
}

interface SmartSuggestionsProps {
    invitedFriends: Friend[]
    currentDateTime?: string
    currentLocation?: string
    hangoutTitle?: string
    onSelectTime: (dateTime: string) => void
    onSelectLocation: (location: string) => void
    userId?: string
}

/**
 * Smart suggestions component that displays AI-powered recommendations
 * Features:
 * - Time suggestions based on friend availability
 * - Location suggestions from past hangouts
 * - Conflict warnings
 * - One-click application of suggestions
 */
export function SmartSuggestions({
    invitedFriends,
    currentDateTime,
    currentLocation,
    hangoutTitle,
    onSelectTime,
    onSelectLocation,
    userId
}: SmartSuggestionsProps) {
    const [timeSuggestions, setTimeSuggestions] = useState<any[]>([])
    const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])
    const [conflicts, setConflicts] = useState<string[]>([])
    const [isExpanded, setIsExpanded] = useState(false)

    // Generate time suggestions when friends change
    useEffect(() => {
        if (invitedFriends.length > 0 || !currentDateTime) {
            const suggestions = generateTimeSuggestions(invitedFriends, currentDateTime)
            setTimeSuggestions(suggestions)
        }
    }, [invitedFriends, currentDateTime])

    // Generate location suggestions on mount
    useEffect(() => {
        if (userId) {
            generateLocationSuggestions(userId).then(setLocationSuggestions)
        }
    }, [userId])

    // Check for conflicts when date/time changes
    useEffect(() => {
        if (currentDateTime) {
            const detected = checkTimeConflicts(currentDateTime)
            setConflicts(detected)
        }
    }, [currentDateTime])

    // Don't show if no suggestions
    if (timeSuggestions.length === 0 && locationSuggestions.length === 0 && conflicts.length === 0) {
        return null
    }

    return (
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-4 mb-4">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between text-left"
            >
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h3 className="text-white font-semibold">Smart Suggestions</h3>
                    <Badge variant="secondary" className="bg-purple-600/20 text-purple-400 text-xs">
                        AI-Powered
                    </Badge>
                </div>
                <span className="text-gray-400 text-sm">
                    {isExpanded ? 'Hide' : 'Show'}
                </span>
            </button>

            {isExpanded && (
                <div className="mt-4 space-y-4">
                    {/* Time Conflicts Warning */}
                    {conflicts.length > 0 && (
                        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-yellow-400 font-medium text-sm mb-1">
                                        Potential Scheduling Conflicts
                                    </p>
                                    <ul className="text-yellow-300/80 text-xs space-y-1">
                                        {conflicts.map((conflict, idx) => (
                                            <li key={idx}>• {conflict}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Time Suggestions */}
                    {timeSuggestions.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-purple-400" />
                                <p className="text-white text-sm font-medium">Recommended Times</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {timeSuggestions.slice(0, 3).map((suggestion, idx) => (
                                    <Button
                                        key={idx}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onSelectTime(suggestion.dateTime)}
                                        className="border-purple-500/50 text-white hover:bg-purple-500/20 hover:border-purple-500 text-xs"
                                    >
                                        <div className="text-left">
                                            <div className="font-medium">{suggestion.displayText}</div>
                                            <div className="text-xs text-gray-400">
                                                {formatAvailabilityMessage(suggestion.availableCount, suggestion.totalCount)}
                                            </div>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Location Suggestions */}
                    {locationSuggestions.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-blue-400" />
                                <p className="text-white text-sm font-medium">Popular Locations</p>
                            </div>
                            <div className="space-y-2">
                                {locationSuggestions.slice(0, 3).map((location, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => onSelectLocation(location.address)}
                                        className="w-full text-left p-2 rounded border border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white text-sm font-medium">{location.name}</p>
                                                <p className="text-gray-400 text-xs">{location.address}</p>
                                            </div>
                                            <Badge variant="secondary" className="bg-blue-600/20 text-blue-400 text-xs">
                                                Used {location.frequency}x
                                            </Badge>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Smart insight based on hangout title */}
                    {hangoutTitle && hangoutTitle.length > 3 && (
                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                            <p className="text-blue-300 text-xs">
                                💡 <strong>Tip:</strong> Based on "{hangoutTitle}", we recommend a 2-hour duration and considering weeknight evenings or weekend afternoons.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
