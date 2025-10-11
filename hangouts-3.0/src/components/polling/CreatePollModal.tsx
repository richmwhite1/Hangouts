"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Settings, Users, Clock, Target } from 'lucide-react'
import { usePolling } from '@/contexts/realtime-context'
import { MobileFullScreenModal } from '@/components/ui/mobile-modal'

import { logger } from '@/lib/logger'
interface CreatePollModalProps {
  hangoutId: string
  onPollCreated?: (poll: any) => void
  children?: React.ReactNode
}

interface PollOption {
  id: string
  text: string
  description: string
}

interface ConsensusConfig {
  consensusType: 'PERCENTAGE' | 'ABSOLUTE' | 'MAJORITY' | 'SUPERMAJORITY' | 'QUADRATIC' | 'CONDORCET' | 'CUSTOM'
  threshold: number
  minParticipants: number
  timeLimit?: number
  allowTies: boolean
  tieBreaker?: string
}

export function CreatePollModal({ hangoutId, onPollCreated, children }: CreatePollModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [options, setOptions] = useState<PollOption[]>([
    { id: '1', text: '', description: '' },
    { id: '2', text: '', description: '' }
  ])
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [allowDelegation, setAllowDelegation] = useState(false)
  const [allowAbstention, setAllowAbstention] = useState(true)
  const [allowAddOptions, setAllowAddOptions] = useState(true)
  const [isPublic, setIsPublic] = useState(false)
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FRIENDS' | 'PUBLIC'>('PRIVATE')
  const [allowFriendsToInvite, setAllowFriendsToInvite] = useState(true)
  const [allowTextInvitation, setAllowTextInvitation] = useState(true)
  
  // Consensus configuration
  const [consensusConfig, setConsensusConfig] = useState<ConsensusConfig>({
    consensusType: 'PERCENTAGE',
    threshold: 60,
    minParticipants: 2,
    timeLimit: undefined,
    allowTies: false,
    tieBreaker: undefined
  })

  const { createPoll } = usePolling()

  const addOption = () => {
    const newId = (options.length + 1).toString()
    setOptions([...options, { id: newId, text: '', description: '' }])
  }

  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter(option => option.id !== id))
    }
  }

  const updateOption = (id: string, field: 'text' | 'description', value: string) => {
    setOptions(options.map(option => 
      option.id === id ? { ...option, [field]: value } : option
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError('Poll title is required')
      return
    }

    const validOptions = options.filter(option => option.text.trim())
    if (validOptions.length < 2) {
      setError('At least 2 options are required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const pollData = {
        hangoutId,
        title: title.trim(),
        description: description.trim() || undefined,
        options: validOptions.map(option => ({
          text: option.text.trim(),
          description: option.description.trim() || undefined
        })),
        consensusConfig,
        allowMultiple,
        isAnonymous,
        allowDelegation,
        allowAbstention,
        allowAddOptions,
        isPublic,
        visibility
      }

      const result = await createPoll(pollData)
      
      // Reset form
      setTitle('')
      setDescription('')
      setOptions([
        { id: '1', text: '', description: '' },
        { id: '2', text: '', description: '' }
      ])
      setAllowMultiple(false)
      setIsAnonymous(false)
      setAllowDelegation(false)
      setAllowAbstention(true)
      setIsPublic(false)
      setConsensusConfig({
        consensusType: 'PERCENTAGE',
        threshold: 60,
        minParticipants: 2,
        timeLimit: undefined,
        allowTies: false,
        tieBreaker: undefined
      })

      setOpen(false)
      onPollCreated?.(result)
    } catch (err) {
      logger.error('Error creating poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to create poll')
    } finally {
      setLoading(false)
    }
  }

  const getConsensusDescription = (type: string) => {
    switch (type) {
      case 'PERCENTAGE': return 'Consensus based on percentage of votes'
      case 'ABSOLUTE': return 'Consensus based on absolute number of votes'
      case 'MAJORITY': return 'Simple majority (50%+)'
      case 'SUPERMAJORITY': return 'Super majority (66%+)'
      case 'QUADRATIC': return 'Quadratic voting system'
      case 'CONDORCET': return 'Condorcet method (pairwise comparison)'
      case 'CUSTOM': return 'Custom consensus rules'
      default: return ''
    }
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {children || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Poll
          </Button>
        )}
      </div>
      
      <MobileFullScreenModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Create New Poll"
        className="bg-white dark:bg-gray-900"
        closeOnBackdropClick={true}
        closeOnEscape={true}
        preventBodyScroll={true}
      >

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Poll Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What should we decide on?"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide more context about this poll..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Poll Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Poll Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {options.map((option, index) => (
                <div key={option.id} className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={option.text}
                      onChange={(e) => updateOption(option.id, 'text', e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      required
                    />
                    <Input
                      value={option.description}
                      onChange={(e) => updateOption(option.id, 'description', e.target.value)}
                      placeholder="Optional description"
                    />
                  </div>
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(option.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addOption}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </CardContent>
          </Card>

          {/* Consensus Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5" />
                Consensus Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="consensusType">Consensus Type</Label>
                  <Select
                    value={consensusConfig.consensusType}
                    onValueChange={(value: any) => 
                      setConsensusConfig(prev => ({ ...prev, consensusType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="ABSOLUTE">Absolute</SelectItem>
                      <SelectItem value="MAJORITY">Majority</SelectItem>
                      <SelectItem value="SUPERMAJORITY">Super Majority</SelectItem>
                      <SelectItem value="QUADRATIC">Quadratic</SelectItem>
                      <SelectItem value="CONDORCET">Condorcet</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {getConsensusDescription(consensusConfig.consensusType)}
                  </p>
                </div>

                <div>
                  <Label htmlFor="threshold">Threshold</Label>
                  <Input
                    id="threshold"
                    type="number"
                    min="0"
                    max="100"
                    value={consensusConfig.threshold}
                    onChange={(e) => 
                      setConsensusConfig(prev => ({ 
                        ...prev, 
                        threshold: parseInt(e.target.value) || 0 
                      }))
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {consensusConfig.consensusType === 'PERCENTAGE' ? 'Percentage (0-100)' : 'Number of votes'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="minParticipants">Min Participants</Label>
                  <Input
                    id="minParticipants"
                    type="number"
                    min="1"
                    value={consensusConfig.minParticipants}
                    onChange={(e) => 
                      setConsensusConfig(prev => ({ 
                        ...prev, 
                        minParticipants: parseInt(e.target.value) || 1 
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min="1"
                    value={consensusConfig.timeLimit || ''}
                    onChange={(e) => 
                      setConsensusConfig(prev => ({ 
                        ...prev, 
                        timeLimit: e.target.value ? parseInt(e.target.value) : undefined 
                      }))
                    }
                    placeholder="No limit"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="allowTies"
                  checked={consensusConfig.allowTies}
                  onCheckedChange={(checked) => 
                    setConsensusConfig(prev => ({ ...prev, allowTies: checked }))
                  }
                />
                <Label htmlFor="allowTies">Allow ties</Label>
              </div>
            </CardContent>
          </Card>

          {/* Poll Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Poll Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="allowMultiple"
                    checked={allowMultiple}
                    onCheckedChange={setAllowMultiple}
                  />
                  <Label htmlFor="allowMultiple">Allow multiple votes</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isAnonymous"
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous}
                  />
                  <Label htmlFor="isAnonymous">Anonymous voting</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="allowDelegation"
                    checked={allowDelegation}
                    onCheckedChange={setAllowDelegation}
                  />
                  <Label htmlFor="allowDelegation">Allow vote delegation</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="allowAbstention"
                    checked={allowAbstention}
                    onCheckedChange={setAllowAbstention}
                  />
                  <Label htmlFor="allowAbstention">Allow abstention</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="allowAddOptions"
                    checked={allowAddOptions}
                    onCheckedChange={setAllowAddOptions}
                  />
                  <Label htmlFor="allowAddOptions">Allow participants to add options</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPublic"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                  <Label htmlFor="isPublic">Public poll (legacy)</Label>
                </div>
              </div>

              {/* Visibility Settings */}
              <div className="space-y-2">
                <Label htmlFor="visibility">Poll Visibility</Label>
                <Select
                  value={visibility}
                  onValueChange={(value: 'PRIVATE' | 'FRIENDS' | 'PUBLIC') => setVisibility(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE">Private - Only you can see this poll</SelectItem>
                    <SelectItem value="FRIENDS">Friends - Your friends can see this poll</SelectItem>
                    <SelectItem value="PUBLIC">Public - Anyone with the link can see this poll</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {visibility === 'PRIVATE' && 'Only you can see and vote on this poll.'}
                  {visibility === 'FRIENDS' && 'Your friends can see and vote on this poll.'}
                  {visibility === 'PUBLIC' && 'Anyone with the link can see and vote on this poll.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Invitation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Invitation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Allow friends to invite others</div>
                  <div className="text-xs text-muted-foreground">Friends can add more people to this poll</div>
                </div>
                <Switch
                  id="allowFriendsToInvite"
                  checked={allowFriendsToInvite}
                  onCheckedChange={setAllowFriendsToInvite}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Allow text invitation to new users</div>
                  <div className="text-xs text-muted-foreground">Send text invites to people not on the app</div>
                </div>
                <Switch
                  id="allowTextInvitation"
                  checked={allowTextInvitation}
                  onCheckedChange={setAllowTextInvitation}
                />
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Poll'}
            </Button>
          </div>
        </form>
      </MobileFullScreenModal>
    </>
  )
}
