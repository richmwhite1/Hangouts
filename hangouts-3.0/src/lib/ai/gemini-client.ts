/**
 * Google Gemini AI Client
 * 
 * Provides conversational AI assistance for hangout creation
 * using Gemini 1.5 Flash model with function calling
 * 
 * Cost: ~$0.001 per hangout creation (extremely cheap!)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '@/lib/logger'

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

if (!GOOGLE_AI_API_KEY) {
  logger.warn('GOOGLE_AI_API_KEY not configured - AI features will be disabled')
}

// Initialize Gemini API
const genAI = GOOGLE_AI_API_KEY ? new GoogleGenerativeAI(GOOGLE_AI_API_KEY) : null

// Use Gemini 1.5 Flash - fastest and cheapest model
const MODEL_NAME = 'gemini-1.5-flash'

export interface HangoutSuggestion {
  title: string
  description?: string
  location?: string
  dateTime?: string
  participants?: string[]
  reasoning?: string
}

/**
 * Generate hangout suggestions based on user input
 */
export async function generateHangoutSuggestions(
  userInput: string,
  context: {
    userId?: string
    recentHangouts?: string[]
    friendNames?: string[]
    userLocation?: string
  }
): Promise<HangoutSuggestion[]> {
  if (!genAI) {
    throw new Error('Google AI not configured')
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME })

    const contextInfo = `
User input: "${userInput}"
Context:
- Recent hangouts: ${context.recentHangouts?.join(', ') || 'None'}
- Friends: ${context.friendNames?.join(', ') || 'None specified'}
- Location: ${context.userLocation || 'Unknown'}

Generate 2-3 hangout suggestions based on this input. For each suggestion, provide:
1. title - A catchy, short title (e.g., "Coffee Catch-up", "Weekend Brunch")
2. description - Brief description (optional)
3. location - Suggested location if applicable
4. dateTime - Suggested date/time in ISO format if mentioned
5. participants - List of friend names if mentioned
6. reasoning - Why this suggestion makes sense

Return the suggestions as a JSON array.`

    const result = await model.generateContent(contextInfo)
    const response = result.response
    const text = response.text()

    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0])
      logger.info('Generated hangout suggestions:', { count: suggestions.length })
      return suggestions
    }

    // Fallback if no JSON found
    logger.warn('Could not parse AI response as JSON')
    return []
  } catch (error) {
    logger.error('Error generating hangout suggestions:', error)
    throw error
  }
}

/**
 * Parse natural language input into structured hangout data
 */
export async function parseHangoutInput(
  userInput: string,
  context?: {
    friendNames?: string[]
    userLocation?: string
  }
): Promise<Partial<HangoutSuggestion>> {
  if (!genAI) {
    throw new Error('Google AI not configured')
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME })

    const prompt = `
Parse this hangout input into structured data:
"${userInput}"

Context:
- Available friends: ${context?.friendNames?.join(', ') || 'None'}
- User location: ${context?.userLocation || 'Unknown'}

Extract and return JSON with:
{
  "title": "hangout title",
  "description": "brief description (optional)",
  "location": "specific location if mentioned",
  "dateTime": "ISO date if mentioned (e.g., 2024-12-15T19:00:00.000Z)",
  "participants": ["friend names mentioned"],
  "confidence": 0.0-1.0
}

If something isn't mentioned, omit that field or set to null.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      logger.info('Parsed hangout input:', { parsed })
      return parsed
    }

    logger.warn('Could not parse AI response')
    return {}
  } catch (error) {
    logger.error('Error parsing hangout input:', error)
    throw error
  }
}

/**
 * Generate smart auto-complete suggestions as user types
 */
export async function generateAutoCompleteSuggestions(
  partialInput: string,
  context: {
    recentTitles?: string[]
    friendNames?: string[]
  }
): Promise<string[]> {
  if (!genAI || partialInput.length < 3) {
    return []
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME })

    const prompt = `
User is typing: "${partialInput}"

Suggest 3-5 completions for this hangout title based on:
- Recent titles: ${context.recentTitles?.join(', ') || 'None'}
- Friends: ${context.friendNames?.join(', ') || 'None'}

Return only a JSON array of completion strings, e.g.:
["Coffee with Sarah tomorrow", "Weekend brunch plans", "Friday game night"]

Keep suggestions natural and conversational.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Parse JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0])
      return suggestions.slice(0, 5)
    }

    return []
  } catch (error) {
    logger.error('Error generating auto-complete:', error)
    return []
  }
}

/**
 * Get smart time suggestions based on context
 */
export async function suggestOptimalTimes(context: {
  title?: string
  participants?: string[]
  userPreferences?: any
}): Promise<{ dateTime: string; reason: string }[]> {
  if (!genAI) {
    throw new Error('Google AI not configured')
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME })

    const prompt = `
Suggest 3 optimal times for this hangout:
- Title: ${context.title || 'Unknown'}
- Participants: ${context.participants?.join(', ') || 'Just me'}

Consider:
- Type of activity (coffee=morning, dinner=evening, etc.)
- Weekend vs weekday appropriateness
- Typical social patterns

Return JSON array:
[
  {
    "dateTime": "ISO string",
    "reason": "Why this time is good"
  }
]`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return []
  } catch (error) {
    logger.error('Error suggesting optimal times:', error)
    throw error
  }
}

/**
 * Check if Gemini AI is available
 */
export function isGeminiAvailable(): boolean {
  return !!genAI
}

/**
 * Get model info
 */
export function getModelInfo() {
  return {
    modelName: MODEL_NAME,
    available: isGeminiAvailable(),
    features: [
      'Natural language parsing',
      'Smart suggestions',
      'Auto-complete',
      'Time optimization',
      'Multi-modal (text + voice)'
    ]
  }
}
