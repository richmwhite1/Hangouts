'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Clock, Users, Vote } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface Poll {
  id: string
  title: string
  description?: string
  options: Array<{ title: string; description?: string }>
  votes: Array<{ id: string; option: string; user: { id: string; username: string; name: string } }>
  status: 'ACTIVE' | 'EXPIRED' | 'CONSENSUS_REACHED'
  consensusPercentage: number
  minimumParticipants: number
  expiresAt: string
  creatorId: string
}

interface RSVP {
  id: string
  userId: string
  status: 'YES' | 'NO' | 'MAYBE' | 'PENDING'
  respondedAt: string
  user: { id: string; username: string; name: string; avatar?: string }
}

interface PollPlanTabsProps {
  hangoutId: string
  isCreator: boolean
  currentUserId: string
}

export function PollPlanTabs({ hangoutId, isCreator, currentUserId }: PollPlanTabsProps) {
  const [activeTab, setActiveTab] = useState<'poll' | 'plan'>('poll')
  const [polls, setPolls] = useState<Poll[]>([])
  const [rsvps, setRsvps] = useState<RSVP[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOption, setSelectedOption] = useState<string>('')
  const [userVote, setUserVote] = useState<string>('')

  // Fetch polls and RSVPs
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch polls
        const token = localStorage.getItem('token') || apiClient.token
        const pollsResponse = await fetch(`/api/hangouts/${hangoutId}/polls`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (pollsResponse.ok) {
          const pollsData = await pollsResponse.json()
          setPolls(pollsData.data?.polls || [])
          
          // Check if any poll has reached consensus
          const hasConsensus = pollsData.data?.polls?.some((poll: Poll) => 
            poll.status === 'CONSENSUS_REACHED' || poll.consensusPercentage >= 60
          )
          if (hasConsensus) {
            setActiveTab('plan')
          }
        }

        // Fetch RSVPs
        const rsvpResponse = await fetch(`/api/hangouts/${hangoutId}/rsvp`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (rsvpResponse.ok) {
          const rsvpData = await rsvpResponse.json()
          setRsvps(rsvpData.data?.rsvps || [])
        }

        // Get user's current vote
        if (polls.length > 0) {
          const voteResponse = await fetch(`/api/hangouts/${hangoutId}/polls/${polls[0].id}/vote`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (voteResponse.ok) {
            const voteData = await voteResponse.json()
            setUserVote(voteData.userVotes?.[0] || '')
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [hangoutId, polls.length])

  const handleVote = async (pollId: string, option: string) => {
    try {
      const token = localStorage.getItem('token') || apiClient.token
      const response = await fetch(`/api/hangouts/${hangoutId}/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ option })
      })

      if (response.ok) {
        setUserVote(option)
        // Refresh polls data
        const pollsResponse = await fetch(`/api/hangouts/${hangoutId}/polls`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (pollsResponse.ok) {
          const pollsData = await pollsResponse.json()
          setPolls(pollsData.data?.polls || [])
        }
      }
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  const handleTransitionToPlan = async (pollId: string) => {
    try {
      const token = localStorage.getItem('token') || apiClient.token
      const response = await fetch(`/api/hangouts/${hangoutId}/polls/${pollId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'start' })
      })

      if (response.ok) {
        setActiveTab('plan')
        // Refresh polls to show updated status
        const pollsResponse = await fetch(`/api/hangouts/${hangoutId}/polls`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (pollsResponse.ok) {
          const pollsData = await pollsResponse.json()
          setPolls(pollsData.data?.polls || [])
        }
      }
    } catch (error) {
      console.error('Error transitioning to plan:', error)
    }
  }

  const handleRSVP = async (status: 'YES' | 'NO' | 'MAYBE') => {
    try {
      const token = localStorage.getItem('token') || apiClient.token
      const response = await fetch(`/api/hangouts/${hangoutId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        // Refresh RSVPs
        const rsvpResponse = await fetch(`/api/hangouts/${hangoutId}/rsvp`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (rsvpResponse.ok) {
          const rsvpData = await rsvpResponse.json()
          setRsvps(rsvpData.data?.rsvps || [])
        }
      }
    } catch (error) {
      console.error('Error updating RSVP:', error)
    }
  }

  const getVoteCounts = (poll: Poll) => {
    const counts: Record<string, number> = {}
    poll.options.forEach(option => {
      counts[option.title] = poll.votes.filter(vote => vote.option === option.title).length
    })
    return counts
  }

  const getWinningOption = (poll: Poll) => {
    const counts = getVoteCounts(poll)
    return Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'poll' | 'plan')} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="poll" className="flex items-center gap-2">
          <Vote className="w-4 h-4" />
          The Poll
        </TabsTrigger>
        <TabsTrigger value="plan" className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          The Plan
        </TabsTrigger>
      </TabsList>

      <TabsContent value="poll" className="space-y-4">
        {polls.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No polls available for this hangout.</p>
            </CardContent>
          </Card>
        ) : (
          polls.map((poll) => {
            const voteCounts = getVoteCounts(poll)
            const totalVotes = poll.votes.length
            const [winningOption, winningVotes] = getWinningOption(poll)
            const consensusReached = poll.consensusPercentage >= 60 || poll.status === 'CONSENSUS_REACHED'
            
            return (
              <Card key={poll.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{poll.title}</CardTitle>
                    <Badge variant={consensusReached ? "default" : "secondary"}>
                      {consensusReached ? "Consensus Reached" : "Active"}
                    </Badge>
                  </div>
                  {poll.description && (
                    <p className="text-muted-foreground">{poll.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Poll Options */}
                  <div className="space-y-2">
                    {poll.options.map((option, index) => {
                      const votes = voteCounts[option.title] || 0
                      const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0
                      const isWinning = option.title === winningOption && totalVotes > 0
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant={userVote === option.title ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleVote(poll.id, option.title)}
                                disabled={consensusReached}
                              >
                                {option.title}
                              </Button>
                              {isWinning && <Badge variant="default">Winning</Badge>}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {votes} vote{votes !== 1 ? 's' : ''} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                          {option.description && (
                            <p className="text-sm text-muted-foreground ml-2">{option.description}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Poll Stats */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {totalVotes} total votes
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {poll.consensusPercentage}% consensus
                      </span>
                    </div>
                    {isCreator && !consensusReached && totalVotes > 0 && (
                      <Button
                        onClick={() => handleTransitionToPlan(poll.id)}
                        size="sm"
                        disabled={poll.consensusPercentage < 60}
                      >
                        Transition to Plan
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </TabsContent>

      <TabsContent value="plan" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>The Plan</CardTitle>
            <p className="text-muted-foreground">
              {polls.length > 0 && getWinningOption(polls[0])[0] 
                ? `Based on the poll: ${getWinningOption(polls[0])[0]}`
                : "Plan details will appear here once consensus is reached."
              }
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h3 className="font-semibold">RSVP Status</h3>
              <div className="space-y-2">
                {rsvps.map((rsvp) => (
                  <div key={rsvp.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rsvp.user.name}</span>
                      <span className="text-muted-foreground">@{rsvp.user.username}</span>
                    </div>
                    <Badge variant={
                      rsvp.status === 'YES' ? 'default' :
                      rsvp.status === 'NO' ? 'destructive' :
                      rsvp.status === 'MAYBE' ? 'secondary' : 'outline'
                    }>
                      {rsvp.status}
                    </Badge>
                  </div>
                ))}
              </div>
              
              {/* RSVP Actions */}
              <div className="flex gap-2 pt-4">
                <Button onClick={() => handleRSVP('YES')} variant="default">
                  Yes, I'm in!
                </Button>
                <Button onClick={() => handleRSVP('MAYBE')} variant="secondary">
                  Maybe
                </Button>
                <Button onClick={() => handleRSVP('NO')} variant="destructive">
                  No, can't make it
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
