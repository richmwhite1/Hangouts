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

