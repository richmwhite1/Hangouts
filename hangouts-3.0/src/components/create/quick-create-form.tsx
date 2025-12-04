'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Sparkles, Coffee, Utensils, Film, Beer, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function QuickCreateForm() {
    const router = useRouter()
    const [input, setInput] = useState('')
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    const templates = [
        { label: 'Coffee', icon: Coffee, text: 'Coffee with ' },
        { label: 'Dinner', icon: Utensils, text: 'Dinner at ' },
        { label: 'Drinks', icon: Beer, text: 'Drinks with ' },
        { label: 'Movie', icon: Film, text: 'Movie night: ' },
    ]

    const handleTemplateClick = (text: string) => {
        setInput(text)
        // Focus textarea?
    }

    const handleSubmit = async () => {
        if (!input.trim()) return

        try {
            setIsAnalyzing(true)

            const response = await fetch('/api/parse-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                })
            })

            const result = await response.json()

            if (result.success) {
                const { title, date, time, location, description } = result.data

                // Construct query params
                const params = new URLSearchParams()
                if (title) params.set('title', title)
                if (date) params.set('date', date)
                if (time) params.set('time', time)
                if (location) params.set('location', location)
                if (description) params.set('description', description)

                // Redirect to full create form
                router.push(`/create/new?${params.toString()}`)
            } else {
                // Fallback
                router.push(`/create/new?title=${encodeURIComponent(input)}`)
            }
        } catch (error) {
            console.error('Error parsing plan:', error)
            toast.error('Failed to analyze plan. Opening standard form.')
            router.push(`/create/new?title=${encodeURIComponent(input)}`)
        } finally {
            setIsAnalyzing(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-4">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-white mb-2">What's the plan?</h1>
                <p className="text-gray-400">Just type it out naturally. We'll handle the details.</p>
            </div>

            <Card className="p-6 bg-gray-900 border-gray-800 shadow-xl">
                <div className="space-y-6">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="e.g. Dinner with Sarah tomorrow at 7pm at Mario's..."
                        className="min-h-[120px] text-lg bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 resize-none focus:ring-blue-500"
                        autoFocus
                    />

                    <div className="flex flex-wrap gap-2">
                        {templates.map((template) => {
                            const Icon = template.icon
                            return (
                                <Button
                                    key={template.label}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleTemplateClick(template.text)}
                                    className="border-gray-700 hover:bg-gray-800 text-gray-300"
                                >
                                    <Icon className="w-4 h-4 mr-2" />
                                    {template.label}
                                </Button>
                            )
                        })}
                    </div>

                    <div className="flex justify-end">
                        <Button
                            size="lg"
                            onClick={handleSubmit}
                            disabled={!input.trim() || isAnalyzing}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/20"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Create Plan
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="mt-8 text-center">
                <Button variant="link" className="text-gray-500 hover:text-white" onClick={() => router.push('/create/new')}>
                    Skip to advanced mode <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        </div>
    )
}
