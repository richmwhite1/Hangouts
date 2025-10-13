import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    return NextResponse.json({
      success: true,
      userId: userId,
      headers: {
        authorization: request.headers.get('authorization'),
        'x-user-id': request.headers.get('x-user-id'),
        'user-agent': request.headers.get('user-agent')
      },
      url: request.url,
      method: request.method
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      userId: null
    })
  }
}
