// Agent utility functions

export interface AgentIntent {
  intent: 'discover_event' | 'create_hangout' | 'select_event' | 'select_friend' | 'add_activity' | 'confirm_action' | 'mark_interest' | 'mark_going' | 'show_trending' | 'general_help' | 'casual_chat';
  entities: {
    eventType?: string;
    location?: string;
    date?: string;
    time?: string;
    eventIndex?: number;
    friendNames?: string[];
    activity?: string;
  };
  confidence: number;
}

export interface AgentContext {
  currentStep?: 'discovering' | 'selecting_event' | 'selecting_friends' | 'adding_activities' | 'confirming';
  discoveredEvents?: any[];
  selectedEvent?: any;
  selectedFriends?: string[];
  activities?: string[];
  savedEvents?: any[];
  userLocation?: string;
}

export function parseIntent(intentJson: string): AgentIntent | null {
  try {
    const parsed = JSON.parse(intentJson);
    return parsed as AgentIntent;
  } catch (error) {
    console.error('Failed to parse intent JSON:', error);
    return null;
  }
}

export function extractJSONFromResponse(response: string): any | null {
  try {
    // Try to find JSON data after a marker
    const jsonMarker = 'JSON_DATA:';
    if (response.includes(jsonMarker)) {
      const afterMarker = response.split(jsonMarker)[1];
      // Extract the JSON array
      const jsonMatch = afterMarker.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const events = JSON.parse(jsonMatch[0]);
        logger.info(`✅ Extracted ${events.length} events from Perplexity response`);
        return events;
      }
    }

    // Try to extract JSON array or object from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const events = JSON.parse(jsonMatch[0]);
      logger.info(`✅ Extracted ${events.length} events from response (no marker)`);
      return events;
    }

    logger.warn('⚠️  No JSON array found in response');
    return null;
  } catch (error) {
    logger.error('❌ Failed to extract JSON from response:', error);
    logger.error('Response preview:', response.substring(0, 500));
    return null;
  }
}

export function updateContext(currentContext: AgentContext, updates: Partial<AgentContext>): AgentContext {
  return {
    ...currentContext,
    ...updates,
  };
}

export function shouldShowEventCards(intent: AgentIntent, context: AgentContext): boolean {
  return intent.intent === 'discover_event' || (context.discoveredEvents && context.discoveredEvents.length > 0);
}

export function shouldShowFriendSelector(intent: AgentIntent, context: AgentContext): boolean {
  return context.currentStep === 'selecting_friends' || (intent.intent === 'create_hangout' && context.selectedEvent);
}

export function shouldShowActivityInput(context: AgentContext): boolean {
  return context.currentStep === 'adding_activities' && context.selectedFriends && context.selectedFriends.length > 0;
}

export function generateHangoutSummary(context: AgentContext): string {
  const parts: string[] = [];

  if (context.selectedEvent) {
    parts.push(`Event: ${context.selectedEvent.title} at ${context.selectedEvent.venue}`);
  }

  if (context.activities && context.activities.length > 0) {
    parts.push(`Activities: ${context.activities.join(', ')}`);
  }

  if (context.selectedFriends && context.selectedFriends.length > 0) {
    parts.push(`Friends: ${context.selectedFriends.length} invited`);
  }

  return parts.join(' | ');
}

export function isEventDiscoveryQuery(message: string): boolean {
  const eventKeywords = ['find', 'search', 'looking for', 'show me', 'concert', 'event', 'show', 'restaurant', 'bar', 'activity', 'movie', 'theater'];
  const lowerMessage = message.toLowerCase();
  return eventKeywords.some(keyword => lowerMessage.includes(keyword));
}

export function isHangoutCreationQuery(message: string): boolean {
  const hangoutKeywords = ['create hangout', 'make plans', 'invite friends', 'plan with', 'hangout with'];
  const lowerMessage = message.toLowerCase();
  return hangoutKeywords.some(keyword => lowerMessage.includes(keyword));
}

export function extractEventIndex(message: string): number | null {
  // Try to extract a number from messages like "the first one", "option 2", "number 3"
  const numberWords: Record<string, number> = {
    'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5
  };

  const lowerMessage = message.toLowerCase();

  // Check for word numbers
  for (const [word, num] of Object.entries(numberWords)) {
    if (lowerMessage.includes(word)) {
      return num;
    }
  }

  // Check for digit numbers
  const digitMatch = lowerMessage.match(/\b(\d+)\b/);
  if (digitMatch) {
    const num = parseInt(digitMatch[1], 10);
    if (num >= 1 && num <= 10) {
      return num;
    }
  }

  return null;
}

