'use client'

import React, { useState, useEffect } from 'react'
import { MessageCircle, Calendar, CheckCircle, X, Users, MapPin, Clock } from 'lucide-react'

/**
 * Visual comparison component showing messy group texts vs organized Plans
 * Used on landing page to illustrate the value proposition
 */
export function GroupTextComparison() {
    const [activeTab, setActiveTab] = useState<'grouptext' | 'plans'>('grouptext')
    const [messageIndex, setMessageIndex] = useState(0)

    // Simulate message typing animation
    useEffect(() => {
        if (activeTab === 'grouptext' && messageIndex < groupTextMessages.length - 1) {
            const timer = setTimeout(() => {
                setMessageIndex(messageIndex + 1)
            }, 1500)
            return () => clearTimeout(timer)
        }
    }, [activeTab, messageIndex])

    // Reset animation when switching tabs
    useEffect(() => {
        setMessageIndex(0)
    }, [activeTab])

    const groupTextMessages = [
        { sender: 'Sarah', message: 'Hey! Want to hang out this weekend?', time: '2:14 PM' },
        { sender: 'Mike', message: 'Yeah! What are we doing?', time: '2:15 PM' },
        { sender: 'Sarah', message: 'Idk, maybe dinner?', time: '2:16 PM' },
        { sender: 'Alex', message: 'I\'m down. Where?', time: '2:17 PM' },
        { sender: 'Mike', message: 'What about that new Italian place?', time: '2:18 PM' },
        { sender: 'Sarah', message: 'Or sushi?', time: '2:19 PM' },
        { sender: 'Jordan', message: 'Sorry just saw this. When?', time: '2:45 PM' },
        { sender: 'Alex', message: 'Saturday?', time: '2:46 PM' },
        { sender: 'Mike', message: 'Can\'t do Saturday, Friday?', time: '2:47 PM' },
        { sender: 'Sarah', message: 'Friday works. What time?', time: '2:48 PM' },
        { sender: 'Jordan', message: 'Wait, where are we going again?', time: '3:02 PM' },
        { sender: 'Alex', message: '7pm?', time: '3:03 PM' },
        { sender: 'Mike', message: 'I thought we said Italian?', time: '3:15 PM' },
        { sender: 'Sarah', message: 'I\'m confused now 😅', time: '3:16 PM' },
    ]

    return (
        <div className="w-full max-w-6xl mx-auto px-4 py-12">
            {/* Header */}
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    Stop the Group Text Chaos
                </h2>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    See how Plans transforms messy conversations into organized hangouts
                </p>
            </div>

            {/* Tab Selector */}
            <div className="flex justify-center mb-8">
                <div className="inline-flex bg-gray-800 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('grouptext')}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${activeTab === 'grouptext'
                                ? 'bg-red-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <MessageCircle className="inline-block w-5 h-5 mr-2" />
                        Group Text Hell
                    </button>
                    <button
                        onClick={() => setActiveTab('plans')}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${activeTab === 'plans'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <Calendar className="inline-block w-5 h-5 mr-2" />
                        Plans Solution
                    </button>
                </div>
            </div>

            {/* Comparison Container */}
            <div className="grid md:grid-cols-2 gap-8">
                {/* Group Text Side */}
                <div className={`transition-all duration-500 ${activeTab === 'grouptext' ? 'opacity-100 scale-100' : 'opacity-50 scale-95'}`}>
                    <div className="bg-gray-900 rounded-2xl border-2 border-red-500/30 overflow-hidden shadow-2xl">
                        {/* Phone Header */}
                        <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                                    <Users className="w-5 h-5 text-gray-400" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-white font-semibold">Weekend Plans 🤷</h3>
                                    <p className="text-xs text-gray-400">5 people</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="h-[500px] overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-900 to-black">
                            {groupTextMessages.slice(0, messageIndex + 1).map((msg, idx) => (
                                <div
                                    key={idx}
                                    className="animate-fadeIn"
                                >
                                    <div className="flex items-start space-x-2">
                                        <div className="w-8 h-8 bg-gray-700 rounded-full flex-shrink-0 flex items-center justify-center text-xs text-white">
                                            {msg.sender[0]}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-baseline space-x-2">
                                                <span className="text-sm font-semibold text-white">{msg.sender}</span>
                                                <span className="text-xs text-gray-500">{msg.time}</span>
                                            </div>
                                            <div className="mt-1 bg-gray-800 rounded-2xl rounded-tl-none px-4 py-2 inline-block">
                                                <p className="text-white text-sm">{msg.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Problems List */}
                        <div className="bg-red-900/20 border-t-2 border-red-500/50 p-4">
                            <div className="space-y-2">
                                <div className="flex items-center text-red-400 text-sm">
                                    <X className="w-4 h-4 mr-2" />
                                    <span>14 messages, still no plan</span>
                                </div>
                                <div className="flex items-center text-red-400 text-sm">
                                    <X className="w-4 h-4 mr-2" />
                                    <span>Conflicting times & locations</span>
                                </div>
                                <div className="flex items-center text-red-400 text-sm">
                                    <X className="w-4 h-4 mr-2" />
                                    <span>Someone will miss the final decision</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Plans Side */}
                <div className={`transition-all duration-500 ${activeTab === 'plans' ? 'opacity-100 scale-100' : 'opacity-50 scale-95'}`}>
                    <div className="bg-gray-900 rounded-2xl border-2 border-blue-500/30 overflow-hidden shadow-2xl">
                        {/* App Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3">
                            <h3 className="text-white font-bold text-lg">Weekend Hangout</h3>
                            <p className="text-blue-100 text-sm">Created by Sarah • 5 friends invited</p>
                        </div>

                        {/* Plan Content */}
                        <div className="p-6 space-y-6">
                            {/* Poll Options */}
                            <div>
                                <h4 className="text-white font-semibold mb-3 flex items-center">
                                    <Calendar className="w-4 h-4 mr-2 text-blue-400" />
                                    Vote on Options
                                </h4>

                                {/* Option 1 - Leading */}
                                <div className="mb-3 bg-blue-900/30 border-2 border-blue-500 rounded-lg p-4 relative overflow-hidden">
                                    <div className="absolute top-2 right-2">
                                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                                            LEADING
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <h5 className="text-white font-semibold">Italian Restaurant</h5>
                                        <div className="flex items-center text-gray-300 text-sm">
                                            <MapPin className="w-4 h-4 mr-1 text-blue-400" />
                                            <span>Bella Vista, Downtown</span>
                                        </div>
                                        <div className="flex items-center text-gray-300 text-sm">
                                            <Clock className="w-4 h-4 mr-1 text-blue-400" />
                                            <span>Friday, 7:00 PM</span>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="text-gray-400">4 of 5 voted</span>
                                            <span className="text-blue-400 font-semibold">80%</span>
                                        </div>
                                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{ width: '80%' }}></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Option 2 */}
                                <div className="mb-3 bg-gray-800 border border-gray-700 rounded-lg p-4">
                                    <div className="space-y-2">
                                        <h5 className="text-white font-semibold">Sushi Place</h5>
                                        <div className="flex items-center text-gray-400 text-sm">
                                            <MapPin className="w-4 h-4 mr-1" />
                                            <span>Sakura, Midtown</span>
                                        </div>
                                        <div className="flex items-center text-gray-400 text-sm">
                                            <Clock className="w-4 h-4 mr-1" />
                                            <span>Saturday, 6:30 PM</span>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="text-gray-400">2 of 5 voted</span>
                                            <span className="text-gray-400">40%</span>
                                        </div>
                                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-gray-600 rounded-full" style={{ width: '40%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Participants */}
                            <div>
                                <h4 className="text-white font-semibold mb-3 flex items-center">
                                    <Users className="w-4 h-4 mr-2 text-purple-400" />
                                    Who's Coming
                                </h4>
                                <div className="flex -space-x-2">
                                    {['Sarah', 'Mike', 'Alex', 'Jordan', 'Chris'].map((name, idx) => (
                                        <div
                                            key={idx}
                                            className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full border-2 border-gray-900 flex items-center justify-center text-white font-semibold text-sm"
                                            title={name}
                                        >
                                            {name[0]}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Benefits List */}
                        <div className="bg-green-900/20 border-t-2 border-green-500/50 p-4">
                            <div className="space-y-2">
                                <div className="flex items-center text-green-400 text-sm">
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    <span>Everyone sees all options</span>
                                </div>
                                <div className="flex items-center text-green-400 text-sm">
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    <span>Real-time voting & consensus</span>
                                </div>
                                <div className="flex items-center text-green-400 text-sm">
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    <span>Automatic calendar sync</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-12">
                <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-8 py-4 rounded-full text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    Start Planning Better →
                </button>
                <p className="text-gray-400 mt-4 text-sm">
                    Free forever • No credit card required
                </p>
            </div>
        </div>
    )
}
