"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, X, MapPin, ExternalLink } from "lucide-react"
import { useState } from "react"

interface Preference {
  id: string
  name: string
  icon?: React.ReactNode
  color?: string
  isCustom?: boolean
}

interface Place {
  id: string
  title: string
  mapLink?: string
}

interface PreferencesAndPlacesProps {
  userPreferences: Preference[]
  favoritePlaces: Place[]
  onPreferencesChange: (preferences: Preference[]) => void
  onPlacesChange: (places: Place[]) => void
}

export function PreferencesAndPlaces({ 
  userPreferences, 
  favoritePlaces, 
  onPreferencesChange, 
  onPlacesChange 
}: PreferencesAndPlacesProps) {
  const [newPreference, setNewPreference] = useState("")
  const [newPlace, setNewPlace] = useState("")
  const [isAddingPreference, setIsAddingPreference] = useState(false)
  const [isAddingPlace, setIsAddingPlace] = useState(false)

  const handleAddPreference = () => {
    if (newPreference.trim()) {
      const newPref: Preference = {
        id: `custom_${Date.now()}`,
        name: newPreference.trim(),
        isCustom: true,
        color: 'bg-gray-600'
      }
      onPreferencesChange([...userPreferences, newPref])
      setNewPreference("")
      setIsAddingPreference(false)
    }
  }

  const handleRemovePreference = (id: string) => {
    onPreferencesChange(userPreferences.filter(p => p.id !== id))
  }

  const handleAddPlace = () => {
    if (newPlace.trim()) {
      const newPlaceObj: Place = {
        id: `place_${Date.now()}`,
        title: newPlace.trim(),
        mapLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(newPlace.trim())}`
      }
      onPlacesChange([...favoritePlaces, newPlaceObj])
      setNewPlace("")
      setIsAddingPlace(false)
    }
  }

  const generateMapLink = (placeTitle: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeTitle)}`
  }

  const handlePlaceClick = (place: Place) => {
    const mapLink = place.mapLink || generateMapLink(place.title)
    window.open(mapLink, '_blank', 'noopener,noreferrer')
  }

  const handleRemovePlace = (id: string) => {
    onPlacesChange(favoritePlaces.filter(p => p.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Preferences Section */}
      <Card className="bg-gray-900/30 border-gray-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-300">Favorite Activities</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2 mb-3">
            {userPreferences.map((preference) => (
              <div
                key={preference.id}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-gray-300 bg-gray-800/50 border border-gray-600/30 hover:bg-gray-800/70 transition-colors"
              >
                {preference.icon}
                <span>{preference.name}</span>
                <button
                  onClick={() => handleRemovePreference(preference.id)}
                  className="ml-1 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          
          {isAddingPreference ? (
            <div className="flex gap-2">
              <Input
                value={newPreference}
                onChange={(e) => setNewPreference(e.target.value)}
                placeholder="Add activity..."
                className="flex-1 h-8 text-xs bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddPreference()}
              />
              <Button 
                onClick={handleAddPreference} 
                size="sm" 
                className="h-8 px-3 text-xs bg-blue-600/80 hover:bg-blue-700/80"
              >
                Add
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddingPreference(false)
                  setNewPreference("")
                }}
                size="sm"
                className="h-8 px-3 text-xs border-gray-600/50 text-gray-300 hover:bg-gray-800/50"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsAddingPreference(true)}
              className="w-full h-8 text-xs border-gray-600/50 text-gray-300 hover:bg-gray-800/50"
            >
              <Plus className="w-3 h-3 mr-1.5" />
              Add Activity
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Places Section */}
      <Card className="bg-gray-900/30 border-gray-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-300">Favorite Places</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 mb-3">
            {favoritePlaces.map((place) => (
              <div
                key={place.id}
                className="flex items-center justify-between p-2.5 border border-gray-600/30 rounded-md bg-gray-800/30 hover:bg-gray-800/50 transition-colors group"
              >
                <div 
                  className="flex items-center gap-2 flex-1 cursor-pointer hover:text-gray-200 transition-colors"
                  onClick={() => handlePlaceClick(place)}
                >
                  <MapPin className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-300 transition-colors" />
                  <span className="text-xs text-gray-300 group-hover:text-gray-200 transition-colors">{place.title}</span>
                  <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-gray-400 transition-colors ml-1" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemovePlace(place.id)
                  }}
                  className="text-gray-500 hover:text-gray-300 transition-colors p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          
          {isAddingPlace ? (
            <div className="flex gap-2">
              <Input
                value={newPlace}
                onChange={(e) => setNewPlace(e.target.value)}
                placeholder="Add place..."
                className="flex-1 h-8 text-xs bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddPlace()}
              />
              <Button 
                onClick={handleAddPlace} 
                size="sm" 
                className="h-8 px-3 text-xs bg-blue-600/80 hover:bg-blue-700/80"
              >
                Add
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddingPlace(false)
                  setNewPlace("")
                }}
                size="sm"
                className="h-8 px-3 text-xs border-gray-600/50 text-gray-300 hover:bg-gray-800/50"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsAddingPlace(true)}
              className="w-full h-8 text-xs border-gray-600/50 text-gray-300 hover:bg-gray-800/50"
            >
              <Plus className="w-3 h-3 mr-1.5" />
              Add Place
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
