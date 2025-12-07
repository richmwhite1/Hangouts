'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { MobileModal } from './mobile-modal'
import { logger } from '@/lib/logger'

interface SimpleDateTimePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * Simple, user-friendly date and time picker
 * Opens as a modal/popup for easy selection
 */
export function SimpleDateTimePicker({ 
  value, 
  onChange, 
  placeholder = "Select date and time",
  className = "" 
}: SimpleDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth())
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear())
  const [isProcessing, setIsProcessing] = useState(false)

  // Initialize from value
  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          const dateString = date.toISOString().split('T')[0]
          setSelectedDate(dateString)
          
          // Format time as HH:MM
          const hours = date.getHours().toString().padStart(2, '0')
          const minutes = date.getMinutes().toString().padStart(2, '0')
          setSelectedTime(`${hours}:${minutes}`)
          
          setDisplayMonth(date.getMonth())
          setDisplayYear(date.getFullYear())
        }
      } catch (error) {
        console.error('Error parsing date:', error)
      }
    }
  }, [value])

  // Generate calendar days
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(displayYear, displayMonth, 1).getDay()
  const days: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const handleDateSelect = (day: number) => {
    if (isProcessing) return // Prevent multiple clicks
    
    setIsProcessing(true)
    const dateString = `${displayYear}-${(displayMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    setSelectedDate(dateString)
    
    // Reset processing flag after a short delay
    setTimeout(() => setIsProcessing(false), 300)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTime(e.target.value)
  }

  const handleConfirm = () => {
    if (selectedDate && selectedTime && !isProcessing) {
      setIsProcessing(true)
      const [hours, minutes] = selectedTime.split(':')
      const date = new Date(`${selectedDate}T${hours}:${minutes}:00`)
      const isoString = date.toISOString()
      onChange(isoString)
      setIsOpen(false)
      setIsProcessing(false)
      logger.info('Date/time selected:', { selectedDate, selectedTime, isoString })
    }
  }

  const formatDisplayValue = () => {
    if (!value) return placeholder
    
    try {
      const date = new Date(value)
      if (isNaN(date.getTime())) return placeholder
      
      const dateStr = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
      const timeStr = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
      
      return `${dateStr} at ${timeStr}`
    } catch {
      return placeholder
    }
  }

  const quickTimes = [
    { label: 'Morning', time: '09:00' },
    { label: 'Noon', time: '12:00' },
    { label: 'Afternoon', time: '15:00' },
    { label: 'Evening', time: '18:00' },
    { label: 'Night', time: '21:00' },
  ]

  const quickDates = [
    { label: 'Today', getDate: () => {
      const today = new Date()
      return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`
    }},
    { label: 'Tomorrow', getDate: () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return `${tomorrow.getFullYear()}-${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}-${tomorrow.getDate().toString().padStart(2, '0')}`
    }},
    { label: 'This Weekend', getDate: () => {
      const saturday = new Date()
      const dayOfWeek = saturday.getDay()
      const daysUntilSaturday = (6 - dayOfWeek) % 7 || 7
      saturday.setDate(saturday.getDate() + daysUntilSaturday)
      return `${saturday.getFullYear()}-${(saturday.getMonth() + 1).toString().padStart(2, '0')}-${saturday.getDate().toString().padStart(2, '0')}`
    }},
  ]

  // Close any open location suggestions when date picker opens
  useEffect(() => {
    if (isOpen) {
      // Close any Google Maps autocomplete suggestions
      const pacContainers = document.querySelectorAll('.pac-container')
      pacContainers.forEach(container => {
        (container as HTMLElement).style.display = 'none'
      })
      
      // Also close any custom suggestion dropdowns
      const suggestionDropdowns = document.querySelectorAll('[style*="zIndex"][style*="99999"]')
      suggestionDropdowns.forEach(dropdown => {
        (dropdown as HTMLElement).style.display = 'none'
      })
    }
  }, [isOpen])

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          // Close any open location suggestions before opening date picker
          const pacContainers = document.querySelectorAll('.pac-container')
          pacContainers.forEach(container => {
            (container as HTMLElement).style.display = 'none'
          })
          const suggestionDropdowns = document.querySelectorAll('[style*="zIndex"][style*="99999"]')
          suggestionDropdowns.forEach(dropdown => {
            (dropdown as HTMLElement).style.display = 'none'
          })
          setIsOpen(true)
        }}
        className="w-full flex items-center gap-2 px-4 py-3 bg-black border border-gray-600 rounded-lg text-white hover:border-purple-500 transition-colors text-left"
      >
        <Calendar className="w-5 h-5 text-blue-400" />
        <span className="flex-1">{formatDisplayValue()}</span>
        <Clock className="w-4 h-4 text-gray-400" />
      </button>

      <MobileModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Select Date & Time"
        className="bg-gray-900 border-gray-700 max-w-md"
        closeOnBackdropClick={true}
        closeOnEscape={true}
        preventBodyScroll={true}
      >
        <div className="p-4 space-y-6">

          {/* Quick Date Options */}
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">Quick dates:</p>
            <div className="flex gap-2 flex-wrap">
              {quickDates.map((quick) => (
                <button
                  key={quick.label}
                  type="button"
                  onClick={() => {
                    setSelectedDate(quick.getDate())
                    if (!selectedTime) setSelectedTime('18:00')
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    selectedDate === quick.getDate()
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {quick.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => {
                  if (isProcessing) return
                  if (displayMonth === 0) {
                    setDisplayMonth(11)
                    setDisplayYear(displayYear - 1)
                  } else {
                    setDisplayMonth(displayMonth - 1)
                  }
                }}
                disabled={isProcessing}
                className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1"
              >
                ‹
              </button>
              <h4 className="text-white font-medium">
                {monthNames[displayMonth]} {displayYear}
              </h4>
              <button
                type="button"
                onClick={() => {
                  if (isProcessing) return
                  if (displayMonth === 11) {
                    setDisplayMonth(0)
                    setDisplayYear(displayYear + 1)
                  } else {
                    setDisplayMonth(displayMonth + 1)
                  }
                }}
                disabled={isProcessing}
                className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={index} />
                }
                
                const dateString = `${displayYear}-${(displayMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
                const isSelected = selectedDate === dateString
                const isToday = dateString === new Date().toISOString().split('T')[0]
                const isPast = new Date(dateString) < new Date(new Date().toISOString().split('T')[0])

                return (
                  <button
                    key={`${day}-${displayMonth}-${displayYear}`}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDateSelect(day)
                    }}
                    disabled={isPast || isProcessing}
                    className={`aspect-square rounded-lg text-sm transition-colors ${
                      isSelected
                        ? 'bg-purple-600 text-white'
                        : isToday
                        ? 'bg-purple-600/30 text-white border border-purple-500'
                        : isPast || isProcessing
                        ? 'text-gray-600 cursor-not-allowed opacity-50'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time Selection */}
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">Time:</p>
            <div className="flex items-center gap-3">
              <Input
                type="time"
                value={selectedTime}
                onChange={handleTimeChange}
                className="flex-1 bg-gray-800 border-gray-600 text-white"
              />
              <div className="flex gap-1 flex-wrap">
                {quickTimes.map((quick) => (
                  <button
                    key={quick.label}
                    type="button"
                    onClick={() => setSelectedTime(quick.time)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      selectedTime === quick.time
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {quick.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedTime || isProcessing}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Confirm'}
          </Button>
        </div>
      </MobileModal>
    </div>
  )
}
