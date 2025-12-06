"use client"

import { useHapticFeedback } from "@/hooks/use-haptic-feedback"

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
            <div className="relative bg-planner-tab rounded-lg p-1 flex items-center shadow-inner">
                {/* Sliding Background Indicator */}
                <div
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-md shadow-sm transition-all duration-300 ease-out ${value === 'today' ? 'left-1' : 'left-[calc(50%+0px)]'
                        }`}
                />

                <button
                    className={`
                        relative z-10 px-6 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 w-24
                        ${value === 'today' ? 'text-black' : 'text-planner-text-secondary hover:text-planner-text-primary'}
                    `}
                    onClick={() => handleChange('today')}
                    type="button"
                >
                    Today
                </button>
                <button
                    className={`
                        relative z-10 px-6 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 w-24
                        ${value === 'month' ? 'text-black' : 'text-planner-text-secondary hover:text-planner-text-primary'}
                    `}
                    onClick={() => handleChange('month')}
                    type="button"
                >
                    Month
                </button>
            </div>
        </div>
    )
}
