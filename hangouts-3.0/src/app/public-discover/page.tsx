'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  Users,
  Calendar,
  MapPin,
  Clock,
  Search,
  TrendingUp,
  Star,
  Loader2,
  MessageSquare,
  UserPlus,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'

interface PublicContent {
  id: string
  title: string
  description?: string
  image?: string
  privacyLevel: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'
  creator: {
    name: string
    username: string
    avatar?: string
  }
  _count: {
    participants: number
  }
  // Hangout specific
  location?: string
  startTime?: string
  endTime?: string
  // Event specific
  venue?: string
  city?: string
  startDate?: string
  endDate?: string
  price?: number
  type: 'HANGOUT' | 'EVENT'
}

export default function PublicDiscoveryPage() {
  const [content, setContent] = useState<PublicContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all', 'hangouts', 'events', 'trending'
  const router = useRouter()

  useEffect(() => {
    const fetchPublicContent = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (searchQuery) params.set('search', searchQuery)
        if (activeTab !== 'all' && activeTab !== 'trending') params.set('type', activeTab)

        const response = await fetch(`/api/public/content?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          const combinedContent = [...data.hangouts, ...data.events]
          // Sort by creation date for 'all' and 'trending' (trending logic would be more complex)
          combinedContent.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setContent(combinedContent)
        } else {
          throw new Error(data.error || 'Failed to fetch public content')
        }
      } catch (err) {
        logger.error('Error fetching public content:', err)
        setError(err instanceof Error ? err.message : 'Failed to load public content')
      } finally {
        setLoading(false)
      }
    }

    fetchPublicContent()
  }, [searchQuery, activeTab])

  const handleSignIn = () => {
    router.push('/signin')
  }

  const handleSignUp = () => {
    router.push('/signup')
  }

  const renderContentCard = (item: PublicContent) => (
    <Card key={item.id} className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all duration-300">
      <Link href={`/${item.type === 'HANGOUT' ? 'hangouts' : 'events'}/public/${item.id}`}>
        <div className="relative">
          {item.image && (
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-48 object-cover rounded-t-lg"
            />
          )}
          <Badge
            className={`absolute top-3 right-3 ${
              item.type === 'HANGOUT' ? 'bg-blue-600/20 text-blue-300 border-blue-400/30' :
              'bg-green-600/20 text-green-300 border-green-400/30'
            }`}
          >
            {item.type === 'HANGOUT' ? 'Hangout' : 'Event'}
          </Badge>
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl text-white">{item.title}</CardTitle>
          <p className="text-sm text-gray-400">
            {item.type === 'HANGOUT'
              ? format(new Date(item.startTime!), 'MMM d, yyyy h:mm a')
              : format(new Date(item.startDate!), 'MMM d, yyyy h:mm a')}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {item.type === 'HANGOUT' && item.location && (
            <div className="flex items-center text-gray-300 text-sm">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{item.location}</span>
            </div>
          )}
          {item.type === 'EVENT' && item.venue && item.city && (
            <div className="flex items-center text-gray-300 text-sm">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{item.venue}, {item.city}</span>
            </div>
          )}
          <div className="flex items-center text-gray-300 text-sm">
            <Users className="w-4 h-4 mr-2" />
            <span>{item._count.participants} going</span>
          </div>
          {item.description && (
            <p className="text-gray-400 text-sm line-clamp-2">{item.description}</p>
          )}
        </CardContent>
      </Link>
    </Card>
  )

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bg-gradient-to-r from-blue-600/20 to-blue-700/20 border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Discover Amazing Events &amp; Hangouts</h1>
            <p className="text-gray-300 mb-4">Browse public events and hangouts. Sign up to create your own!</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSignUp}
              >
                Get Started Free
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-gray-600 text-white hover:bg-gray-700"
                onClick={handleSignIn}
              >
                Sign In
              </Button>
            </div>
          </div>
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search events and hangouts..."
                className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800/50 border-gray-700">
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-600">
              <TrendingUp className="w-4 h-4 mr-2" />All
            </TabsTrigger>
            <TabsTrigger value="hangouts" className="data-[state=active]:bg-blue-600">
              <Users className="w-4 h-4 mr-2" />Hangouts
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-green-600">
              <Calendar className="w-4 h-4 mr-2" />Events
            </TabsTrigger>
            <TabsTrigger value="trending" className="data-[state=active]:bg-blue-600">
              <Star className="w-4 h-4 mr-2" />Trending
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-6">
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-full h-64 bg-gray-700 animate-pulse rounded-lg" />
                ))}
              </div>
            )}
            {error && <p className="text-red-500 text-center mt-4">Error: {error}</p>}
            {!loading && !error && content.length === 0 && (
              <p className="text-gray-400 text-center mt-4">No public content found.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.map(renderContentCard)}
            </div>
          </TabsContent>
          <TabsContent value="hangouts" className="mt-6">
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-full h-64 bg-gray-700 animate-pulse rounded-lg" />
                ))}
              </div>
            )}
            {error && <p className="text-red-500 text-center mt-4">Error: {error}</p>}
            {!loading && !error && content.filter(item => item.type === 'HANGOUT').length === 0 && (
              <p className="text-gray-400 text-center mt-4">No public hangouts found.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.filter(item => item.type === 'HANGOUT').map(renderContentCard)}
            </div>
          </TabsContent>
          <TabsContent value="events" className="mt-6">
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-full h-64 bg-gray-700 animate-pulse rounded-lg" />
                ))}
              </div>
            )}
            {error && <p className="text-red-500 text-center mt-4">Error: {error}</p>}
            {!loading && !error && content.filter(item => item.type === 'EVENT').length === 0 && (
              <p className="text-gray-400 text-center mt-4">No public events found.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.filter(item => item.type === 'EVENT').map(renderContentCard)}
            </div>
          </TabsContent>
          <TabsContent value="trending" className="mt-6">
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-full h-64 bg-gray-700 animate-pulse rounded-lg" />
                ))}
              </div>
            )}
            {error && <p className="text-red-500 text-center mt-4">Error: {error}</p>}
            {!loading && !error && content.length === 0 && (
              <p className="text-gray-400 text-center mt-4">No trending content found.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Trending logic would go here, for now it shows all content */}
              {content.map(renderContentCard)}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
