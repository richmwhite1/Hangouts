'use client'

import React from 'react'
import { CheckCircle, Lock, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConsensusBannerProps {
    leadingOption: {
        id: string
        title: string
        voteCount: number
        votePercentage: number
    } | null
    consensusThreshold: number
    totalVoters: number
    onLockOption?: (optionId: string) => void
    isLocked?: boolean
}

/**
 * Banner that appears when a poll option is leading or has reached consensus
 * Features:
 * - Shows which option is winning
 * - Displays vote count and percentage
 * - Allows locking the option when consensus is reached
 * - Visual celebration when consensus achieved
 */
export function ConsensusBanner({
    leadingOption,
    consensusThreshold,
    totalVoters,
    onLockOption,
    isLocked = false
}: ConsensusBannerProps) {
    if (!leadingOption) return null

    const hasReachedConsensus = leadingOption.votePercentage >= consensusThreshold
    const isClose = leadingOption.votePercentage >= consensusThreshold - 10

    return (
        <div
            className={`
        relative overflow-hidden rounded-lg border-2 p-4 mb-4 transition-all
        ${hasReachedConsensus
                    ? 'bg-green-900/20 border-green-500 shadow-lg shadow-green-500/20'
                    : isClose
                        ? 'bg-yellow-900/20 border-yellow-500 shadow-lg shadow-yellow-500/20'
                        : 'bg-blue-900/20 border-blue-500 shadow-lg shadow-blue-500/20'
                }
      `}
        >
            {/* Animated background gradient */}
            {hasReachedConsensus && (
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 animate-pulse" />
            )}

            <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        {hasReachedConsensus ? (
                            <>
                                <CheckCircle className="w-5 h-5 text-green-400" />
                                <span className="text-green-400 font-bold text-sm uppercase tracking-wide">
                                    Consensus Reached! 🎉
                                </span>
                            </>
                        ) : isClose ? (
                            <>
                                <TrendingUp className="w-5 h-5 text-yellow-400" />
                                <span className="text-yellow-400 font-bold text-sm uppercase tracking-wide">
                                    Close to Consensus
                                </span>
                            </>
                        ) : (
                            <>
                                <TrendingUp className="w-5 h-5 text-blue-400" />
                                <span className="text-blue-400 font-bold text-sm uppercase tracking-wide">
                                    Leading Option
                                </span>
                            </>
                        )}
                    </div>

                    <h3 className="text-white font-semibold text-lg mb-1">
                        {leadingOption.title}
                    </h3>

                    <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-300">
                            {leadingOption.voteCount} {leadingOption.voteCount === 1 ? 'vote' : 'votes'}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className={`font-medium ${hasReachedConsensus ? 'text-green-400' : isClose ? 'text-yellow-400' : 'text-blue-400'
                            }`}>
                            {leadingOption.votePercentage}% of {totalVoters} voters
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${hasReachedConsensus
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                    : isClose
                                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                }`}
                            style={{ width: `${leadingOption.votePercentage}%` }}
                        />
                    </div>

                    {/* Consensus threshold indicator */}
                    <div className="mt-1 text-xs text-gray-400">
                        {hasReachedConsensus ? (
                            `✓ Exceeded ${consensusThreshold}% consensus threshold`
                        ) : (
                            `${consensusThreshold - leadingOption.votePercentage}% away from ${consensusThreshold}% consensus`
                        )}
                    </div>
                </div>

                {/* Lock button */}
                {hasReachedConsensus && onLockOption && !isLocked && (
                    <Button
                        type="button"
                        onClick={() => onLockOption(leadingOption.id)}
                        className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white px-4 py-2 h-auto shadow-lg"
                        size="sm"
                    >
                        <Lock className="w-4 h-4 mr-2" />
                        Lock This Option
                    </Button>
                )}

                {isLocked && (
                    <div className="flex-shrink-0 flex items-center gap-2 bg-green-600/20 border border-green-500 rounded-lg px-3 py-2">
                        <Lock className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-medium text-sm">Locked</span>
                    </div>
                )}
            </div>
        </div>
    )
}
