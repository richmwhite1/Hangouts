export default function HomePage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Hangouts 3.0</h1>
        <p className="text-gray-400 mb-6">Plan amazing hangouts with friends</p>
        <div className="space-x-4">
          <a href="/login" className="bg-[#6c47ff] text-white px-4 py-2 rounded-md hover:bg-[#6c47ff]/90">
            Sign In
          </a>
          <a href="/signup" className="border border-gray-300 text-white px-4 py-2 rounded-md hover:bg-gray-800">
            Sign Up
          </a>
        </div>
      </div>
    </div>
  )
}