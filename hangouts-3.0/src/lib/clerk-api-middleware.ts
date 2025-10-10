import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClerkApiUser } from './clerk-auth'

export async function withClerkAuth(handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const { userId } = await auth()
      
      if (!userId) {
        return NextResponse.json({
          success: false,
          error: 'Authentication required',
          message: 'No valid authentication token provided'
        }, { status: 401 })
      }
      
      const user = await getClerkApiUser()
      
      if (!user) {
        return NextResponse.json({
          success: false,
          error: 'User not found',
          message: 'User account not found in database'
        }, { status: 404 })
      }
      
      if (!user.isActive) {
        return NextResponse.json({
          success: false,
          error: 'Account disabled',
          message: 'User account is inactive'
        }, { status: 403 })
      }
      
      return await handler(req, user)
    } catch (error) {
      console.error('Clerk auth middleware error:', error)
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        message: 'An error occurred during authentication'
      }, { status: 500 })
    }
  }
}
