/**
 * Photo Matcher - Smart Photo Selection for Hangouts
 * 
 * Automatically selects appropriate photos based on hangout title
 * using keyword matching and category classification
 */

import { logger } from '@/lib/logger'

// Photo categories and their associated keywords
export const photoCategories = {
  coffee: {
    keywords: ['coffee', 'cafe', 'latte', 'espresso', 'cappuccino', 'mocha', 'brew', 'beans', 'morning'],
    photos: [
      '/hangout-images/coffee/coffee-1.jpg',
      '/hangout-images/coffee/coffee-2.jpg',
      '/hangout-images/coffee/coffee-3.jpg',
      '/hangout-images/coffee/coffee-4.jpg',
      '/hangout-images/coffee/coffee-5.jpg',
    ]
  },
  dinner: {
    keywords: ['dinner', 'restaurant', 'meal', 'eating', 'food', 'cuisine', 'dining', 'supper', 'feast'],
    photos: [
      '/hangout-images/dinner/dinner-1.jpg',
      '/hangout-images/dinner/dinner-2.jpg',
      '/hangout-images/dinner/dinner-3.jpg',
      '/hangout-images/dinner/dinner-4.jpg',
      '/hangout-images/dinner/dinner-5.jpg',
    ]
  },
  drinks: {
    keywords: ['drinks', 'bar', 'cocktails', 'beer', 'wine', 'happy hour', 'nightlife', 'pub', 'brewery'],
    photos: [
      '/hangout-images/drinks/drinks-1.jpg',
      '/hangout-images/drinks/drinks-2.jpg',
      '/hangout-images/drinks/drinks-3.jpg',
      '/hangout-images/drinks/drinks-4.jpg',
      '/hangout-images/drinks/drinks-5.jpg',
    ]
  },
  concerts: {
    keywords: ['concert', 'music', 'show', 'band', 'festival', 'live music', 'performance', 'gig'],
    photos: [
      '/hangout-images/concerts/concert-1.jpg',
      '/hangout-images/concerts/concert-2.jpg',
      '/hangout-images/concerts/concert-3.jpg',
      '/hangout-images/concerts/concert-4.jpg',
      '/hangout-images/concerts/concert-5.jpg',
    ]
  },
  sports: {
    keywords: ['game', 'sports', 'basketball', 'football', 'baseball', 'soccer', 'hockey', 'match', 'tournament'],
    photos: [
      '/hangout-images/sports/sports-1.jpg',
      '/hangout-images/sports/sports-2.jpg',
      '/hangout-images/sports/sports-3.jpg',
      '/hangout-images/sports/sports-4.jpg',
      '/hangout-images/sports/sports-5.jpg',
    ]
  },
  hiking: {
    keywords: ['hike', 'hiking', 'trail', 'outdoors', 'nature', 'mountain', 'walk', 'trek', 'adventure'],
    photos: [
      '/hangout-images/hiking/hiking-1.jpg',
      '/hangout-images/hiking/hiking-2.jpg',
      '/hangout-images/hiking/hiking-3.jpg',
      '/hangout-images/hiking/hiking-4.jpg',
      '/hangout-images/hiking/hiking-5.jpg',
    ]
  },
  movies: {
    keywords: ['movie', 'film', 'cinema', 'theater', 'flick', 'screening', 'netflix', 'watch'],
    photos: [
      '/hangout-images/movies/movie-1.jpg',
      '/hangout-images/movies/movie-2.jpg',
      '/hangout-images/movies/movie-3.jpg',
      '/hangout-images/movies/movie-4.jpg',
      '/hangout-images/movies/movie-5.jpg',
    ]
  },
  games: {
    keywords: ['game night', 'games', 'board games', 'gaming', 'cards', 'poker', 'monopoly', 'play'],
    photos: [
      '/hangout-images/games/games-1.jpg',
      '/hangout-images/games/games-2.jpg',
      '/hangout-images/games/games-3.jpg',
      '/hangout-images/games/games-4.jpg',
      '/hangout-images/games/games-5.jpg',
    ]
  }
}

const DEFAULT_PHOTO = '/hangout-images/default/default-hangout.jpg'

/**
 * Match a hangout title to the best photo category
 */
export function matchPhotoCategory(title: string): string {
  if (!title || title.trim().length === 0) {
    return 'default'
  }

  const titleLower = title.toLowerCase()
  let bestMatch: { category: string; score: number } | null = null

  // Score each category based on keyword matches
  for (const [category, { keywords }] of Object.entries(photoCategories)) {
    let score = 0
    
    for (const keyword of keywords) {
      if (titleLower.includes(keyword)) {
        // Exact word match gets higher score
        const wordBoundaryMatch = new RegExp(`\\b${keyword}\\b`, 'i').test(title)
        score += wordBoundaryMatch ? 2 : 1
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { category, score }
    }
  }

  return bestMatch ? bestMatch.category : 'default'
}

/**
 * Get a random photo from a category
 */
export function getPhotoFromCategory(category: string): string {
  const categoryData = photoCategories[category as keyof typeof photoCategories]
  
  if (!categoryData || !categoryData.photos || categoryData.photos.length === 0) {
    return DEFAULT_PHOTO
  }

  // Return a random photo from the category
  const randomIndex = Math.floor(Math.random() * categoryData.photos.length)
  return categoryData.photos[randomIndex]
}

/**
 * Main function: Match a hangout title to an appropriate photo
 */
export function matchHangoutPhoto(title: string): string {
  try {
    const category = matchPhotoCategory(title)
    const photo = getPhotoFromCategory(category)
    
    logger.info('Matched photo:', { title, category, photo })
    
    return photo
  } catch (error) {
    logger.error('Error matching hangout photo:', error)
    return DEFAULT_PHOTO
  }
}

/**
 * Get all photos for a specific category
 */
export function getAllPhotosForCategory(category: string): string[] {
  const categoryData = photoCategories[category as keyof typeof photoCategories]
  return categoryData?.photos || [DEFAULT_PHOTO]
}

/**
 * Get all available categories
 */
export function getAllCategories(): string[] {
  return Object.keys(photoCategories)
}

/**
 * Get a preview of matches for a title
 */
export function getMatchPreview(title: string): {
  category: string
  confidence: number
  photo: string
  alternatives: string[]
} {
  const category = matchPhotoCategory(title)
  const photo = getPhotoFromCategory(category)
  const allPhotos = getAllPhotosForCategory(category)
  const alternatives = allPhotos.filter(p => p !== photo).slice(0, 3)

  // Calculate simple confidence based on keyword matches
  const titleLower = title.toLowerCase()
  const categoryData = photoCategories[category as keyof typeof photoCategories]
  const matchCount = categoryData?.keywords.filter(k => titleLower.includes(k)).length || 0
  const confidence = category === 'default' ? 0 : Math.min(matchCount / 3, 1)

  return {
    category,
    confidence,
    photo,
    alternatives
  }
}


