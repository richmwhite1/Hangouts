'use client'

import React from 'react'
import { X, Users, TrendingUp, GripVertical, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SimpleDateTimePicker } from '@/components/ui/simple-datetime-picker'
import { GoogleMapsAutocomplete } from '@/components/ui/google-maps-autocomplete'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface OptionCardProps {
    option: {
        id: string
        title: string
        description?: string
        location?: string
        dateTime?: string
        price?: number
        hangoutUrl?: string
    }
    index: number
    isRemovable: boolean
    onRemove: () => void
    onChange: (field: string, value: any) => void
    showAdvancedControls?: boolean
    isAllDay?: boolean
    isRecurring?: boolean
    recurrenceFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
    onToggleAllDay?: (checked: boolean) => void
    onToggleRecurring?: (checked: boolean) => void
    onChangeRecurrenceFrequency?: (frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY') => void
    // Voting preview props (for showing vote count during creation)
    voteCount?: number
    votePercentage?: number
    isLeading?: boolean
    dragHandleProps?: any // For drag-and-drop support
}

/**
 * Individual option card for poll creation
 * Features:
 * - Title, description, location, date/time inputs
 * - Vote count display (preview)
 * - Leading indicator
 * - Remove button
 * - Drag handle for reordering
 * - All-day and recurring toggles (for first option only)
 */
export function OptionCard({
    option,
    index,
    isRemovable,
    onRemove,
    onChange,
    showAdvancedControls = false,
    isAllDay,
    isRecurring,
    recurrenceFrequency,
    onToggleAllDay,
    onToggleRecurring,
    onChangeRecurrenceFrequency,
    voteCount = 0,
    votePercentage = 0,
    isLeading = false,
    dragHandleProps
}: OptionCardProps) {
    return (
        <div
            className={`
        relative p-4 rounded-lg border-2 transition-all
        ${isLeading
                    ? 'border-blue-500 bg-blue-900/10 shadow-lg shadow-blue-500/20'
                    : 'border-gray-600 bg-gray-900/50'
                }
      `}
        >
            {/* Leading indicator */}
            {isLeading && (
                <div className="absolute -top-3 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                    <TrendingUp className="w-3 h-3" />
                    LEADING
                </div>
            )}

            {/* Header with drag handle and remove button */}
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    {/* Drag handle */}
                    {dragHandleProps && (
                        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-300">
                            <GripVertical className="w-4 h-4" />
                        </div>
                    )}

                    <Label className="text-white font-semibold">Option {index + 1}</Label>

                    {/* Vote preview badge */}
                    {voteCount > 0 && (
                        <Badge
                            variant="secondary"
                            className={`text-xs ${isLeading ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                        >
                            <Users className="w-3 h-3 mr-1" />
                            {voteCount} {voteCount === 1 ? 'vote' : 'votes'} ({votePercentage}%)
                        </Badge>
                    )}
                </div>

                {isRemovable && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onRemove}
                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Title input */}
            <Input
                placeholder="Option title"
                value={option.title}
                onChange={(e) => onChange('title', e.target.value)}
                className="bg-black border-gray-600 text-white mb-3"
                required
            />

            {/* Description textarea */}
            <Textarea
                placeholder="Description (optional)"
                value={option.description}
                onChange={(e) => onChange('description', e.target.value)}
                className="bg-black border-gray-600 text-white mb-3"
            />

            {/* Where - Using exact structure from SimplifiedHangoutForm */}
            <Card className="bg-black border-gray-700 p-4 relative mb-3" style={{ zIndex: 100 }}>
                <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-green-400" />
                    <label className="text-white font-medium">Where?</label>
                    <span className="text-sm text-gray-400">(optional)</span>
                </div>
                <div className="relative" style={{ zIndex: 1000 }}>
                    <GoogleMapsAutocomplete
                        key={`option-autocomplete-${option.id || index}`}
                        value={option.location || ''}
                        onChange={(value) => onChange('location', value)}
                        placeholder="Search for a location..."
                        className="w-full"
                    />
                </div>
            </Card>

            {/* Date/Time controls */}
            <div className="space-y-3">
                {/* Advanced controls (All-day and Recurring) - only for first option */}
                {showAdvancedControls && index === 0 && (
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs text-gray-400">Date & Time</Label>
                        <div className="flex items-center gap-4">
                            {onToggleAllDay && (
                                <div className="flex items-center gap-2">
                                    <Label htmlFor={`all-day-${index}`} className="text-xs text-gray-400">All Day</Label>
                                    <Switch
                                        id={`all-day-${index}`}
                                        checked={isAllDay}
                                        onCheckedChange={onToggleAllDay}
                                        className="scale-75"
                                    />
                                </div>
                            )}
                            {onToggleRecurring && (
                                <div className="flex items-center gap-2">
                                    <Label htmlFor={`recurring-${index}`} className="text-xs text-gray-400">Recurring</Label>
                                    <Switch
                                        id={`recurring-${index}`}
                                        checked={isRecurring}
                                        onCheckedChange={onToggleRecurring}
                                        className="scale-75"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Calendar picker */}
                <SimpleDateTimePicker
                    value={option.dateTime || ''}
                    onChange={(value) => onChange('dateTime', value)}
                    placeholder={isAllDay ? "Select date" : "Select date and time"}
                    className="w-full"
                />

                {/* Recurrence frequency selector */}
                {showAdvancedControls && index === 0 && isRecurring && onChangeRecurrenceFrequency && (
                    <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                        <Label className="text-xs text-gray-400 mb-2 block">Repeat</Label>
                        <div className="flex gap-2">
                            {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((freq) => (
                                <Button
                                    key={freq}
                                    type="button"
                                    variant={recurrenceFrequency === freq ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => onChangeRecurrenceFrequency(freq)}
                                    className={`flex-1 text-xs ${recurrenceFrequency === freq
                                            ? 'bg-blue-600 text-white'
                                            : 'border-gray-600 text-gray-300'
                                        }`}
                                >
                                    {freq.charAt(0) + freq.slice(1).toLowerCase()}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Price and URL */}
            <div className="grid grid-cols-2 gap-2 mt-3">
                <Input
                    type="number"
                    placeholder="Price (optional)"
                    value={option.price || ''}
                    onChange={(e) => onChange('price', parseFloat(e.target.value) || 0)}
                    className="bg-black border-gray-600 text-white"
                />
                <Input
                    placeholder="Hangout URL (optional)"
                    value={option.hangoutUrl || ''}
                    onChange={(e) => onChange('hangoutUrl', e.target.value)}
                    className="bg-black border-gray-600 text-white"
                />
            </div>

            {/* Vote percentage bar (preview) */}
            {votePercentage > 0 && (
                <div className="mt-3">
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${isLeading
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                                    : 'bg-gray-500'
                                }`}
                            style={{ width: `${votePercentage}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
