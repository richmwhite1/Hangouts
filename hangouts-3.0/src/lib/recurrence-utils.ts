/**
 * Recurrence utilities for handling recurring events
 * Supports basic RRULE format for daily, weekly, and monthly patterns
 */

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export interface RecurrencePattern {
  frequency: RecurrenceFrequency
  interval?: number // e.g., every 2 weeks
  daysOfWeek?: number[] // 0 = Sunday, 6 = Saturday (for weekly)
  dayOfMonth?: number // 1-31 (for monthly)
  endDate?: Date
  count?: number // Number of occurrences
}

export interface RecurrenceRule {
  rule: string // RRULE format
  pattern: RecurrencePattern
}

/**
 * Generate RRULE string from pattern
 * Format: FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20251231T235959Z
 */
export function generateRRule(pattern: RecurrencePattern): string {
  const parts: string[] = []

  // Frequency (required)
  parts.push(`FREQ=${pattern.frequency}`)

  // Interval (optional, default 1)
  if (pattern.interval && pattern.interval > 1) {
    parts.push(`INTERVAL=${pattern.interval}`)
  }

  // Days of week (for weekly recurrence)
  if (pattern.frequency === 'WEEKLY' && pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
    const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
    const days = pattern.daysOfWeek.map(d => dayNames[d]).join(',')
    parts.push(`BYDAY=${days}`)
  }

  // Day of month (for monthly recurrence)
  if (pattern.frequency === 'MONTHLY' && pattern.dayOfMonth) {
    parts.push(`BYMONTHDAY=${pattern.dayOfMonth}`)
  }

  // End date or count
  if (pattern.endDate) {
    const until = pattern.endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    parts.push(`UNTIL=${until}`)
  } else if (pattern.count) {
    parts.push(`COUNT=${pattern.count}`)
  }

  return parts.join(';')
}

/**
 * Parse RRULE string into pattern object
 */
export function parseRRule(rrule: string): RecurrencePattern {
  const parts = rrule.split(';')
  const pattern: RecurrencePattern = {
    frequency: 'DAILY'
  }

  parts.forEach(part => {
    const [key, value] = part.split('=')
    
    switch (key) {
      case 'FREQ':
        pattern.frequency = value as RecurrenceFrequency
        break
      
      case 'INTERVAL':
        pattern.interval = parseInt(value)
        break
      
      case 'BYDAY':
        const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
        pattern.daysOfWeek = value.split(',').map(day => dayNames.indexOf(day))
        break
      
      case 'BYMONTHDAY':
        pattern.dayOfMonth = parseInt(value)
        break
      
      case 'UNTIL':
        // Parse ISO date from RRULE format
        const year = parseInt(value.substring(0, 4))
        const month = parseInt(value.substring(4, 6)) - 1
        const day = parseInt(value.substring(6, 8))
        pattern.endDate = new Date(year, month, day)
        break
      
      case 'COUNT':
        pattern.count = parseInt(value)
        break
    }
  })

  return pattern
}

/**
 * Generate human-readable description of recurrence pattern
 */
export function describeRecurrence(pattern: RecurrencePattern): string {
  const { frequency, interval = 1, daysOfWeek, dayOfMonth, endDate, count } = pattern

  let description = ''

  // Frequency description
  if (frequency === 'DAILY') {
    description = interval === 1 ? 'Every day' : `Every ${interval} days`
  } else if (frequency === 'WEEKLY') {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    if (daysOfWeek && daysOfWeek.length > 0) {
      const days = daysOfWeek.map(d => dayNames[d]).join(', ')
      description = interval === 1 
        ? `Every ${days}` 
        : `Every ${interval} weeks on ${days}`
    } else {
      description = interval === 1 ? 'Every week' : `Every ${interval} weeks`
    }
  } else if (frequency === 'MONTHLY') {
    if (dayOfMonth) {
      const suffix = getDayOfMonthSuffix(dayOfMonth)
      description = interval === 1
        ? `Every ${dayOfMonth}${suffix} of the month`
        : `Every ${interval} months on the ${dayOfMonth}${suffix}`
    } else {
      description = interval === 1 ? 'Every month' : `Every ${interval} months`
    }
  }

  // End condition
  if (endDate) {
    description += ` until ${formatDate(endDate)}`
  } else if (count) {
    description += ` for ${count} occurrences`
  }

  return description
}

/**
 * Generate event instances from recurrence pattern
 * Returns array of dates for the next N occurrences (up to 6 months)
 */
export function generateEventInstances(
  startDate: Date,
  pattern: RecurrencePattern,
  maxInstances: number = 50
): Date[] {
  const instances: Date[] = []
  const { frequency, interval = 1, daysOfWeek, dayOfMonth, endDate, count } = pattern

  // Maximum date: 6 months from start or endDate, whichever is sooner
  const sixMonthsFromNow = new Date(startDate)
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
  const maxDate = endDate && endDate < sixMonthsFromNow ? endDate : sixMonthsFromNow

  let currentDate = new Date(startDate)
  const maxOccurrences = count || maxInstances

  while (instances.length < maxOccurrences && currentDate <= maxDate) {
    instances.push(new Date(currentDate))

    // Calculate next occurrence based on frequency
    if (frequency === 'DAILY') {
      currentDate.setDate(currentDate.getDate() + interval)
    } else if (frequency === 'WEEKLY') {
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Find next day of week in the pattern
        let found = false
        for (let i = 1; i <= 7; i++) {
          currentDate.setDate(currentDate.getDate() + 1)
          if (daysOfWeek.includes(currentDate.getDay())) {
            found = true
            break
          }
        }
        if (!found) {
          // Skip to next interval
          currentDate.setDate(currentDate.getDate() + (7 * interval))
        }
      } else {
        currentDate.setDate(currentDate.getDate() + (7 * interval))
      }
    } else if (frequency === 'MONTHLY') {
      currentDate.setMonth(currentDate.getMonth() + interval)
      if (dayOfMonth) {
        currentDate.setDate(dayOfMonth)
      }
    }
  }

  return instances
}

/**
 * Validate recurrence pattern
 */
export function validateRecurrencePattern(pattern: RecurrencePattern): { valid: boolean; error?: string } {
  if (!pattern.frequency) {
    return { valid: false, error: 'Frequency is required' }
  }

  if (pattern.interval && pattern.interval < 1) {
    return { valid: false, error: 'Interval must be at least 1' }
  }

  if (pattern.frequency === 'WEEKLY' && pattern.daysOfWeek) {
    if (pattern.daysOfWeek.length === 0) {
      return { valid: false, error: 'At least one day must be selected for weekly recurrence' }
    }
    if (pattern.daysOfWeek.some(d => d < 0 || d > 6)) {
      return { valid: false, error: 'Invalid day of week' }
    }
  }

  if (pattern.frequency === 'MONTHLY' && pattern.dayOfMonth) {
    if (pattern.dayOfMonth < 1 || pattern.dayOfMonth > 31) {
      return { valid: false, error: 'Day of month must be between 1 and 31' }
    }
  }

  if (pattern.endDate && pattern.count) {
    return { valid: false, error: 'Cannot specify both end date and count' }
  }

  return { valid: true }
}

// Helper functions
function getDayOfMonthSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

