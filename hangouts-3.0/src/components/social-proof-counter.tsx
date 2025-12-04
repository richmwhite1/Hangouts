'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'

interface SocialProofCounterProps {
    className?: string
}

export function SocialProofCounter({ className = '' }: SocialProofCounterProps) {
    const [stats, setStats] = useState<{
        thisWeek: number
        today: number
        total: number
        activeUsers: number
    } | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [displayCount, setDisplayCount] = useState(0)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/stats/plans-count')
                const data = await response.json()

                if (data.success) {
                    setStats(data.data)
                    // Animate counter
                    animateCount(data.data.thisWeek)
                }
            } catch (error) {
                console.error('Error fetching stats:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchStats()
    }, [])

    const animateCount = (target: number) => {
        const duration = 1500 // 1.5 seconds
        const steps = 60
        const increment = target / steps
        let current = 0

        const timer = setInterval(() => {
            current += increment
            if (current >= target) {
                setDisplayCount(target)
                clearInterval(timer)
            } else {
                setDisplayCount(Math.floor(current))
            }
        }, duration / steps)
    }

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center gap-2 ${className}`}>
                <div className="h-6 w-48 bg-gray-800 animate-pulse rounded-md" />
            </div>
        )
    }

    if (!stats || stats.thisWeek === 0) {
        // Fallback if no data
        return (
            <div className={`flex items-center justify-center gap-2 ${className}`}>
                <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400 px-4 py-2 text-sm">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Join thousands making plans that actually happen
                </Badge>
            </div>
        )
    }

    return (
        <div className={`flex items-center justify-center gap-2 ${className}`}>
            <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-400 px-4 py-2 text-sm font-medium">
                <TrendingUp className="w-4 h-4 mr-2" />
                <span className="tabular-nums">
                    {displayCount.toLocaleString()}
                </span>
                {' '}plans made this week
            </Badge>
        </div>
    )
}
