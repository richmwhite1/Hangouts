"use client"

import { Calendar as CalendarIcon, Plus, User, Compass, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"

export function BottomNavigation() {
  const pathname = usePathname()
  const { hapticLight, hapticSuccess } = useHapticFeedback()

  const tabs = [
    { id: "plans", label: "Plans", icon: CalendarIcon, href: "/" },
    { id: "discover", label: "Discover", icon: Compass, href: "/discover" },
    { id: "create", label: "Hangout", icon: Plus, href: "/create" },
    { id: "friends", label: "Friends", icon: Users, href: "/friends" },
    { id: "profile", label: "Profile", icon: User, href: "/profile" },
  ]

  const getActiveTab = () => {
    if (pathname === "/") return "plans"
    if (pathname === "/discover" || pathname.startsWith("/discover")) return "discover"
    if (pathname === "/events" || pathname.startsWith("/events")) return "events"
    if (pathname === "/create" || pathname.startsWith("/create")) return "create"
    if (pathname === "/friends" || pathname.startsWith("/friends")) return "friends"
    if (pathname === "/profile" || pathname.startsWith("/profile")) return "profile"
    return "plans"
  }

  const activeTab = getActiveTab()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      {/* Tab Container - mimics the folder/rolodex look */}
      <div className="relative bg-card border-t border-planner-border shadow-planner-lg rounded-t-2xl mx-2 mb-2 overflow-hidden">

        {/* Background texture/layer for depth */}
        <div className="absolute inset-0 bg-planner-cream opacity-50 pointer-events-none" />

        <div className="relative flex items-end justify-around pt-3 pb-2 px-1 min-h-[64px]">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <Link
                key={tab.id}
                href={tab.href}
                prefetch={false}
                className={`flex-1 flex justify-center min-w-0 relative group`}
                onClick={() => {
                  if (isActive) {
                    hapticLight()
                  } else {
                    hapticSuccess()
                  }
                }}
              >
                {/* Active Tab Indicator / "Card" Shape */}
                {isActive && (
                  <div className="absolute inset-x-1 bottom-0 top-0 bg-planner-navy/5 rounded-t-lg -z-10 transform scale-105 transition-transform duration-200" />
                )}

                <button
                  className={`
                    flex flex-col items-center justify-center gap-2 py-3 px-2 w-full min-h-[64px]
                    transition-all duration-200 ease-out rounded-t-lg
                    ${isActive
                      ? 'text-planner-navy transform -translate-y-1'
                      : 'text-planner-text-muted hover:text-planner-text-secondary hover:bg-planner-tab/50'
                    }
                  `}
                >
                  <div className={`
                    relative flex items-center justify-center p-2 rounded-full transition-all duration-200 min-h-[44px] min-w-[44px]
                    ${isActive ? 'bg-planner-navy text-white shadow-planner-md' : 'bg-transparent'}
                  `}>
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  </div>

                  <span className={`
                    text-[10px] font-medium uppercase tracking-wider leading-none
                    ${isActive ? 'text-planner-navy font-bold' : 'text-planner-text-muted'}
                  `}>
                    {tab.label}
                  </span>
                </button>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
