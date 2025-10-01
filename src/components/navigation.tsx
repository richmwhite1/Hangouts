"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Bell, User, Users, LogOut, Settings, MessageSquare } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
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
  const { user, isAuthenticated, signOut } = useAuth()
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
              <Button variant="ghost" size="sm">
                <Users className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/messages">
              <Button variant="ghost" size="sm" className="relative">
                <MessageSquare className="w-4 h-4" />
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
                size="sm"
                className="relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-4 h-4" />
                <Badge variant="destructive" className="absolute -top-1 -right-1 px-1 min-w-0 h-4 text-xs">
                  2
                </Badge>
              </Button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-border/50 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">New comment on Weekend Coffee Meetup</p>
                          <p className="text-xs text-muted-foreground mt-1">Sarah added: &quot;Looking forward to this!&quot;</p>
                          <p className="text-xs text-muted-foreground mt-1">2 minutes ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border-b border-border/50 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Reminder: Vote needed for Friday Gaming</p>
                          <p className="text-xs text-muted-foreground mt-1">Mike is waiting for your RSVP</p>
                          <p className="text-xs text-muted-foreground mt-1">1 hour ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-muted rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground">David created Hiking Adventure</p>
                          <p className="text-xs text-muted-foreground mt-1">3 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-t border-border">
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      View All Notifications
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <Avatar className="w-8 h-8 rounded-md">
                  <AvatarImage 
                    src={isAuthenticated && user?.avatar ? user.avatar : "/placeholder-avatar.png"} 
                    alt={isAuthenticated && user?.name ? user.name : "Profile"} 
                  />
                  <AvatarFallback className="rounded-md">
                    {isAuthenticated && user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
              
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage 
                          src={isAuthenticated && user?.avatar ? user.avatar : "/placeholder-avatar.png"} 
                          alt={isAuthenticated && user?.name ? user.name : "Profile"} 
                        />
                        <AvatarFallback>
                          {isAuthenticated && user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{isAuthenticated && user?.name ? user.name : "User"}</p>
                        <p className="text-xs text-muted-foreground">{isAuthenticated && user?.email ? user.email : ""}</p>
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
                        signOut()
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
