'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Calendar, 
  MapPin, 
  Heart, 
  Share2, 
  Star,
  ArrowRight,
  CheckCircle,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'

interface GuestLandingProps {
  onSignIn: () => void
  onSignUp: () => void
}

export function GuestLanding({ onSignIn, onSignUp }: GuestLandingProps) {
  const [currentFeature, setCurrentFeature] = useState(0)

  const features = [
    {
      icon: Users,
      title: "Connect with Friends",
      description: "Create hangouts and invite your friends to join the fun",
      color: "text-blue-500"
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Let everyone vote on the best time and place for your hangout",
      color: "text-green-500"
    },
    {
      icon: Heart,
      title: "Save & Discover",
      description: "Save events you're interested in and discover new ones",
      color: "text-red-500"
    },
    {
      icon: Share2,
      title: "Easy Sharing",
      description: "Share hangouts and events with friends instantly",
      color: "text-purple-500"
    }
  ]

  const benefits = [
    "Create unlimited hangouts and events",
    "Invite friends and manage RSVPs",
    "Discover local events and activities",
    "Save events you're interested in",
    "Share with friends and family",
    "Get notifications for your events"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Sparkles className="h-8 w-8 text-yellow-400 mr-2" />
              <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-300 border-yellow-400/30">
                Beta
              </Badge>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Plan Perfect
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {" "}Hangouts
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              The easiest way to coordinate with friends, discover events, and make plans that actually happen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                onClick={onSignUp}
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-gray-600 text-white hover:bg-gray-700 px-8 py-3 text-lg"
                onClick={onSignIn}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to plan great hangouts
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              From casual meetups to big events, we make coordination effortless
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card 
                  key={index}
                  className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all duration-300 cursor-pointer"
                  onClick={() => setCurrentFeature(index)}
                >
                  <CardHeader className="text-center">
                    <div className={`mx-auto w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-4 ${
                      currentFeature === index ? 'bg-blue-600' : ''
                    }`}>
                      <Icon className={`h-8 w-8 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-center">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why choose Hangouts 3.0?
            </h2>
            <p className="text-xl text-gray-300">
              Join thousands of users who make better plans together
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-lg">{benefit}</span>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-4">Ready to get started?</h3>
              <p className="text-gray-300 mb-6">
                Sign up now and start planning your first hangout. It's completely free and takes less than a minute.
              </p>
              <Button 
                size="lg" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={onSignUp}
              >
                Create Your Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start planning better hangouts today
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join the community and never miss out on the fun again
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
              onClick={onSignUp}
            >
              Get Started Free
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-gray-600 text-white hover:bg-gray-700 px-8 py-3 text-lg"
              onClick={onSignIn}
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
