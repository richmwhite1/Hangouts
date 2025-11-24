import { HangoutFrequency, getFrequencyThresholdDays } from './services/relationship-reminder-service'

export type RelationshipStatus = 'on-track' | 'approaching' | 'overdue' | 'no-goal'

export interface TimeElapsedInfo {
  text: string
  days: number | null
  status: RelationshipStatus
  daysUntilThreshold?: number
  thresholdDays?: number
}

/**
 * Calculate days since a given date
 */
export function getDaysSince(date: Date | string | null | undefined): number | null {
  if (!date) return null
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return null
  
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - dateObj.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * Format time elapsed in a human-readable way
 */
export function formatTimeElapsed(date: Date | string | null | undefined): string {
  if (!date) return 'Never'
  
  const days = getDaysSince(date)
  if (days === null) return 'Never'
  
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
  }
  if (days < 365) {
    const months = Math.floor(days / 30)
    return months === 1 ? '1 month ago' : `${months} months ago`
  }
  
  const years = Math.floor(days / 365)
  return years === 1 ? '1 year ago' : `${years} years ago`
}

/**
 * Get detailed time elapsed information with relationship status
 */
export function getTimeElapsedInfo(
  lastHangoutDate: Date | string | null | undefined,
  frequency: HangoutFrequency | null
): TimeElapsedInfo {
  const days = getDaysSince(lastHangoutDate)
  const text = formatTimeElapsed(lastHangoutDate)
  
  if (!frequency) {
    return {
      text,
      days,
      status: 'no-goal'
    }
  }
  
  const thresholdDays = getFrequencyThresholdDays(frequency)
  if (!thresholdDays) {
    return {
      text,
      days,
      status: 'no-goal'
    }
  }
  
  // If no hangout ever, consider it overdue if threshold is reasonable
  if (days === null) {
    return {
      text: 'Never',
      days: null,
      status: thresholdDays >= 30 ? 'overdue' : 'no-goal',
      thresholdDays
    }
  }
  
  const daysUntilThreshold = thresholdDays - days
  const approachingThreshold = 7 // Consider "approaching" if within 7 days of threshold
  
  if (days >= thresholdDays) {
    return {
      text,
      days,
      status: 'overdue',
      daysUntilThreshold: 0,
      thresholdDays
    }
  } else if (daysUntilThreshold <= approachingThreshold) {
    return {
      text,
      days,
      status: 'approaching',
      daysUntilThreshold,
      thresholdDays
    }
  } else {
    return {
      text,
      days,
      status: 'on-track',
      daysUntilThreshold,
      thresholdDays
    }
  }
}

/**
 * Get relationship status badge color classes
 */
export function getStatusColorClasses(status: RelationshipStatus): string {
  switch (status) {
    case 'on-track':
      return 'bg-green-500/20 text-green-400 border-green-500/50'
    case 'approaching':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
    case 'overdue':
      return 'bg-red-500/20 text-red-400 border-red-500/50'
    case 'no-goal':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
  }
}

/**
 * Get relationship status label
 */
export function getStatusLabel(status: RelationshipStatus): string {
  switch (status) {
    case 'on-track':
      return 'On Track'
    case 'approaching':
      return 'Due Soon'
    case 'overdue':
      return 'Overdue'
    case 'no-goal':
      return 'No Goal Set'
    default:
      return 'Unknown'
  }
}

