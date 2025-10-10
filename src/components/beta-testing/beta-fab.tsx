'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, X, Star, Bug, Lightbulb } from 'lucide-react'
import { BetaFeedbackModal } from './beta-feedback-modal'

interface BetaFabProps {
  context?: {
    page?: string
    feature?: string
    hangoutId?: string
  }
}

export function BetaFab({ context }: BetaFabProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [, setFeedbackType] = useState<'general' | 'bug' | 'feature'>('general')

  const handleFeedbackClick = (type: 'general' | 'bug' | 'feature') => {
    setFeedbackType(type)
    setIsModalOpen(true)
    setIsExpanded(false)
  }

  return (
    <>
      {/* Floating Action Button - Top Left */}
      <div className="fixed top-4 left-4 z-40">
        {/* Main FAB */}
        <Button
          onClick={() => setIsModalOpen(true)}
          className="w-8 h-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-blue-500 hover:bg-blue-600 p-0"
          title="Beta Feedback"
        >
          <div className="relative">
            <Star className="h-4 w-4" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-3 w-3 p-0 flex items-center justify-center text-xs"
            >
              β
            </Badge>
          </div>
        </Button>
      </div>

      {/* Feedback Modal */}
        <BetaFeedbackModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          context={context || {}}
        />
    </>
  )
}
