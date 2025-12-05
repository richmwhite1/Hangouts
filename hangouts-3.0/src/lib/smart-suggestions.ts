/**
 * Smart suggestions system for hangout creation
 * Provides intelligent recommendations for times and locations based on:
 * - Friend availability
 * - Popular hangout times
 * - Previous hangout patterns
 * - User preferences
 */

interface Friend {
    id: string
    name: string
}

interface TimeSlot {
    dateTime: string
    displayText: string
    score: number
    availableCount: number
    totalCount: number
}

interface LocationSuggestion {
    name: string
    address: string
    frequency: number
    lastUsed: string
}

/**
 * Generate smart time suggestions based on invited friends
 * In a production app, this would query friend calendars and availability
 * For now, we'll suggest popular times
 */
export function generateTimeSuggestions(
    invitedFriends: Friend[],
    currentDateTime?: string
): TimeSlot[] {
    const suggestions: TimeSlot[] = []
    const now = new Date()

    // Popular time slots to suggest
    const popularSlots = [
        { day: 'friday', hour: 19, label: 'This Friday at 7:00 PM' },
        { day: 'saturday', hour: 14, label: 'This Saturday at 2:00 PM' },
        { day: 'saturday', hour: 19, label: 'This Saturday at 7:00 PM' },
        { day: 'sunday', hour: 12, label: 'This Sunday at 12:00 PM' },
        { day: 'sunday', hour: 18, label: 'This Sunday at 6:00 PM' },
    ]

    // Calculate next occurrence of each day
    popularSlots.forEach(slot => {
        const targetDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(slot.day)
        const currentDay = now.getDay()
        let daysToAdd = targetDay - currentDay

        // If the day has passed this week, go to next week
        if (daysToAdd <= 0) {
            daysToAdd += 7
        }

        const suggestedDate = new Date(now)
        suggestedDate.setDate(suggestedDate.getDate() + daysToAdd)
        suggestedDate.setHours(slot.hour, 0, 0, 0)

        // Simulate availability (in production, this would query actual calendars)
        // Higher availability for weekend evenings
        const isWeekend = targetDay === 0 || targetDay === 6
        const isEvening = slot.hour >= 17
        const baseAvailability = isWeekend ? 0.75 : 0.6
        const eveningBonus = isEvening ? 0.1 : 0
        const availabilityRate = Math.min(0.95, baseAvailability + eveningBonus)

        const totalCount = Math.max(invitedFriends.length, 1)
        const availableCount = Math.round(totalCount * availabilityRate)

        suggestions.push({
            dateTime: suggestedDate.toISOString(),
            displayText: slot.label,
            score: availableCount / totalCount,
            availableCount,
            totalCount
        })
    })

    // Sort by score (best suggestions first)
    return suggestions.sort((a, b) => b.score - a.score).slice(0, 5)
}

/**
 * Generate location suggestions based on past hangouts
 * In production, this would query the user's hangout history
 */
export async function generateLocationSuggestions(
    userId: string
): Promise<LocationSuggestion[]> {
    try {
        // In a real implementation, this would fetch from the API
        // For now, return some common suggestions
        const commonLocations: LocationSuggestion[] = [
            {
                name: 'Downtown Coffee Shop',
                address: '123 Main St',
                frequency: 5,
                lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                name: 'City Park',
                address: '456 Park Ave',
                frequency: 3,
                lastUsed: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                name: 'Local Bar & Grill',
                address: '789 Oak St',
                frequency: 4,
                lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
            }
        ]

        return commonLocations.sort((a, b) => b.frequency - a.frequency)
    } catch (error) {
        console.error('Error generating location suggestions:', error)
        return []
    }
}

/**
 * Format availability message for display
 */
export function formatAvailabilityMessage(availableCount: number, totalCount: number): string {
    if (totalCount === 0) return 'Great time to meet up!'

    const percentage = Math.round((availableCount / totalCount) * 100)

    if (percentage >= 80) {
        return `🎉 ${availableCount}/${totalCount} friends are likely available`
    } else if (percentage >= 60) {
        return `👍 ${availableCount}/${totalCount} friends might be available`
    } else {
        return `${availableCount}/${totalCount} friends might be available`
    }
}

/**
 * Check if a time conflicts with common busy periods
 */
export function checkTimeConflicts(dateTime: string): string[] {
    const date = new Date(dateTime)
    const hour = date.getHours()
    const day = date.getDay()
    const conflicts: string[] = []

    // Weekday work hours
    if (day >= 1 && day <= 5 && hour >= 9 && hour < 17) {
        conflicts.push('During typical work hours')
    }

    // Late night
    if (hour >= 23 || hour < 6) {
        conflicts.push('Very late/early - some friends might not be available')
    }

    // Early morning
    if (hour >= 6 && hour < 9) {
        conflicts.push('Early morning - consider a later time')
    }

    return conflicts
}

/**
 * Suggest optimal duration based on hangout type
 */
export function suggestDuration(title: string): number {
    const lowerTitle = title.toLowerCase()

    // Quick activities (30 min - 1 hour)
    if (lowerTitle.includes('coffee') || lowerTitle.includes('quick')) {
        return 1
    }

    // Meals (1-2 hours)
    if (lowerTitle.includes('lunch') || lowerTitle.includes('dinner') || lowerTitle.includes('brunch')) {
        return 1.5
    }

    // Movies, events (2-3 hours)
    if (lowerTitle.includes('movie') || lowerTitle.includes('show') || lowerTitle.includes('concert')) {
        return 2.5
    }

    // Games, parties (3-4 hours)
    if (lowerTitle.includes('game') || lowerTitle.includes('party') || lowerTitle.includes('night')) {
        return 3
    }

    // Default (2 hours)
    return 2
}
