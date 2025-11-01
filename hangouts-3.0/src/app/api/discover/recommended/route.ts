import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { RecommendationEngine } from '@/lib/recommendation-engine'
import { TrendingService } from '@/lib/trending-service'

/**
 * GET /api/discover/recommended
 * Get personalized recommendations for authenticated user
 * Falls back to trending for new users or unauthenticated
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    
    // If not authenticated, return trending instead
    if (!clerkId) {
      const { searchParams } = new URL(request.url)
      const location = searchParams.get('location') || undefined
      const limit = parseInt(searchParams.get('limit') || '20')
      
      const trending = await TrendingService.getTrending({ location, limit })
      
      return NextResponse.json({
        success: true,
        recommended: trending,
        fallbackToTrending: true,
        message: 'Sign in to get personalized recommendations'
      })
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { clerkId },
      select: { 
        id: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is new (created less than 7 days ago)
    const isNewUser = (Date.now() - new Date(user.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000

    // Get query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const location = searchParams.get('location') || undefined

    let recommendations

    if (isNewUser) {
      // For new users, show trending content
      recommendations = await TrendingService.getTrending({ location, limit })
      
      return NextResponse.json({
        success: true,
        recommended: recommendations,
        fallbackToTrending: true,
        message: 'Showing trending events. Interact with more events to get personalized recommendations!'
      })
    }

    // Get personalized recommendations
    recommendations = await RecommendationEngine.getRecommendations(user.id, limit)

    // If no recommendations (user has no interaction history), fall back to trending
    if (recommendations.length === 0) {
      recommendations = await TrendingService.getTrending({ location, limit })
      
      return NextResponse.json({
        success: true,
        recommended: recommendations,
        fallbackToTrending: true,
        message: 'RSVP to events to get personalized recommendations!'
      })
    }

    // Transform recommendations to match expected format
    const transformedRecommendations = recommendations.map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      type: item.type,
      image: item.image,
      location: item.location,
      city: item.city,
      venue: item.venue,
      startTime: item.startTime,
      endTime: item.endTime,
      price: {
        min: item.priceMin || 0,
        max: item.priceMax,
        currency: item.currency || 'USD'
      },
      creator: item.users ? {
        id: item.users.id,
        name: item.users.name,
        username: item.users.username,
        avatar: item.users.avatar
      } : null,
      attendeeCount: item.attendeeCount || 0,
      saveCount: item.eventSaves?.length || 0,
      recommendationScore: item.recommendationScore,
      recommendationReasons: item.recommendationReasons,
      createdAt: item.createdAt
    }))

    return NextResponse.json({
      success: true,
      recommended: transformedRecommendations,
      personalized: true
    })
  } catch (error) {
    console.error('Error fetching recommendations:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch recommendations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/discover/recommended/refresh
 * Clear recommendation cache for current user
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    
    if (!clerkId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { clerkId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Clear user's recommendation cache
    RecommendationEngine.clearUserCache(user.id)

    return NextResponse.json({
      success: true,
      message: 'Recommendation cache cleared'
    })
  } catch (error) {
    console.error('Error refreshing recommendations:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to refresh recommendations' },
      { status: 500 }
    )
  }
}

