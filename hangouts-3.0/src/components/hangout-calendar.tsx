"use client"

import React, { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { getHangoutActionStatus } from '@/hooks/use-hangout-actions'

interface CalendarEvent {
  id: string
  title: string
  date: Date
  status: "going" | "maybe" | "not-going"
  participants: number
  image: string
  type: 'hangout' | 'event'
  votingStatus?: 'open' | 'closed' | 'pending'
  myRsvpStatus?: "YES" | "NO" | "MAYBE" | "PENDING"
}

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Coffee & Code",
    date: new Date(2024, 11, 15),
    status: "going",
    participants: 4,
    image: "/modern-coffee-shop.png"},
  {
    id: "2",
    title: "Weekend Hike",
    date: new Date(2024, 11, 18),
    status: "maybe",
    participants: 7,
    image: "/modern-coffee-shop.png"},
  {
    id: "3",
    title: "Game Night",
    date: new Date(2024, 11, 22),
    status: "going",
    participants: 6,
    image: "/modern-coffee-shop.png"},
]

interface HangoutCalendarProps {
  hangouts?: any[]
  events?: any[]
  currentUserId?: string
}

export function HangoutCalendar({ hangouts = [], events = [], currentUserId }: HangoutCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  // Process hangouts and events into calendar events
  const calendarEvents = useMemo(() => {
    const allEvents: CalendarEvent[] = []
    
    // Process hangouts
    hangouts.forEach(hangout => {
      const eventDate = new Date(hangout.startTime || hangout.date)
      
      // Determine RSVP status - check multiple possible sources
      let rsvpStatus = 'not-going'
      if (hangout.myRsvpStatus) {
        rsvpStatus = hangout.myRsvpStatus === 'YES' ? 'going' : 
                    hangout.myRsvpStatus === 'MAYBE' ? 'maybe' : 'not-going'
      } else if (hangout.participants && Array.isArray(hangout.participants) && currentUserId) {
        // Look for current user's RSVP in participants array
        const currentUserParticipant = hangout.participants.find(p => p.user?.id === currentUserId)
        if (currentUserParticipant) {
          rsvpStatus = currentUserParticipant.rsvpStatus === 'YES' ? 'going' : 
                      currentUserParticipant.rsvpStatus === 'MAYBE' ? 'maybe' : 'not-going'
        }
      }
      
      allEvents.push({
        id: hangout.id,
        title: hangout.title,
        date: eventDate,
        status: rsvpStatus,
        participants: hangout.participants?.length || hangout._count?.participants || 0,
        image: hangout.image || '/default-hangout-friends.png',
        type: 'hangout',
        votingStatus: hangout.votingStatus,
        myRsvpStatus: hangout.myRsvpStatus
      })
    })
    
    // Process events
    events.forEach(event => {
      const eventDate = new Date(event.startDate || event.startTime)
      allEvents.push({
        id: event.id,
        title: event.title,
        date: eventDate,
        status: event.myRsvpStatus === 'YES' ? 'going' : 
                event.myRsvpStatus === 'MAYBE' ? 'maybe' : 'not-going',
        participants: event.attendeeCount || 0,
        image: event.coverImage || '/default-event.png',
        type: 'event',
        votingStatus: event.votingStatus,
        myRsvpStatus: event.myRsvpStatus
      })
    })
    
    return allEvents
  }, [hangouts, events])

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const getEventsForDate = (date: Date | null) => {
    if (!date) return []
    return calendarEvents.filter((event) => event.date.toDateString() === date.toDateString())
  }

  const getStatusColor = (event: CalendarEvent) => {
    // Create a hangout object for the action status function
    const hangoutForStatus = {
      id: event.id,
      title: event.title,
      startTime: event.date.toISOString(),
      endTime: event.date.toISOString(),
      creator: { name: '', username: '' },
      myRsvpStatus: event.myRsvpStatus,
      votingStatus: event.votingStatus,
      hasRecentActivity: false
    }
    
    const actionStatus = getHangoutActionStatus(hangoutForStatus)
    
    // Use action priority for color coding
    switch (actionStatus.actionPriority) {
      case 'high':
        return "bg-red-500" // High priority: RSVP required or vote needed
      case 'medium':
        return "bg-orange-500" // Medium priority: RSVP needed
      case 'low':
        return "bg-blue-500" // Low priority: New activity
      default:
        // Fallback to RSVP status if no action needed
        switch (event.status) {
          case "going":
            return "bg-green-500"
          case "maybe":
            return "bg-yellow-500"
          case "not-going":
            return "bg-gray-500"
          default:
            return "bg-gray-400"
        }
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY })
  }

  const days = getDaysInMonth(currentDate)

  return (
    <div className="bg-card border border-border/50 rounded-lg p-4 shadow-sm">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth("prev")}
            className="h-8 w-8 p-0 hover:bg-muted/50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth("next")}
            className="h-8 w-8 p-0 hover:bg-muted/50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-xs font-medium text-muted-foreground text-center py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const events = getEventsForDate(date)
          const isToday = date && date.toDateString() === new Date().toDateString()

          return (
            <div
              key={index}
              className={`
                aspect-square p-1 text-sm relative cursor-pointer transition-colors
                ${date ? "hover:bg-muted/30" : ""}
                ${isToday ? "bg-primary border border-primary rounded" : ""}
              `}
            >
              {date && (
                <>
                  <div className={`text-xs ${isToday ? "font-semibold text-primary-foreground" : "text-foreground"}`}>
                    {date.getDate()}
                  </div>
                  {events.length > 0 && (
                    <div className="absolute bottom-1 left-1 right-1 flex space-x-1">
                      {events.slice(0, 3).map((event, eventIndex) => (
                        <div
                          key={event.id}
                          className={`w-3 h-3 rounded-full ${getStatusColor(event)} cursor-pointer touch-manipulation`}
                          onMouseEnter={(e) => {
                            setHoveredEvent(event)
                            handleMouseMove(e)
                          }}
                          onMouseLeave={() => setHoveredEvent(null)}
                          onMouseMove={handleMouseMove}
                          onClick={() => {
                            const url = event.type === 'hangout' ? `/hangout/${event.id}` : `/event/${event.id}`
                            window.location.href = url
                          }}
                        />
                      ))}
                      {events.length > 3 && <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Event Tooltip */}
      {hoveredEvent && (
        <div
          className="fixed z-50 bg-popover border border-border/50 rounded-lg p-4 shadow-lg pointer-events-auto cursor-pointer max-w-xs"
          style={{
            left: Math.min(
              Math.max(mousePosition.x + 10, 10), // At least 10px from left edge
              window.innerWidth - 320 // 320px is max-w-xs width
            ),
            top: Math.max(mousePosition.y - 10, 10), // Keep at least 10px from top
            transform: mousePosition.y < 200 ? "translateY(0)" : "translateY(-100%)", // Show below if near top
            maxWidth: '300px', // Ensure consistent width
          }}
          onClick={() => {
            // Navigate to hangout or event detail page
            const url = hoveredEvent.type === 'hangout' ? `/hangout/${hoveredEvent.id}` : `/event/${hoveredEvent.id}`
            window.location.href = url
          }}
        >
          <div className="flex items-start space-x-3">
            <Image
              src={hoveredEvent.image || "/placeholder.svg"}
              alt={hoveredEvent.title}
              className="w-12 h-12 rounded object-cover"
              width={48}
              height={48}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm mb-1 line-clamp-2">{hoveredEvent.title}</div>
              <div className="text-xs text-muted-foreground mb-2">
                {hoveredEvent.participants} participants • {hoveredEvent.type === 'hangout' ? 'Hangout' : 'Event'}
              </div>
              
              {/* Voting Status */}
              {hoveredEvent.votingStatus && (
                <div className={`text-xs px-2 py-1 rounded-full inline-block mb-2 ${
                  hoveredEvent.votingStatus === 'open' 
                    ? 'bg-blue-100 text-blue-700' 
                    : hoveredEvent.votingStatus === 'pending'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {hoveredEvent.votingStatus === 'open' ? '🗳️ Voting Open' : 
                   hoveredEvent.votingStatus === 'pending' ? '⏳ Pending Vote' : '✅ Vote Closed'}
                </div>
              )}
              
              {/* RSVP Status */}
              <div
                className={`text-xs px-2 py-1 rounded-full inline-block ${
                  hoveredEvent.status === "going"
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : hoveredEvent.status === "maybe"
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                {hoveredEvent.status === "going" ? "✅ Going" : 
                 hoveredEvent.status === "maybe" ? "❓ Maybe" : "⏳ Pending"}
              </div>
              
              <div className="text-xs text-muted-foreground mt-2">
                Click to view details
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
