'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useState } from 'react'
import { 
  Sparkles, 
  Coffee, 
  Moon, 
  TreePine, 
  Gamepad2, 
  BookOpen, 
  Music, 
  Camera,
  Heart,
  Zap,
  Users,
  MessageCircle
} from 'lucide-react'

interface PersonalityTrait {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  category: 'connection' | 'preference' | 'activity'
}

interface ConnectionStyle {
  primary: string
  secondary: string[]
  description: string
  icon: React.ReactNode
  color: string
}

const personalityTraits: PersonalityTrait[] = [
  // Connection Styles
  { id: 'spontaneous-organizer', name: 'Spontaneous Organizer', description: 'Brings people together on a whim', icon: <Zap className="w-4 h-4" />, color: 'bg-yellow-500', category: 'connection' },
  { id: 'deep-conversationalist', name: 'Deep Conversationalist', description: 'Loves meaningful, thought-provoking chats', icon: <MessageCircle className="w-4 h-4" />, color: 'bg-blue-500', category: 'connection' },
  { id: 'social-catalyst', name: 'Social Catalyst', description: 'The person who makes everyone feel included', icon: <Users className="w-4 h-4" />, color: 'bg-green-500', category: 'connection' },
  { id: 'creative-connector', name: 'Creative Connector', description: 'Brings artistic flair to social gatherings', icon: <Sparkles className="w-4 h-4" />, color: 'bg-blue-500', category: 'connection' },
  
  // Hangout Preferences
  { id: 'coffee-lover', name: 'Coffee Lover', description: 'Always up for a coffee chat', icon: <Coffee className="w-4 h-4" />, color: 'bg-amber-600', category: 'preference' },
  { id: 'night-owl', name: 'Night Owl', description: 'Most active after dark', icon: <Moon className="w-4 h-4" />, color: 'bg-indigo-600', category: 'preference' },
  { id: 'outdoor-adventurer', name: 'Outdoor Adventurer', description: 'Loves nature and outdoor activities', icon: <TreePine className="w-4 h-4" />, color: 'bg-green-600', category: 'preference' },
  { id: 'gaming-enthusiast', name: 'Gaming Enthusiast', description: 'Board games, video games, you name it', icon: <Gamepad2 className="w-4 h-4" />, color: 'bg-red-500', category: 'preference' },
  { id: 'book-club-regular', name: 'Book Club Regular', description: 'Loves intellectual discussions', icon: <BookOpen className="w-4 h-4" />, color: 'bg-emerald-600', category: 'preference' },
  { id: 'music-lover', name: 'Music Lover', description: 'Concerts, jams, music discovery', icon: <Music className="w-4 h-4" />, color: 'bg-pink-500', category: 'preference' },
  { id: 'photo-enthusiast', name: 'Photo Enthusiast', description: 'Captures every moment', icon: <Camera className="w-4 h-4" />, color: 'bg-cyan-500', category: 'preference' },
  { id: 'wellness-focused', name: 'Wellness Focused', description: 'Health, mindfulness, self-care', icon: <Heart className="w-4 h-4" />, color: 'bg-rose-500', category: 'preference' }
]

const connectionStyles: ConnectionStyle[] = [
  {
    primary: 'The Catalyst',
    secondary: ['Spontaneous Organizer', 'Social Catalyst'],
    description: 'You bring energy and spontaneity to every gathering, making sure everyone feels included and has a great time.',
    icon: <Zap className="w-6 h-6" />,
    color: 'bg-gradient-to-r from-yellow-500 to-orange-500'
  },
  {
    primary: 'The Connector',
    secondary: ['Deep Conversationalist', 'Creative Connector'],
    description: 'You create meaningful connections through thoughtful conversations and creative expression.',
    icon: <MessageCircle className="w-6 h-6" />,
    color: 'bg-gradient-to-r from-blue-500 to-blue-500'
  },
  {
    primary: 'The Explorer',
    secondary: ['Outdoor Adventurer', 'Music Lover'],
    description: 'You seek new experiences and adventures, always ready to discover something new with friends.',
    icon: <TreePine className="w-6 h-6" />,
    color: 'bg-gradient-to-r from-green-500 to-teal-500'
  },
  {
    primary: 'The Creator',
    secondary: ['Creative Connector', 'Photo Enthusiast'],
    description: 'You bring artistic vision to social gatherings, creating memorable experiences through creativity.',
    icon: <Sparkles className="w-6 h-6" />,
    color: 'bg-gradient-to-r from-blue-500 to-pink-500'
  }
]

interface PersonalityTraitsProps {
  userTraits: string[]
  connectionStyle?: string
  onTraitClick?: (trait: PersonalityTrait) => void
  isEditable?: boolean
}

export function PersonalityTraits({ userTraits, connectionStyle, onTraitClick, isEditable = false }: PersonalityTraitsProps) {
  const [selectedTrait, setSelectedTrait] = useState<PersonalityTrait | null>(null)
  
  const userTraitObjects = userTraits
    .map(traitId => personalityTraits.find(t => t.id === traitId))
    .filter(Boolean) as PersonalityTrait[]
  
  const userConnectionStyle = connectionStyles.find(style => style.primary === connectionStyle) || connectionStyles[0]

  const handleTraitClick = (trait: PersonalityTrait) => {
    setSelectedTrait(trait)
    onTraitClick?.(trait)
  }

  return (
    <div className="space-y-6">
      {/* Connection Style */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${userConnectionStyle.color} text-white`}>
              {userConnectionStyle.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{userConnectionStyle.primary}</h3>
              <p className="text-sm text-gray-400">Connection Style</p>
            </div>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            {userConnectionStyle.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {userConnectionStyle.secondary.map((traitName, index) => {
              const trait = personalityTraits.find(t => t.name === traitName)
              if (!trait) return null
              return (
                <Badge 
                  key={index}
                  variant="secondary" 
                  className={`${trait.color} text-white hover:opacity-80 cursor-pointer transition-opacity`}
                  onClick={() => handleTraitClick(trait)}
                >
                  {trait.icon}
                  <span className="ml-1">{trait.name}</span>
                </Badge>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Personality Traits */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Hangout Preferences</h3>
          <div className="flex flex-wrap gap-2">
            {userTraitObjects.map((trait) => (
              <Badge 
                key={trait.id}
                variant="outline" 
                className={`border-gray-600 text-gray-300 hover:${trait.color} hover:text-white cursor-pointer transition-all duration-200`}
                onClick={() => handleTraitClick(trait)}
              >
                {trait.icon}
                <span className="ml-1">{trait.name}</span>
              </Badge>
            ))}
          </div>
          {userTraitObjects.length === 0 && (
            <p className="text-gray-400 text-sm italic">
              {isEditable ? 'Add some personality traits to help others understand your hangout style!' : 'No personality traits added yet.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Trait Details Modal */}
      {selectedTrait && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${selectedTrait.color} text-white`}>
                {selectedTrait.icon}
              </div>
              <h3 className="text-lg font-semibold text-white">{selectedTrait.name}</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              {selectedTrait.description}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedTrait(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { personalityTraits, connectionStyles }
export type { PersonalityTrait, ConnectionStyle }

