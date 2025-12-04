'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Sparkles, Users, Zap } from 'lucide-react'

interface OnboardingFlowProps {
    isOpen: boolean
    onComplete: () => void
    onSkip: () => void
}

export function OnboardingFlow({ isOpen, onComplete, onSkip }: OnboardingFlowProps) {
    const [step, setStep] = useState(0)
    const [planInput, setPlanInput] = useState('')

    const steps = [
        {
            title: 'Welcome to Plans!',
            description: 'Make plans that actually happen.',
            icon: Sparkles,
            content: (
                <div className="text-center space-y-6">
                    <div className="text-6xl">🎉</div>
                    <p className="text-gray-400">
                        Stop the endless back-and-forth in group chats. Plans makes decisions for you.
                    </p>
                </div>
            )
        },
        {
            title: 'Create Your First Plan',
            description: 'Just type what you want to do',
            icon: Zap,
            content: (
                <div className="space-y-4">
                    <p className="text-gray-400 text-center">
                        Try typing something like:
                    </p>
                    <div className="bg-gray-800 rounded-lg p-4 text-center text-sm text-gray-300">
                        "Coffee tomorrow at 10am"
                    </div>
                    <Input
                        placeholder="What are you planning?"
                        value={planInput}
                        onChange={(e) => setPlanInput(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                    />
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPlanInput('Coffee tomorrow 10am')}
                            className="flex-1 border-gray-700"
                        >
                            ☕ Coffee
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPlanInput('Dinner this Friday 7pm')}
                            className="flex-1 border-gray-700"
                        >
                            🍽️ Dinner
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPlanInput('Movie this weekend')}
                            className="flex-1 border-gray-700"
                        >
                            🎬 Movie
                        </Button>
                    </div>
                </div>
            )
        },
        {
            title: 'Invite Your Friends',
            description: 'Plans are better together',
            icon: Users,
            content: (
                <div className="text-center space-y-6">
                    <div className="text-6xl">👥</div>
                    <p className="text-gray-400">
                        Invite friends to join your plans. They'll get notified and can vote on options.
                    </p>
                    <div className="bg-blue-950/30 border border-blue-500/50 rounded-lg p-4">
                        <p className="text-sm text-blue-300">
                            💡 Tip: The more friends you invite, the easier it is to make plans!
                        </p>
                    </div>
                </div>
            )
        }
    ]

    const currentStep = steps[step]
    const Icon = currentStep.icon

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1)
        } else {
            onComplete()
        }
    }

    const handleSkip = () => {
        onSkip()
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleSkip}>
            <DialogContent className="max-w-lg bg-gray-900 border-gray-800 text-white">
                <div className="space-y-6 py-4">
                    {/* Progress Dots */}
                    <div className="flex justify-center gap-2">
                        {steps.map((_, index) => (
                            <div
                                key={index}
                                className={`h-2 rounded-full transition-all ${index === step
                                        ? 'w-8 bg-blue-500'
                                        : index < step
                                            ? 'w-2 bg-blue-700'
                                            : 'w-2 bg-gray-700'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-full p-4">
                            <Icon className="w-8 h-8 text-white" />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2">{currentStep.title}</h2>
                        <p className="text-gray-400">{currentStep.description}</p>
                    </div>

                    {/* Content */}
                    <div className="min-h-[200px]">
                        {currentStep.content}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            onClick={handleSkip}
                            variant="ghost"
                            className="flex-1 text-gray-400 hover:text-white"
                        >
                            Skip
                        </Button>
                        <Button
                            onClick={handleNext}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            disabled={step === 1 && !planInput}
                        >
                            {step === steps.length - 1 ? "Get Started" : "Next"}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
