import { Navigation } from "@/components/navigation"
import { HangoutCalendar } from "@/components/hangout-calendar"

// Server-side data fetching
async function getHangouts() {
  try {
    const response = await fetch('http://localhost:3000/api/hangouts', {
      cache: 'no-store' // Ensure fresh data
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data.hangouts || []
  } catch (error) {
    console.error('Server-side fetch error:', error)
    return []
  }
}

export default async function HomePage() {
  const hangouts = await getHangouts()
  
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <Navigation />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-8">
          <HangoutCalendar />
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Hangouts ({hangouts.length})</h2>
          {hangouts.length === 0 ? (
            <div className="p-4">No hangouts found.</div>
          ) : (
            hangouts.map((hangout: any) => (
              <div key={hangout.id} className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold">{hangout.title}</h3>
                <p className="text-gray-600">{hangout.description}</p>
                <p className="text-sm text-gray-500">📍 {hangout.location}</p>
                <p className="text-sm text-gray-500">👤 by {hangout.creator.name}</p>
                <p className="text-sm text-gray-500">👥 {hangout._count.participants} participants</p>
                <p className="text-sm text-gray-500">🕐 {new Date(hangout.startTime).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}