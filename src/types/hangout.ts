// Core Hangout System Types
// Based on the master plan for the ultimate hangout planning experience

export type HangoutPhase = 'planning' | 'rsvp' | 'active' | 'completed'
export type PlanSectionType = 'static' | 'poll'
export type ParticipantRole = 'host' | 'co-host' | 'participant' | 'mandatory'
export type RSVPStatus = 'going' | 'not-going' | 'maybe' | 'pending'
export type VoteType = 'yes' | 'no' | 'maybe' | 'preferred'

// Core Hangout Interface
export interface Hangout {
  id: string
  phase: HangoutPhase
  title: string
  description?: string
  heroImage?: string
  
  // Plan Sections
  planSections: {
    what: PlanSection
    where: PlanSection
    when: PlanSection
  }
  
  // Participants and Settings
  participants: Participant[]
  settings: HangoutSettings
  
  // Social Features
  chat: Message[]
  photos: Photo[]
  
  // Metadata
  createdAt: string
  updatedAt: string
  creatorId: string
}

// Plan Section Interface
export interface PlanSection {
  id: string
  type: PlanSectionType
  finalized: boolean
  finalResult?: string
  consensusReachedAt?: string
  
  // Static mode
  staticValue?: string
  
  // Poll mode
  options: PollOption[]
  votes: Vote[]
  
  // Settings
  allowParticipantOptions: boolean
  consensusThreshold: number
  minimumVotes: number
}

// Poll Option Interface
export interface PollOption {
  id: string
  text: string
  addedBy: string
  addedAt: string
  isRemoved: boolean
}

// Vote Interface
export interface Vote {
  id: string
  participantId: string
  optionId: string
  voteType: VoteType
  votedAt: string
}

// Participant Interface
export interface Participant {
  id: string
  userId: string
  role: ParticipantRole
  rsvp: RSVPStatus
  rsvpAt?: string
  
  // Voting Status
  votedSections: string[] // Array of section IDs they've voted on
  isMandatory: boolean
  
  // User Info
  user: {
    id: string
    name: string
    username: string
    avatar?: string
  }
  
  // Invitation
  invitedAt: string
  joinedAt?: string
}

// Hangout Settings Interface
export interface HangoutSettings {
  // Consensus Rules
  consensusPercentage: number // Default 70%
  minimumVotes: number // Default 3
  allowParticipantOptions: boolean // Default true
  allowMaybeVotes: boolean // Default false (maybe votes don't count toward consensus)
  
  // RSVP Settings
  rsvpDeadline?: string
  allowLateRSVP: boolean // Default true
  
  // Privacy
  isPublic: boolean
  allowInviteLinks: boolean
  
  // Notifications
  notifyOnVote: boolean
  notifyOnConsensus: boolean
  notifyOnRSVP: boolean
}

// Message Interface (Chat)
export interface Message {
  id: string
  hangoutId: string
  senderId: string
  content: string
  type: 'text' | 'image' | 'system'
  
  // Threading
  replyToId?: string
  replies: Message[]
  
  // Reactions
  reactions: Reaction[]
  
  // Media
  attachments?: Attachment[]
  
  // Metadata
  createdAt: string
  updatedAt: string
  isEdited: boolean
  
  // User Info
  sender: {
    id: string
    name: string
    username: string
    avatar?: string
  }
}

// Reaction Interface
export interface Reaction {
  id: string
  messageId: string
  userId: string
  emoji: string
  createdAt: string
}

// Attachment Interface
export interface Attachment {
  id: string
  type: 'image' | 'file'
  url: string
  filename: string
  size: number
  mimeType: string
}

// Photo Interface (Post-event memories)
export interface Photo {
  id: string
  hangoutId: string
  uploadedBy: string
  url: string
  caption?: string
  tags: string[]
  createdAt: string
  
  // User Info
  uploader: {
    id: string
    name: string
    username: string
    avatar?: string
  }
}

// UI State Interfaces
export interface UIState {
  // Active sections and modals
  activeSection: 'what' | 'where' | 'when' | null
  activeModal: 'settings' | 'participants' | 'chat' | null
  
  // Loading states
  isLoading: boolean
  isCreating: boolean
  isVoting: boolean
  
  // Error states
  error: string | null
  
  // Mobile state
  isMobile: boolean
  sidebarOpen: boolean
}

// Real-time Update Types
export interface VoteUpdate {
  hangoutId: string
  sectionId: string
  optionId: string
  participantId: string
  voteType: VoteType
  timestamp: string
}

export interface ConsensusUpdate {
  hangoutId: string
  sectionId: string
  consensusReached: boolean
  winningOption?: string
  consensusPercentage: number
  timestamp: string
}

export interface ParticipantUpdate {
  hangoutId: string
  participantId: string
  action: 'joined' | 'left' | 'voted' | 'rsvp_changed'
  data: any
  timestamp: string
}

// Form Data Interfaces
export interface CreateHangoutData {
  title: string
  description?: string
  heroImage?: File
  
  // Initial plan values
  what: string
  where: string
  when: string
  
  // Settings
  settings: Partial<HangoutSettings>
  
  // Participants
  participantIds: string[]
  mandatoryParticipantIds: string[]
}

export interface UpdateHangoutData {
  title?: string
  description?: string
  heroImage?: File
  settings?: Partial<HangoutSettings>
}

// API Response Types
export interface HangoutResponse {
  hangout: Hangout
  success: boolean
  message?: string
}

export interface VoteResponse {
  vote: Vote
  poll: PlanSection
  consensusReached: boolean
  success: boolean
  message?: string
}

export interface ParticipantResponse {
  participant: Participant
  success: boolean
  message?: string
}

// Utility Types
export type SectionKey = 'what' | 'where' | 'when'

export interface SectionConfig {
  key: SectionKey
  label: string
  icon: string
  placeholder: string
  pollPlaceholder: string
}

export const SECTION_CONFIGS: Record<SectionKey, SectionConfig> = {
  what: {
    key: 'what',
    label: 'What',
    icon: '🎯',
    placeholder: 'What are you planning?',
    pollPlaceholder: 'Add activity options...'
  },
  where: {
    key: 'where',
    label: 'Where',
    icon: '📍',
    placeholder: 'Where will this happen?',
    pollPlaceholder: 'Add location options...'
  },
  when: {
    key: 'when',
    label: 'When',
    icon: '📅',
    placeholder: 'When will this happen?',
    pollPlaceholder: 'Add time options...'
  }
}

// Validation Schemas (for use with Zod)
export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}
