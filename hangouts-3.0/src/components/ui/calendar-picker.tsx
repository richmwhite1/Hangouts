'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, X } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'

interface CalendarPickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function CalendarPicker({ value, onChange, placeholder = "Select date and time", className = "" }: CalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth())
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear())
  const [isMobile, setIsMobile] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Detect mobile device (client-side only)
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  }, [])

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Initialize selected date and time from value prop
  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          const dateString = date.toISOString().split('T')[0]
          setSelectedDate(dateString)

          // Convert to 12-hour format
          let hours = date.getHours()
          const minutes = date.getMinutes()
          const period = hours >= 12 ? 'PM' : 'AM'
          hours = hours % 12 || 12
          const timeString = `${hours}:${minutes.toString().padStart(2, '0')} ${period}`
          setSelectedTime(timeString)

          // Set display month/year to match the selected date
          setDisplayMonth(date.getMonth())
          setDisplayYear(date.getFullYear())
        }
      } catch (error) {
        console.error('Error parsing date:', error)
      }
    }
  }, [value])

  // Generate calendar days for displayed month
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

  const handleDateSelect = (day: number) => {
    const year = displayYear
    const month = (displayMonth + 1).toString().padStart(2, '0')
    const dayStr = day.toString().padStart(2, '0')
    const dateString = `${year}-${month}-${dayStr}`
    setSelectedDate(dateString)
    console.log('Date selected:', dateString)
  }

  const convertTo24Hour = (time12: string) => {
    const [time, period] = time12.split(' ')
    let [hours, minutes] = time.split(':')
    let hoursNum = parseInt(hours)

    if (period === 'PM' && hoursNum !== 12) {
      hoursNum += 12
    } else if (period === 'AM' && hoursNum === 12) {
      hoursNum = 0
    }

    return `${hoursNum.toString().padStart(2, '0')}:${minutes}`
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    console.log('Time selected:', time)
  }

  const goToPreviousMonth = () => {
    if (displayMonth === 0) {
      setDisplayMonth(11)
      setDisplayYear(displayYear - 1)
    } else {
      setDisplayMonth(displayMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayMonth(0)
      setDisplayYear(displayYear + 1)
    } else {
      setDisplayMonth(displayMonth + 1)
    }
  }

  const handleConfirm = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (selectedDate && selectedTime) {
      try {
        const time24 = convertTo24Hour(selectedTime)
        // Create date in local timezone to avoid timezone shift
        const [year, month, day] = selectedDate.split('-').map(Number)
        const [hours, minutes] = time24.split(':').map(Number)
        const dateTime = new Date(year, month - 1, day, hours, minutes, 0).toISOString()
        console.log('Confirming date/time:', dateTime)
        onChange(dateTime)
        setIsOpen(false)
      } catch (error) {
        console.error('Error creating date:', error)
      }
    } else {
      console.warn('Cannot confirm - missing date or time', { selectedDate, selectedTime })
    }
  }

  const formatDisplayValue = (value: string) => {
    if (!value) return placeholder
    try {
      const date = new Date(value)
      if (isNaN(date.getTime())) return placeholder
      return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return placeholder
    }
  }

  // Predefined time slots in 12-hour format
  const timeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
    '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM'
  ]

  const [customTime, setCustomTime] = useState('')
  const [showCustomTime, setShowCustomTime] = useState(false)

  // Use native date/time inputs on mobile for better UX
  if (isMobile) {
    const dateValue = value ? new Date(value).toISOString().slice(0, 16) : ''

    return (
      <div className={`relative ${className}`}>
        <input
          type="datetime-local"
          value={dateValue}
          onChange={(e) => {
            if (e.target.value) {
              const isoString = new Date(e.target.value).toISOString()
              console.log('Mobile datetime changed:', isoString)
              onChange(isoString)
            }
          }}
          placeholder={placeholder}
          className="w-full p-3 bg-black border border-gray-600 rounded-lg text-white min-h-[44px] text-base"
        />
      </div>
    )
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Toggle picker:', !isOpen)
    setIsOpen(!isOpen)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedDate('')
    setSelectedTime('')
    onChange('')
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      <Button
        type="button"
        variant="outline"
        onClick={handleToggle}
        className={`w-full justify-start text-left font-normal border-gray-600 text-white min-h-[44px] transition-all ${value
            ? 'bg-black hover:bg-gray-800 hover:border-gray-500'
            : 'bg-gray-900 hover:bg-gray-800 hover:border-blue-500 border-dashed animate-pulse-subtle'
          }`}
      >
        <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
        <span className={value ? 'text-white' : 'text-gray-400'}>
          {value ? formatDisplayValue(value) : '📅 Click to select date & time'}
        </span>
        {value && (
          <X
            className="ml-auto h-4 w-4 hover:text-red-500 flex-shrink-0"
            onClick={handleClear}
          />
        )}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={() => setIsOpen(false)}>
          <div
            className="bg-black border border-gray-600 rounded-lg shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              {/* Calendar */}
              <div>
                <h3 className="text-white font-semibold mb-2 flex items-center justify-between">
                  <span className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    Select Date
                  </span>
                  {selectedDate && (
                    <span className="text-sm text-gray-400">{selectedDate}</span>
                  )}
                </h3>

                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={goToPreviousMonth}
                    className="p-3 rounded-lg hover:bg-gray-700 text-white text-lg font-bold transition-all duration-200 active:scale-95"
                  >
                    ‹
                  </button>
                  <h4 className="text-white font-semibold text-lg">
                    {monthNames[displayMonth]} {displayYear}
                  </h4>
                  <button
                    type="button"
                    onClick={goToNextMonth}
                    className="p-3 rounded-lg hover:bg-gray-700 text-white text-lg font-bold transition-all duration-200 active:scale-95"
                  >
                    ›
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-sm">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-gray-400 font-semibold text-xs">{day}</div>
                  ))}
                  {days.map((day, index) => {
                    const isToday = day === new Date().getDate() &&
                      displayMonth === new Date().getMonth() &&
                      displayYear === new Date().getFullYear()
                    const isSelected = selectedDate && day === new Date(selectedDate + 'T12:00:00').getDate() &&
                      displayMonth === new Date(selectedDate + 'T12:00:00').getMonth() &&
                      displayYear === new Date(selectedDate + 'T12:00:00').getFullYear()

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => day && handleDateSelect(day)}
                        className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 min-h-[44px] min-w-[44px] ${isSelected ? 'bg-blue-600 text-white shadow-lg' :
                          isToday ? 'bg-gray-600 text-white border-2 border-gray-400' :
                            'text-white hover:bg-gray-700 hover:text-white'
                          }`}
                        disabled={!day}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Time Picker */}
              <div>
                <h3 className="text-white font-semibold mb-2 flex items-center justify-between">
                  <span className="flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    Select Time
                  </span>
                  {selectedTime && (
                    <span className="text-sm text-gray-400">{selectedTime}</span>
                  )}
                </h3>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {timeSlots.map(time => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => handleTimeSelect(time)}
                      className={`p-3 text-sm rounded-lg border-2 font-medium transition-all duration-200 active:scale-95 min-h-[44px] ${selectedTime === time
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                        : 'border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500'
                        }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>

                {/* Custom Time Input */}
                <button
                  type="button"
                  onClick={() => setShowCustomTime(!showCustomTime)}
                  className="text-blue-400 hover:text-blue-300 text-sm underline mb-2"
                >
                  {showCustomTime ? 'Hide' : 'Enter'} custom time
                </button>

                {showCustomTime && (
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={customTime}
                      onChange={(e) => {
                        setCustomTime(e.target.value)
                        if (e.target.value) {
                          const [hours, minutes] = e.target.value.split(':')
                          let h = parseInt(hours)
                          const period = h >= 12 ? 'PM' : 'AM'
                          h = h % 12 || 12
                          const time12 = `${h}:${minutes} ${period}`
                          handleTimeSelect(time12)
                        }
                      }}
                      className="flex-1 bg-black border-gray-600 text-white"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="border-gray-600 text-white hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!selectedDate || !selectedTime}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
