'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Circle, Clock, Coffee, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusType = 'free' | 'busy' | 'working' | 'sleeping' | 'coffee'

interface StatusOption {
    id: StatusType
    label: string
    icon: React.ElementType
    color: string
}

const statusOptions: StatusOption[] = [
    { id: 'free', label: "I'm Free", icon: Sun, color: 'text-green-500' },
    { id: 'busy', label: 'Busy', icon: Circle, color: 'text-red-500' },
    { id: 'working', label: 'Working', icon: Clock, color: 'text-blue-500' },
    { id: 'coffee', label: 'Up for Coffee', icon: Coffee, color: 'text-amber-500' },
    { id: 'sleeping', label: 'Sleeping', icon: Moon, color: 'text-purple-500' },
]

export function UserStatusWidget() {
    const [currentStatus, setCurrentStatus] = useState<StatusType>('free')

    const selectedOption = statusOptions.find(opt => opt.id === currentStatus) || statusOptions[0]
    const Icon = selectedOption.icon

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <Icon className={cn("w-5 h-5", selectedOption.color)} />
                        </div>
                        <div className={cn("absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800",
                            currentStatus === 'free' ? 'bg-green-500' :
                                currentStatus === 'busy' ? 'bg-red-500' : 'bg-gray-400'
                        )} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">My Status</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{selectedOption.label}</p>
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="rounded-full h-8 px-3 text-xs">
                            Update
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        {statusOptions.map((option) => (
                            <DropdownMenuItem
                                key={option.id}
                                onClick={() => setCurrentStatus(option.id)}
                                className="flex items-center space-x-2 cursor-pointer"
                            >
                                <option.icon className={cn("w-4 h-4", option.color)} />
                                <span>{option.label}</span>
                                {currentStatus === option.id && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
