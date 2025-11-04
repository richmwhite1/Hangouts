import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ProfileClient } from "@/components/profile-client"

export default async function Profile() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in?redirect_url=/profile')
  }

  return <ProfileClient />
}