'use client'

import { useRef, useEffect } from 'react'
import { format } from 'date-fns'

interface ShareCardProps {
    title: string
    date: string
    location?: string
    image?: string
    creatorName: string
    participantCount?: number
    type?: 'story' | 'feed' | 'square'
}

export function ShareCard({
    title,
    date,
    location,
    image,
    creatorName,
    participantCount = 0,
    type = 'feed'
}: ShareCardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size based on type
        const dimensions = {
            story: { width: 1080, height: 1920 },
            feed: { width: 1200, height: 630 },
            square: { width: 1080, height: 1080 }
        }

        const { width, height } = dimensions[type]
        canvas.width = width
        canvas.height = height

        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height)
        gradient.addColorStop(0, '#1e3a8a') // blue-900
        gradient.addColorStop(0.5, '#7c3aed') // purple-600
        gradient.addColorStop(1, '#db2777') // pink-600

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)

        // Add image if provided
        if (image) {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
                // Draw image with overlay
                ctx.globalAlpha = 0.3
                ctx.drawImage(img, 0, 0, width, height)
                ctx.globalAlpha = 1.0

                // Add dark overlay for text readability
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
                ctx.fillRect(0, 0, width, height)

                drawContent()
            }
            img.src = image
        } else {
            drawContent()
        }

        function drawContent() {
            if (!ctx) return

            // Title
            ctx.fillStyle = '#ffffff'
            ctx.font = `bold ${type === 'story' ? 80 : 60}px Inter, sans-serif`
            ctx.textAlign = 'center'

            // Word wrap title
            const maxWidth = width * 0.8
            const words = title.split(' ')
            let line = ''
            let y = type === 'story' ? height / 2 - 100 : height / 2 - 50

            for (const word of words) {
                const testLine = line + word + ' '
                const metrics = ctx.measureText(testLine)
                if (metrics.width > maxWidth && line !== '') {
                    ctx.fillText(line, width / 2, y)
                    line = word + ' '
                    y += type === 'story' ? 90 : 70
                } else {
                    line = testLine
                }
            }
            ctx.fillText(line, width / 2, y)

            // Date
            y += type === 'story' ? 120 : 80
            ctx.font = `${type === 'story' ? 40 : 32}px Inter, sans-serif`
            ctx.fillStyle = '#e5e7eb'
            const formattedDate = format(new Date(date), 'EEEE, MMMM d • h:mm a')
            ctx.fillText(formattedDate, width / 2, y)

            // Location
            if (location) {
                y += type === 'story' ? 60 : 50
                ctx.fillText(`📍 ${location}`, width / 2, y)
            }

            // Creator info
            y += type === 'story' ? 100 : 80
            ctx.font = `${type === 'story' ? 36 : 28}px Inter, sans-serif`
            ctx.fillStyle = '#d1d5db'
            ctx.fillText(`${creatorName} invited you to join!`, width / 2, y)

            // Participant count
            if (participantCount > 0) {
                y += type === 'story' ? 60 : 50
                ctx.fillText(`${participantCount} ${participantCount === 1 ? 'person' : 'people'} going`, width / 2, y)
            }

            // Branding
            const brandingY = type === 'story' ? height - 100 : height - 60
            ctx.font = `${type === 'story' ? 32 : 24}px Inter, sans-serif`
            ctx.fillStyle = '#9ca3af'
            ctx.fillText('Made with Plans', width / 2, brandingY)
        }
    }, [title, date, location, image, creatorName, participantCount, type])

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-auto rounded-lg shadow-2xl"
            style={{ maxWidth: '100%', height: 'auto' }}
        />
    )
}

// Export function to get canvas as blob for sharing
export async function getShareCardBlob(
    canvasRef: React.RefObject<HTMLCanvasElement>
): Promise<Blob | null> {
    return new Promise((resolve) => {
        const canvas = canvasRef.current
        if (!canvas) {
            resolve(null)
            return
        }

        canvas.toBlob((blob) => {
            resolve(blob)
        }, 'image/png')
    })
}
