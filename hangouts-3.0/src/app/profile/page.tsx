import { ProfilePage } from "@/components/profile-page"

// Profile page - middleware handles authentication
// Using client component for auth to avoid server-side auth() issues
export default function Profile() {
  return <ProfilePage />
}