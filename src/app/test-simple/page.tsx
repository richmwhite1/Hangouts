'use client'

export default function TestSimplePage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">Simple Test Page</h1>
      <p className="text-xl mb-8">This is a simple test page to verify the app is working.</p>
      <div className="space-y-4">
        <button 
          onClick={() => window.location.href = '/hangouts/hangout_1758250598719_ti4p2nlxr'}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-lg font-semibold"
        >
          Test Hangout Page
        </button>
        <button 
          onClick={() => window.location.href = '/'}
          className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg text-lg font-semibold"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}









