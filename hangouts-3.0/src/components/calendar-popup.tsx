"use client"

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Clock, Calendar as CalendarIcon } from 'lucide-react'
import { format, addDays, addWeeks, addMonths } from 'date-fns'
import { MobileModal } from '@/components/ui/mobile-modal'

interface CalendarPopupProps {
  isOpen: boolean
  onClose: () => void
  onDateSelect: (date: Date, time: string) => void
  selectedDate?: Date
  selectedTime?: string
}

const quickTimes = [
  { id: "morning", label: "Morning", time: "9:00 AM" },
  { id: "afternoon", label: "Afternoon", time: "2:00 PM" },
  { id: "evening", label: "Evening", time: "7:00 PM" },
  { id: "night", label: "Night", time: "10:00 PM" },
]

const quickDates = [
  { id: "today", label: "Today", date: new Date() },
  { id: "tomorrow", label: "Tomorrow", date: addDays(new Date(), 1) },
  { id: "next-week", label: "Next Week", date: addWeeks(new Date(), 1) },
  { id: "next-month", label: "Next Month", date: addMonths(new Date(), 1) },
]

export function CalendarPopup({ 
  isOpen, 
  onClose, 
  onDateSelect, 
  selectedDate, 
  selectedTime 
}: CalendarPopupProps) {
  const [date, setDate] = useState<Date | undefined>(selectedDate)
  const [time, setTime] = useState(selectedTime || "7:00 PM")
  const [customTime, setCustomTime] = useState("")

  if (!isOpen) return null

  const handleQuickDate = (quickDate: Date) => {
    setDate(quickDate)
  }

  const handleQuickTime = (timeValue: string) => {
    setTime(timeValue)
    setCustomTime("")
  }

  const handleCustomTime = (timeValue: string) => {
    setCustomTime(timeValue)
    setTime(timeValue)
  }

  const handleConfirm = () => {
    if (date && time) {
      onDateSelect(date, time)
      onClose()
    }
  }

  const handleCancel = () => {
    onClose()
  }

  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Date & Time"
      className="w-full max-w-md bg-gray-800 border-gray-700"
      closeOnBackdropClick={true}
      closeOnEscape={true}
      preventBodyScroll={true}
    >
        
        <CardContent className="space-y-6">
          {/* Quick Date Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-white">Quick Dates</Label>
            <div className="grid grid-cols-2 gap-2">
              {quickDates.map((quickDate) => (
                <Button
                  key={quickDate.id}
                  variant={date?.toDateString() === quickDate.date.toDateString() ? "default" : "outline"}
                  size="sm"
                  className={
                    date?.toDateString() === quickDate.date.toDateString()
                      ? "bg-primary text-primary-foreground"
                      : "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  }
                  onClick={() => handleQuickDate(quickDate.date)}
                >
                  {quickDate.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-white">Select Date</Label>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => date < new Date()}
                className="bg-gray-800 border-gray-700 rounded-lg"
                classNames={{
                  day: "text-white hover:bg-gray-700",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  day_today: "bg-gray-600 text-white",
                  day_disabled: "text-gray-500",
                  month: "text-white",
                  caption: "text-white",
                  caption_label: "text-white",
                  nav_button: "text-white hover:bg-gray-700"}}
              />
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-white">Select Time</Label>
            
            {/* Quick Time Options */}
            <div className="grid grid-cols-2 gap-2">
              {quickTimes.map((quickTime) => (
                <Button
                  key={quickTime.id}
                  variant={time === quickTime.time ? "default" : "outline"}
                  size="sm"
                  className={
                    time === quickTime.time
                      ? "bg-primary text-primary-foreground"
                      : "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  }
                  onClick={() => handleQuickTime(quickTime.time)}
                >
                  {quickTime.label}
                </Button>
              ))}
            </div>

            {/* Custom Time Input */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Or enter custom time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="time"
                  value={customTime}
                  onChange={(e) => handleCustomTime(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white pl-10"
                  placeholder="HH:MM"
                />
              </div>
            </div>
          </div>

          {/* Selected Date/Time Preview */}
          {date && time && (
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-sm text-gray-400">Selected:</div>
              <div className="text-white font-medium">
                {format(date, 'EEEE, MMMM d, yyyy')} at {time}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!date || !time}
              className="flex-1"
            >
              Confirm
            </Button>
          </div>
        </CardContent>
    </MobileModal>
  )
}













