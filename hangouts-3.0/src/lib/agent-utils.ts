// Agent utility functions

export interface AgentIntent {
  intent: 'discover_event' | 'create_hangout' | 'select_event' | 'select_friend' | 'add_activity' | 'confirm_action' | 'general_help' | 'casual_chat';
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
      const jsonPart = response.split(jsonMarker)[1].trim();
      return JSON.parse(jsonPart);
    }

    // Try to extract JSON array or object from the response
    const jsonMatch = response.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return null;
  } catch (error) {
    console.error('Failed to extract JSON from response:', error);
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

