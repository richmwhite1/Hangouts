"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Bell, Users, MessageSquare } from "lucide-react"
import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
// import { useUnreadCounts } from "@/hooks/use-unread-counts"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { NotificationSettings } from "@/components/notifications/notification-settings"
import { NotificationHistory } from "@/components/notifications/notification-history"

export function Navigation() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showNotifications, setShowNotifications] = useState(false)
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [showNotificationHistory, setShowNotificationHistory] = useState(false)
  // const { totalUnreadCount } = useUnreadCounts()
  const totalUnreadCount = 0 // Temporarily disabled

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-4">
            <span className="font-bold text-xl">Hangout</span>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search hangouts, friends, or places..."
                className="pl-10 bg-input border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                suppressHydrationWarning
              />
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-2">
            <Link href="/friends">
              <Button variant="ghost" size="lg" className="min-h-[44px] min-w-[44px] p-2">
                <Users className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/messages">
              <Button variant="ghost" size="lg" className="relative min-h-[44px] min-w-[44px] p-2">
                <MessageSquare className="w-5 h-5" />
                {totalUnreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <div className="relative">
              <Button
                variant="ghost"
                size="lg"
                className="relative min-h-[44px] min-w-[44px] p-2"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5" />
              </Button>
            </div>
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: {
                    width: '40px',
                    height: '40px'
                  },
                  userButtonPopoverCard: {
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333333'
                  },
                  userButtonPopoverActionButton: {
                    color: '#FFFFFF'
                  },
                  userButtonPopoverActionButton__signOut: {
                    color: '#FF4444'
                  }
                }
              }}
              afterSignOutUrl="/login"
            />
          </div>
        </div>
      </div>
      {showNotifications && <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />}
      
      {/* Notification Center */}
      <NotificationCenter 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)}
        onOpenSettings={() => setShowNotificationSettings(true)}
        onOpenHistory={() => setShowNotificationHistory(true)}
      />
      
      {/* Notification Settings - Temporarily disabled */}
      {/* <NotificationSettings 
        isOpen={showNotificationSettings} 
        onClose={() => setShowNotificationSettings(false)} 
      /> */}
      
      {/* Notification History - Temporarily disabled */}
      {/* <NotificationHistory 
        isOpen={showNotificationHistory} 
        onClose={() => setShowNotificationHistory(false)} 
      /> */}
    </nav>
  )
}
