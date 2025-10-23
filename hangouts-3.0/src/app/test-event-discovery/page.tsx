'use client'

import { EventDiscovery } from '@/components/event-discovery'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface EventResult {
  title: string
  venue: string
  date: string
  time: string
  price: string
  url: string
  description?: string
  imageUrl?: string
}

export default function TestEventDiscovery() {
  const [interestedEvents, setInterestedEvents] = useState<EventResult[]>([])
  const [testResults, setTestResults] = useState<any[]>([])

  const handleEventInterest = async (event: EventResult) => {
    try {
      // Test scraping functionality
      const scrapeResponse = await fetch('/api/events/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventUrl: event.url,
          basicEventData: {
            title: event.title,
            venue: event.venue,
            date: event.date,
            time: event.time,
            price: event.price
          }
        }),
      })

      const scrapeData = await scrapeResponse.json()
      
      setTestResults(prev => [...prev, {
        query: `Scrape: ${event.title}`,
        timestamp: new Date().toLocaleTimeString(),
        success: scrapeResponse.ok,
        data: scrapeData,
        error: scrapeResponse.ok ? null : scrapeData.error
      }])

      if (scrapeResponse.ok) {
        setInterestedEvents(prev => [...prev, { ...event, scrapedData: scrapeData.data }])
      }

    } catch (error) {
      setTestResults(prev => [...prev, {
        query: `Scrape: ${event.title}`,
        timestamp: new Date().toLocaleTimeString(),
        success: false,
        data: null,
        error: error.message
      }])
    }
  }

  const runQuickTest = async (query: string) => {
    try {
      const response = await fetch('/api/events/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          location: 'San Francisco, CA'
        }),
      })

      const data = await response.json()
      
      setTestResults(prev => [...prev, {
        query,
        timestamp: new Date().toLocaleTimeString(),
        success: response.ok,
        data: data,
        error: response.ok ? null : data.error
      }])
    } catch (error) {
      setTestResults(prev => [...prev, {
        query,
        timestamp: new Date().toLocaleTimeString(),
        success: false,
        data: null,
        error: error.message
      }])
    }
  }

  const clearResults = () => {
    setTestResults([])
    setInterestedEvents([])
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Event Discovery Test</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test the AI-powered event discovery system
          </p>
        </div>

        {/* Quick Test Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => runQuickTest('concerts this weekend')}>
                Concerts This Weekend
              </Button>
              <Button onClick={() => runQuickTest('comedy shows Friday')}>
                Comedy Shows Friday
              </Button>
              <Button onClick={() => runQuickTest('what\'s happening tonight')}>
                What's Happening Tonight
              </Button>
              <Button onClick={() => runQuickTest('art exhibitions this month')}>
                Art Exhibitions
              </Button>
              <Button onClick={() => runQuickTest('food festivals')}>
                Food Festivals
              </Button>
              <Button variant="outline" onClick={clearResults}>
                Clear Results
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>API Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={result.success ? 'default' : 'destructive'}>
                        {result.success ? 'Success' : 'Error'}
                      </Badge>
                      <span className="font-medium">{result.query}</span>
                      <span className="text-sm text-gray-500">{result.timestamp}</span>
                    </div>
                    
                    {result.success ? (
                      <div>
                        <p className="text-sm text-green-600 mb-2">
                          Found {result.data?.data?.length || 0} events
                        </p>
                        {result.data?.data && (
                          <div className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                            <pre>{JSON.stringify(result.data.data, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Event Discovery Component */}
        <Card>
          <CardHeader>
            <CardTitle>Interactive Event Discovery</CardTitle>
          </CardHeader>
          <CardContent>
            <EventDiscovery 
              onEventInterest={handleEventInterest}
              userLocation="San Francisco, CA"
            />
          </CardContent>
        </Card>

        {/* Interested Events */}
        {interestedEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Events You're Interested In</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {interestedEvents.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{event.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {event.venue} • {event.date}
                      </p>
                    </div>
                    <Badge variant="secondary">Interested</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
