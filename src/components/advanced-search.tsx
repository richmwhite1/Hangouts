"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, Filter, MapPin, Calendar as CalendarIcon, Users, X } from "lucide-react"
import { format } from "date-fns"

interface SearchFilters {
  query: string
  category: string
  location: string
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
  participants: string
  privacy: string
  status: string
}

interface AdvancedSearchProps {
  onFiltersChange: (filters: SearchFilters) => void
  onSearch: (query: string) => void
}

const categories = [
  { id: "all", label: "All Categories" },
  { id: "food", label: "🍽️ Food & Dining" },
  { id: "entertainment", label: "🎬 Entertainment" },
  { id: "outdoor", label: "🥾 Outdoor Activities" },
  { id: "social", label: "🍸 Social Events" },
  { id: "sports", label: "⚽ Sports & Fitness" },
  { id: "culture", label: "🎨 Arts & Culture" },
  { id: "education", label: "📚 Learning" },
]

const participantRanges = [
  { id: "any", label: "Any size" },
  { id: "small", label: "2-5 people" },
  { id: "medium", label: "6-15 people" },
  { id: "large", label: "16+ people" },
]

const privacyOptions = [
  { id: "all", label: "All privacy levels" },
  { id: "PUBLIC", label: "🌍 Public" },
  { id: "FRIENDS_ONLY", label: "👥 Friends only" },
  { id: "PRIVATE", label: "🔒 Private" },
]

const statusOptions = [
  { id: "all", label: "All statuses" },
  { id: "PLANNING", label: "Planning" },
  { id: "ACTIVE", label: "Active" },
  { id: "COMPLETED", label: "Completed" },
]

export function AdvancedSearch({ onFiltersChange, onSearch }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    category: "all",
    location: "",
    dateRange: { from: undefined, to: undefined },
    participants: "any",
    privacy: "all",
    status: "all",
  })
  
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
    
    // Update active filters
    const newActiveFilters = Object.entries(newFilters)
      .filter(([k, v]) => {
        if (k === 'query' && v) return true
        if (k === 'category' && v !== 'all') return true
        if (k === 'location' && v) return true
        if (k === 'dateRange' && (v.from || v.to)) return true
        if (k === 'participants' && v !== 'any') return true
        if (k === 'privacy' && v !== 'all') return true
        if (k === 'status' && v !== 'all') return true
        return false
      })
      .map(([k, v]) => {
        if (k === 'dateRange') {
          if (v.from && v.to) return `Date: ${format(v.from, 'MMM d')} - ${format(v.to, 'MMM d')}`
          if (v.from) return `From: ${format(v.from, 'MMM d')}`
          if (v.to) return `Until: ${format(v.to, 'MMM d')}`
        }
        if (k === 'category') return `Category: ${categories.find(c => c.id === v)?.label}`
        if (k === 'participants') return `Size: ${participantRanges.find(p => p.id === v)?.label}`
        if (k === 'privacy') return `Privacy: ${privacyOptions.find(p => p.id === v)?.label}`
        if (k === 'status') return `Status: ${statusOptions.find(s => s.id === v)?.label}`
        if (k === 'location') return `Location: ${v}`
        return `${k}: ${v}`
      })
    
    setActiveFilters(newActiveFilters)
  }

  const clearFilter = (filterKey: string) => {
    if (filterKey === 'query') {
      updateFilter('query', '')
    } else if (filterKey === 'category') {
      updateFilter('category', 'all')
    } else if (filterKey === 'location') {
      updateFilter('location', '')
    } else if (filterKey === 'dateRange') {
      updateFilter('dateRange', { from: undefined, to: undefined })
    } else if (filterKey === 'participants') {
      updateFilter('participants', 'any')
    } else if (filterKey === 'privacy') {
      updateFilter('privacy', 'all')
    } else if (filterKey === 'status') {
      updateFilter('status', 'all')
    }
  }

  const clearAllFilters = () => {
    const clearedFilters = {
      query: "",
      category: "all",
      location: "",
      dateRange: { from: undefined, to: undefined },
      participants: "any",
      privacy: "all",
      status: "all",
    }
    setFilters(clearedFilters)
    onFiltersChange(clearedFilters)
    setActiveFilters([])
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search hangouts by title, description, or location..."
          value={filters.query}
          onChange={(e) => {
            updateFilter('query', e.target.value)
            onSearch(e.target.value)
          }}
          className="pl-10 pr-20 bg-card border-border/50"
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 transform -translate-y-1/2"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter className="w-4 h-4 mr-1" />
          Filters
        </Button>
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {filter}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => {
                  const filterKey = filter.split(':')[0].toLowerCase()
                  clearFilter(filterKey)
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={clearAllFilters}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Advanced filters */}
      {showAdvanced && (
        <Card className="bg-card/50">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Category filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="City, venue, or area"
                    value={filters.location}
                    onChange={(e) => updateFilter('location', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Participants filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Group Size</label>
                <Select value={filters.participants} onValueChange={(value) => updateFilter('participants', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {participantRanges.map((range) => (
                      <SelectItem key={range.id} value={range.id}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Privacy filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Privacy</label>
                <Select value={filters.privacy} onValueChange={(value) => updateFilter('privacy', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {privacyOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date range filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.from ? (
                        filters.dateRange.to ? (
                          `${format(filters.dateRange.from, 'MMM d')} - ${format(filters.dateRange.to, 'MMM d')}`
                        ) : (
                          format(filters.dateRange.from, 'MMM d')
                        )
                      ) : (
                        "Pick a date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={filters.dateRange}
                      onSelect={(range) => updateFilter('dateRange', range || { from: undefined, to: undefined })}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

