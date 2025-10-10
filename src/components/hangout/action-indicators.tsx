import { Badge } from "@/components/ui/badge"
import { getHangoutActionStatus, HangoutActionStatus } from "@/hooks/use-hangout-actions"

interface ActionIndicatorsProps {
  hangout: any // Using any for now to avoid type conflicts
  className?: string
}

export function ActionIndicators({ hangout, className = "" }: ActionIndicatorsProps) {
  const actions = getHangoutActionStatus(hangout)
  
  if (actions.actionPriority === 'none') {
    return null
  }
  
  const getIndicatorColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500 text-white'
      case 'medium':
        return 'bg-orange-500 text-white'
      case 'low':
        return 'bg-green-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }
  
  const getIndicatorIcon = (actions: HangoutActionStatus) => {
    if (actions.isMandatoryRSVP) return '🚨'
    if (actions.needsVote) return '🗳️'
    if (actions.needsRSVP) return '📝'
    if (actions.hasRecentActivity) return '✨'
    return '•'
  }
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Badge 
        className={`${getIndicatorColor(actions.actionPriority)} text-xs px-2 py-1`}
      >
        <span className="mr-1">{getIndicatorIcon(actions)}</span>
        {actions.actionText}
      </Badge>
    </div>
  )
}

interface ActionDotProps {
  hangout: any
  className?: string
}

export function ActionDot({ hangout, className = "" }: ActionDotProps) {
  const actions = getHangoutActionStatus(hangout)
  
  if (actions.actionPriority === 'none') {
    return null
  }
  
  const getDotColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500'
      case 'medium':
        return 'bg-orange-500'
      case 'low':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }
  
  return (
    <div 
      className={`w-3 h-3 rounded-full ${getDotColor(actions.actionPriority)} ${className}`}
      title={actions.actionText}
    />
  )
}
