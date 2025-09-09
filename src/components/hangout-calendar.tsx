"use client"

import type React from "react"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CalendarEvent {
  id: string
  title: string
  date: Date
  status: "going" | "maybe" | "not-going"
  participants: number
  image: string
}

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Coffee & Code",
    date: new Date(2024, 11, 15),
    status: "going",
    participants: 4,
    image: "/modern-coffee-shop.png",
  },
  {
    id: "2",
    title: "Weekend Hike",
    date: new Date(2024, 11, 18),
    status: "maybe",
    participants: 7,
    image: "/modern-coffee-shop.png",
  },
  {
    id: "3",
    title: "Game Night",
    date: new Date(2024, 11, 22),
    status: "going",
    participants: 6,
    image: "/modern-coffee-shop.png",
  },
]

export function HangoutCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

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
    return mockEvents.filter((event) => event.date.toDateString() === date.toDateString())
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "going":
        return "bg-primary"
      case "maybe":
        return "bg-yellow-500"
      case "not-going":
        return "bg-red-500"
      default:
        return "bg-muted"
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
                    <div className="absolute bottom-1 left-1 right-1 flex space-x-0.5">
                      {events.slice(0, 3).map((event, eventIndex) => (
                        <div
                          key={event.id}
                          className={`w-1.5 h-1.5 rounded-full ${getStatusColor(event.status)} cursor-pointer`}
                          onMouseEnter={(e) => {
                            setHoveredEvent(event)
                            handleMouseMove(e)
                          }}
                          onMouseLeave={() => setHoveredEvent(null)}
                          onMouseMove={handleMouseMove}
                        />
                      ))}
                      {events.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />}
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
          className="fixed z-50 bg-popover border border-border/50 rounded-lg p-3 shadow-lg pointer-events-none"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
            transform: "translateY(-100%)",
          }}
        >
          <div className="flex items-center space-x-3">
            <img
              src={hoveredEvent.image || "/placeholder.svg"}
              alt={hoveredEvent.title}
              className="w-10 h-10 rounded object-cover"
            />
            <div>
              <div className="font-medium text-sm">{hoveredEvent.title}</div>
              <div className="text-xs text-muted-foreground">{hoveredEvent.participants} participants</div>
              <div
                className={`text-xs px-1.5 py-0.5 rounded-full inline-block mt-1 ${
                  hoveredEvent.status === "going"
                    ? "bg-primary text-primary-foreground"
                    : hoveredEvent.status === "maybe"
                      ? "bg-yellow-500/20 text-yellow-600"
                      : "bg-red-500/20 text-red-600"
                }`}
              >
                {hoveredEvent.status === "going" ? "Going" : hoveredEvent.status === "maybe" ? "Maybe" : "Not Going"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
