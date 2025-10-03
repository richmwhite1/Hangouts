// Free geocoding service using Nominatim (OpenStreetMap)
export interface LocationResult {
  display_name: string
  lat: string
  lon: string
  place_id: string
  type: string
  importance: number
}

export interface GeocodeResult {
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

export async function geocodeAddress(address: string): Promise<GeocodeResult[]> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Hangouts3.0/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Geocoding request failed')
    }

    const results: LocationResult[] = await response.json()
    
    return results.map(result => ({
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
      address: {
        city: result.address?.city || result.address?.town || result.address?.village,
        state: result.address?.state,
        country: result.address?.country,
        postcode: result.address?.postcode,
      }
    }))
  } catch (error) {
    console.error('Geocoding error:', error)
    return []
  }
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Hangouts3.0/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Reverse geocoding request failed')
    }

    const result = await response.json()
    
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
      address: {
        city: result.address?.city || result.address?.town || result.address?.village,
        state: result.address?.state,
        country: result.address?.country,
        postcode: result.address?.postcode,
      }
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

export function formatLocationName(result: GeocodeResult): string {
  const parts = []
  
  if (result.address.city) parts.push(result.address.city)
  if (result.address.state) parts.push(result.address.state)
  if (result.address.country) parts.push(result.address.country)
  
  return parts.length > 0 ? parts.join(', ') : result.displayName
}

export function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const d = R * c // Distance in km
  return d
}

function deg2rad(deg: number): number {
  return deg * (Math.PI/180)
}



















