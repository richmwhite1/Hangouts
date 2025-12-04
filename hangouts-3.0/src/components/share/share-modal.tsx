'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ShareCard, getShareCardBlob } from './share-card'
import { Download, Link as LinkIcon, Share2 } from 'lucide-react'
import { toast } from 'sonner'

interface ShareModalProps {
    isOpen: boolean
    onClose: () => void
    hangout: {
        id: string
        title: string
        startTime: string
        location?: string
        image?: string
        creator: {
            name: string
        }
        _count?: {
            participants: number
        }
    }
}

export function ShareModal({ isOpen, onClose, hangout }: ShareModalProps) {
    const [cardType, setCardType] = useState<'story' | 'feed' | 'square'>('feed')
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const handleDownload = async () => {
        const blob = await getShareCardBlob(canvasRef)
        if (!blob) {
            toast.error('Failed to generate share card')
            return
        }

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${hangout.title.replace(/\s+/g, '-')}-share-card.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.success('Share card downloaded!')
    }

    const handleCopyLink = async () => {
        const url = `${window.location.origin}/hangout/${hangout.id}`
        try {
            await navigator.clipboard.writeText(url)
            toast.success('Link copied to clipboard!')
        } catch (error) {
            toast.error('Failed to copy link')
        }
    }

    const handleShare = async () => {
        const blob = await getShareCardBlob(canvasRef)
        if (!blob) {
            toast.error('Failed to generate share card')
            return
        }

        const file = new File([blob], 'share-card.png', { type: 'image/png' })
        const url = `${window.location.origin}/hangout/${hangout.id}`

        if (navigator.share && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    title: hangout.title,
                    text: `Join me for ${hangout.title}!`,
                    url,
                    files: [file]
                })
                toast.success('Shared successfully!')
            } catch (error) {
                // User cancelled or error occurred
                console.error('Share failed:', error)
            }
        } else {
            // Fallback to download
            handleDownload()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-gray-900 border-gray-800">
                <DialogHeader>
                    <DialogTitle className="text-white">Share This Plan</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Card Type Selector */}
                    <div className="flex gap-2">
                        <Button
                            variant={cardType === 'feed' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCardType('feed')}
                            className="flex-1"
                        >
                            Feed (1200x630)
                        </Button>
                        <Button
                            variant={cardType === 'square' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCardType('square')}
                            className="flex-1"
                        >
                            Square (1080x1080)
                        </Button>
                        <Button
                            variant={cardType === 'story' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCardType('story')}
                            className="flex-1"
                        >
                            Story (1080x1920)
                        </Button>
                    </div>

                    {/* Preview */}
                    <div className="bg-gray-950 p-4 rounded-lg">
                        <div ref={canvasRef as any}>
                            <ShareCard
                                title={hangout.title}
                                date={hangout.startTime}
                                location={hangout.location}
                                image={hangout.image}
                                creatorName={hangout.creator.name}
                                participantCount={hangout._count?.participants || 0}
                                type={cardType}
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-3">
                        <Button
                            onClick={handleShare}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                        </Button>
                        <Button
                            onClick={handleDownload}
                            variant="outline"
                            className="border-gray-700"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                        </Button>
                        <Button
                            onClick={handleCopyLink}
                            variant="outline"
                            className="border-gray-700"
                        >
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Copy Link
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
