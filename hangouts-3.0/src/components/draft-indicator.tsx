"use client"

import { Badge } from '@/components/ui/badge'
import { Edit, Clock } from 'lucide-react'

interface DraftIndicatorProps {
  isDraft?: boolean
  lastUpdated?: Date
  className?: string
}

export function DraftIndicator({ isDraft, lastUpdated, className = "" }: DraftIndicatorProps) {
  if (!isDraft) return null

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant="secondary" 
        className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs"
      >
        <Edit className="w-3 h-3 mr-1" />
        Draft
      </Badge>
      {lastUpdated && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          {getTimeAgo(lastUpdated)}
        </div>
      )}
    </div>
  )
}





























