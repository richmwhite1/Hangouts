"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import { onboardingSteps, getMobileOnboardingSteps, type OnboardingStep } from '@/lib/onboarding-steps'

interface WelcomeTourProps {
  onComplete: () => void
  onSkip: () => void
  isMobile?: boolean
}

export function WelcomeTour({ onComplete, onSkip, isMobile = false }: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [showDontShowAgain, setShowDontShowAgain] = useState(false)
  
  const steps = isMobile ? getMobileOnboardingSteps() : onboardingSteps
  const step = steps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1

  // Calculate position of spotlight and tooltip
  const calculatePosition = useCallback(() => {
    if (!step || step.position === 'center') {
      return
    }

    const element = document.querySelector(step.targetSelector)
    if (!element) {
      console.warn(`Element not found for selector: ${step.targetSelector}`)
      return
    }

    const rect = element.getBoundingClientRect()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

    setPosition({
      top: rect.top + scrollTop,
      left: rect.left + scrollLeft
    })
  }, [step])

  useEffect(() => {
    calculatePosition()
    window.addEventListener('resize', calculatePosition)
    window.addEventListener('scroll', calculatePosition)

    return () => {
      window.removeEventListener('resize', calculatePosition)
      window.removeEventListener('scroll', calculatePosition)
    }
  }, [calculatePosition])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip()
      } else if (e.key === 'ArrowRight' && !isLastStep) {
        handleNext()
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        handlePrevious()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStep, isFirstStep, isLastStep])

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    if (showDontShowAgain) {
      localStorage.setItem('plans-skip-onboarding', 'true')
    }
    onSkip()
  }

  const handleComplete = async () => {
    // Mark onboarding as complete in the database
    try {
      await fetch('/api/profile/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true })
      })
    } catch (error) {
      console.error('Failed to mark onboarding as complete:', error)
    }
    onComplete()
  }

  const getTooltipPosition = () => {
    if (step.position === 'center') {
      return 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
    }

    // For non-center positions, calculate based on target element
    const baseClasses = 'fixed'
    switch (step.position) {
      case 'bottom':
        return `${baseClasses} top-[${position.top + 60}px] left-[${position.left}px]`
      case 'top':
        return `${baseClasses} bottom-[${window.innerHeight - position.top + 10}px] left-[${position.left}px]`
      case 'left':
        return `${baseClasses} top-[${position.top}px] right-[${window.innerWidth - position.left + 10}px]`
      case 'right':
        return `${baseClasses} top-[${position.top}px] left-[${position.left + 60}px]`
      default:
        return `${baseClasses} top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`
    }
  }

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Spotlight effect for target element */}
      {step.position !== 'center' && (
        <div
          className="absolute rounded-lg ring-4 ring-blue-500/50 ring-offset-4 ring-offset-black/0 transition-all duration-300 pointer-events-none"
          style={{
            top: position.top - 8,
            left: position.left - 8,
            width: '100px',
            height: '50px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)'
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className={`${
          step.position === 'center'
            ? 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
            : 'fixed'
        } max-w-md w-full mx-4 z-[10000]`}
        style={
          step.position !== 'center'
            ? {
                top: step.position === 'bottom' ? position.top + 60 : step.position === 'top' ? position.top - 200 : position.top,
                left: step.position === 'right' ? position.left + 100 : step.position === 'left' ? position.left - 420 : Math.max(16, Math.min(position.left, window.innerWidth - 420))
              }
            : undefined
        }
      >
        <div className="bg-gray-900 rounded-xl p-6 shadow-2xl border border-purple-500/30">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1">{step.title}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span>•</span>
                <span>Press ESC to skip</span>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-800"
              aria-label="Skip tour"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Description */}
          <p className="text-gray-300 mb-6 leading-relaxed">
            {step.description}
          </p>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>Progress</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-purple-500'
                    : index < currentStep
                    ? 'w-2 bg-purple-500/50'
                    : 'w-2 bg-gray-700'
                }`}
                aria-label={`Step ${index + 1}${index === currentStep ? ' (current)' : index < currentStep ? ' (completed)' : ' (upcoming)'}`}
              />
            ))}
          </div>

          {/* Don't show again checkbox (only on first step) */}
          {isFirstStep && (
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="dont-show-again"
                checked={showDontShowAgain}
                onChange={(e) => setShowDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="dont-show-again" className="text-sm text-muted-foreground cursor-pointer">
                Don't show this again
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="gap-2 text-gray-400 hover:text-white border-gray-700 hover:border-gray-600"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-xs text-gray-500 hover:text-gray-400"
            >
              Skip Tour
            </Button>

            <Button
              onClick={handleNext}
              className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              {isLastStep ? 'Get Started' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

