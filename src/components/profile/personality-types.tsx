'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { 
  Plus, 
  X, 
  Edit3,
  Star,
  Brain,
  Sparkles,
  Target
} from 'lucide-react'

interface PersonalityType {
  id: string
  type: string
  category: 'myers-briggs' | 'big-five' | 'zodiac' | 'enneagram'
  description?: string
}

interface PersonalityTypesProps {
  userTypes: PersonalityType[]
  onTypesChange: (types: PersonalityType[]) => void
  isEditable?: boolean
}

const personalityCategories = {
  'myers-briggs': {
    name: 'Myers-Briggs',
    icon: <Brain className="w-4 h-4" />,
    color: 'bg-blue-500',
    placeholder: 'e.g., ENFP, INTJ, ESFJ...',
    description: '16 personality types based on cognitive functions'
  },
  'big-five': {
    name: 'Big 5',
    icon: <Target className="w-4 h-4" />,
    color: 'bg-green-500',
    placeholder: 'e.g., High Openness, Low Neuroticism...',
    description: 'Five-factor model of personality traits'
  },
  'zodiac': {
    name: 'Zodiac',
    icon: <Star className="w-4 h-4" />,
    color: 'bg-purple-500',
    placeholder: 'e.g., Scorpio, Aquarius, Cancer...',
    description: 'Astrological personality characteristics'
  },
  'enneagram': {
    name: 'Enneagram',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'bg-orange-500',
    placeholder: 'e.g., Type 3, Type 7w8, Type 4w5...',
    description: 'Nine personality types with wings and levels'
  }
}

export function PersonalityTypes({ userTypes, onTypesChange, isEditable = true }: PersonalityTypesProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof personalityCategories>('myers-briggs')
  const [newType, setNewType] = useState('')

  const handleAddType = () => {
    if (!newType.trim()) return

    const typeId = `${selectedCategory}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newPersonalityType: PersonalityType = {
      id: typeId,
      type: newType.trim(),
      category: selectedCategory
    }

    onTypesChange([...userTypes, newPersonalityType])
    setNewType('')
    setIsAdding(false)
  }

  const handleRemoveType = (typeId: string) => {
    onTypesChange(userTypes.filter(t => t.id !== typeId))
  }

  const handleEditType = (typeId: string, newTypeValue: string) => {
    onTypesChange(userTypes.map(t => 
      t.id === typeId ? { ...t, type: newTypeValue } : t
    ))
  }

  const getTypesByCategory = (category: keyof typeof personalityCategories) => {
    return userTypes.filter(t => t.category === category)
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Personality Types</h3>
          {isEditable && (
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title="Add personality type"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Add New Type */}
        {isAdding && (
          <div className="space-y-3 mb-4 p-3 bg-gray-700/30 rounded-lg">
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Select category:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(personalityCategories).map(([key, category]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key as keyof typeof personalityCategories)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all ${
                      selectedCategory === key
                        ? `${category.color} text-white`
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {category.icon}
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Input
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                placeholder={personalityCategories[selectedCategory].placeholder}
                className="flex-1 bg-gray-600 border-gray-500 text-white text-sm h-8"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddType()
                  }
                }}
              />
              <Button
                onClick={handleAddType}
                disabled={!newType.trim()}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white h-8 px-3"
              >
                Add
              </Button>
              <button
                onClick={() => {
                  setIsAdding(false)
                  setNewType('')
                }}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs text-gray-400">
              {personalityCategories[selectedCategory].description}
            </p>
          </div>
        )}

        {/* Display Types by Category */}
        <div className="space-y-3">
          {Object.entries(personalityCategories).map(([key, category]) => {
            const types = getTypesByCategory(key as keyof typeof personalityCategories)
            if (types.length === 0) return null

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded ${category.color} text-white`}>
                    {category.icon}
                  </div>
                  <h4 className="text-xs font-medium text-gray-300">{category.name}</h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {types.map((type) => (
                    <Badge 
                      key={type.id}
                      variant="outline" 
                      className={`border-gray-600 text-gray-300 hover:${category.color} hover:text-white transition-all duration-200 text-xs px-2 py-1 group`}
                    >
                      {category.icon}
                      <span className="ml-1">{type.type}</span>
                      {isEditable && (
                        <button
                          onClick={() => handleRemoveType(type.id)}
                          className="ml-1 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {userTypes.length === 0 && !isAdding && (
          <p className="text-gray-400 text-xs italic">
            {isEditable ? 'Add your personality types to help others understand you better' : 'No personality types added yet.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export type { PersonalityType }

