'use client'

import { useState } from 'react'
import { useHapticFeedback } from '@/hooks/use-haptic-feedback'

interface ViewToggleProps {
    value: 'today' | 'month'
    onChange: (value: 'today' | 'month') => void
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
    const { hapticLight } = useHapticFeedback()

    const handleChange = (newValue: 'today' | 'month') => {
        if (newValue !== value) {
            hapticLight()
            onChange(newValue)
        }
    }

    return (
        <div className="flex justify-center mb-6">
            <div className="segmented-control">
                <button
                    className={`segmented-control-item ${value === 'today' ? 'active' : ''}`}
                    onClick={() => handleChange('today')}
                    type="button"
                >
                    Today
                </button>
                <button
                    className={`segmented-control-item ${value === 'month' ? 'active' : ''}`}
                    onClick={() => handleChange('month')}
                    type="button"
                >
                    Month
                </button>
            </div>
        </div>
    )
}
