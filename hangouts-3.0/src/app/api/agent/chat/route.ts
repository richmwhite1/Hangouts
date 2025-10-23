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
} from '@/lib/agent-utils';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
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

    // Step 1: Detect intent
    const intentResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: INTENT_DETECTION_PROMPT },
        { role: 'user', content: `Previous conversation:\n${conversationHistory}\n\nCurrent message: ${message}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const intentContent = intentResponse.choices[0]?.message?.content;
    const intent = intentContent ? parseIntent(intentContent) : null;

    if (!intent) {
      logger.error('Failed to parse intent from OpenAI response');
      return NextResponse.json(
        createErrorResponse('Processing error', 'Could not understand your request'),
        { status: 500 }
      );
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
          const location = intent.entities.location || context.userLocation || clerkUser.location;

          // Call Perplexity API
          const perplexityResponse = await axios.post(
            PERPLEXITY_API_URL,
            {
              model: 'llama-3.1-sonar-small-128k-online',
              messages: [
                { role: 'system', content: 'You are an event discovery assistant.' },
                { role: 'user', content: EVENT_DISCOVERY_PROMPT(searchQuery, location) },
              ],
            },
            {
              headers: {
                Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json',
              },
              timeout: 15000,
            }
          );

          const perplexityContent = perplexityResponse.data.choices[0]?.message?.content || '';
          
          // Extract JSON data from response
          const eventsData = extractJSONFromResponse(perplexityContent);
          
          // Remove JSON_DATA part from the message
          assistantMessage = perplexityContent.split('JSON_DATA:')[0].trim();

          if (eventsData && Array.isArray(eventsData) && eventsData.length > 0) {
            updatedContext = updateContext(context, {
              currentStep: 'selecting_event',
              discoveredEvents: eventsData,
            });
            actionHint = 'show_events';
            actionData = eventsData;
          } else {
            assistantMessage = "I couldn't find any events matching your search. Could you try being more specific about what you're looking for?";
          }
        } catch (error: any) {
          logger.error('Error discovering events:', error);
          assistantMessage = "I'm having trouble searching for events right now. You can try the Events page directly, or try again in a moment.";
        }
        break;

      case 'select_event':
        const eventIndex = intent.entities.eventIndex;
        if (eventIndex && context.discoveredEvents && eventIndex <= context.discoveredEvents.length) {
          const selectedEvent = context.discoveredEvents[eventIndex - 1];
          updatedContext = updateContext(context, {
            currentStep: 'selecting_friends',
            selectedEvent,
          });
          assistantMessage = `Great choice! ${selectedEvent.title} looks awesome. Would you like to create a hangout with friends for this event, or just save it to your interested list?`;
          actionHint = 'ask_hangout_or_save';
          actionData = { selectedEvent };
        } else {
          assistantMessage = "I'm not sure which event you're referring to. Could you specify the number?";
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

      case 'general_help':
      case 'casual_chat':
      default:
        // Generate a conversational response
        const chatResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Previous conversation:\n${conversationHistory}\n\nUser: ${message}\n\nProvide a helpful, conversational response.` },
          ],
          temperature: 0.7,
          max_tokens: 300,
        });

        assistantMessage = chatResponse.choices[0]?.message?.content || "I'm here to help! You can ask me to find events or help create hangouts with friends.";
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

