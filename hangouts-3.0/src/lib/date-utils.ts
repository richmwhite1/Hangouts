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

