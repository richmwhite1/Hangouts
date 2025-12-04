'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { QuickCreateForm } from '@/components/create/quick-create-form'
import { GuestLanding } from '@/components/guest-landing'

export default function CreatePage() {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isLoaded || !isClient) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return <GuestLanding onSignIn={() => router.push('/sign-in')} onSignUp={() => router.push('/sign-up')} />
  }

  return (
    <div className="min-h-screen bg-black pt-20 pb-20">
      <QuickCreateForm />
    </div>
  )
}