'use client'

import React from 'react'
import { Users, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Friend {
    id: string
    name: string
    username: string
    avatar?: string
}

interface InviteFriendsBarProps {
    invitedFriends: Friend[]
    onOpenModal: () => void
    onRemoveFriend: (friendId: string) => void
    mandatoryParticipants: string[]
    coHosts: string[]
}

/**
 * Floating bar at the bottom of the screen showing invited friends
 * Features:
 * - Displays friend avatars in a horizontal scroll
 * - Shows total invited count
 * - Quick remove with X button on hover
 * - Opens invite modal when "Invite Friends" button is clicked
 * - Indicates mandatory participants and co-hosts with badges
 */
export function InviteFriendsBar({
    invitedFriends,
    onOpenModal,
    onRemoveFriend,
    mandatoryParticipants,
    coHosts
}: InviteFriendsBarProps) {
    // Don't render if no space needed (can always invite)
    // We'll show the bar even with 0 friends to make it discoverable

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-gray-700 z-40 pb-safe" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Invite Button */}
                    <Button
                        type="button"
                        onClick={onOpenModal}
                        className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 h-10 sm:h-auto text-sm"
                        size="sm"
                    >
                        <Users className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Invite Friends</span>
                        <span className="sm:hidden">Invite</span>
                    </Button>

                    {/* Friend Avatars */}
                    {invitedFriends.length > 0 ? (
                        <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                            {/* Count Badge */}
                            <div className="flex-shrink-0 bg-blue-600/20 border border-blue-500/50 rounded-full px-3 py-1 text-sm font-medium text-blue-400">
                                {invitedFriends.length} invited
                            </div>

                            {/* Avatar List */}
                            <div className="flex items-center gap-2">
                                {invitedFriends.map((friend) => {
                                    const isMandatory = mandatoryParticipants.includes(friend.id)
                                    const isCoHost = coHosts.includes(friend.id)

                                    return (
                                        <div
                                            key={friend.id}
                                            className="relative group flex-shrink-0"
                                        >
                                            {/* Avatar */}
                                            <div className="relative">
                                                <img
                                                    src={friend.avatar || '/placeholder-avatar.png'}
                                                    alt={friend.name}
                                                    className="w-10 h-10 rounded-full border-2 border-gray-600 group-hover:border-blue-500 transition-all"
                                                    title={friend.name}
                                                />

                                                {/* Badge for mandatory/co-host */}
                                                {(isMandatory || isCoHost) && (
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black border border-gray-600 flex items-center justify-center text-xs">
                                                        {isMandatory ? '★' : '👑'}
                                                    </div>
                                                )}

                                                {/* Remove button on hover */}
                                                <button
                                                    type="button"
                                                    onClick={() => onRemoveFriend(friend.id)}
                                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                    title={`Remove ${friend.name}`}
                                                >
                                                    <X className="w-3 h-3 text-white" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Add more button if many friends */}
                            {invitedFriends.length > 8 && (
                                <button
                                    type="button"
                                    onClick={onOpenModal}
                                    className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-dashed border-gray-600 hover:border-blue-500 flex items-center justify-center transition-colors"
                                    title="View all invited friends"
                                >
                                    <Plus className="w-4 h-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 text-gray-400 text-sm">
                            No friends invited yet
                        </div>
                    )}
                </div>
            </div>

            {/* Custom scrollbar styles */}
            <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .safe-area-inset-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
        </div>
    )
}
