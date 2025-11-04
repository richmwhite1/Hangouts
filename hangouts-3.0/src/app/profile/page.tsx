import { ProfileClient } from "@/components/profile-client"

// Profile page - middleware handles authentication
// Using client component for auth to avoid server-side auth() issues
export default function Profile() {
  return <ProfileClient />
}