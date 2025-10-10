import { ProfilePage } from "@/components/profile-page"

// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'

export default function Profile() {
  return <ProfilePage />
}