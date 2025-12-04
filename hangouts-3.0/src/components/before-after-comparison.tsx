'use client'

import { Card } from '@/components/ui/card'
import { ArrowRight, MessageSquare, CheckCircle2 } from 'lucide-react'

export function BeforeAfterComparison() {
    return (
        <div className="w-full max-w-6xl mx-auto px-4 py-16">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    From This → To This
                </h2>
                <p className="text-xl text-gray-400">
                    Stop the endless back-and-forth. Start making decisions.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* BEFORE: Group Text Chaos */}
                <Card className="bg-gray-900 border-red-900/30 p-6 relative overflow-hidden">
                    <div className="absolute top-4 right-4">
                        <span className="text-2xl">😵‍💫</span>
                    </div>

                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            Group Texts
                        </h3>
                    </div>

                    <div className="space-y-3 opacity-90">
                        {/* Simulated group text messages */}
                        <div className="bg-gray-800 rounded-lg p-3 text-sm">
                            <div className="font-medium text-gray-300 mb-1">Sarah</div>
                            <div className="text-gray-400">Hey! Want to grab dinner this weekend?</div>
                        </div>

                        <div className="bg-gray-800 rounded-lg p-3 text-sm">
                            <div className="font-medium text-gray-300 mb-1">Mike</div>
                            <div className="text-gray-400">Yeah! Saturday or Sunday?</div>
                        </div>

                        <div className="bg-gray-800 rounded-lg p-3 text-sm">
                            <div className="font-medium text-gray-300 mb-1">Alex</div>
                            <div className="text-gray-400">I'm free Saturday. What time?</div>
                        </div>

                        <div className="bg-gray-800 rounded-lg p-3 text-sm">
                            <div className="font-medium text-gray-300 mb-1">Sarah</div>
                            <div className="text-gray-400">6pm or 7pm?</div>
                        </div>

                        <div className="bg-gray-800 rounded-lg p-3 text-sm">
                            <div className="font-medium text-gray-300 mb-1">Emma</div>
                            <div className="text-gray-400">Wait, where are we going?</div>
                        </div>

                        <div className="bg-gray-800 rounded-lg p-3 text-sm">
                            <div className="font-medium text-gray-300 mb-1">Mike</div>
                            <div className="text-gray-400">I thought we said Sunday?</div>
                        </div>

                        <div className="text-center py-2">
                            <span className="text-gray-500 text-xs">... 47 more messages ...</span>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-800">
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                            <span className="font-medium">Result:</span>
                            <span>No decision, plans fall through</span>
                        </div>
                    </div>
                </Card>

                {/* Arrow */}
                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-blue-600 rounded-full p-4">
                        <ArrowRight className="w-8 h-8 text-white" />
                    </div>
                </div>

                {/* AFTER: Plans Clarity */}
                <Card className="bg-gray-900 border-green-900/30 p-6 relative overflow-hidden">
                    <div className="absolute top-4 right-4">
                        <span className="text-2xl">✨</span>
                    </div>

                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-green-400 mb-2 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            Plans
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {/* Plan card */}
                        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg p-4 border border-blue-500/20">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h4 className="font-semibold text-white text-base mb-1">Weekend Dinner</h4>
                                    <p className="text-sm text-gray-400">Created by Sarah</p>
                                </div>
                            </div>

                            {/* Voting options */}
                            <div className="space-y-2 mb-4">
                                <div className="bg-gray-800/50 rounded-md p-3 border-l-4 border-green-500">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-white">Saturday 7pm</span>
                                        <span className="text-xs text-green-400 font-medium">5 votes</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="flex -space-x-2">
                                            {['S', 'M', 'A', 'E', 'J'].map((initial, i) => (
                                                <div key={i} className="w-6 h-6 rounded-full bg-blue-600 border-2 border-gray-900 flex items-center justify-center text-xs text-white">
                                                    {initial}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-800/50 rounded-md p-3 border-l-4 border-gray-600">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-400">Sunday 6pm</span>
                                        <span className="text-xs text-gray-500 font-medium">2 votes</span>
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="bg-green-900/20 border border-green-500/30 rounded-md p-3">
                                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Consensus reached! Saturday 7pm it is.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-800">
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                            <span className="font-medium">Result:</span>
                            <span>Decision made in 2 minutes</span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}
