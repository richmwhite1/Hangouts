import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 300 // Cache for 5 minutes

export async function GET(request: NextRequest) {
    try {
        // Get current date ranges
        const now = new Date()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
        startOfWeek.setHours(0, 0, 0, 0)

        const startOfToday = new Date(now)
        startOfToday.setHours(0, 0, 0, 0)

        // Query for stats
        const [thisWeekCount, todayCount, totalCount, activeUsersCount] = await Promise.all([
            // Plans created this week
            db.content.count({
                where: {
                    type: 'HANGOUT',
                    createdAt: {
                        gte: startOfWeek
                    }
                }
            }),

            // Plans created today
            db.content.count({
                where: {
                    type: 'HANGOUT',
                    createdAt: {
                        gte: startOfToday
                    }
                }
            }),

            // Total plans ever
            db.content.count({
                where: {
                    type: 'HANGOUT'
                }
            }),

            // Active users (logged in within last 7 days)
            db.user.count({
                where: {
                    lastSeen: {
                        gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            })
        ])

        return NextResponse.json({
            success: true,
            data: {
                thisWeek: thisWeekCount,
                today: todayCount,
                total: totalCount,
                activeUsers: activeUsersCount
            }
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
            }
        })

    } catch (error) {
        console.error('Error fetching stats:', error)

        // Return fallback data on error
        return NextResponse.json({
            success: true,
            data: {
                thisWeek: 0,
                today: 0,
                total: 0,
                activeUsers: 0
            }
        })
    }
}
