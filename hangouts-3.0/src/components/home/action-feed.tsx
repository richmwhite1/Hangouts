'use client'

import { ActionCard } from "./action-card"
import { isPast, isThisWeek, parseISO } from "date-fns"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Inbox } from "lucide-react"
import { useState } from "react"

// Re-using the interface from page.tsx (we should probably move this to a shared types file)
interface FeedItem {
    id: string
    title: string
    description?: string
    location?: string
    startTime: string
    endTime: string
    type?: 'HANGOUT' | 'EVENT' | string
    creator: {
        name: string
        username: string
        avatar?: string
    }
    participants?: Array<{
        id: string
        user: {
            name: string
            username: string
            avatar?: string
        }
        rsvpStatus: "YES" | "NO" | "MAYBE" | "PENDING"
    }>
    _count?: {
        participants: number
    }
    privacyLevel?: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE"
    image?: string
    photos?: string[]
    votingStatus?: 'open' | 'closed' | 'pending'
    myRsvpStatus?: "YES" | "NO" | "MAYBE" | "PENDING"
}

interface ActionFeedProps {
    items: FeedItem[]
    loading?: boolean
}

export function ActionFeed({ items, loading }: ActionFeedProps) {
    const [showPast, setShowPast] = useState(false)

    if (loading) {
        return <FeedSkeleton />
    }

    // Safety check: ensure items is an array
    const safeItems = Array.isArray(items) ? items : []

    if (safeItems.length === 0) {
        return <EmptyState />
    }

    // Group items
    const actionRequired = safeItems.filter(item => {
        const isFuture = !isPast(parseISO(item.startTime))
        const needsRsvp = item.myRsvpStatus === 'PENDING'
        const needsVote = item.votingStatus === 'open' // Simplified logic
        return isFuture && (needsRsvp || needsVote)
    })

    const thisWeek = safeItems.filter(item => {
        const date = parseISO(item.startTime)
        return !isPast(date) && isThisWeek(date) && !actionRequired.includes(item)
    })

    const later = safeItems.filter(item => {
        const date = parseISO(item.startTime)
        return !isPast(date) && !isThisWeek(date) && !actionRequired.includes(item)
    })

    const past = safeItems.filter(item => {
        return isPast(parseISO(item.startTime))
    })

    return (
        <div className="space-y-8 pb-24">
            {/* Action Required Section */}
            {actionRequired.length > 0 && (
                <section>
                    <h2 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        Action Required
                    </h2>
                    <div className="space-y-4">
                        {actionRequired.map(item => (
                            <ActionCard
                                key={item.id}
                                id={item.id}
                                title={item.title}
                                startTime={item.startTime}
                                location={item.location}
                                creator={item.creator}
                                type={item.type === 'EVENT' ? 'EVENT' : 'HANGOUT'}
                                status="needs_vote" // Simplified for now
                                actionRequired={true}
                                image={item.image || item.photos?.[0]}
                                votesCount={0} // We'd need to calculate this
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* This Week Section */}
            {thisWeek.length > 0 && (
                <section>
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                        This Week
                    </h2>
                    <div className="space-y-4">
                        {thisWeek.map(item => (
                            <ActionCard
                                key={item.id}
                                id={item.id}
                                title={item.title}
                                startTime={item.startTime}
                                location={item.location}
                                creator={item.creator}
                                type={item.type === 'EVENT' ? 'EVENT' : 'HANGOUT'}
                                status={item.myRsvpStatus === 'YES' ? 'confirmed' : 'pending'}
                                image={item.image || item.photos?.[0]}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Later Section */}
            {later.length > 0 && (
                <section>
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                        Coming Up
                    </h2>
                    <div className="space-y-4">
                        {later.map(item => (
                            <ActionCard
                                key={item.id}
                                id={item.id}
                                title={item.title}
                                startTime={item.startTime}
                                location={item.location}
                                creator={item.creator}
                                type={item.type === 'EVENT' ? 'EVENT' : 'HANGOUT'}
                                status={item.myRsvpStatus === 'YES' ? 'confirmed' : 'pending'}
                                image={item.image || item.photos?.[0]}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Past Section (Collapsible) */}
            {past.length > 0 && (
                <Collapsible open={showPast} onOpenChange={setShowPast} className="pt-8 border-t border-gray-800">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full flex items-center justify-between text-gray-500 hover:text-gray-400">
                            <span className="text-sm font-semibold uppercase tracking-wider">Past Plans</span>
                            {showPast ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4">
                        {past.map(item => (
                            <ActionCard
                                key={item.id}
                                id={item.id}
                                title={item.title}
                                startTime={item.startTime}
                                location={item.location}
                                creator={item.creator}
                                type={item.type === 'EVENT' ? 'EVENT' : 'HANGOUT'}
                                status="past"
                                image={item.image || item.photos?.[0]}
                            />
                        ))}
                    </CollapsibleContent>
                </Collapsible>
            )}
        </div>
    )
}

function FeedSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-900/50 rounded-xl animate-pulse" />
            ))}
        </div>
    )
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <Inbox className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No plans yet</h3>
            <p className="text-gray-400 max-w-xs mx-auto mb-8">
                Your feed is empty. Create a plan to get started!
            </p>
            {/* FAB will handle creation, so we don't strictly need a button here, 
          but a secondary one helps */}
        </div>
    )
}
