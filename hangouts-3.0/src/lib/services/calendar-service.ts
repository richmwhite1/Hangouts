export interface CalendarEvent {
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
  url?: string
  timezone?: string
  reminders?: number[] // Minutes before event (e.g., [1440, 60] for 1 day and 1 hour)
  organizer?: {
    name: string
    email?: string
  }
  attendees?: Array<{
    name: string
    email?: string
  }>
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
   * Generate ICS content for Apple Calendar with reminders and timezone support
   */
  private static generateICSContent(event: CalendarEvent): string {
    const startDate = new Date(event.startTime)
    const endDate = new Date(event.endTime)
    const now = new Date()
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    }

    const escapeText = (text: string) => {
      return text.replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n')
    }

    // Generate VALARM (reminders)
    const reminders = event.reminders || [60] // Default: 1 hour before
    const alarms = reminders.map(minutes => {
      return [
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:Reminder: ${escapeText(event.title)}`,
        `TRIGGER:-PT${minutes}M`,
        'END:VALARM'
      ].join('\r\n')
    })

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Plans//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      event.timezone ? `X-WR-TIMEZONE:${event.timezone}` : '',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@plans.app`,
      `DTSTAMP:${formatDate(now)}`,
      `DTSTART${event.timezone ? `;TZID=${event.timezone}` : ''}:${formatDate(startDate)}`,
      `DTEND${event.timezone ? `;TZID=${event.timezone}` : ''}:${formatDate(endDate)}`,
      `SUMMARY:${escapeText(event.title)}`,
      event.description ? `DESCRIPTION:${escapeText(event.description)}` : '',
      event.location ? `LOCATION:${escapeText(event.location)}` : '',
      event.url ? `URL:${event.url}` : '',
      event.organizer ? `ORGANIZER;CN=${escapeText(event.organizer.name)}${event.organizer.email ? `:MAILTO:${event.organizer.email}` : ''}` : '',
      ...(event.attendees || []).map(attendee => 
        `ATTENDEE;CN=${escapeText(attendee.name)}${attendee.email ? `;RSVP=TRUE:MAILTO:${attendee.email}` : ''}`
      ),
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      ...alarms,
      'END:VEVENT',
      'END:VCALENDAR'
    ]

    return icsLines.filter(line => line).join('\r\n')
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

  /**
   * Get user's timezone
   */
  static getUserTimezone(): string {
    if (typeof window === 'undefined') return 'UTC'
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  }

  /**
   * Show success message with better UX
   */
  static showSuccessMessage(message: string = 'Added to calendar!'): void {
    // Create toast notification element
    const toast = document.createElement('div')
    toast.innerHTML = `
      <div style="
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #10b981;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: slideUp 0.3s ease-out;
      ">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        ${message}
      </div>
    `
    
    // Add animation keyframes
    const style = document.createElement('style')
    style.textContent = `
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
    `
    document.head.appendChild(style)
    
    document.body.appendChild(toast)
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0'
      toast.style.transform = 'translateX(-50%) translateY(20px)'
      toast.style.transition = 'all 0.3s ease-out'
      setTimeout(() => {
        document.body.removeChild(toast)
        document.head.removeChild(style)
      }, 300)
    }, 3000)
  }
}

export const calendarService = new CalendarService()



