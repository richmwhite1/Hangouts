export interface CalendarEvent {
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  url?: string
}

export class CalendarService {
  /**
   * Generate Google Calendar URL
   */
  static generateGoogleCalendarUrl(event: CalendarEvent): string {
    const baseUrl = 'https://calendar.google.com/calendar/render'
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${this.formatDateForGoogle(event.startTime)}/${this.formatDateForGoogle(event.endTime)}`,
      details: event.description || '',
      location: event.location || '',
      url: event.url || ''
    })
    
    return `${baseUrl}?${params.toString()}`
  }

  /**
   * Generate Apple Calendar URL (ICS format)
   */
  static generateAppleCalendarUrl(event: CalendarEvent): string {
    const icsContent = this.generateICSContent(event)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    return URL.createObjectURL(blob)
  }

  /**
   * Add event to Google Calendar
   */
  static async addToGoogleCalendar(event: CalendarEvent): Promise<void> {
    const url = this.generateGoogleCalendarUrl(event)
    window.open(url, '_blank')
  }

  /**
   * Add event to Apple Calendar
   */
  static async addToAppleCalendar(event: CalendarEvent): Promise<void> {
    // For iOS devices, use the calendar:// URL scheme to open Calendar app directly
    if (this.isIOSDevice()) {
      const startDate = new Date(event.startTime)
      const endDate = new Date(event.endTime)
      
      const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
      }

      const title = encodeURIComponent(event.title)
      const location = encodeURIComponent(event.location || '')
      const notes = encodeURIComponent(event.description || '')
      
      const calendarUrl = `calendar://event?title=${title}&location=${location}&notes=${notes}&startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`
      
      // Try to open Calendar app directly
      window.location.href = calendarUrl
    } else {
      // For other devices, download ICS file
      const url = this.generateAppleCalendarUrl(event)
      const link = document.createElement('a')
      link.href = url
      link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  /**
   * Add event to Outlook Calendar
   */
  static async addToOutlookCalendar(event: CalendarEvent): Promise<void> {
    // Generate Outlook web calendar URL
    const startDate = new Date(event.startTime)
    const endDate = new Date(event.endTime)
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    }

    const title = encodeURIComponent(event.title)
    const description = encodeURIComponent(event.description || '')
    const location = encodeURIComponent(event.location || '')
    const url = encodeURIComponent(event.url || '')
    
    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${description}&location=${location}&startdt=${formatDate(startDate)}&enddt=${formatDate(endDate)}&url=${url}`
    
    window.open(outlookUrl, '_blank')
  }

  /**
   * Format date for Google Calendar (YYYYMMDDTHHMMSSZ)
   */
  private static formatDateForGoogle(dateString: string): string {
    const date = new Date(dateString)
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  }

  /**
   * Generate ICS content for Apple Calendar
   */
  private static generateICSContent(event: CalendarEvent): string {
    const startDate = new Date(event.startTime)
    const endDate = new Date(event.endTime)
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    }

    const escapeText = (text: string) => {
      return text.replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n')
    }

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hangouts 3.0//EN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@hangouts.app`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${escapeText(event.title)}`,
      event.description ? `DESCRIPTION:${escapeText(event.description)}` : '',
      event.location ? `LOCATION:${escapeText(event.location)}` : '',
      event.url ? `URL:${event.url}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(line => line).join('\r\n')
  }

  /**
   * Check if device supports calendar integration
   */
  static isCalendarSupported(): boolean {
    return typeof window !== 'undefined' && 'Blob' in window
  }

  /**
   * Detect if user is on iOS device
   */
  static isIOSDevice(): boolean {
    if (typeof window === 'undefined') return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
  }

  /**
   * Detect if user is on Android device
   */
  static isAndroidDevice(): boolean {
    if (typeof window === 'undefined') return false
    return /Android/.test(navigator.userAgent)
  }
}

export const calendarService = new CalendarService()



