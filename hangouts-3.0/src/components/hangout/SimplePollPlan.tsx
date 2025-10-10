'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Clock, Users, Vote, Plus } from 'lucide-react'
interface Poll {
  id: string
  title: string
  description?: string
  options: Array<{ title: string; description?: string }>
  votes: Array<{ id: string; option: string; user: { id: string; username: string; name: string } }>
  status: 'ACTIVE' | 'CONSENSUS_REACHED'
  consensusPercentage: number
  expiresAt: string
}
interface RSVP {
  id: string
  userId: string
  status: 'YES' | 'NO' | 'MAYBE' | 'PENDING'
  respondedAt: string
  user: { id: string; username: string; name: string; avatar?: string }
}
interface SimplePollPlanProps {
  hangoutId: string
  isCreator: boolean
  currentUserId: string
  hangoutTitle: string
}
export function SimplePollPlan({ hangoutId, isCreator, currentUserId, hangoutTitle }: SimplePollPlanProps) {
  const [step, setStep] = useState<'poll' | 'rsvp'>('poll')
  const [polls, setPolls] = useState<Poll[]>([])
  const [rsvps, setRsvps] = useState<RSVP[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userVote, setUserVote] = useState<string>('')
  const [userRSVP, setUserRSVP] = useState<string>('')
  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem('token')
        // Fetch polls
        const pollsResponse = await fetch(`/api/hangouts/${hangoutId}/polls`))
        if (pollsResponse.ok) {
          const pollsData = await pollsResponse.json()
          const pollsList = pollsData.polls || []
          setPolls(pollsList)
          // Check if consensus is reached
          const hasConsensus = pollsList.some((poll: Poll) =>
            poll.status === 'CONSENSUS_REACHED' || poll.consensusPercentage >= 60
          )
          if (hasConsensus) {
            setStep('rsvp')
          }
        }
        // Fetch RSVPs
        const rsvpResponse = await fetch(`/api/hangouts/${hangoutId}/rsvp`))
        if (rsvpResponse.ok) {
          const rsvpData = await rsvpResponse.json()
          setRsvps(rsvpData.rsvps || [])
          // Find user's RSVP
          const userRsvp = rsvpData.rsvps?.find((rsvp: RSVP) => rsvp.userId === currentUserId)
          if (userRsvp) {
            setUserRSVP(userRsvp.status)
          }
        }
        // Get user's current vote
        if (polls.length > 0) {
          const voteResponse = await fetch(`/api/hangouts/${hangoutId}/polls/${polls[0].id}/vote`))
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
  }, [hangoutId, currentUserId, polls.length])
  const handleVote = async (pollId: string, option: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/hangouts/${hangoutId}/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({ option })
      })
      if (response.ok) {
        setUserVote(option)
        // Refresh polls data
        const pollsResponse = await fetch(`/api/hangouts/${hangoutId}/polls`))
        if (pollsResponse.ok) {
          const pollsData = await pollsResponse.json()
          setPolls(pollsData.polls || [])
        }
      }
    } catch (error) {
      console.error('Error voting:', error)
    }
  }
  const handleCreatePoll = async () => {
    try {
      const token = localStorage.getItem('token')
      const pollData = {
        title: `What should we do for ${hangoutTitle}?`,
        description: 'Choose your preferred option',
        options: [
          { title: 'Go to the movies', description: 'Watch a new release' },
          { title: 'Go bowling', description: 'Have some fun at the lanes' },
          { title: 'Have dinner', description: 'Try a new restaurant' }
        ],
        allowMultiple: false,
        isAnonymous: false,
        visibility: 'PUBLIC' as const
      }
      console.log('Creating poll for hangout:', hangoutId, 'with data:', pollData)
      const response = await fetch(`/api/hangouts/${hangoutId}/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify(pollData)
      })
      console.log('Poll creation response:', response.status, response.statusText)
      if (response.ok) {
        const result = await response.json()
        console.log('Poll created successfully:', result)
        // Refresh polls
        const pollsResponse = await fetch(`/api/hangouts/${hangoutId}/polls`))
        if (pollsResponse.ok) {
          const pollsData = await pollsResponse.json()
          console.log('Refreshed polls:', pollsData)
          setPolls(pollsData.polls || [])
        }
      } else {
        const errorData = await response.json()
        console.error('Poll creation failed:', errorData)
      }
    } catch (error) {
      console.error('Error creating poll:', error)
    }
  }
  const handleTransitionToRSVP = async (pollId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/hangouts/${hangoutId}/polls/${pollId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({ action: 'start' })
      })
      if (response.ok) {
        setStep('rsvp')
        // Refresh polls to show updated status
        const pollsResponse = await fetch(`/api/hangouts/${hangoutId}/polls`))
        if (pollsResponse.ok) {
          const pollsData = await pollsResponse.json()
          setPolls(pollsData.polls || [])
        }
      }
    } catch (error) {
      console.error('Error transitioning to RSVP:', error)
    }
  }
  const handleRSVP = async (status: 'YES' | 'NO' | 'MAYBE') => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/hangouts/${hangoutId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({ status })
      })
      if (response.ok) {
        setUserRSVP(status)
        // Refresh RSVPs
        const rsvpResponse = await fetch(`/api/hangouts/${hangoutId}/rsvp`))
        if (rsvpResponse.ok) {
          const rsvpData = await rsvpResponse.json()
          setRsvps(rsvpData.rsvps || [])
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
    <div className="space-y-6">
      {/* Step 1: Poll */}
      {step === 'poll' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Vote className="w-5 h-5" />
                Step 1: The Poll
              </CardTitle>
              {polls.length === 0 && isCreator && (
                <Button onClick={handleCreatePoll} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Poll
                </Button>
              )}
            </div>
            <p className="text-muted-foreground">
              Let everyone vote on what to do for this hangout
            </p>
          </CardHeader>
          <CardContent>
            {polls.length === 0 ? (
              <div className="text-center py-8">
                <Vote className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {isCreator ? 'Create a poll to let everyone vote on what to do' : 'No poll created yet'}
                </p>
                {isCreator && (
                  <Button onClick={handleCreatePoll}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Poll
                  </Button>
                )}
              </div>
            ) : (
              polls.map((poll) => {
                const voteCounts = getVoteCounts(poll)
                const totalVotes = poll.votes.length
                const [winningOption, winningVotes] = getWinningOption(poll)
                const consensusReached = poll.consensusPercentage >= 60 || poll.status === 'CONSENSUS_REACHED'
                return (
                  <div key={poll.id} className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{poll.title}</h3>
                      {poll.description && (
                        <p className="text-muted-foreground">{poll.description}</p>
                      )}
                    </div>
                    {/* Poll Options */}
                    <div className="space-y-3">
                      {poll.options.map((option, index) => {
                        const votes = voteCounts[option.title] || 0
                        const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0
                        const isWinning = option.title === winningOption && totalVotes > 0
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Button
                                variant={userVote === option.title ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleVote(poll.id, option.title)}
                                disabled={consensusReached}
                                className="flex-1 mr-2"
                              >
                                {option.title}
                              </Button>
                              {isWinning && <Badge variant="default">Winning</Badge>}
                            </div>
                            <Progress value={percentage} className="h-2" />
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>{votes} vote{votes !== 1 ? 's' : ''}</span>
                              <span>{percentage.toFixed(1)}%</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {/* Poll Stats */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
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
                          onClick={() => handleTransitionToRSVP(poll.id)}
                          size="sm"
                          disabled={poll.consensusPercentage < 60}
                        >
                          Move to RSVP
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}
      {/* Step 2: RSVP */}
      {step === 'rsvp' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Step 2: The Plan
            </CardTitle>
            <p className="text-muted-foreground">
              {polls.length > 0 && getWinningOption(polls[0])[0]
                ? `Plan: ${getWinningOption(polls[0])[0]}`
                : "RSVP for this hangout"
              }
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* RSVP Status */}
              <div className="space-y-2">
                <h3 className="font-semibold">Who's coming?</h3>
                {rsvps.length === 0 ? (
                  <p className="text-muted-foreground">No RSVPs yet</p>
                ) : (
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
                )}
              </div>
              {/* RSVP Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleRSVP('YES')}
                  variant={userRSVP === 'YES' ? "default" : "outline"}
                >
                  Yes, I'm in!
                </Button>
                <Button
                  onClick={() => handleRSVP('MAYBE')}
                  variant={userRSVP === 'MAYBE' ? "secondary" : "outline"}
                >
                  Maybe
                </Button>
                <Button
                  onClick={() => handleRSVP('NO')}
                  variant={userRSVP === 'NO' ? "destructive" : "outline"}
                >
                  No, can't make it
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}