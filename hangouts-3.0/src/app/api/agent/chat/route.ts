import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getClerkApiUser } from '@/lib/clerk-auth';
import { db } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import OpenAI from 'openai';
import axios from 'axios';
import {
  SYSTEM_PROMPT,
  INTENT_DETECTION_PROMPT,
  EVENT_DISCOVERY_PROMPT,
  HANGOUT_CREATION_PROMPT,
  formatConversationHistory,
} from '@/lib/agent-prompts';
import {
  parseIntent,
  extractJSONFromResponse,
  updateContext,
  shouldShowEventCards,
  shouldShowFriendSelector,
  AgentContext,
  getUserLocationFromIP,
  extractTimeWindow,
} from '@/lib/agent-utils';
import { getCachedSearch, cacheSearchResults, getTrendingSearches } from '@/lib/agent-cache-service';
import { querySystemEvents } from '@/lib/agent-event-queries';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// Lazy initialization of OpenAI client to prevent build-time errors
let openai: OpenAI | null = null;
function getOpenAIClient() {
  if (!openai && OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return openai;
}

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'Authentication required'),
        { status: 401 }
      );
    }

    const clerkUser = await getClerkApiUser();
    if (!clerkUser) {
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'User not found'),
        { status: 401 }
      );
    }

    const userId = clerkUser.id;
    const body = await request.json();
    const { message, conversationId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        createErrorResponse('Invalid request', 'Message is required'),
        { status: 400 }
      );
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await db.agentConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20, // Last 20 messages
          },
        },
      });

      if (!conversation || conversation.userId !== userId) {
        return NextResponse.json(
          createErrorResponse('Invalid conversation', 'Conversation not found or access denied'),
          { status: 404 }
        );
      }
    } else {
      conversation = await db.agentConversation.create({
        data: {
          userId,
          context: {},
        },
        include: { messages: true },
      });
    }

    // Save user message
    await db.agentMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    });

    // Get conversation context
    const context: AgentContext = (conversation.context as AgentContext) || {};
    const conversationHistory = formatConversationHistory(
      conversation.messages.map(m => ({ role: m.role, content: m.content }))
    );

    // Step 1: Detect intent (with graceful fallback if OpenAI is not configured)
    const client = getOpenAIClient();
    let intent: any = null;
    if (client) {
      try {
        const intentResponse = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: INTENT_DETECTION_PROMPT },
            { role: 'user', content: `Previous conversation:\n${conversationHistory}\n\nCurrent message: ${message}` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });
        const intentContent = intentResponse.choices[0]?.message?.content;
        intent = intentContent ? parseIntent(intentContent) : null;
      } catch (e) {
        logger.error('Intent detection failed; falling back to heuristic', e);
      }
    }
    if (!intent) {
      // Heuristic fallback
      const lower = String(message || '').toLowerCase();
      const looksLikeDiscovery = lower.includes('find') || lower.includes('event') || lower.includes('concert') || lower.includes('what\'s happening') || lower.includes('this weekend') || lower.includes('tonight');
      intent = {
        intent: looksLikeDiscovery ? 'discover_event' : 'general_help',
        entities: {},
        confidence: 0.4,
      };
    }

    logger.info('Detected intent:', intent);

    let assistantMessage = '';
    let actionHint: string | null = null;
    let actionData: any = null;
    let updatedContext = context;

    // Step 2: Handle based on intent
    switch (intent.intent) {
      case 'discover_event':
        try {
          const searchQuery = message;
          let location = intent.entities.location || 
                         context.userLocation;
          
          // Fallback to IP geolocation with specific city
          if (!location) {
            location = getUserLocationFromIP(request) || 'Salt Lake City, UT';
            logger.info(`📍 Using fallback location: ${location}`);
            if (location) {
              updatedContext = updateContext(context, { userLocation: location });
            }
          } else {
            logger.info(`📍 Using location from user: ${location}`);
          }
          
          const timeWindow = extractTimeWindow(searchQuery);
          logger.info(`⏰ Time window extracted:`, timeWindow || 'none');
          
          // Step 1: Check system events first (location required, timeWindow optional)
          let systemEvents: any[] = [];
          if (location) {
            try {
              systemEvents = await querySystemEvents(
                location, 
                timeWindow || undefined,
                intent.entities.eventType
              );
              logger.info(`📅 Found ${systemEvents.length} system events`);
            } catch (error) {
              logger.error('Error querying system events:', error);
            }
          } else {
            logger.info('⚠️  No location found, skipping system events query');
          }
          
          // Step 2: Check cache for external events
          let cachedEvents = await getCachedSearch(searchQuery, location);
          logger.info(`🔍 Cache check for "${searchQuery}" in ${location || 'no location'}:`, cachedEvents ? `Found ${cachedEvents.length} cached events` : 'No cache');
          
          let externalEvents: any[] = [];
          if (!cachedEvents) {
            // Step 3: Call Perplexity only if no cache and key present
            if (PERPLEXITY_API_KEY) {
              logger.info(`🌐 Calling Perplexity API for "${searchQuery}" in ${location || 'no location'}`);
              try {
                const perplexityResponse = await axios.post(
                  PERPLEXITY_API_URL,
                  {
                    model: 'sonar-pro',
                    messages: [
                      { role: 'system', content: 'You are a JSON API that returns real-time event data. Always respond with valid JSON only.' },
                      { role: 'user', content: EVENT_DISCOVERY_PROMPT(searchQuery, location) },
                    ],
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
                      'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                  }
                );
                const perplexityContent = perplexityResponse.data.choices[0]?.message?.content || '';
                logger.info('📝 Perplexity response received, length:', perplexityContent.length);
                logger.info('📄 Full Perplexity response:', perplexityContent);
                logger.debug('Response preview:', perplexityContent.substring(0, 300));
                externalEvents = extractJSONFromResponse(perplexityContent) || [];
                logger.info(`📊 Extracted ${externalEvents.length} events from Perplexity`);
                if (externalEvents.length > 0) {
                  await cacheSearchResults(searchQuery, location, externalEvents);
                  logger.info(`💾 Cached ${externalEvents.length} events`);
                }
              } catch (perplexityError: any) {
                logger.error('❌ Error calling Perplexity API:', perplexityError.response?.data || perplexityError.message);
              }
            } else {
              logger.info('PERPLEXITY_API_KEY not set; skipping external search');
            }
          } else {
            externalEvents = cachedEvents;
            logger.info(`✅ Using ${cachedEvents.length} cached events`);
          }
          
          // Combine system + external events and dedupe by title+date
          const allEvents = [...systemEvents, ...externalEvents];
          logger.info(`📊 Before deduplication: ${allEvents.length} events (${systemEvents.length} system + ${externalEvents.length} external)`);
          const seen = new Set<string>();
          const deduped = allEvents.filter(e => {
            const key = `${(e.title || '').toLowerCase()}|${e.date || ''}`;
            if (seen.has(key)) {
              logger.debug(`Duplicate event skipped: ${e.title}`);
              return false;
            }
            seen.add(key);
            return true;
          });
          logger.info(`📋 Total events found: ${allEvents.length} (${systemEvents.length} system + ${externalEvents.length} external), deduped to ${deduped.length}`);
          
          // Log event titles for debugging
          if (deduped.length > 0) {
            logger.info(`✅ Events to display:`, deduped.map(e => e.title).join(', '));
          }
          
          if (deduped.length > 0) {
            const systemCount = systemEvents.length;
            const externalCount = externalEvents.length;
            
            assistantMessage = `I found ${deduped.length} event${deduped.length !== 1 ? 's' : ''} ${location ? `in ${location}` : ''}${timeWindow ? ` ${timeWindow.replace('_', ' ')}` : ''}!\n\n`;
            
            if (systemCount > 0) {
              assistantMessage += `${systemCount} from the Hangout community`;
              if (externalCount > 0) assistantMessage += ` and ${externalCount} from around the web`;
              assistantMessage += '.\n\n';
            }
            
            assistantMessage += 'Which one interests you?';
            
            updatedContext = updateContext(context, {
              currentStep: 'selecting_event',
              discoveredEvents: deduped,
            });
            actionHint = 'show_events';
            actionData = deduped;
          } else {
            // Provide helpful suggestions when no events found
            assistantMessage = `I couldn't find any events matching "${searchQuery}" ${location ? `in ${location}` : ''}.\n\n`;
            assistantMessage += `Try:\n`;
            assistantMessage += `• Being more specific (e.g., "jazz concerts" instead of just "concerts")\n`;
            assistantMessage += `• A different time frame (e.g., "events this week" or "next weekend")\n`;
            assistantMessage += `• A nearby city if you're in a smaller area\n\n`;
            assistantMessage += `You can also check:\n`;
            assistantMessage += `• Meetup.com for local meetups and activities\n`;
            assistantMessage += `• Eventbrite.com for ticketed events\n`;
            if (location?.toLowerCase().includes('salt lake')) {
              assistantMessage += `• VisitSaltLake.com for Salt Lake City events\n`;
            }
            assistantMessage += `\nWhat else can I help you find?`;
          }
        } catch (error: any) {
          logger.error('Error discovering events:', error);
          assistantMessage = "I'm having trouble searching for events right now. Try again in a moment.";
        }
        break;

      case 'select_event':
        const eventIndex = intent.entities.eventIndex;
        if (eventIndex && context.discoveredEvents && eventIndex <= context.discoveredEvents.length) {
          const selectedEvent = context.discoveredEvents[eventIndex - 1];
          
          // If external event, create it in system first
          if (!selectedEvent.isSystemEvent) {
            try {
              // Helper function to parse price string
              const parsePrice = (priceStr: string): number | null => {
                if (!priceStr || priceStr.toLowerCase() === 'free') return 0;
                const match = priceStr.match(/\$?(\d+)/);
                return match ? parseInt(match[1], 10) : null;
              };
              
              // Helper to parse event date/time
              const parseEventDateTime = (dateStr: string, timeStr: string): Date | null => {
                try {
                  // Combine date and time strings and parse
                  const combined = `${dateStr} ${timeStr}`;
                  const parsed = new Date(combined);
                  return isNaN(parsed.getTime()) ? null : parsed;
                } catch {
                  return null;
                }
              };
              
              // Generate unique ID
              const generateId = () => Math.random().toString(36).substring(2, 15);
              
              const newEvent = await db.content.create({
                data: {
                  id: `event_${Date.now()}_${generateId()}`,
                  type: 'EVENT',
                  title: selectedEvent.title,
                  description: selectedEvent.description || '',
                  venue: selectedEvent.venue || '',
                  location: selectedEvent.venue || '',
                  startTime: parseEventDateTime(selectedEvent.date, selectedEvent.time) || new Date(),
                  image: selectedEvent.image || null,
                  ticketUrl: selectedEvent.url || null,
                  status: 'PUBLISHED',
                  privacyLevel: 'PUBLIC',
                  source: 'DISCOVERED',
                  creatorId: userId,
                  priceMin: parsePrice(selectedEvent.price),
                  updatedAt: new Date()
                }
              });
              
              selectedEvent.id = newEvent.id;
              selectedEvent.isSystemEvent = true;
              
              logger.info('Created event from discovery', { eventId: newEvent.id, title: newEvent.title });
            } catch (error) {
              logger.error('Error creating event from discovery:', error);
              // Continue anyway with the external event data
            }
          }
          
          updatedContext = updateContext(context, {
            currentStep: 'ask_action',
            selectedEvent,
          });
          
          assistantMessage = `Great choice! "${selectedEvent.title}" at ${selectedEvent.venue}.\n\n`;
          assistantMessage += `Would you like to:\n`;
          assistantMessage += `1. Mark as "interested" (save for later)\n`;
          assistantMessage += `2. Mark as "going" (RSVP yes)\n`;
          assistantMessage += `3. Create a hangout with friends\n\n`;
          assistantMessage += `Just let me know!`;
          
          actionHint = 'show_event_actions';
          actionData = { selectedEvent, actions: ['interested', 'going', 'hangout'] };
        } else {
          assistantMessage = "I'm not sure which event. Could you specify the number?";
        }
        break;

      case 'create_hangout':
        if (context.selectedEvent) {
          // Already have an event, now get friends
          const friends = await db.friendship.findMany({
            where: {
              userId,
              status: 'ACTIVE',
            },
            include: {
              friend: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          });

          updatedContext = updateContext(context, {
            currentStep: 'selecting_friends',
          });

          if (friends.length === 0) {
            assistantMessage = "Looks like you don't have any friends added yet. You can add friends from the Friends page first!";
          } else {
            assistantMessage = `Who would you like to invite to this hangout? You have ${friends.length} friends.`;
            actionHint = 'show_friend_selector';
            actionData = friends.map(f => f.friend);
          }
        } else {
          // Check if user has saved events
          const savedEvents = await db.content.findMany({
            where: {
              type: 'EVENT',
              eventSaves: {
                some: { userId },
              },
              startTime: {
                gte: new Date(), // Future events only
              },
            },
            orderBy: { startTime: 'asc' },
            take: 10,
          });

          if (savedEvents.length > 0) {
            updatedContext = updateContext(context, {
              savedEvents,
              currentStep: 'selecting_event',
            });
            assistantMessage = `I see you have ${savedEvents.length} saved event(s). Would you like to create a hangout for one of these, or should I help you find a new event?`;
            actionHint = 'show_saved_events';
            actionData = savedEvents;
          } else {
            assistantMessage = "Let's create a hangout! Would you like me to find an event, or would you prefer to create a custom activity?";
            updatedContext = updateContext(context, {
              currentStep: 'discovering',
            });
          }
        }
        break;

      case 'mark_interest':
      case 'mark_going':
        if (context.selectedEvent && context.selectedEvent.isSystemEvent) {
          const status = intent.intent === 'mark_going' ? 'YES' : 'MAYBE';
          
          try {
            // Generate unique ID
            const generateId = () => Math.random().toString(36).substring(2, 15);
            
            // Create RSVP
            await db.rsvp.upsert({
              where: {
                contentId_userId: {
                  contentId: context.selectedEvent.id,
                  userId
                }
              },
              create: {
                id: `rsvp_${Date.now()}_${generateId()}`,
                contentId: context.selectedEvent.id,
                userId,
                status,
                respondedAt: new Date()
              },
              update: {
                status,
                respondedAt: new Date()
              }
            });
            
            // Create EventSave for interested
            if (status === 'MAYBE') {
              await db.eventSave.upsert({
                where: {
                  contentId_userId: {
                    contentId: context.selectedEvent.id,
                    userId
                  }
                },
                create: {
                  contentId: context.selectedEvent.id,
                  userId
                },
                update: {}
              });
            }
            
            assistantMessage = status === 'YES' 
              ? `Awesome! I've marked you as going to "${context.selectedEvent.title}". You'll see it on your home feed!`
              : `Great! I've saved "${context.selectedEvent.title}" to your interested list. You can find it on your Events page.`;
            
            updatedContext = updateContext(context, {
              currentStep: 'completed',
              selectedEvent: null
            });
            
            logger.info('User marked event interest', { 
              eventId: context.selectedEvent.id, 
              status, 
              userId 
            });
          } catch (error) {
            logger.error('Error marking event interest:', error);
            assistantMessage = "I had trouble saving that. Please try again!";
          }
        } else {
          assistantMessage = "Please select an event first!";
        }
        break;

      case 'show_trending':
        try {
          const location = context.userLocation || getUserLocationFromIP(request);
          const trending = await getTrendingSearches(location || undefined, 5);
          
          if (trending.length > 0) {
            assistantMessage = `Hi! I can help you discover events and create hangouts. `;
            assistantMessage += `Here's what others ${location ? `in ${location}` : 'in your area'} are looking for:\n\n`;
            assistantMessage += trending.map((q, i) => `${i + 1}. ${q}`).join('\n');
            assistantMessage += '\n\nWhat would you like to explore?';
            actionHint = 'show_trending_suggestions';
            actionData = trending;
          } else {
            assistantMessage = "I can help you discover events and create hangouts! What are you looking for?";
          }
        } catch (error) {
          logger.error('Error getting trending searches:', error);
          assistantMessage = "I can help you discover events and create hangouts! What are you looking for?";
        }
        break;

      case 'general_help':
      case 'casual_chat':
      default:
        // Generate a conversational response or fallback if no OpenAI
        if (client) {
          const chatResponse = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: `Previous conversation:\n${conversationHistory}\n\nUser: ${message}\n\nProvide a helpful, conversational response.` },
            ],
            temperature: 0.7,
            max_tokens: 300,
          });
          assistantMessage = chatResponse.choices[0]?.message?.content || "I'm here to help! You can ask me to find events or help create hangouts with friends.";
        } else {
          assistantMessage = "I can help you find events and create hangouts. Try something like \"Find concerts tonight in Salt Lake City\".";
        }
        break;
    }

    // Save assistant message
    await db.agentMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: assistantMessage,
        metadata: {
          intent: intent.intent,
          actionHint,
          actionData,
        },
      },
    });

    // Update conversation context
    await db.agentConversation.update({
      where: { id: conversation.id },
      data: { context: updatedContext as any },
    });

    return NextResponse.json(
      createSuccessResponse({
        conversationId: conversation.id,
        message: assistantMessage,
        intent: intent.intent,
        actionHint,
        actionData,
      }, 'Message processed successfully')
    );

  } catch (error: any) {
    logger.error('Error in agent chat API:', error);
    return NextResponse.json(
      createErrorResponse('Failed to process message', error.message),
      { status: 500 }
    );
  }
}

