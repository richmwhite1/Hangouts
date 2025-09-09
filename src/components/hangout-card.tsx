"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface Participant {
  name: string
  avatar: string
  status: "yes" | "no" | "maybe" | "pending"
}

interface Hangout {
  id: string
  title: string
  description: string
  image: string
  photos?: string[] // Added photos array for carousel functionality
  date: string
  time: string
  location: string
  host: {
    name: string
    avatar: string
  }
  participants: Participant[]
  category: string
  hasNewActivity?: boolean
  newCommentsCount?: number
}

interface HangoutCardProps {
  hangout: Hangout
}

export function HangoutCard({ hangout }: HangoutCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "yes":
        return "bg-green-500"
      case "no":
        return "bg-red-500"
      case "maybe":
        return "bg-yellow-500"
      default:
        return "bg-gray-400"
    }
  }

  const yesCount = (hangout.participants || []).filter((p) => p.status === "yes").length

  const allPhotos = [hangout.image, ...(hangout.photos || [])].filter(Boolean)

  const nextPhoto = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length)
  }

  const prevPhoto = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentPhotoIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length)
  }

  return (
    <Link href={`/hangout/${hangout.id}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden bg-card border-border relative">
        {hangout.hasNewActivity && (
          <div className="absolute top-2 left-2 z-10">
            <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium flex items-center space-x-1">
              <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse"></div>
              <span>New Activity</span>
            </div>
          </div>
        )}

        <div className="relative">
          <Image
            src={allPhotos[currentPhotoIndex] || "/placeholder.svg"}
            alt={hangout.title}
            width={400}
            height={200}
            className="w-full h-48 object-cover"
          />

          {allPhotos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                onClick={prevPhoto}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                onClick={nextPhoto}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex space-x-1 z-10">
                {allPhotos.map((_, index) => (
                  <button
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      index === currentPhotoIndex ? "bg-white" : "bg-white/50"
                    }`}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setCurrentPhotoIndex(index)
                    }}
                  />
                ))}
              </div>
            </>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-black/50 text-white border-0">
              {hangout.category}
            </Badge>
          </div>
          <div className="absolute top-3 right-3">
            <Avatar className="w-8 h-8 border-2 border-white">
              <AvatarImage src={hangout.host?.avatar || "/placeholder.svg"} alt={hangout.host?.name || "Host"} />
              <AvatarFallback>{(hangout.host?.name || "H").charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-white font-bold text-lg text-balance mb-1">{hangout.title}</h3>
            <p className="text-white/90 text-sm line-clamp-2">{hangout.description}</p>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>
                {hangout.date} at {hangout.time}
              </span>
            </div>

            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mr-2" />
              <span className="truncate">{hangout.location}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <div className="flex -space-x-2">
                  {hangout.participants.slice(0, 4).map((participant, index) => (
                    <div key={index} className="relative">
                      <Avatar className="w-6 h-6 border-2 border-background">
                        <AvatarImage src={participant.avatar || "/placeholder.svg"} alt={participant.name} />
                        <AvatarFallback className="text-xs">{participant.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-background ${getStatusColor(participant.status)}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center text-sm text-muted-foreground ml-2">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{yesCount} going</span>
                </div>
              </div>

              <Button variant="ghost" size="sm" className="relative">
                <MessageSquare className="w-4 h-4" />
                {hangout.newCommentsCount && hangout.newCommentsCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 px-1 min-w-0 h-4 text-xs">
                    {hangout.newCommentsCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
