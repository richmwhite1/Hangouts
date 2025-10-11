"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Bell, User, Users, LogOut, Settings, MessageSquare } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAuth, useClerk } from "@clerk/nextjs"
import { useUnreadCounts } from "@/hooks/use-unread-counts"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { NotificationSettings } from "@/components/notifications/notification-settings"
import { NotificationHistory } from "@/components/notifications/notification-history"

export function Navigation() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showNotifications, setShowNotifications] = useState(false)
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [showNotificationHistory, setShowNotificationHistory] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  const { isSignedIn, isLoaded, user } = useAuth()
  const clerk = useClerk()
  const { totalUnreadCount } = useUnreadCounts()

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
            <div className="relative">
              <Button 
                variant="ghost" 
                size="lg" 
                className="p-2 min-h-[44px] min-w-[44px]"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <Avatar className="w-8 h-8 rounded-md">
                  <AvatarImage 
                    src={isSignedIn && user?.imageUrl ? user.imageUrl : "/placeholder-avatar.png"} 
                    alt={isSignedIn && user?.fullName ? user.fullName : "Profile"} 
                  />
                  <AvatarFallback className="rounded-md">
                    {isSignedIn && user?.fullName ? user.fullName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
              
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage 
                          src={isSignedIn && user?.imageUrl ? user.imageUrl : "/placeholder-avatar.png"} 
                          alt={isSignedIn && user?.fullName ? user.fullName : "Profile"} 
                        />
                        <AvatarFallback>
                          {isSignedIn && user?.fullName ? user.fullName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{isSignedIn && user?.fullName ? user.fullName : "User"}</p>
                        <p className="text-xs text-muted-foreground">{isSignedIn && user?.primaryEmailAddress?.emailAddress ? user.primaryEmailAddress.emailAddress : ""}</p>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <Link href="/profile">
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => setShowNotificationSettings(true)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Notification Settings
                    </Button>
                    <div className="border-t border-border my-2"></div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        clerk.signOut()
                        setShowUserMenu(false)
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showNotifications && <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />}
      {showUserMenu && <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />}
      
      {/* Notification Center */}
      <NotificationCenter 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)}
        onOpenSettings={() => setShowNotificationSettings(true)}
        onOpenHistory={() => setShowNotificationHistory(true)}
      />
      
      {/* Notification Settings */}
      <NotificationSettings 
        isOpen={showNotificationSettings} 
        onClose={() => setShowNotificationSettings(false)} 
      />
      
      {/* Notification History */}
      <NotificationHistory 
        isOpen={showNotificationHistory} 
        onClose={() => setShowNotificationHistory(false)} 
      />
    </nav>
  )
}
