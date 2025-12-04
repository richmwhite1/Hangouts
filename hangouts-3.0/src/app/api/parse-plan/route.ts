import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import OpenAI from 'openai'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

interface ParsePlanRequest {
    input: string
    timezone?: string
}

interface ParsedPlanData {
    title: string
    date?: string
    time?: string
    location?: string
    description?: string
    activityType?: 'coffee' | 'dinner' | 'movie' | 'drinks' | 'other'
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json(createErrorResponse('Unauthorized', 'Authentication required'), { status: 401 })
        }

        const body: ParsePlanRequest = await request.json()
        const { input, timezone = 'UTC' } = body

        if (!input || input.trim().length === 0) {
            return NextResponse.json(createErrorResponse('Invalid request', 'Input text is required'), { status: 400 })
        }

        const openaiApiKey = process.env.OPENAI_API_KEY
        if (!openaiApiKey) {
            // Fallback if no API key: just use input as title
            return NextResponse.json(createSuccessResponse({
                title: input,
                activityType: 'other'
            }, 'Parsed successfully (fallback)'))
        }

        const openai = new OpenAI({
            apiKey: openaiApiKey
        })

        const systemPrompt = `You are a helpful assistant that parses natural language plan descriptions into structured data.
    
    Current Date/Time: ${new Date().toISOString()}
    User Timezone: ${timezone}

    Extract the following fields:
    - title: A short, catchy title for the plan (e.g. "Dinner at Mario's")
    - date: YYYY-MM-DD format (if mentioned, otherwise null)
    - time: HH:mm format (24h, if mentioned, otherwise null)
    - location: Location name (if mentioned, otherwise null)
    - description: Any extra details mentioned
    - activityType: One of ['coffee', 'dinner', 'movie', 'drinks', 'other']

    Rules:
    1. Return ONLY valid JSON.
    2. Infer the date relative to "today" or "tomorrow".
    3. If no specific activity is mentioned, use 'other'.
    `

        const userPrompt = `Parse this plan: "${input}"`

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 500,
            temperature: 0.1
        })

        const extractedText = response.choices[0]?.message?.content
        if (!extractedText) {
            throw new Error('No content returned from OpenAI')
        }

        const parsedData = JSON.parse(extractedText) as ParsedPlanData

        return NextResponse.json(createSuccessResponse(parsedData, 'Plan parsed successfully'))

    } catch (error) {
        logger.error('Error parsing plan:', error)
        // Fallback on error
        return NextResponse.json(createSuccessResponse({
            title: body.input || 'New Plan',
            activityType: 'other'
        }, 'Parsed with fallback due to error'))
    }
}
