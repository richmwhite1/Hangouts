'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Share2, X } from 'lucide-react'
import { Confetti } from './confetti'

interface MilestoneCelebrationProps {
    isOpen: boolean
    onClose: () => void
    milestone: {
        type: 'first_plan' | 'plans_5' | 'plans_10' | 'plans_25' | 'large_plan' | 'full_participation'
        count?: number
    }
    onShare?: () => void
}

const milestoneMessages = {
    first_plan: {
        emoji: '🎉',
        title: 'Your First Plan!',
        message: "You've created your first plan. You're bringing people together!"
    },
    plans_5: {
        emoji: '🌟',
        title: '5 Plans Created!',
        message: "You're on a roll! Keep making memories with friends."
    },
    plans_10: {
        emoji: '🔥',
        title: '10 Plans Made!',
        message: "You're a planning pro! Your friends love hanging out with you."
    },
    plans_25: {
        emoji: '🏆',
        title: '25 Plans and Counting!',
        message: "You're a legend! You've brought people together 25 times."
    },
    large_plan: {
        emoji: '👥',
        title: 'Big Group Plan!',
        message: "Wow! You organized a plan with 10+ people. That's impressive!"
    },
    full_participation: {
        emoji: '✨',
        title: '100% Participation!',
        message: "Everyone voted! You know how to get people engaged."
    }
}

export function MilestoneCelebration({
    isOpen,
    onClose,
    milestone,
    onShare
}: MilestoneCelebrationProps) {
    const [showConfetti, setShowConfetti] = useState(false)
    const message = milestoneMessages[milestone.type]

    useEffect(() => {
        if (isOpen) {
            setShowConfetti(true)
            // Auto-hide confetti after 5 seconds
            const timer = setTimeout(() => {
                setShowConfetti(false)
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    return (
        <>
            {showConfetti && <Confetti />}

            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-md bg-gradient-to-br from-blue-900 to-purple-900 border-none text-white">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </button>

                    <div className="text-center space-y-6 py-6">
                        {/* Emoji */}
                        <div className="text-8xl animate-bounce">
                            {message.emoji}
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl font-bold">
                            {message.title}
                        </h2>

                        {/* Message */}
                        <p className="text-lg text-gray-200">
                            {message.message}
                        </p>

                        {/* Count Badge (if applicable) */}
                        {milestone.count && (
                            <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-6 py-2">
                                <span className="text-2xl font-bold">{milestone.count}</span>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-3 pt-4">
                            {onShare && (
                                <Button
                                    onClick={() => {
                                        onShare()
                                        onClose()
                                    }}
                                    className="bg-white text-purple-900 hover:bg-gray-100"
                                    size="lg"
                                >
                                    <Share2 className="w-5 h-5 mr-2" />
                                    Share Your Achievement
                                </Button>
                            )}

                            <Button
                                onClick={onClose}
                                variant="ghost"
                                className="text-white hover:bg-white/10"
                            >
                                Maybe Later
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
