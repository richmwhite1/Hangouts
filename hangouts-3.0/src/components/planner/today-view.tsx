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
                                {hourEvents.map(event => {
                                    // Get image with multiple fallbacks - photos are objects with originalUrl/thumbnailUrl
                                    // The feed API already sets event.image to the first photo URL for hangouts
                                    const eventImage = event.image 
                                        || (event.photos && Array.isArray(event.photos) && event.photos.length > 0 
                                            ? (event.photos[0]?.originalUrl || event.photos[0]?.thumbnailUrl || (typeof event.photos[0] === 'string' ? event.photos[0] : null))
                                            : null)
                                        || event.coverImage 
                                        || '/placeholder-hangout.png'
                                    
                                    // Debug logging (remove in production)
                                    if (process.env.NODE_ENV === 'development' && !event.image && event.photos?.length > 0) {
                                        console.log('Event image debug:', {
                                            id: event.id,
                                            title: event.title,
                                            hasImage: !!event.image,
                                            photosCount: event.photos?.length,
                                            firstPhoto: event.photos[0]
                                        })
                                    }
                                    
                                    return (
                                        <Link key={event.id} href={`/hangout/${event.id}`}>
                                            <div className="group relative rounded-xl shadow-planner hover:shadow-planner-md transition-all duration-300 overflow-hidden h-56 min-h-[224px] bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
                                                {/* Background Image Layer */}
                                                {eventImage && eventImage !== '/placeholder-hangout.png' ? (
                                                    <div className="absolute inset-0">
                                                        <img
                                                            src={eventImage}
                                                            alt={event.title || 'Hangout'}
                                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                            onError={(e) => {
                                                                // Hide image if it fails to load, gradient background will show
                                                                e.currentTarget.style.display = 'none'
                                                            }}
                                                        />
                                                    </div>
                                                ) : null}
                                                
                                                {/* Dark gradient overlay for text readability - ALWAYS visible and very dark */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/60 z-0" />

                                                {/* Left Accent Bar */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 z-20 ${event.type === 'EVENT' ? 'bg-blue-400' : 'bg-pink-400'}`} />

                                                {/* Content - All text is white with strong shadows */}
                                                <div className="relative h-full flex flex-col justify-between p-5 z-10">
                                                    {/* Top Section */}
                                                    <div className="flex items-start justify-between mb-auto">
                                                        <div className="flex-1 pr-2">
                                                            <h3 className="font-bold text-2xl leading-tight mb-2" style={{ color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,0.8)' }}>
                                                                {event.title || 'Untitled Hangout'}
                                                            </h3>
                                                            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#ffffff' }}>
                                                                <Clock className="w-4 h-4" style={{ color: '#ffffff' }} />
                                                                <span style={{ color: '#ffffff', textShadow: '0 1px 4px rgba(0,0,0,1)' }}>
                                                                    {formatTimeBlock(event.startTime)} - {formatTimeBlock(event.endTime)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Type Badge */}
                                                        <span className={`
                                                            text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-md border-2
                                                            ${event.type === 'EVENT'
                                                                ? 'bg-blue-500/90 text-white border-white/30 shadow-lg'
                                                                : 'bg-pink-500/90 text-white border-white/30 shadow-lg'
                                                            }
                                                        `} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                                            {event.type === 'EVENT' ? 'Event' : 'Hangout'}
                                                        </span>
                                                    </div>

                                                    {/* Bottom Section */}
                                                    <div className="space-y-2.5 mt-auto">
                                                        {event.location && (
                                                            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#ffffff' }}>
                                                                <MapPin className="w-4 h-4" style={{ color: '#ffffff' }} />
                                                                <span className="line-clamp-1" style={{ color: '#ffffff', textShadow: '0 1px 4px rgba(0,0,0,1)' }}>
                                                                    {event.location}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between">
                                                            {event._count?.participants && (
                                                                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#ffffff' }}>
                                                                    <Users className="w-4 h-4" style={{ color: '#ffffff' }} />
                                                                    <span style={{ color: '#ffffff', textShadow: '0 1px 4px rgba(0,0,0,1)' }}>
                                                                        {event._count.participants} attending
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Participants Avatars Preview */}
                                                            {event.participants && event.participants.length > 0 && (
                                                                <div className="flex -space-x-2">
                                                                    {event.participants.slice(0, 4).map((p: any, i: number) => (
                                                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-white/30 backdrop-blur-md flex items-center justify-center text-xs font-bold text-white overflow-hidden shadow-lg">
                                                                            {p.user?.avatar ? (
                                                                                <img src={p.user.avatar} alt={p.user?.name || ''} className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                p.user?.name?.[0] || '?'
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                    {event.participants.length > 4 && (
                                                                        <div className="w-8 h-8 rounded-full border-2 border-white bg-white/30 backdrop-blur-md flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                                                            +{event.participants.length - 4}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Action Button (Visible on Hover/Focus) */}
                                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                        <button className="p-2 rounded-full bg-black/60 backdrop-blur-md hover:bg-black/80 text-white border-2 border-white/30 shadow-lg">
                                                            <MoreHorizontal className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                })}
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
