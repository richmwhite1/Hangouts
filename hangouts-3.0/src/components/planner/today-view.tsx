'use client'

import { Calendar as CalendarIcon, Clock, MapPin, Users } from 'lucide-react'
import Link from 'next/link'
import { formatTimeBlock, getTodayEvents, sortEventsByTime, groupEventsByHour, getHourLabel } from '@/lib/planner-utils'
import { format } from 'date-fns'

interface TodayViewProps {
    items: any[]
    loading?: boolean
}

export function TodayView({ items, loading }: TodayViewProps) {
    if (loading) {
        return <TodayViewSkeleton />
    }

    const todayEvents = sortEventsByTime(getTodayEvents(items))

    if (todayEvents.length === 0) {
        return <EmptyTodayState />
    }

    const groupedByHour = groupEventsByHour(todayEvents)
    const hours = Array.from(groupedByHour.keys()).sort((a, b) => a - b)

    return (
        <div className="space-y-6 pb-24">
            {/* Date Header */}
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-planner-text-primary mb-1">
                    {format(new Date(), 'EEEE')}
                </h2>
                <p className="text-planner-text-secondary">
                    {format(new Date(), 'MMMM d, yyyy')}
                </p>
            </div>

            {/* Time-blocked events */}
            <div className="space-y-6">
                {hours.map(hour => {
                    const hourEvents = groupedByHour.get(hour) || []

                    return (
                        <div key={hour} className="time-block" data-time={getHourLabel(hour)}>
                            <div className="space-y-3">
                                {hourEvents.map(event => (
                                    <Link key={event.id} href={`/hangout/${event.id}`}>
                                        <div className="card-elevated p-4 hover:shadow-planner-md cursor-pointer">
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="font-semibold text-planner-text-primary text-lg">
                                                    {event.title}
                                                </h3>
                                                {event.type === 'EVENT' && (
                                                    <span className="text-xs px-2 py-1 rounded bg-planner-navy text-white">
                                                        Event
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-2 text-sm text-planner-text-secondary">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    <span>
                                                        {formatTimeBlock(event.startTime)} - {formatTimeBlock(event.endTime)}
                                                    </span>
                                                </div>

                                                {event.location && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4" />
                                                        <span>{event.location}</span>
                                                    </div>
                                                )}

                                                {event._count?.participants && (
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4" />
                                                        <span>{event._count.participants} attending</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function TodayViewSkeleton() {
    return (
        <div className="space-y-6 pb-24">
            <div className="text-center mb-8">
                <div className="h-8 w-48 bg-muted rounded mx-auto mb-2 animate-pulse" />
                <div className="h-4 w-32 bg-muted rounded mx-auto animate-pulse" />
            </div>

            {[1, 2, 3].map(i => (
                <div key={i} className="time-block" data-time="">
                    <div className="h-32 bg-muted rounded-lg animate-pulse" />
                </div>
            ))}
        </div>
    )
}

function EmptyTodayState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                <CalendarIcon className="w-10 h-10 text-planner-text-muted" />
            </div>
            <h3 className="text-2xl font-bold text-planner-text-primary mb-2">
                No plans today
            </h3>
            <p className="text-planner-text-secondary max-w-xs mx-auto mb-8">
                Your schedule is clear. Time to relax or create something new!
            </p>
        </div>
    )
}
