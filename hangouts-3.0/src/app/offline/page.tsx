'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, RefreshCw, Home, Users, Calendar, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const [cachedData, setCachedData] = useState({
    hangouts: [],
    friends: [],
    conversations: []
  })

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    // Initial check
    updateOnlineStatus()

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Load cached data from IndexedDB
    loadCachedData()

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const loadCachedData = async () => {
    try {
      // This would load from IndexedDB in a real implementation
      // For now, we'll show placeholder data
      setCachedData({
        hangouts: [
          { id: '1', title: 'Coffee Meetup', date: 'Today 2:00 PM' },
          { id: '2', title: 'Game Night', date: 'Tomorrow 7:00 PM' }
        ],
        friends: [
          { id: '1', name: 'Sarah Johnson', status: 'Online' },
          { id: '2', name: 'Mike Chen', status: 'Last seen 2h ago' }
        ],
        conversations: [
          { id: '1', name: 'Weekend Plans', lastMessage: 'See you tomorrow!', time: '2h ago' }
        ]
      })
    } catch (error) {
      console.error('Failed to load cached data:', error)
    }
  }

  const handleRefresh = () => {
    if (isOnline) {
      window.location.reload()
    }
  }

  const handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Status Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {isOnline ? (
                <Wifi className="w-12 h-12 text-green-500" />
              ) : (
                <WifiOff className="w-12 h-12 text-red-500" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isOnline ? 'You\'re Back Online!' : 'You\'re Offline'}
            </CardTitle>
            <CardDescription>
              {isOnline 
                ? 'Your connection has been restored. You can now access all features.'
                : 'You\'re currently offline. Some features may be limited.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {isOnline ? (
              <Button onClick={handleRefresh} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh App
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Check your internet connection and try again
                </p>
                <Button onClick={handleGoHome} variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offline Features */}
        {!isOnline && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WifiOff className="w-5 h-5" />
                Available Offline
              </CardTitle>
              <CardDescription>
                These features work without an internet connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium">View Hangouts</p>
                    <p className="text-sm text-muted-foreground">Recently cached hangouts</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Users className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium">Friends List</p>
                    <p className="text-sm text-muted-foreground">Cached friends data</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <MessageCircle className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Recent Messages</p>
                    <p className="text-sm text-muted-foreground">Last conversations</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Home className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="font-medium">App Navigation</p>
                    <p className="text-sm text-muted-foreground">Browse cached pages</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cached Data Preview */}
        {!isOnline && (
          <div className="space-y-4">
            {/* Recent Hangouts */}
            {cachedData.hangouts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Recent Hangouts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {cachedData.hangouts.map((hangout: any) => (
                      <div key={hangout.id} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="font-medium">{hangout.title}</span>
                        <span className="text-sm text-muted-foreground">{hangout.date}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Conversations */}
            {cachedData.conversations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Recent Conversations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {cachedData.conversations.map((conversation: any) => (
                      <div key={conversation.id} className="p-2 bg-muted rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{conversation.name}</p>
                            <p className="text-sm text-muted-foreground">{conversation.lastMessage}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">{conversation.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Connection Tips */}
        {!isOnline && (
          <Alert>
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              <strong>Connection Tips:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Check your Wi-Fi or mobile data connection</li>
                <li>• Try refreshing the page when back online</li>
                <li>• Some features require an internet connection</li>
                <li>• Your data is safely cached for offline viewing</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
