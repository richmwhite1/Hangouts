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
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className={`flex flex-col items-end gap-3 transition-all duration-300 ${
          isExpanded ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 pointer-events-none'
        }`}>
          {/* Feedback Options */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => handleFeedbackClick('bug')}
              size="sm"
              variant="outline"
              className="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all"
            >
              <Bug className="h-4 w-4 mr-2 text-red-500" />
              Report Bug
            </Button>
            
            <Button
              onClick={() => handleFeedbackClick('feature')}
              size="sm"
              variant="outline"
              className="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all"
            >
              <Lightbulb className="h-4 w-4 mr-2 text-yellow-500" />
              Suggest Feature
            </Button>
            
            <Button
              onClick={() => handleFeedbackClick('general')}
              size="sm"
              variant="outline"
              className="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all"
            >
              <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
              General Feedback
            </Button>
          </div>
        </div>

        {/* Main FAB */}
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ${
            isExpanded 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isExpanded ? (
            <X className="h-6 w-6" />
          ) : (
            <div className="relative">
              <Star className="h-6 w-6" />
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                β
              </Badge>
            </div>
          )}
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
