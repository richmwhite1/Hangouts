import MessagesWrapper from "@/components/messages-wrapper"

// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'

export default function MessagesPage() {
  return <MessagesWrapper />
}