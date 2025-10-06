"use client"

import React, { useState, useEffect } from 'react'
import { RealtimeProvider } from '@/contexts/realtime-context'
import { PollList } from '@/components/polling/PollList'
import { CreatePollModal } from '@/components/polling/CreatePollModal'
import { PollDetails } from '@/components/polling/PollDetails'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Clock, 
  Target,
  Activity,
  Zap
} from 'lucide-react'

interface PollStats {
  activePolls: number
  totalParticipants: number
  totalVotes: number
  consensusReached: number
}

export default function PollingPage() {
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [stats, setStats] = useState<PollStats>({
    activePolls: 0,
    totalParticipants: 0,
    totalVotes: 0,
    consensusReached: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)

  // Fetch stats
  const fetchStats = async () => {
    try {
      // Use the proper API endpoint
      const response = await fetch('/api/polls')
      const data = await response.json()
      
      if (data.polls) {
        const activePolls = data.polls.filter((poll: any) => poll.status === 'ACTIVE').length
        const totalParticipants = data.polls.reduce((sum: number, poll: any) => 
          sum + (poll.participants?.length || 0), 0)
        const totalVotes = data.polls.reduce((sum: number, poll: any) => 
          sum + (poll.consensus?.totalVotes || 0), 0)
        const consensusReached = data.polls.filter((poll: any) => 
          poll.consensus?.reached || poll.status === 'CONSENSUS_REACHED').length

        setStats({
          activePolls,
          totalParticipants,
          totalVotes,
          consensusReached
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      // Set default stats on error
      setStats({
        activePolls: 0,
        totalParticipants: 0,
        totalVotes: 0,
        consensusReached: 0
      })
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handlePollClick = (pollId: string) => {
    setSelectedPollId(pollId)
  }

  const handlePollCreated = (poll: any) => {
    console.log('Poll created:', poll)
    setShowCreateModal(false)
    // Refresh stats when a new poll is created
    fetchStats()
  }

  const handleCloseDetails = () => {
    setSelectedPollId(null)
  }

  if (selectedPollId) {
    return (
      <RealtimeProvider>
        <div className="container mx-auto px-4 py-8">
          <PollDetails 
            pollId={selectedPollId} 
            onClose={handleCloseDetails}
          />
        </div>
      </RealtimeProvider>
    )
  }

  return (
    <RealtimeProvider>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Real-time Polling System
          </h1>
          <p className="text-gray-600">
            Create polls, vote in real-time, and reach consensus with your community
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {statsLoading ? '...' : stats.activePolls}
                  </div>
                  <div className="text-sm text-gray-600">Active Polls</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {statsLoading ? '...' : stats.totalParticipants}
                  </div>
                  <div className="text-sm text-gray-600">Total Participants</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {statsLoading ? '...' : stats.totalVotes}
                  </div>
                  <div className="text-sm text-gray-600">Total Votes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {statsLoading ? '...' : stats.consensusReached}
                  </div>
                  <div className="text-sm text-gray-600">Consensus Reached</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Real-time Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                See votes and consensus updates instantly as they happen. No need to refresh the page.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                Multiple Consensus Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Choose from percentage, absolute, majority, supermajority, quadratic, and Condorcet voting.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                Advanced Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Track consensus progress, voting velocity, and time-to-consensus predictions.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Poll List */}
        <PollList
          onCreatePoll={() => setShowCreateModal(true)}
          onPollClick={handlePollClick}
        />

        {/* Create Poll Modal */}
        <CreatePollModal
          hangoutId="demo-hangout"
          onPollCreated={handlePollCreated}
        />

        {/* Demo Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-blue-100 rounded">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Demo Mode</h3>
              <p className="text-blue-800 text-sm mb-3">
                This is a demonstration of the real-time polling system. The system includes:
              </p>
              <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside">
                <li>Real-time vote casting and consensus tracking</li>
                <li>Multiple consensus algorithms (Percentage, Absolute, Majority, etc.)</li>
                <li>Advanced analytics and progress visualization</li>
                <li>Participant management and delegation</li>
                <li>Comprehensive audit trails</li>
                <li>WebSocket-based real-time updates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </RealtimeProvider>
  )
}
