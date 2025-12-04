'use client'

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { getEventsForDate, getMonthEventDates } from '@/lib/planner-utils'
import { format } from 'date-fns'
import { Clock, MapPin } from 'lucide-react'
import Link from 'next/link'

interface MonthCalendarViewProps {
    items: any[]
    loading?: boolean
}

export function MonthCalendarView({ items, loading }: MonthCalendarViewProps) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())

    if (loading) {
        return <MonthViewSkeleton />
    }

    const eventDates = getMonthEventDates(items, currentMonth)
    const selectedDateEvents = selectedDate ? getEventsForDate(items, selectedDate) : []

    return (
        <div className="pb-24">
            {/* Calendar */}
            <div className="card-elevated p-4 mb-6">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    onMonthChange={setCurrentMonth}
                    modifiers={{
                        hasEvent: eventDates,
                    }}
                    modifiersClassNames={{
                        hasEvent: 'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-planner-navy',
                    }}
                    className="rounded-md"
                />
            </div>

            {/* Selected Date Events */}
            {selectedDate && (
                <div>
                    <h3 className="text-lg font-semibold text-planner-text-primary mb-4">
                        {format(selectedDate, 'EEEE, MMMM d')}
                    </h3>

                    {selectedDateEvents.length === 0 ? (
                        <div className="text-center py-12 text-planner-text-secondary">
                            <p>No plans for this day</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {selectedDateEvents.map(event => (
                                <Link key={event.id} href={`/hangout/${event.id}`}>
                                    <div className="card-elevated p-4 hover:shadow-planner-md cursor-pointer">
                                        <h4 className="font-semibold text-planner-text-primary mb-2">
                                            {event.title}
                                        </h4>

                                        <div className="space-y-1 text-sm text-planner-text-secondary">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                <span>
                                                    {format(new Date(event.startTime), 'h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}
                                                </span>
                                            </div>

                                            {event.location && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>{event.location}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function MonthViewSkeleton() {
    return (
        <div className="pb-24">
            <div className="h-96 bg-muted rounded-lg animate-pulse mb-6" />
            <div className="space-y-3">
                {[1, 2].map(i => (
                    <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
                ))}
            </div>
        </div>
    )
}