export function calculateTokenUsage(messages: Array<{ role: string; content: string }>): { estimatedTokens: number; estimatedCost: number } {
  // Rough estimation: ~4 characters per token
  const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  const estimatedTokens = Math.ceil(totalChars / 4);

  // GPT-4o-mini pricing (approximate)
  const inputCostPer1M = 0.15; // $0.15 per 1M input tokens
  const outputCostPer1M = 0.60; // $0.60 per 1M output tokens
  
  // Assume roughly 50/50 split input/output
  const estimatedCost = (estimatedTokens / 1_000_000) * ((inputCostPer1M + outputCostPer1M) / 2);

  return { estimatedTokens, estimatedCost };
}

// Query normalization and hashing
export function normalizeQuery(query: string, location?: string): string {
  // Lowercase, remove extra spaces, standardize time references
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
  return location ? `${normalized}|${location.toLowerCase()}` : normalized;
}

export function hashQuery(normalizedQuery: string): string {
  // Simple hash for cache key using base64 encoding
  return Buffer.from(normalizedQuery).toString('base64');
}

export function extractTimeWindow(query: string): string | null {
  const timeKeywords: Record<string, string> = {
    'tonight': 'tonight',
    'today': 'today',
    'tomorrow': 'tomorrow',
    'this weekend': 'this_weekend',
    'this week': 'this_week',
    'weekend': 'this_weekend',
    'next week': 'next_week',
    'next weekend': 'next_weekend'
  };
  
  const lowerQuery = query.toLowerCase();
  for (const [keyword, window] of Object.entries(timeKeywords)) {
    if (lowerQuery.includes(keyword)) return window;
  }
  return null;
}

export function getTimeWindowDates(window: string): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (window) {
    case 'tonight':
    case 'today':
      return {
        start: today,
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      };
    
    case 'tomorrow':
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        start: tomorrow,
        end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59)
      };
    
    case 'this_weekend':
    case 'weekend':
      // Find next Saturday
      const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
      const saturday = new Date(today);
      saturday.setDate(saturday.getDate() + daysUntilSaturday);
      const sunday = new Date(saturday);
      sunday.setDate(sunday.getDate() + 1);
      return {
        start: saturday,
        end: new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59)
      };
    
    case 'this_week':
      const endOfWeek = new Date(today);
      endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));
      return {
        start: today,
        end: new Date(endOfWeek.getFullYear(), endOfWeek.getMonth(), endOfWeek.getDate(), 23, 59, 59)
      };
    
    case 'next_week':
      const nextWeekStart = new Date(today);
      nextWeekStart.setDate(nextWeekStart.getDate() + (7 - today.getDay() + 1));
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
      return {
        start: nextWeekStart,
        end: new Date(nextWeekEnd.getFullYear(), nextWeekEnd.getMonth(), nextWeekEnd.getDate(), 23, 59, 59)
      };
    
    case 'next_weekend':
      const nextSaturday = new Date(today);
      const daysUntilNextSaturday = (6 - today.getDay() + 7) % 7 || 7;
      nextSaturday.setDate(nextSaturday.getDate() + daysUntilNextSaturday + 7);
      const nextSunday = new Date(nextSaturday);
      nextSunday.setDate(nextSunday.getDate() + 1);
      return {
        start: nextSaturday,
        end: new Date(nextSunday.getFullYear(), nextSunday.getMonth(), nextSunday.getDate(), 23, 59, 59)
      };
    
    default:
      // Default to next 7 days
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return {
        start: today,
        end: weekFromNow
      };
  }
}

export function getUserLocationFromIP(request: any): string | null {
  // Use request headers (Cloudflare, Vercel, etc. provide geo headers)
  const city = request.headers.get('x-vercel-ip-city') || 
               request.headers.get('cf-ipcity');
  const region = request.headers.get('x-vercel-ip-country-region') ||
                 request.headers.get('cf-region');
  
  if (city && region) {
    // Decode URI components in case they're encoded
    try {
      const decodedCity = decodeURIComponent(city);
      const decodedRegion = decodeURIComponent(region);
      return `${decodedCity}, ${decodedRegion}`;
    } catch {
      return city && region ? `${city}, ${region}` : null;
    }
  }
  
  return null;
}

