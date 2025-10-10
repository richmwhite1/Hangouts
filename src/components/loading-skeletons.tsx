"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export const HangoutCardSkeleton = () => (
  <Card className="overflow-hidden">
    <div className="aspect-video bg-muted animate-pulse" />
    <CardContent className="p-4 space-y-3">
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      
      <div className="flex items-center space-x-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-8" />
      </div>
      
      <div className="flex space-x-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </CardContent>
  </Card>
)

export const HangoutFeedSkeleton = () => (
  <div className="space-y-4">
    <div className="relative">
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
    {Array.from({ length: 3 }).map((_, i) => (
      <HangoutCardSkeleton key={i} />
    ))}
  </div>
)

export const ProfileSkeleton = () => (
  <div className="space-y-6">
    <div className="text-center space-y-4">
      <Skeleton className="h-24 w-24 rounded-full mx-auto" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-24 mx-auto" />
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 text-center">
            <Skeleton className="h-8 w-8 mx-auto mb-2" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)

export const FriendsSkeleton = () => (
  <div className="space-y-4">
    <div className="relative">
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
    <div className="grid grid-cols-1 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)

export const CreateHangoutSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full" />
    </div>
    
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-full" />
        ))}
      </div>
    </div>
    
    <div className="space-y-4">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
    
    <div className="space-y-4">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-10 w-full" />
    </div>
    
    <div className="space-y-4">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-10 w-full" />
    </div>
  </div>
)

