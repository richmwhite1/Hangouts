"use client"

// Removed useState import as it's no longer needed
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TouchButton } from "@/components/ui/touch-button"
import { Home, Compass, Plus, Calendar, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
// Removed old MessagesModal import
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
    if (pathname === "/create") return "create"
    if (pathname === "/events") return "events"
    if (pathname === "/profile") return "profile"
    return "home"
  }

  const activeTab = getActiveTab()

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-40">
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <Link key={tab.id} href={tab.href}>
                <TouchButton
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className="flex flex-col items-center space-y-1 h-auto py-2 px-3 min-w-0"
                  hapticType="light"
                  rippleEffect={false}
                  touchScale={0.95}
                  onClick={() => {
                    if (isActive) {
                      hapticLight()
                    } else {
                      hapticSuccess()
                    }
                  }}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {tab.id === "friends" && (
                      <Badge variant="destructive" className="absolute -top-1 -right-1 px-1 min-w-0 h-4 text-xs">
                        2
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs font-medium">{tab.label}</span>
                </TouchButton>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Messages functionality now integrated into bottom navigation */}
    </>
  )
}
