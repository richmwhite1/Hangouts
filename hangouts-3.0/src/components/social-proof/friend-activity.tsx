'use client'

import { Card } from '@/components/ui/card'
import { Users, TrendingUp, Calendar } from 'lucide-react'

interface FriendActivityProps {
    stats?: {
        friendsUsingApp?: number
        plansThisWeek?: number
        trendingActivity?: string
    }
}

export function FriendActivity({ stats }: FriendActivityProps) {
    const {
        friendsUsingApp = 0,
        plansThisWeek = 0,
        trendingActivity = 'Dinner plans'
    } = stats || {}

    if (!stats || (friendsUsingApp === 0 && plansThisWeek === 0)) {
        return null
    }

    return (
        <Card className="bg-gradient-to-br from-blue-950/30 to-purple-950/30 border-blue-500/30 p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Activity
            </h3>

            <div className="space-y-2">
                {friendsUsingApp > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                            <span className="text-blue-400 font-semibold">{friendsUsingApp}</span> of your friends use Plans
                        </span>
                    </div>
                )}

                {plansThisWeek > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                            <span className="text-purple-400 font-semibold">{plansThisWeek}</span> plans happening this week
                        </span>
                    </div>
                )}

                {trendingActivity && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-xs text-gray-400">
                            🔥 Trending: <span className="text-white font-medium">{trendingActivity}</span>
                        </p>
                    </div>
                )}
            </div>
        </Card>
    )
}
