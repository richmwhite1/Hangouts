'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Plus, Calendar, MapPin, Clock, Loader2 } from 'lucide-react'

interface AddPollOptionModalProps {
  pollId: string
  onOptionAdded: (option: any) => void
  children: React.ReactNode
}

export function AddPollOptionModal({ pollId, onOptionAdded, children }: AddPollOptionModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    text: '',
    description: '',
    what: '',
    where: '',
    when: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.text.trim()) {
      setError('Option text is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/polls/${pollId}/add-option`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const result = await response.json()
        onOptionAdded(result.option)
        
        // Reset form
        setFormData({
          text: '',
          description: '',
          what: '',
          where: '',
          when: ''
        })
        
        setIsOpen(false)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to add option')
      }
    } catch (err) {
      console.error('Error adding poll option:', err)
      setError('Failed to add option. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setError(null)
    setFormData({
      text: '',
      description: '',
      what: '',
      where: '',
      when: ''
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Poll Option</DialogTitle>
          <DialogDescription>
            Add a new option to this poll. You can provide basic details or use the what/where/when tool for more structured information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="text">Option Text *</Label>
                <Input
                  id="text"
                  value={formData.text}
                  onChange={(e) => handleInputChange('text', e.target.value)}
                  placeholder="Enter the option text"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Optional description for this option"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* What/Where/When Tool */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                What/Where/When Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="what" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    What
                  </Label>
                  <Input
                    id="what"
                    value={formData.what}
                    onChange={(e) => handleInputChange('what', e.target.value)}
                    placeholder="What will happen?"
                  />
                </div>

                <div>
                  <Label htmlFor="where" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Where
                  </Label>
                  <Input
                    id="where"
                    value={formData.where}
                    onChange={(e) => handleInputChange('where', e.target.value)}
                    placeholder="Where will it happen?"
                  />
                </div>

                <div>
                  <Label htmlFor="when" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    When
                  </Label>
                  <Input
                    id="when"
                    value={formData.when}
                    onChange={(e) => handleInputChange('when', e.target.value)}
                    placeholder="When will it happen?"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.text.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Option'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


















