'use client'

import React, { useState } from 'react'
import { Calendar, Clock } from 'lucide-react'
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

  // Generate calendar days for displayed month
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(displayYear, displayMonth, 1).getDay()
  
  const days = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const handleDateSelect = (day: number) => {
    // Create date in local timezone to avoid timezone shift issues
    const date = new Date(displayYear, displayMonth, day, 12, 0, 0) // Use noon to avoid DST issues
    const dateString = date.toISOString().split('T')[0]
    setSelectedDate(dateString)
  }

  const convertTo24Hour = (time12: string) => {
    const [time, period] = time12.split(' ')
    let [hours, minutes] = time.split(':')
    hours = parseInt(hours)
    
    if (period === 'PM' && hours !== 12) {
      hours += 12
    } else if (period === 'AM' && hours === 12) {
      hours = 0
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
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

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      const time24 = convertTo24Hour(selectedTime)
      // Create date in local timezone to avoid timezone shift
      const [year, month, day] = selectedDate.split('-').map(Number)
      const [hours, minutes] = time24.split(':').map(Number)
      const dateTime = new Date(year, month - 1, day, hours, minutes, 0).toISOString()
      onChange(dateTime)
      setIsOpen(false)
    }
  }

  const formatDisplayValue = (value: string) => {
    if (!value) return placeholder
    const date = new Date(value)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Predefined time slots in 12-hour format
  const timeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
    '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM'
  ]

  const [customTime, setCustomTime] = useState('')
  const [showCustomTime, setShowCustomTime] = useState(false)

  return (
    <div className={`relative ${className}`}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start text-left font-normal bg-black border-gray-600 text-white hover:bg-gray-800"
      >
        <Calendar className="mr-2 h-4 w-4" />
        {formatDisplayValue(value)}
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-black border border-gray-600 rounded-lg shadow-lg p-4">
          <div className="space-y-4">
            {/* Calendar */}
            <div>
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                Select Date
              </h3>
              
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="p-2 rounded hover:bg-gray-700 text-white"
                >
                  ←
                </button>
                <h4 className="text-white font-semibold">
                  {monthNames[displayMonth]} {displayYear}
                </h4>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="p-2 rounded hover:bg-gray-700 text-white"
                >
                  →
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-gray-400 font-semibold">{day}</div>
                ))}
                {days.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => day && handleDateSelect(day)}
                    className={`p-2 rounded hover:bg-gray-700 ${
                      day === new Date().getDate() ? 'bg-purple-600 text-white' : 
                      selectedDate && day === new Date(selectedDate + 'T12:00:00').getDate() ? 'bg-purple-500 text-white' :
                      'text-white hover:text-white'
                    }`}
                    disabled={!day}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Picker */}
            <div>
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                Select Time
              </h3>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {timeSlots.map(time => (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className={`p-2 text-sm rounded border ${
                      selectedTime === time 
                        ? 'bg-purple-600 border-purple-500 text-white' 
                        : 'border-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
              
              {/* Custom Time Input */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowCustomTime(!showCustomTime)}
                  className="w-full p-2 text-sm rounded border border-gray-600 text-white hover:bg-gray-700"
                >
                  {showCustomTime ? 'Hide' : 'Custom Time'}
                </button>
                
                {showCustomTime && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        placeholder="e.g., 2:30 PM"
                        className="flex-1 p-2 bg-black border border-gray-600 rounded text-white"
                      />
                      <select
                        value={customTime.includes('AM') ? 'AM' : customTime.includes('PM') ? 'PM' : ''}
                        onChange={(e) => {
                          const time = customTime.replace(/\s*(AM|PM)/i, '').trim()
                          setCustomTime(time + ' ' + e.target.value)
                        }}
                        className="px-2 py-2 bg-black border border-gray-600 rounded text-white"
                      >
                        <option value="">AM/PM</option>
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (customTime && (customTime.includes('AM') || customTime.includes('PM'))) {
                          handleTimeSelect(customTime)
                          setShowCustomTime(false)
                        }
                      }}
                      className="w-full px-3 py-2 bg-purple-600 text-white rounded text-sm"
                    >
                      Set Time
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-600">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="border-gray-600 text-white hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedDate || !selectedTime}
                className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!selectedDate ? 'Select Date' : !selectedTime ? 'Select Time' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
