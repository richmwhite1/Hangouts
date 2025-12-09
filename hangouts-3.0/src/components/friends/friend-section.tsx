"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { FriendCardEnhanced } from "./friend-card-enhanced"
import { EnhancedFriend, FriendSectionData } from "./types"

interface FriendSectionProps {
  section: FriendSectionData
  onMessageFriend: (friendId: string) => void
  onInviteFriend: (friendId: string) => void
  onSetGoal: (friendId: string) => void
  defaultExpanded?: boolean
  className?: string
}

export function FriendSection({
  section,
  onMessageFriend,
  onInviteFriend,
  onSetGoal,
  defaultExpanded = true,
  className
}: FriendSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Get color classes based on section color
  const getSectionColorClasses = () => {
    switch (section.color) {
      case 'red':
        return 'border-red-500/30 bg-red-500/5'
      case 'yellow':
        return 'border-yellow-500/30 bg-yellow-500/5'
      case 'green':
        return 'border-green-500/30 bg-green-500/5'
      case 'blue':
        return 'border-blue-500/30 bg-blue-500/5'
      case 'gray':
      default:
        return 'border-gray-700/50 bg-gray-800/50'
    }
  }

  if (section.friends.length === 0) {
    return null
  }

  return (
    <div className={cn("mb-6", className)}>
      {/* Section Header */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-between p-3 rounded-lg transition-all hover:bg-gray-800/70 mb-3",
              getSectionColorClasses()
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{section.icon}</span>
              <div className="text-left">
                <h3 className="font-semibold text-white text-base">
                  {section.title}
                </h3>
                <p className="text-xs text-gray-400">
                  {section.friends.length} friend{section.friends.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-magenta-500/20 text-magenta-400 border-magenta-500/50"
              >
                {section.friends.length}
              </Badge>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3">
          {section.friends.map((friend) => (
            <FriendCardEnhanced
              key={friend.id}
              friend={friend}
              onMessage={() => onMessageFriend(friend.id)}
              onInvite={() => onInviteFriend(friend.id)}
              onSetGoal={() => onSetGoal(friend.id)}
              className={cn(
                "transition-all duration-200",
                section.color !== 'gray' && getSectionColorClasses()
              )}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

// Helper function to group friends by goal status
export function groupFriendsByGoalStatus(friends: EnhancedFriend[]): FriendSectionData[] {
  const sections: Record<string, EnhancedFriend[]> = {
    overdue: [],
    approaching: [],
    upcoming: [],
    onTrack: [],
    noGoal: []
  }

  // Group friends by status
  friends.forEach(friend => {
    if (friend.upcomingHangouts.length > 0) {
      // Prioritize friends with upcoming plans
      sections.upcoming.push(friend)
    } else if (friend.goalStatus.status === 'overdue') {
      sections.overdue.push(friend)
    } else if (friend.goalStatus.status === 'approaching') {
      sections.approaching.push(friend)
    } else if (friend.goalStatus.status === 'on-track') {
      sections.onTrack.push(friend)
    } else {
      sections.noGoal.push(friend)
    }
  })

  // Convert to section data format
  const sectionData: FriendSectionData[] = []

  if (sections.overdue.length > 0) {
    sectionData.push({
      title: 'Need to Hang Out',
      icon: '🔥',
      friends: sections.overdue,
      color: 'red'
    })
  }

  if (sections.approaching.length > 0) {
    sectionData.push({
      title: 'Due Soon',
      icon: '⚠️',
      friends: sections.approaching,
      color: 'yellow'
    })
  }

  if (sections.upcoming.length > 0) {
    sectionData.push({
      title: 'Upcoming Plans',
      icon: '📅',
      friends: sections.upcoming,
      color: 'blue'
    })
  }

  if (sections.onTrack.length > 0) {
    sectionData.push({
      title: 'On Track',
      icon: '✅',
      friends: sections.onTrack,
      color: 'green'
    })
  }

  if (sections.noGoal.length > 0) {
    sectionData.push({
      title: 'All Friends',
      icon: '👥',
      friends: sections.noGoal,
      color: 'gray'
    })
  }

  return sectionData
}