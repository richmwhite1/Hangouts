'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MobileModal } from '@/components/ui/mobile-modal'
import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface SmartPasteModalProps {
    isOpen: boolean
    onClose: () => void
    onParsed: (data: { title?: string; location?: string; dateTime?: string; description?: string }) => void
}

export function SmartPasteModal({ isOpen, onClose, onParsed }: SmartPasteModalProps) {
    const [text, setText] = useState('')
    const [isParsing, setIsParsing] = useState(false)

    const handleParse = async () => {
        if (!text.trim()) {
            toast.error('Please paste some text first')
            return
        }

        setIsParsing(true)

        // Simulate "AI" processing time for effect
        await new Promise(resolve => setTimeout(resolve, 800))

        try {
            const parsedData = parseEventText(text)
            onParsed(parsedData)
            onClose()
            toast.success('Magic! ✨ Event details extracted.')
            setText('')
        } catch (error) {
            console.error('Parsing error:', error)
            toast.error('Could not extract details. Try manual entry.')
        } finally {
            setIsParsing(false)
        }
    }

    // Simple heuristic parser (Regex-based)
    const parseEventText = (input: string) => {
        const lines = input.split('\n').map(l => l.trim()).filter(l => l)
        let title = ''
        let location = ''
        let dateTime = ''
        let description = input

        // Heuristic 1: Title is often the first line
        if (lines.length > 0) {
            title = lines[0] || ''
        }

        // Heuristic 2: Look for keywords
        const locationRegex = /(?:at|@|loc|location):\s*(.*)/i
        const timeRegex = /(?:time|when|date):\s*(.*)/i

        // Scan lines for structured data
        lines.forEach(line => {
            const locMatch = line.match(locationRegex)
            if (locMatch) location = locMatch[1] || ''

            const timeMatch = line.match(timeRegex)
            if (timeMatch) {
                // Try to parse date - this is very basic
                // In a real app, use a library like chrono-node
                dateTime = timeMatch[1] || ''
            }
        })

        // If no explicit location found, look for "at [Something]" in the text
        if (!location) {
            const atMatch = input.match(/\bat\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/)
            if (atMatch) location = atMatch[1] || ''
        }

        // Basic date extraction if not found explicitly
        if (!dateTime) {
            // Look for time patterns like "7pm", "8:00 AM"
            const timePattern = /\b((?:1[0-2]|0?[1-9])(?::[0-5][0-9])?\s*(?:am|pm|AM|PM))\b/
            const timeMatch = input.match(timePattern)

            // Look for date patterns like "Dec 5", "12/05"
            const datePattern = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?\b/i
            const dateMatch = input.match(datePattern)

            if (timeMatch || dateMatch) {
                // Construct a rough string, actual Date object creation would happen in parent or need more robust parsing
                dateTime = `${dateMatch ? dateMatch[0] : 'Tomorrow'} ${timeMatch ? timeMatch[0] : '7:00 PM'}`
            }
        }

        return {
            title: title.substring(0, 50) || '',
            location: location || '',
            dateTime: dateTime || '',
            description: description || ''
        }
    }

    return (
        <MobileModal isOpen={isOpen} onClose={onClose} title="Smart Paste ✨">
            <div className="space-y-4 pt-2">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                    <p>Paste an invite text, email, or message below. We'll extract the details for you!</p>
                </div>

                <Textarea
                    placeholder="e.g. 'Birthday Dinner at Luig's on Friday at 7pm...'"
                    className="min-h-[150px] text-base"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />

                <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    onClick={handleParse}
                    disabled={isParsing || !text.trim()}
                >
                    {isParsing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Magic Fill
                        </>
                    )}
                </Button>
            </div>
        </MobileModal>
    )
}
