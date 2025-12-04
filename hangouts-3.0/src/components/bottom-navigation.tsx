"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Home, Compass, Calendar, Plus, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
export function BottomNavigation() {
  const pathname = usePathname()
  const { hapticLight, hapticSuccess } = useHapticFeedback()

  const tabs = [
    { id: "home", label: "Home", icon: Home, href: "/" },
    { id: "discover", label: "Discover", icon: Compass, href: "/discover" },
    { id: "create", label: "Create", icon: Plus, href: "/create" },
    { id: "events", label: "Events", icon: Calendar, href: "/events" },
    { id: "profile", label: "Profile", icon: User, href: "/profile" },
  ]

  const getActiveTab = () => {
    if (pathname === "/") return "home"
    if (pathname === "/discover") return "discover"
    if (pathname.startsWith("/events")) return "events"
    if (pathname === "/create" || pathname.startsWith("/create")) return "create"
    if (pathname === "/profile" || pathname.startsWith("/profile")) return "profile"
    return "home"
  }

  const activeTab = getActiveTab()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#000000] backdrop-blur-lg border-t border-[#262626] z-40 pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className="flex-1 flex justify-center min-w-0"
            >
              <Button
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className="flex flex-col items-center justify-center gap-1 h-auto py-2 px-2 min-h-[44px] min-w-[44px] w-full max-w-[70px]"
                onClick={() => {
                  if (isActive) {
                    hapticLight()
                  } else {
                    hapticSuccess()
                  }
                }}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {tab.id === "friends" && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 px-1 min-w-0 h-4 text-xs">
                      2
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium text-center leading-tight">{tab.label}</span>
              </Button>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
