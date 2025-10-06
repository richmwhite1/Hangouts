'use client'

import { useState } from 'react'
import { SimplePollModal } from '@/components/polling/SimplePollModal'
import { SimplePollDisplay } from '@/components/polling/SimplePollDisplay'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TestSimplifiedPage() {
  const [showModal, setShowModal] = useState(false)
  const [polls, setPolls] = useState([
    {
      id: 'test-poll-1',
      title: 'Test Poll - Where should we go?',
      description: 'Choose your favorite option',
      options: [
        { id: 'opt-1', text: 'Italian Restaurant', voteCount: 3, percentage: 60 },
        { id: 'opt-2', text: 'Sushi Bar', voteCount: 2, percentage: 40 },
        { id: 'opt-3', text: 'Burger Joint', voteCount: 0, percentage: 0 }
      ],
      totalVotes: 5,
      participantCount: 4,
      consensusReached: false,
      isActive: true
    }
  ])

  const handleVote = (pollId: string, optionId: string) => {
    console.log('Vote cast:', { pollId, optionId })
    // Simulate vote update
    setPolls(prev => prev.map(poll => {
      if (poll.id === pollId) {
        return {
          ...poll,
          options: poll.options.map(option => {
            if (option.id === optionId) {
              return { ...option, voteCount: option.voteCount + 1 }
            }
            return option
          })
        }
      }
      return poll
    }))
  }

  const handlePollCreated = (poll: any) => {
    console.log('Poll created:', poll)
    setShowModal(false)
    // Add new poll to list
    setPolls(prev => [...prev, {
      id: poll.id,
      title: poll.title,
      description: poll.description || '',
      options: poll.options?.map((opt: any) => ({
        id: opt.id,
        text: opt.text,
        voteCount: 0,
        percentage: 0
      })) || [],
      totalVotes: 0,
      participantCount: 0,
      consensusReached: false,
      isActive: true
    }])
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Test Simplified Components</h1>
      
      <div className="space-y-6">
        {/* Test Poll Display */}
        <Card>
          <CardHeader>
            <CardTitle>Test Poll Display</CardTitle>
          </CardHeader>
          <CardContent>
            <SimplePollDisplay
              poll={polls[0]}
              onVote={handleVote}
              userVote={null}
            />
          </CardContent>
        </Card>

        {/* Test Create Poll Button */}
        <Card>
          <CardHeader>
            <CardTitle>Test Create Poll</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowModal(true)}>
              Create New Poll
            </Button>
          </CardContent>
        </Card>

        {/* Test Multiple Polls */}
        <Card>
          <CardHeader>
            <CardTitle>All Polls ({polls.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {polls.map((poll) => (
              <SimplePollDisplay
                key={poll.id}
                poll={poll}
                onVote={handleVote}
                userVote={null}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Create Poll Modal */}
      {showModal && (
        <SimplePollModal
          hangoutId="test-hangout"
          onPollCreated={handlePollCreated}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}













