import { ProfilePage } from "@/components/profile-page"
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default function Profile() {
  const { userId } = auth()
  if (!userId) {
    redirect('/sign-in?redirect_url=/profile')
  }
  return <ProfilePage />
}