'use client'

import { EventDiscovery } from '@/components/event-discovery'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'

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

export default function EventDiscoveryPage() {
  const [interestedEvents, setInterestedEvents] = useState<EventResult[]>([])
  const [userLocation, setUserLocation] = useState<string>('San Francisco, CA')

  const handleEventInterest = (event: EventResult) => {
    setInterestedEvents(prev => [...prev, event])
  }

  const clearInterestedEvents = () => {
    setInterestedEvents([])
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Discover Events</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Find amazing events happening near you and create hangouts with friends. 
            Our AI-powered discovery finds concerts, shows, festivals, and more.
          </p>
        </div>

        {/* How it Works */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              How It Works
            </CardTitle>
            <CardDescription>
              From discovery to hangout creation in three simple steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
                </div>
                <h3 className="font-semibold">Search Events</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Use natural language to find events. Try "concerts this weekend" or "comedy shows Friday"
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-green-600 dark:text-green-400 font-bold">2</span>
                </div>
                <h3 className="font-semibold">Get Details</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Our AI scrapes event details, prices, and ticket information automatically
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">3</span>
                </div>
                <h3 className="font-semibold">Create Hangout</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Invite friends, add options like dinner before, and make plans that actually happen
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Discovery Component */}
        <Card>
          <CardHeader>
            <CardTitle>Find Events</CardTitle>
            <CardDescription>
              Search for events in {userLocation} and discover what's happening
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventDiscovery 
              onEventInterest={handleEventInterest}
              userLocation={userLocation}
            />
          </CardContent>
        </Card>

        {/* Interested Events */}
        {interestedEvents.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Events You're Interested In
                  </CardTitle>
                  <CardDescription>
                    {interestedEvents.length} event{interestedEvents.length !== 1 ? 's' : ''} saved
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={clearInterestedEvents}>
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {interestedEvents.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{event.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.venue}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {event.date} at {event.time}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{event.price}</Badge>
                      <Button size="sm" variant="outline">
                        Create Hangout
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Why Use Event Discovery?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Never Miss Out
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Discover events you might not have found otherwise. Our AI searches multiple sources to find the best events happening near you.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  Easy Planning
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Skip the hassle of manually entering event details. Everything is automatically filled in when you create a hangout.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Smart Suggestions
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get personalized event recommendations based on your interests and location preferences.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-orange-600" />
                  Seamless Integration
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Directly create hangouts from discovered events. Invite friends, add activities, and coordinate effortlessly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
