'use client'

import { useState } from 'react'

interface FeedToggleProps {
  value: 'upcoming' | 'past'
  onChange: (value: 'upcoming' | 'past') => void
}

export function FeedToggle({ value, onChange }: FeedToggleProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4 px-4">
      <button
        onClick={() => onChange('upcoming')}
        className={`
          flex-1 max-w-[140px] px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-200
          ${value === 'upcoming'
            ? 'bg-planner-navy text-white shadow-md'
            : 'bg-planner-tab text-planner-text-muted hover:bg-planner-border'
          }
        `}
      >
        Upcoming
      </button>
      <button
        onClick={() => onChange('past')}
        className={`
          flex-1 max-w-[140px] px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-200
          ${value === 'past'
            ? 'bg-planner-navy text-white shadow-md'
            : 'bg-planner-tab text-planner-text-muted hover:bg-planner-border'
          }
        `}
      >
        Past
      </button>
    </div>
  )
}
