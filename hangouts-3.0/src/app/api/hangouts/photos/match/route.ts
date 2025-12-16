import { NextRequest, NextResponse } from 'next/server'
import { matchHangoutPhoto, getMatchPreview } from '@/lib/photo-matcher'

/**
 * GET /api/hangouts/photos/match
 * 
 * Match a hangout title to an appropriate photo
 * 
 * Query params:
 * - title: Hangout title (required)
 * - preview: Return full match preview with alternatives (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')
    const showPreview = searchParams.get('preview') === 'true'

    if (!title) {
      return NextResponse.json(
        { error: 'Title parameter is required' },
        { status: 400 }
      )
    }

    if (showPreview) {
      const preview = getMatchPreview(title)
      return NextResponse.json({
        success: true,
        ...preview
      })
    }

    const photo = matchHangoutPhoto(title)
    return NextResponse.json({
      success: true,
      photo,
      title
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Failed to match photo',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}






