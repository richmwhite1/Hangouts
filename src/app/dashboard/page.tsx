export default function DashboardPage() {
  return (
    <div className="container">
      <div className="card">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="text-gray-600 mb-4">
          This is a placeholder dashboard page. Ready for your custom design integration.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card">
            <h3 className="font-semibold mb-2">My Hangouts</h3>
            <p className="text-gray-600">View your created hangouts</p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">Upcoming</h3>
            <p className="text-gray-600">Hangouts you&apos;re attending</p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">Recent Activity</h3>
            <p className="text-gray-600">Latest updates and notifications</p>
          </div>
        </div>
      </div>
    </div>
  )
}