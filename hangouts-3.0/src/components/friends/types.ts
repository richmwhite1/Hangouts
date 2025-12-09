import { SharedHangout } from '@/lib/services/friend-relationship-service'
import { RelationshipStatus } from '@/lib/friend-relationship-utils'
import { HangoutFrequency } from '@/lib/services/relationship-reminder-service'

export interface EnhancedFriend {
  id: string
  name: string
  username: string
  avatar?: string
  isActive: boolean
  friendshipCreatedAt: Date
  desiredHangoutFrequency: HangoutFrequency | null
  hangoutStats: {
    lastHangoutDate: Date | null
    totalHangouts: number
    lastHangout?: SharedHangout
  }
  upcomingHangouts: SharedHangout[]
  goalStatus: {
    status: RelationshipStatus
    days: number | null
    text: string
    daysUntilThreshold?: number
    thresholdDays?: number
  }
}

export interface FriendSectionData {
  title: string
  icon: string
  friends: EnhancedFriend[]
  color: 'red' | 'yellow' | 'green' | 'blue' | 'gray'
}