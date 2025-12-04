'use client'

import { useEffect, useRef } from 'react'

interface ConfettiProps {
    duration?: number
    particleCount?: number
}

interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    rotation: number
    rotationSpeed: number
    color: string
    size: number
}

export function Confetti({ duration = 5000, particleCount = 150 }: ConfettiProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size
        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener('resize', resize)

        // Confetti colors
        const colors = [
            '#60a5fa', // blue-400
            '#a78bfa', // purple-400
            '#f472b6', // pink-400
            '#fbbf24', // yellow-400
            '#34d399', // green-400
            '#fb923c', // orange-400
        ]

        // Create particles
        const particles: Particle[] = []
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: -20 - Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 2,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4
            })
        }

        // Animation
        let animationId: number
        const startTime = Date.now()

        const animate = () => {
            const elapsed = Date.now() - startTime
            if (elapsed > duration) {
                window.removeEventListener('resize', resize)
                return
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height)

            particles.forEach((particle) => {
                // Update position
                particle.x += particle.vx
                particle.y += particle.vy
                particle.rotation += particle.rotationSpeed

                // Apply gravity
                particle.vy += 0.1

                // Wrap around horizontally
                if (particle.x < -20) particle.x = canvas.width + 20
                if (particle.x > canvas.width + 20) particle.x = -20

                // Draw particle
                ctx.save()
                ctx.translate(particle.x, particle.y)
                ctx.rotate((particle.rotation * Math.PI) / 180)
                ctx.fillStyle = particle.color
                ctx.fillRect(
                    -particle.size / 2,
                    -particle.size / 2,
                    particle.size,
                    particle.size
                )
                ctx.restore()
            })

            animationId = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            cancelAnimationFrame(animationId)
            window.removeEventListener('resize', resize)
        }
    }, [duration, particleCount])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-50"
            style={{ width: '100%', height: '100%' }}
        />
    )
}
