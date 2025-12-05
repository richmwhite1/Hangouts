'use client'

import { Calendar as CalendarIcon, Clock, MapPin, Users, MoreHorizontal } from 'lucide-react'
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
        <div className="space-y-8 pb-32">
            {/* Date Header - Elegant & Clean */}
            <div className="text-center mb-8 pt-4">
                <h2 className="text-4xl font-bold text-planner-navy mb-1 tracking-tight" style={{ fontFamily: 'var(--font-oswald)' }}>
                    {format(new Date(), 'EEEE')}
                </h2>
                <p className="text-planner-text-secondary uppercase tracking-widest text-xs font-medium">
                    {format(new Date(), 'MMMM d, yyyy')}
                </p>
            </div>

            {/* Time-blocked events */}
            <div className="relative space-y-8 px-2">
                {/* Vertical Time Line */}
                <div className="absolute left-[4.5rem] top-0 bottom-0 w-px bg-planner-border/50 hidden md:block" />

                {hours.map(hour => {
                    const hourEvents = groupedByHour.get(hour) || []

                    return (
                        <div key={hour} className="relative">
                            {/* Time Label */}
                            <div className="sticky top-20 z-10 mb-4 md:mb-0 md:absolute md:left-0 md:top-0 md:w-16 text-right pr-4">
                                <span className="text-sm font-medium text-planner-text-muted">
                                    {getHourLabel(hour)}
                                </span>
                            </div>

                            <div className="md:pl-20 space-y-4">
                                {hourEvents.map(event => (
                                    <Link key={event.id} href={`/hangout/${event.id}`}>
                                        <div className="group relative bg-white rounded-xl p-5 shadow-planner hover:shadow-planner-md transition-all duration-300 border border-planner-border/50 overflow-hidden">
                                            {/* Left Accent Bar */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${event.type === 'EVENT' ? 'bg-planner-navy' : 'bg-accent'
                                                }`} />

                                            <div className="flex items-start justify-between mb-3 pl-2">
                                                <div>
                                                    <h3 className="font-bold text-planner-text-primary text-xl leading-tight mb-1">
                                                        {event.title}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-sm text-planner-text-secondary">
                                                        <Clock className="w-3.5 h-3.5 text-planner-navy/60" />
                                                        <span className="font-medium">
                                                            {formatTimeBlock(event.startTime)} - {formatTimeBlock(event.endTime)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Type Badge */}
                                                <span className={`
                                                    text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full
                                                    ${event.type === 'EVENT'
                                                        ? 'bg-planner-navy/10 text-planner-navy'
                                                        : 'bg-accent/10 text-accent'
                                                    }
                                                `}>
                                                    {event.type === 'EVENT' ? 'Event' : 'Hangout'}
                                                </span>
                                            </div>

                                            <div className="pl-2 space-y-2.5">
                                                {event.location && (
                                                    <div className="flex items-center gap-2 text-sm text-planner-text-secondary">
                                                        <MapPin className="w-4 h-4 text-planner-text-muted" />
                                                        <span className="line-clamp-1">{event.location}</span>
                                                    </div>
                                                )}

                                                {event._count?.participants && (
                                                    <div className="flex items-center gap-2 text-sm text-planner-text-secondary">
                                                        <Users className="w-4 h-4 text-planner-text-muted" />
                                                        <span>{event._count.participants} attending</span>
                                                    </div>
                                                )}

                                                {/* Participants Avatars Preview (Mock) */}
                                                {event.participants && event.participants.length > 0 && (
                                                    <div className="flex -space-x-2 pt-2">
                                                        {event.participants.slice(0, 4).map((p: any, i: number) => (
                                                            <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-planner-tab flex items-center justify-center text-[10px] font-bold text-planner-text-secondary overflow-hidden">
                                                                {p.user.avatar ? (
                                                                    <img src={p.user.avatar} alt={p.user.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    p.user.name[0]
                                                                )}
                                                            </div>
                                                        ))}
                                                        {event.participants.length > 4 && (
                                                            <div className="w-7 h-7 rounded-full border-2 border-white bg-planner-tab flex items-center justify-center text-[10px] font-bold text-planner-text-secondary">
                                                                +{event.participants.length - 4}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Button (Visible on Hover/Focus) */}
                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 rounded-full hover:bg-planner-tab text-planner-text-muted hover:text-planner-navy">
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </button>
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
        <div className="space-y-8 pb-24">
            <div className="text-center mb-8 pt-4">
                <div className="h-10 w-48 bg-planner-tab rounded mx-auto mb-2 animate-pulse" />
                <div className="h-4 w-32 bg-planner-tab rounded mx-auto animate-pulse" />
            </div>

            {[1, 2, 3].map(i => (
                <div key={i} className="relative md:pl-20">
                    <div className="hidden md:block absolute left-0 top-0 w-16 h-4 bg-planner-tab rounded animate-pulse" />
                    <div className="h-40 bg-white rounded-xl shadow-sm border border-planner-border/50 animate-pulse" />
                </div>
            ))}
        </div>
    )
}

function EmptyTodayState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4 min-h-[60vh]">
            <div className="w-24 h-24 bg-planner-tab rounded-full flex items-center justify-center mb-6 shadow-inner">
                <CalendarIcon className="w-10 h-10 text-planner-text-muted opacity-50" />
            </div>
            <h3 className="text-2xl font-bold text-planner-navy mb-2 font-oswald">
                No plans for today
            </h3>
            <p className="text-planner-text-secondary max-w-xs mx-auto mb-8 leading-relaxed">
                Your schedule is clear. Use this time to recharge or plan something spontaneous!
            </p>
            <Link href="/create">
                <button className="bg-planner-navy text-white px-8 py-3 rounded-lg font-medium shadow-planner hover:shadow-planner-md hover:bg-planner-navy-light transition-all duration-200 transform hover:-translate-y-0.5">
                    Create Plan
                </button>
            </Link>
        </div>
    )
}
