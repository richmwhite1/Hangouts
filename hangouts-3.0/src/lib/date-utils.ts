export function createStartTimeFilter(options: {
  startDate?: string | null
  endDate?: string | null
  includePast?: boolean
}) {
  const { startDate, endDate, includePast } = options
  const filter: Record<string, Date> = {}

  if (startDate) {
    const parsedStart = new Date(startDate)
    if (!isNaN(parsedStart.getTime())) {
      filter.gte = parsedStart
    }
  } else if (!includePast) {
    // When includePast is false, we want to show events that haven't ended yet
    // So we filter by startTime >= now, but we'll also need to check endTime in the query
    // For now, use startTime >= now, but the API should also check endTime >= now OR endTime is null
    filter.gte = new Date()
  }

  if (endDate) {
    const parsedEnd = new Date(endDate)
    if (!isNaN(parsedEnd.getTime())) {
      filter.lte = parsedEnd
    }
  }

  return Object.keys(filter).length > 0 ? filter : undefined
}

export function isPastDate(dateInput?: string | Date | null) {
  if (!dateInput) return false
  const value = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(value.getTime())) return false
  return value.getTime() < Date.now()
}

/**
 * Format a relative time string (e.g., "3 months ago")
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return 'Never'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return 'Never'
  
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - dateObj.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return months === 1 ? '1 month ago' : `${months} months ago`
  }
  
  const years = Math.floor(diffDays / 365)
  return years === 1 ? '1 year ago' : `${years} years ago`
}

