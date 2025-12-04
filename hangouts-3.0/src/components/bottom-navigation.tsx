"use client"

import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, Compass, Plus, Users, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"

export function BottomNavigation() {
  const pathname = usePathname()
  const { hapticLight, hapticSuccess } = useHapticFeedback()

  const tabs = [
    { id: "today", label: "Today", icon: CalendarIcon, href: "/" },
    { id: "discover", label: "Discover", icon: Compass, href: "/discover" },
    { id: "create", label: "Create", icon: Plus, href: "/create" },
    { id: "friends", label: "Friends", icon: Users, href: "/friends" },
    { id: "profile", label: "Profile", icon: User, href: "/profile" },
  ]

  const getActiveTab = () => {
    if (pathname === "/") return "today"
    if (pathname === "/discover") return "discover"
    if (pathname.startsWith("/events")) return "events"
    if (pathname === "/create" || pathname.startsWith("/create")) return "create"
    if (pathname === "/friends" || pathname.startsWith("/friends")) return "friends"
    if (pathname === "/profile" || pathname.startsWith("/profile")) return "profile"
    return "today"
  }

  const activeTab = getActiveTab()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-planner-cream border-t border-planner-border z-40 pb-safe shadow-planner">
      <div className="flex items-end justify-around px-2 pt-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className="flex-1 flex justify-center min-w-0"
            >
              <button
                className={`
                  flex flex-col items-center justify-center gap-1 px-3 py-2 min-h-[56px] w-full max-w-[80px]
                  transition-all duration-200 ease-out
                  ${isActive
                    ? 'tab-planner active text-planner-navy'
                    : 'text-planner-text-secondary hover:text-planner-text-primary'
                  }
                `}
                onClick={() => {
                  if (isActive) {
                    hapticLight()
                  } else {
                    hapticSuccess()
                  }
                }}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  {tab.id === "friends" && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 px-1 min-w-0 h-4 text-xs"
                    >
                      2
                    </Badge>
                  )}
                </div>
                <span className={`text-xs font-medium text-center leading-tight ${isActive ? 'font-semibold' : ''}`}>
                  {tab.label}
                </span>
              </button>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
