"use client"

import React, { useState, useEffect, useMemo } from "react"
import { HangoutCard } from "@/components/hangout-card"
import { MobileHangoutCard } from "@/components/mobile-optimized-hangout-card"
import { StackedHangoutTile } from "@/components/stacked-hangout-tile"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, AlertCircle } from "lucide-react"
import { useHangouts } from "@/hooks/use-hangouts"
import { useDraft } from "@/hooks/use-draft"
import { HangoutFeedSkeleton } from "@/components/loading-skeletons"
import { UnauthorizedMessage } from "@/components/unauthorized-message"
import { AdvancedSearch } from "@/components/advanced-search"
import { DraftHangoutCard } from "@/components/draft-hangout-card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { logger } from '@/lib/logger'
// Removed api-client import - using direct fetch calls

export function HangoutFeed() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [hangouts, setHangouts] = useState<{ id: string; title: string; description?: string; startTime: string; endTime: string; location?: string; creator: { name: string; username: string; avatar?: string }; privacyLevel?: string; maxParticipants?: number; image?: string; photos?: string[]; participants?: any[]; _count?: { participants: number } }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isSignedIn, isLoaded } = useAuth()
  
  // console.log('🔄 HangoutFeed component mounting...'); // Removed for production
  
  // Use useEffect properly
  useEffect(() => {
    const fetchData = async () => {
      if (!isLoaded) return
      
      if (!isSignedIn) {
        setIsLoading(false)
        return
      }
      
      try {
        // console.log('🚀 useEffect API call starting...'); // Removed for production
        setIsLoading(true)
        const data = await apiClient.getHangouts()
        // console.log('✅ useEffect API success:', data.hangouts?.length || 0); // Removed for production
        setHangouts(data.hangouts || [])
      } catch (err) {
        logger.error('❌ useEffect API error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [isSignedIn, isLoaded])
  
  // console.log('📊 Direct state:', { hangoutsCount: hangouts.length, isLoading, error }); // Removed for production
  
  const { drafts, loadDraft, deleteDraft } = useDraft()
  const router = useRouter()

  const handleEditDraft = (draft: { id: string; [key: string]: unknown }) => {
    loadDraft(draft.id)
    router.push('/create')
  }

  const handleDeleteDraft = (draftId: string) => {
    deleteDraft(draftId)
  }

  const filteredAndSortedHangouts = useMemo(() => {
    let filtered = hangouts

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (hangout) =>
          hangout.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          hangout.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          hangout.location?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by status
    if (activeFilter === "upcoming") {
      filtered = filtered.filter(hangout => 
        new Date(hangout.startTime) > new Date() && hangout.status === 'PLANNING'
      )
    } else if (activeFilter === "past") {
      filtered = filtered.filter(hangout => 
        new Date(hangout.startTime) < new Date() || hangout.status === 'COMPLETED'
      )
    } else if (activeFilter === "my") {
      // This would need to be filtered on the backend based on user participation
      // For now, we'll show all hangouts
    }

    // Sort by date (upcoming first)
    return filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }, [hangouts, searchQuery, activeFilter])

  if (!isLoaded) {
    return <HangoutFeedSkeleton />
  }

  if (!isSignedIn) {
    return <UnauthorizedMessage />
  }

  if (isLoading) {
    return <HangoutFeedSkeleton />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Quick filter buttons */}
      <div className="flex items-center space-x-2 mb-4">
        <Button
          variant={activeFilter === "all" ? "secondary" : "ghost"}
          size="sm"
          className="text-xs px-3 py-1 h-7"
          onClick={() => setActiveFilter("all")}
        >
          All
        </Button>
        <Button
          variant={activeFilter === "upcoming" ? "secondary" : "ghost"}
          size="sm"
          className="text-xs px-3 py-1 h-7"
          onClick={() => setActiveFilter("upcoming")}
        >
          Upcoming
        </Button>
        <Button
          variant={activeFilter === "past" ? "secondary" : "ghost"}
          size="sm"
          className="text-xs px-3 py-1 h-7"
          onClick={() => setActiveFilter("past")}
        >
          Past Events
        </Button>
        <Button
          variant={activeFilter === "my" ? "secondary" : "ghost"}
          size="sm"
          className="text-xs px-3 py-1 h-7"
          onClick={() => setActiveFilter("my")}
        >
          My Events
        </Button>
        <Button
          variant={activeFilter === "invitations" ? "secondary" : "ghost"}
          size="sm"
          className="text-xs px-3 py-1 h-7"
          onClick={() => setActiveFilter("invitations")}
        >
          Invitations
        </Button>
      </div>

      {/* Advanced search */}
      <AdvancedSearch
        onFiltersChange={(filters) => {
          // Handle advanced filters
          // console.log('Advanced filters:', filters); // Removed for production
        }}
        onSearch={(query) => setSearchQuery(query)}
      />

      {/* Draft Hangouts Section */}
      {drafts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            📝 Draft Hangouts ({drafts.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drafts.map((draft) => (
              <DraftHangoutCard 
                key={draft.id} 
                draft={draft} 
                onEdit={handleEditDraft}
                onDelete={handleDeleteDraft}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Regular Hangouts Section */}
      <div className="space-y-3">
        {drafts.length > 0 && (
          <h3 className="text-sm font-medium text-gray-300">
            🎉 Published Hangouts
          </h3>
        )}
        {/* Stacked Editorial Feed */}
        <div className="space-y-0">
          {filteredAndSortedHangouts.map((hangout, index) => (
            <StackedHangoutTile 
              key={hangout.id} 
              hangout={hangout} 
              index={index}
              totalCount={filteredAndSortedHangouts.length}
            />
          ))}
        </div>
      </div>

      {filteredAndSortedHangouts.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No hangouts found matching &quot;{searchQuery}&quot;</p>
        </div>
      )}

      {filteredAndSortedHangouts.length === 0 && !searchQuery && drafts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No hangouts found. Create your first hangout!</p>
        </div>
      )}
    </div>
  )
}