import { useState, useEffect, useCallback } from 'react'

interface DraftHangout {
  id: string
  activity: string
  location: string
  selectedLocation?: {
    latitude: number
    longitude: number
    displayName: string
    address: {
      city?: string
      state?: string
      country?: string
      postcode?: string
    }
  }
  selectedDateTime?: {
    date: Date
    time: string
  }
  selectedDate?: string
  selectedTime?: string
  customDateTime?: string
  selectedFriends: string[]
  selectedGroups: string[]
  participantRoles: Record<string, { isMandatory: boolean; isCoHost: boolean }>
  privacy: 'public' | 'friends'
  allowFriendsToInvite: boolean
  isPoll: boolean
  pollSettings: {
    allowMultipleVotes: boolean
    allowSuggestions: boolean
    consensusPercentage: number
    minimumParticipants: number
  }
  rsvpSettings: {
    allowSuggestions: boolean
    hostCanEdit: boolean
    coHostCanEdit: boolean
  }
  hangoutPhoto?: {
    url: string
    filename: string
  }
  createdAt: Date
  updatedAt: Date
}

const DRAFT_KEY = 'hangout_drafts'

export const useDraft = () => {
  const [drafts, setDrafts] = useState<DraftHangout[]>([])
  const [currentDraft, setCurrentDraft] = useState<DraftHangout | null>(null)

  // Load drafts from localStorage on mount
  useEffect(() => {
    try {
      const savedDrafts = localStorage.getItem(DRAFT_KEY)
      if (savedDrafts) {
        const parsedDrafts = JSON.parse(savedDrafts).map((draft: { createdAt: string; updatedAt: string; [key: string]: unknown }) => ({
          ...draft,
          createdAt: new Date(draft.createdAt),
          updatedAt: new Date(draft.updatedAt),
          selectedDateTime: draft.selectedDateTime ? {
            date: new Date(draft.selectedDateTime.date),
            time: draft.selectedDateTime.time
          } : undefined
        }))
        setDrafts(parsedDrafts)
      }
    } catch (error) {
      console.error('Error loading drafts:', error)
    }
  }, [])

  // Save drafts to localStorage whenever drafts change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))
    } catch (error) {
      console.error('Error saving drafts:', error)
    }
  }, [drafts])

  const saveDraft = useCallback((draftData: Partial<DraftHangout>) => {
    const now = new Date()
    const draftId = currentDraft?.id || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newDraft: DraftHangout = {
      id: draftId,
      activity: '',
      location: '',
      selectedFriends: [],
      selectedGroups: [],
      participantRoles: {},
      privacy: 'friends',
      allowFriendsToInvite: false,
      isPoll: false,
      pollSettings: {
        allowMultipleVotes: false,
        allowSuggestions: false,
        consensusPercentage: 75,
        minimumParticipants: 2},
      rsvpSettings: {
        allowSuggestions: false,
        hostCanEdit: true,
        coHostCanEdit: false},
      createdAt: currentDraft?.createdAt || now,
      updatedAt: now,
      ...draftData}

    setDrafts(prev => {
      const existingIndex = prev.findIndex(d => d.id === draftId)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = newDraft
        return updated
      } else {
        return [...prev, newDraft]
      }
    })

    setCurrentDraft(newDraft)
    return newDraft
  }, [currentDraft])

  const loadDraft = useCallback((draftId: string) => {
    const draft = drafts.find(d => d.id === draftId)
    if (draft) {
      setCurrentDraft(draft)
      return draft
    }
    return null
  }, [drafts])

  const deleteDraft = useCallback((draftId: string) => {
    setDrafts(prev => prev.filter(d => d.id !== draftId))
    if (currentDraft?.id === draftId) {
      setCurrentDraft(null)
    }
  }, [currentDraft])

  const clearCurrentDraft = useCallback(() => {
    setCurrentDraft(null)
  }, [])

  const autoSave = useCallback((draftData: Partial<DraftHangout>) => {
    // Only auto-save if there's meaningful content
    if (draftData.activity || draftData.location || draftData.selectedFriends?.length) {
      saveDraft(draftData)
    }
  }, [saveDraft])

  return {
    drafts,
    currentDraft,
    saveDraft,
    loadDraft,
    deleteDraft,
    clearCurrentDraft,
    autoSave}
}

