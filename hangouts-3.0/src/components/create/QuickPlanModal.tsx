'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MobileModal } from '@/components/ui/mobile-modal'
import { Calendar, Clock, MapPin, Users, Zap, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@clerk/nextjs'

interface QuickPlanModalProps {
    isOpen: boolean
    onClose: () => void
}

export function QuickPlanModal({ isOpen, onClose }: QuickPlanModalProps) {
    const router = useRouter()
    const { getToken } = useAuth()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)

    // Form State
    const [title, setTitle] = useState('')
    const [time, setTime] = useState('')
    const [location, setLocation] = useState('')
    const [selectedFriends, setSelectedFriends] = useState<string[]>([])

    // Smart suggestions
    const timeSuggestions = [
        { label: 'Tonight 8pm', value: 'tonight_8pm' },
        { label: 'Tomorrow Lunch', value: 'tomorrow_12pm' },
        { label: 'Friday Night', value: 'friday_8pm' },
        { label: 'Saturday Brunch', value: 'saturday_11am' }
    ]

    const activitySuggestions = [
        'Coffee', 'Drinks', 'Dinner', 'Movie', 'Game Night', 'Hike'
    ]

    const handleQuickCreate = async () => {
        if (!title) {
            toast.error('What are we doing?')
            return
        }

        setLoading(true)
        try {
            // Create the hangout
            const token = await getToken()
            const response = await fetch('/api/hangouts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    description: 'Quick plan created via Fast Track ⚡️',
                    location: location || 'TBD',
                    type: 'quick_plan',
                    privacyLevel: 'FRIENDS_ONLY',
                    options: [
                        {
                            title: title,
                            dateTime: calculateDateTime(time),
                            location: location || 'TBD'
                        }
                    ],
                    participants: selectedFriends
                })
            })

            if (response.ok) {
                const data = await response.json()
                toast.success('Hangout created! 🚀')
                // Fix: API returns { success: true, data: { id: ... } }
                const hangoutId = data.data?.id || data.id
                router.push(`/hangout/${hangoutId}`)
                onClose()
            } else {
                throw new Error('Failed to create')
            }
        } catch (error) {
            console.error(error)
            toast.error('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const calculateDateTime = (timeValue: string) => {
        const now = new Date()
        const target = new Date()

        if (timeValue === 'tonight_8pm') {
            target.setHours(20, 0, 0, 0)
            if (now.getHours() >= 20) target.setDate(target.getDate() + 1)
        } else if (timeValue === 'tomorrow_12pm') {
            target.setDate(target.getDate() + 1)
            target.setHours(12, 0, 0, 0)
        } else if (timeValue === 'friday_8pm') {
            const day = target.getDay()
            const diff = 5 - day + (day >= 5 ? 7 : 0)
            target.setDate(target.getDate() + diff)
            target.setHours(20, 0, 0, 0)
        } else if (timeValue === 'saturday_11am') {
            const day = target.getDay()
            const diff = 6 - day + (day >= 6 ? 7 : 0)
            target.setDate(target.getDate() + diff)
            target.setHours(11, 0, 0, 0)
        } else {
            // Default to tomorrow 7pm if custom
            target.setDate(target.getDate() + 1)
            target.setHours(19, 0, 0, 0)
        }

        return target.toISOString()
    }

    return (
        <MobileModal isOpen={isOpen} onClose={onClose} title="⚡️ Quick Plan">
            <div className="space-y-6 pt-4">
                {/* Step 1: What & Where */}
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-500 mb-1.5 block">What's the vibe?</label>
                        <Input
                            placeholder="e.g. Tacos & Margs"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-lg font-semibold"
                            autoFocus
                        />
                        <div className="flex gap-2 mt-2 overflow-x-auto pb-2 no-scrollbar">
                            {activitySuggestions.map(activity => (
                                <button
                                    key={activity}
                                    onClick={() => setTitle(activity)}
                                    className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm whitespace-nowrap hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                >
                                    {activity}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-500 mb-1.5 block">When?</label>
                        <div className="grid grid-cols-2 gap-2">
                            {timeSuggestions.map((suggestion) => (
                                <button
                                    key={suggestion.value}
                                    onClick={() => setTime(suggestion.value)}
                                    className={`p-3 rounded-lg border text-left transition-all ${time === suggestion.value
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="font-medium text-sm">{suggestion.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <Button
                        className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/20"
                        onClick={handleQuickCreate}
                        disabled={loading || !title}
                    >
                        {loading ? 'Creating...' : 'Send It 🚀'}
                    </Button>

                    <button
                        onClick={() => {
                            onClose()
                            router.push('/create')
                        }}
                        className="w-full mt-3 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 py-2"
                    >
                        I need more options (Polls, etc.)
                    </button>
                </div>
            </div>
        </MobileModal>
    )
}
