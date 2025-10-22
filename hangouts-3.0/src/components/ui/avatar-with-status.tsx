"use client"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface AvatarWithStatusProps {
  src?: string
  alt?: string
  fallback?: string
  size?: "sm" | "md" | "lg" | "xl"
  status?: "online" | "offline" | "away" | "busy"
  className?: string
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8", 
  lg: "w-10 h-10",
  xl: "w-12 h-12"
}

const statusClasses = {
  online: "bg-green-500",
  offline: "bg-gray-500",
  away: "bg-yellow-500", 
  busy: "bg-red-500"
}

export function AvatarWithStatus({ 
  src, 
  alt = "User", 
  fallback = "U", 
  size = "md", 
  status = "offline",
  className 
}: AvatarWithStatusProps) {
  return (
    <div className="relative inline-block">
      <Avatar className={cn(sizeClasses[size], "rounded-lg", className)}>
        <AvatarImage src={src} alt={alt} />
        <AvatarFallback className="rounded-lg">
          {fallback.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      {/* Status Indicator */}
      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background flex items-center justify-center">
        <div className={cn("w-2 h-2 rounded-full", statusClasses[status])}></div>
      </div>
    </div>
  )
}







