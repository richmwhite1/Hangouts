import { useMemo } from 'react'

interface Hangout {
  id: string
  title: string
  description?: string
  location?: string
  startTime: string
  endTime: string
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
  maxParticipants?: number
  image?: string
  photos?: string[]
  // Activity tracking
  lastActivity?: string
  hasRecentActivity?: boolean
  activityType?: 'comment' | 'photo' | 'rsvp' | 'poll'
  activityCount?: number
  // Voting status
  votingStatus?: 'open' | 'closed' | 'pending'
  // RSVP status for current user
  myRsvpStatus?: "YES" | "NO" | "MAYBE" | "PENDING"
  // Creation time
  createdAt?: string
}

export interface HangoutActionStatus {
  needsVote: boolean
  needsRSVP: boolean
  isMandatoryRSVP: boolean
  hasRecentActivity: boolean
  actionPriority: 'high' | 'medium' | 'low' | 'none'
  actionText: string
}

// Helper function that doesn't use hooks
export function getHangoutActionStatus(hangout: Hangout): HangoutActionStatus {
  const now = new Date()
  const startTime = new Date(hangout.startTime)
  const isUpcoming = startTime > now
  
  // Check if user needs to vote
  const needsVote = hangout.votingStatus === 'open'
  
  // Check if user needs to RSVP
  const needsRSVP = hangout.myRsvpStatus === 'PENDING' || !hangout.myRsvpStatus || hangout.myRsvpStatus === undefined
  
  // Check if RSVP is mandatory (within 24 hours of start time)
  const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  const isMandatoryRSVP = needsRSVP && hoursUntilStart <= 24 && hoursUntilStart > 0
  
  // Check for recent activity
  const hasRecentActivity = hangout.hasRecentActivity || false
  
  // Determine action priority
  let actionPriority: 'high' | 'medium' | 'low' | 'none' = 'none'
  let actionText = ''
  
  if (isMandatoryRSVP) {
    actionPriority = 'high'
    actionText = 'RSVP Required'
  } else if (needsVote) {
    actionPriority = 'high'
    actionText = 'Vote Needed'
  } else if (needsRSVP) {
    actionPriority = 'medium'
    actionText = 'RSVP Needed'
  } else if (hasRecentActivity) {
    actionPriority = 'low'
    actionText = 'New Activity'
  }
  
  return {
    needsVote,
    needsRSVP,
    isMandatoryRSVP,
    hasRecentActivity,
    actionPriority,
    actionText
  }
}

export function useHangoutActions(hangout: Hangout): HangoutActionStatus {
  return useMemo(() => getHangoutActionStatus(hangout), [hangout])
}

export function useHangoutActionIndicators(hangouts: Hangout[]) {
  return useMemo(() => {
    const actionStats = {
      totalHangouts: hangouts.length,
      needsAction: 0,
      needsVote: 0,
      needsRSVP: 0,
      mandatoryRSVP: 0,
      hasActivity: 0
    }
    
    hangouts.forEach(hangout => {
      const actions = useHangoutActions(hangout)
      
      if (actions.actionPriority !== 'none') {
        actionStats.needsAction++
      }
      if (actions.needsVote) actionStats.needsVote++
      if (actions.needsRSVP) actionStats.needsRSVP++
      if (actions.isMandatoryRSVP) actionStats.mandatoryRSVP++
      if (actions.hasRecentActivity) actionStats.hasActivity++
    })
    
    return actionStats
  }, [hangouts])
}
