"use client"

import Link from "next/link"

export function Logo() {
  return (
    <Link 
      href="/" 
      className="flex items-center space-x-3 select-none" 
      aria-label="Plans home"
    >
      {/* Calendar icon with checkmark */}
      <svg
        width="36"
        height="36"
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="flex-shrink-0 text-white"
      >
        {/* Calendar frame */}
        <rect x="8" y="12" width="48" height="40" rx="6" ry="6" fill="none" stroke="currentColor" strokeWidth="4" />
        {/* Binding rings */}
        <rect x="18" y="8" width="4" height="8" rx="2" fill="currentColor" />
        <rect x="42" y="8" width="4" height="8" rx="2" fill="currentColor" />
        {/* Header bar */}
        <line x1="8" y1="20" x2="56" y2="20" stroke="currentColor" strokeWidth="4" />
        {/* Grid dots (simplified squares) - Calendar dates */}
        <rect x="13" y="23" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="23" y="23" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="33" y="23" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="43" y="23" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="13" y="33" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="23" y="33" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="33" y="33" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="43" y="33" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="13" y="43" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="23" y="43" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="33" y="43" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="43" y="43" width="6" height="6" rx="1.5" fill="currentColor" />
        {/* Checkmark overlay */}
        <path d="M24 36 l6 6 l14 -14" fill="none" stroke="#D25A3C" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {/* Wordmark */}
      <span className="font-extrabold text-white tracking-tight uppercase whitespace-nowrap">
        PLANS
      </span>
    </Link>
  )
}


