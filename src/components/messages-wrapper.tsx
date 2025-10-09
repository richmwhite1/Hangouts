"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Phone, 
  Video, 
  Archive,
  Star,
  Grid3X3,
  List
} from "lucide-react"
import { useUnreadCounts } from "@/hooks/use-unread-counts"
import Link from "next/link"

interface Friend {
  id: string
  name: string
  username: string
  avatar?: string
  isOnline: boolean
}

interface Conversation {
  id: string
  name: string
  avatar?: string
  lastMessage?: string
  lastMessageTime?: string
  unreadCount: number
  type: 'DIRECT' | 'GROUP'
  participants: Array<{
    id: string
    name: string
    username: string
    avatar?: string
  }>
  createdAt: string
  updatedAt: string
}

export default function MessagesWrapper() {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [getToken, setGetToken] = useState<(() => Promise<string | null>) | null>(null)

  useEffect(() => {
    setIsClient(true)
    
    // Dynamically import Clerk hooks only on client side
    if (typeof window !== 'undefined') {
      import('@clerk/nextjs').then((clerk) => {
        try {
          const { useAuth, useUser } = clerk
          const authResult = useAuth()
          const userResult = useUser()
          
          setIsSignedIn(authResult.isSignedIn)
          setUser(userResult.user)
          setGetToken(() => authResult.getToken)
        } catch (error) {
          console.log('Clerk hooks not available:', error)
        }
      }).catch((error) => {
        console.log('Clerk not available:', error)
      })
    }
  }, [])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to view messages</h1>
          <Link href="/signin">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Messages</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Messages functionality coming soon!</h2>
          <p className="text-gray-400">We're working on bringing you an amazing messaging experience.</p>
        </div>
      </div>
    </div>
  )
}
