'use client'

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface ActionCardProps {
    id: string
    title: string
    startTime: string
    location?: string
    creator: {
        name: string
        avatar?: string
    }
    type: 'HANGOUT' | 'EVENT'
    status: 'needs_vote' | 'confirmed' | 'pending' | 'past'
    actionRequired?: boolean
    votesCount?: number
    myVote?: string
    image?: string
}

export function ActionCard({
    id,
    title,
    startTime,
    location,
    creator,
    type,
    status,
    actionRequired,
    votesCount = 0,
    image
}: ActionCardProps) {

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    }

    const getStatusConfig = () => {
        switch (status) {
            case 'needs_vote':
                return {
                    color: 'text-orange-400',
                    borderColor: 'border-orange-500/30',
                    bgColor: 'bg-orange-500/10',
                    icon: AlertCircle,
                    label: 'Needs your vote',
                    buttonText: 'Vote Now',
                    buttonVariant: 'default' as const
                }
            case 'confirmed':
                return {
                    color: 'text-green-400',
                    borderColor: 'border-green-500/30',
                    bgColor: 'bg-green-500/10',
                    icon: CheckCircle2,
                    label: 'Confirmed',
                    buttonText: 'View Details',
                    buttonVariant: 'outline' as const
                }
            case 'pending':
            default:
                return {
                    color: 'text-blue-400',
                    borderColor: 'border-blue-500/30',
                    bgColor: 'bg-blue-500/10',
                    icon: Clock,
                    label: 'Pending',
                    buttonText: 'View Details',
                    buttonVariant: 'secondary' as const
                }
        }
    }

    const config = getStatusConfig()
    const StatusIcon = config.icon
    const route = type === 'EVENT' ? `/event/${id}` : `/hangout/${id}`

    return (
        <Link href={route} className="block group">
            <Card className={cn(
                "relative overflow-hidden transition-all duration-300 hover:scale-[1.02]",
                "bg-gray-900 border-gray-800 hover:border-gray-700",
                actionRequired && "border-l-4 border-l-orange-500"
            )}>
                <div className="flex">
                    {/* Left: Image (if available) or Date Box */}
                    <div className="w-24 h-full min-h-[120px] relative shrink-0">
                        {image ? (
                            <img
                                src={image}
                                alt={title}
                                className="w-full h-full object-cover absolute inset-0"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center p-2 text-center border-r border-gray-800">
                                <span className="text-xs font-medium text-red-400 uppercase tracking-wider">
                                    {new Date(startTime).toLocaleDateString('en-US', { month: 'short' })}
                                </span>
                                <span className="text-2xl font-bold text-white my-1">
                                    {new Date(startTime).getDate()}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {new Date(startTime).toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                            </div>
                        )}

                        {/* Type Badge */}
                        <div className="absolute top-2 left-2">
                            <Badge variant="secondary" className="bg-black/60 backdrop-blur-sm text-[10px] px-1.5 h-5">
                                {type === 'EVENT' ? 'EVENT' : 'PLAN'}
                            </Badge>
                        </div>
                    </div>

                    {/* Right: Content */}
                    <div className="flex-1 p-4 flex flex-col justify-between">
                        <div>
                            {/* Status Header */}
                            <div className={cn("flex items-center gap-1.5 text-xs font-medium mb-2", config.color)}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                <span>{config.label}</span>
                            </div>

                            <h3 className="font-semibold text-white text-lg leading-tight mb-1 line-clamp-1">
                                {title}
                            </h3>

                            <div className="flex items-center gap-3 text-sm text-gray-400 mb-3">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{formatTime(startTime)}</span>
                                </div>
                                {location && (
                                    <div className="flex items-center gap-1 line-clamp-1">
                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{location}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-2">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>By {creator.name}</span>
                                {votesCount > 0 && (
                                    <>
                                        <span>•</span>
                                        <span>{votesCount} votes</span>
                                    </>
                                )}
                            </div>

                            <Button
                                size="sm"
                                variant={config.buttonVariant}
                                className={cn(
                                    "h-8 text-xs font-medium",
                                    actionRequired && "bg-orange-500 hover:bg-orange-600 text-white border-none"
                                )}
                            >
                                {config.buttonText}
                                <ArrowRight className="w-3 h-3 ml-1.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </Link>
    )
}
