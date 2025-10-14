'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  Users,
  Clock,
  Zap,
  Award,
  TrendingUp,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  XCircle2,
  AlertCircle,
  Info,
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  RefreshCw,
  RotateCcw,
  Save,
  Edit,
  Trash2,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Copy,
  Download,
  Upload,
  Filter,
  Search,
  Plus,
  Minus,
  Eye,
  EyeOff,
  Settings,
  Target,
  Timer,
  Bell,
  BellOff,
  StarOff,
  Reply,
  Flag,
  MoreVertical as MoreVerticalIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  ExternalLink as ExternalLinkIcon,
  Copy as CopyIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Filter as FilterIcon,
  Search as SearchIcon,
  Plus as PlusIcon,
  Minus as MinusIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  Settings as SettingsIcon,
  Target as TargetIcon,
  Timer as TimerIcon,
  Bell as BellIcon,
  BellOff as BellOffIcon,
  StarOff as StarOffIcon,
  Reply as ReplyIcon,
  Flag as FlagIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PollResult {
  winningOption: string
  consensusPercentage: number
  totalVotes: number
  participantCount: number
  timeToConsensus: number
}

interface RSVPTransition {
  isTransitioning: boolean
  transitionProgress: number
  estimatedTimeRemaining: number
  autoTransitionAt?: Date
}

interface PollToRSVPTransitionProps {
  pollResult: PollResult
  transition: RSVPTransition
  onStartTransition: () => Promise<void>
  onCancelTransition: () => Promise<void>
  onCompleteTransition: () => Promise<void>
  onAutoTransition: () => Promise<void>
  isTransitioning: boolean
  isUpdating: boolean
}

export function PollToRSVPTransition({
  pollResult,
  transition,
  onStartTransition,
  onCancelTransition,
  onCompleteTransition,
  onAutoTransition,
  isTransitioning,
  isUpdating
}: PollToRSVPTransitionProps) {
  const [countdown, setCountdown] = useState<number>(0)
  const [showDetails, setShowDetails] = useState(false)

  // Countdown for auto-transition
  useEffect(() => {
    if (!transition.autoTransitionAt) return

    const updateCountdown = () => {
      const now = new Date()
      const autoTransitionAt = new Date(transition.autoTransitionAt!)
      const diff = autoTransitionAt.getTime() - now.getTime()

      if (diff <= 0) {
        setCountdown(0)
        onAutoTransition()
        return
      }

      setCountdown(Math.ceil(diff / 1000))
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [transition.autoTransitionAt, onAutoTransition])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const getConsensusColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConsensusBadgeColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100 text-green-800 border-green-200'
    if (percentage >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  const isConsensusStrong = pollResult.consensusPercentage >= 70
  const isConsensusReached = pollResult.consensusPercentage >= 60

  return (
    <div className="space-y-6">
      {/* Consensus Reached Banner */}
      <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-green-800">
                  Consensus Reached! 🎉
                </CardTitle>
                <p className="text-green-600 mt-1">
                  The poll has reached consensus and is ready to transition to RSVP mode.
                </p>
              </div>
            </div>
            <Badge className={getConsensusBadgeColor(pollResult.consensusPercentage)}>
              {pollResult.consensusPercentage.toFixed(0)}% Consensus
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Winning Option */}
            <div className="p-4 bg-white rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Winning Option</h4>
                  <p className="text-gray-600 mt-1">{pollResult.winningOption}</p>
                </div>
                <div className="text-right">
                  <div className={cn("text-2xl font-bold", getConsensusColor(pollResult.consensusPercentage))}>
                    {pollResult.consensusPercentage.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-500">{pollResult.totalVotes} votes</div>
                </div>
              </div>
            </div>

            {/* Poll Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{pollResult.totalVotes}</div>
                <div className="text-sm text-gray-600">Total Votes</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-blue-600">{pollResult.participantCount}</div>
                <div className="text-sm text-gray-600">Participants</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-purple-600">{pollResult.timeToConsensus}h</div>
                <div className="text-sm text-gray-600">Time to Consensus</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transition Status */}
      {transition.isTransitioning && (
        <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              Transitioning to RSVP Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Transition Progress</span>
                  <span className="font-medium">{transition.transitionProgress.toFixed(0)}%</span>
                </div>
                <Progress value={transition.transitionProgress} className="h-3" />
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Estimated time remaining: {transition.estimatedTimeRemaining} minutes</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancelTransition}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-Transition Countdown */}
      {transition.autoTransitionAt && !transition.isTransitioning && (
        <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Timer className="w-5 h-5 text-orange-600" />
              Auto-Transition in Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600 mb-2">
                  {formatTime(countdown)}
                </div>
                <p className="text-gray-600">
                  The poll will automatically transition to RSVP mode when the countdown reaches zero.
                </p>
              </div>
              
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={onStartTransition}
                  disabled={isUpdating}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Transition Now
                </Button>
                <Button
                  variant="outline"
                  onClick={onCancelTransition}
                  disabled={isUpdating}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Auto-Transition
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transition Actions */}
      {!transition.isTransitioning && !transition.autoTransitionAt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ready to Transition?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-800">Consensus Achieved</h4>
                  <p className="text-sm text-green-600">
                    {pollResult.consensusPercentage.toFixed(0)}% consensus reached with "{pollResult.winningOption}"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-semibold text-blue-800">RSVP Mode Ready</h4>
                  <p className="text-sm text-blue-600">
                    All {pollResult.participantCount} participants can now RSVP to the confirmed event
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <ArrowRight className="w-5 h-5 text-purple-600" />
                <div>
                  <h4 className="font-semibold text-purple-800">Seamless Transition</h4>
                  <p className="text-sm text-purple-600">
                    Poll data will be preserved and participants will be automatically invited
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={onStartTransition}
                disabled={isUpdating}
                className="flex-1"
                size="lg"
              >
                <Zap className="w-5 h-5 mr-2" />
                Transition to RSVP Mode
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDetails(!showDetails)}
                disabled={isUpdating}
              >
                <Info className="w-4 h-4 mr-2" />
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transition Details */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transition Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Winning Option</span>
                <span className="text-gray-600">{pollResult.winningOption}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Consensus Percentage</span>
                <span className="text-gray-600">{pollResult.consensusPercentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Total Votes</span>
                <span className="text-gray-600">{pollResult.totalVotes}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Participant Count</span>
                <span className="text-gray-600">{pollResult.participantCount}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Time to Consensus</span>
                <span className="text-gray-600">{pollResult.timeToConsensus} hours</span>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">What happens during transition?</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Poll results are locked and preserved</li>
                <li>• Hangout details are updated with the winning option</li>
                <li>• All participants are automatically invited to RSVP</li>
                <li>• Poll interface is replaced with RSVP interface</li>
                <li>• Participants can now confirm their attendance</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transition Complete */}
      {transition.transitionProgress === 100 && (
        <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Transition Complete!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-green-800 mb-2">
                  Successfully Transitioned to RSVP Mode
                </h3>
                <p className="text-green-600">
                  The hangout is now ready for participants to RSVP. All poll data has been preserved.
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={onCompleteTransition}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Continue to RSVP
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
























