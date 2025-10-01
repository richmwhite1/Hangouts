'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Plus, Trash2 } from 'lucide-react'
import { MobileModal } from '@/components/ui/mobile-modal'

interface SimplePollModalProps {
  hangoutId: string
  onPollCreated: (poll: any) => void
  onClose: () => void
}

export function SimplePollModal({ hangoutId, onPollCreated, onClose }: SimplePollModalProps) {
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [visibility, setVisibility] = useState<'PRIVATE' | 'FRIENDS' | 'PUBLIC'>('FRIENDS')
  const [allowAddOptions, setAllowAddOptions] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  const addOption = () => {
    if (options.length < 4) {
      setOptions([...options, ''])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || options.filter(opt => opt.trim()).length < 2) return

    setIsCreating(true)
    try {
      const response = await fetch(`/api/hangouts/${hangoutId}/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: '',
          options: options.filter(opt => opt.trim()).map(text => ({ text: text.trim() })),
          allowMultiple: false,
          isAnonymous: false,
          consensusConfig: {
            consensusType: 'PERCENTAGE',
            threshold: 60,
            minParticipants: 2,
            allowTies: false
          },
          allowDelegation: false,
          allowAbstention: true,
          allowAddOptions,
          isPublic: false,
          visibility
        })
      })

      if (response.ok) {
        const data = await response.json()
        onPollCreated(data.poll)
        onClose()
      } else {
        console.error('Failed to create poll')
      }
    } catch (error) {
      console.error('Error creating poll:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <MobileModal
      isOpen={true}
      onClose={onClose}
      title="Create Poll"
      className="w-full max-w-md"
      closeOnBackdropClick={true}
      closeOnEscape={true}
      preventBodyScroll={true}
    >
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">What should we decide?</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Where should we go for dinner?"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label>Options</Label>
              <div className="space-y-2 mt-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      required
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 4 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Option
                  </Button>
                )}
              </div>
            </div>

          <div>
            <Label htmlFor="visibility">Who can see this poll?</Label>
            <Select
              value={visibility}
              onValueChange={(value: 'PRIVATE' | 'FRIENDS' | 'PUBLIC') => setVisibility(value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">Private - Only you</SelectItem>
                <SelectItem value="FRIENDS">Friends - Your friends</SelectItem>
                <SelectItem value="PUBLIC">Public - Anyone with link</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="allowAddOptions"
              checked={allowAddOptions}
              onChange={(e) => setAllowAddOptions(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="allowAddOptions" className="text-sm">
              Allow participants to add options
            </Label>
          </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !title.trim() || options.filter(opt => opt.trim()).length < 2}
                className="flex-1"
              >
                {isCreating ? 'Creating...' : 'Create Poll'}
              </Button>
            </div>
          </form>
        </CardContent>
    </MobileModal>
  )
}

