import { parseISO, isToday, isSameDay, format, startOfDay } from 'date-fns'

export interface PlannerEvent {
    id: string
    title: string
    startTime: string
    endTime: string
    location?: string
    type?: 'HANGOUT' | 'EVENT' | string
    creator: {
        name: string
        username: string
        avatar?: string
    }
    [key: string]: any
}

/**
 * Filter events to only include those happening today
 */
export function getTodayEvents(items: PlannerEvent[]): PlannerEvent[] {
    // Safety check: ensure items is an array
    if (!Array.isArray(items)) {
        console.warn('getTodayEvents: items is not an array', items)
        return []
    }

    return items.filter(item => {
        try {
            const eventDate = parseISO(item.startTime)
            return isToday(eventDate)
        } catch {
            return false
        }
    })
}

/**
 * Group events by hour for time-block layout
 */
export function groupEventsByHour(items: PlannerEvent[]): Map<number, PlannerEvent[]> {
    const grouped = new Map<number, PlannerEvent[]>()

    // Safety check: ensure items is an array
    if (!Array.isArray(items)) {
        console.warn('groupEventsByHour: items is not an array', items)
        return grouped
    }

    items.forEach(item => {
        try {
            const eventDate = parseISO(item.startTime)
            const hour = eventDate.getHours()

            if (!grouped.has(hour)) {
                grouped.set(hour, [])
            }
            grouped.get(hour)!.push(item)
        } catch {
            // Skip invalid dates
        }
    })

    return grouped
}

/**
 * Get all events for a specific date
 */
export function getEventsForDate(items: PlannerEvent[], date: Date): PlannerEvent[] {
    // Safety check: ensure items is an array
    if (!Array.isArray(items)) {
        console.warn('getEventsForDate: items is not an array', items)
        return []
    }

    return items.filter(item => {
        try {
            const eventDate = parseISO(item.startTime)
            return isSameDay(eventDate, date)
        } catch {
            return false
        }
    })
}

/**
 * Get all dates in a month that have events
 */
export function getMonthEventDates(items: PlannerEvent[], month: Date): Date[] {
    const eventDates = new Set<string>()

    // Safety check: ensure items is an array
    if (!Array.isArray(items)) {
        console.warn('getMonthEventDates: items is not an array', items)
        return []
    }

    items.forEach(item => {
        try {
            const eventDate = parseISO(item.startTime)
            if (eventDate.getMonth() === month.getMonth() &&
                eventDate.getFullYear() === month.getFullYear()) {
                eventDates.add(format(startOfDay(eventDate), 'yyyy-MM-dd'))
            }
        } catch {
            // Skip invalid dates
        }
    })

    return Array.from(eventDates).map(dateStr => parseISO(dateStr))
}

/**
 * Format time for display in time blocks
 */
export function formatTimeBlock(time: string | Date): string {
    try {
        const date = typeof time === 'string' ? parseISO(time) : time
        return format(date, 'h:mm a')
    } catch {
        return ''
    }
}

/**
 * Get hour label for time block (e.g., "8 AM", "2 PM")
 */
export function getHourLabel(hour: number): string {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour} ${period}`
}

/**
 * Sort events chronologically
 */
export function sortEventsByTime(items: PlannerEvent[]): PlannerEvent[] {
    // Safety check: ensure items is an array
    if (!Array.isArray(items)) {
        console.warn('sortEventsByTime: items is not an array', items)
        return []
    }

    return [...items].sort((a, b) => {
        try {
            const dateA = parseISO(a.startTime)
            const dateB = parseISO(b.startTime)
            return dateA.getTime() - dateB.getTime()
        } catch {
            return 0
        }
    })
}
