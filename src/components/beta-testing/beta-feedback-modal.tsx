'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { X, Star, Bug, Lightbulb, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react'
import { toast } from 'sonner'

interface BetaFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  context?: {
    page?: string
    feature?: string
    hangoutId?: string
  }
}

type FeedbackType = 'bug' | 'feature' | 'general' | 'ui' | 'performance'

const feedbackTypes = [
  { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-400' },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-400' },
  { id: 'ui', label: 'UI/UX Feedback', icon: MessageSquare, color: 'text-blue-400' },
  { id: 'performance', label: 'Performance Issue', icon: ThumbsDown, color: 'text-orange-400' },
  { id: 'general', label: 'General Feedback', icon: ThumbsUp, color: 'text-green-400' }
]

export function BetaFeedbackModal({ isOpen, onClose, context }: BetaFeedbackModalProps) {
  const [selectedType, setSelectedType] = useState<FeedbackType>('general')
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      const feedbackData = {
        type: selectedType,
        rating,
        title: title.trim(),
        description: description.trim(),
        stepsToReproduce: steps.trim(),
        context: {
          page: context?.page || window.location.pathname,
          feature: context?.feature,
          hangoutId: context?.hangoutId,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      }

      // TODO: Send to backend API
      console.log('Beta feedback submitted:', feedbackData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Thank you for your feedback!')
      handleClose()
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast.error('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setTitle('')
    setDescription('')
    setSteps('')
    setRating(0)
    setSelectedType('general')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Beta Feedback
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Feedback Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">What type of feedback is this?</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {feedbackTypes.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id as FeedbackType)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedType === type.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mx-auto mb-1 ${type.color}`} />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium mb-3">How would you rate this experience?</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`p-1 transition-colors ${
                    star <= rating ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
                  }`}
                >
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {rating === 0 ? 'Select a rating' : 
               rating === 1 ? 'Very Poor' :
               rating === 2 ? 'Poor' :
               rating === 3 ? 'Average' :
               rating === 4 ? 'Good' : 'Excellent'}
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of your feedback"
              className="w-full"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide detailed feedback..."
              rows={4}
              className="w-full"
            />
          </div>

          {/* Steps to Reproduce (for bugs) */}
          {selectedType === 'bug' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Steps to Reproduce
              </label>
              <Textarea
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                rows={3}
                className="w-full"
              />
            </div>
          )}

          {/* Context Info */}
          {context && (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Context Information</h4>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {context.page && <p>Page: {context.page}</p>}
                {context.feature && <p>Feature: {context.feature}</p>}
                {context.hangoutId && <p>Hangout ID: {context.hangoutId}</p>}
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
