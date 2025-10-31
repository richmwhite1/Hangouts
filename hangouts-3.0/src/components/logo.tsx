"use client"

import Link from "next/link"

// Brand colors: white icon on dark header, orange checkmark
const WHITE = "#FFFFFF"
const ORANGE = "#D25A3C"

export function Logo() {
  return (
    <Link href="/" className="flex items-center space-x-3 select-none" aria-label="Plans home">
      {/* Calendar icon with checkmark */}
      <svg
        width="36"
        height="36"
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Calendar frame */}
        <rect x="8" y="12" width="48" height="40" rx="6" ry="6" fill="none" stroke={WHITE} strokeWidth="4" />
        {/* Binding rings */}
        <rect x="18" y="8" width="4" height="8" rx="2" fill={WHITE} />
        <rect x="42" y="8" width="4" height="8" rx="2" fill={WHITE} />
        {/* Header bar */}
        <line x1="8" y1="20" x2="56" y2="20" stroke={WHITE} strokeWidth="4" />
        {/* Grid dots (simplified squares) */}
        {[
          [16, 26], [26, 26], [36, 26], [46, 26],
          [16, 36], [26, 36], [36, 36], [46, 36],
          [16, 46], [26, 46], [36, 46], [46, 46],
        ].map(([x, y], i) => (
          <rect key={i} x={x - 3} y={y - 3} width="6" height="6" rx="1.5" fill={WHITE} />
        ))}
        {/* Checkmark */}
        <path d="M24 36 l6 6 l14 -14" fill="none" stroke={ORANGE} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {/* Wordmark */}
      <span className="font-extrabold tracking-tight uppercase" style={{ color: WHITE, letterSpacing: "0.02em" }}>
        PLANS
      </span>
    </Link>
  )
}


