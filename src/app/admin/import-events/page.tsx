'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import { Loader2, Download, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'

interface ImportResults {
  total: number
  imported: number
  skipped: number
  errors: Array<{
    event: string
    error: string
  }>
}

export default function ImportEventsPage() {
  const { isAuthenticated, token } = useAuth()
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<{success: boolean, message: string, sampleEvent?: string} | null>(null)
  const [testing, setTesting] = useState(false)

  const handleTestAPI = async () => {
    setTesting(true)
    setTestResults(null)
    
    try {
      const response = await fetch('/api/admin/import-events', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'API request failed')
      }
      
      const data = await response.json()
      
      setTestResults({
        success: true,
        message: data.message || '✅ Connected to Eventbrite!',
        sampleEvent: data.data?.sampleEvent || 'No events found'
      })
    } catch (error) {
      setTestResults({
        success: false,
        message: `❌ Connection failed: ${(error as Error).message}`
      })
    } finally {
      setTesting(false)
    }
  }

  const handleImport = async () => {
    if (!isAuthenticated || !token) {
      setError('Please sign in to import events')
      return
    }

    setImporting(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/admin/import-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        setResults(data.data.results)
      } else {
        setError(data.message || 'Import failed')
      }
    } catch (err) {
      setError('Failed to import events: ' + (err as Error).message)
    } finally {
      setImporting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-900 border-gray-700">
          <CardContent className="p-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Authentication Required</h2>
            <p className="text-gray-400">Please sign in to access the event import page.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Import Eventbrite Events</h1>
          <p className="text-gray-400">Import events from Eventbrite for Salt Lake City and surrounding areas</p>
        </div>
        
        <Card className="bg-gray-900 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Download className="w-5 h-5" />
              Salt Lake City Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4">
              Import events from Eventbrite for Salt Lake City and surrounding areas (25 mile radius).
              This will fetch upcoming events and add them to your database.
            </p>
            
            <Button
              onClick={handleTestAPI}
              disabled={testing}
              className="bg-gray-600 hover:bg-gray-700 text-white min-h-[44px] px-6 mb-4 w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Test Eventbrite API Connection
                </>
              )}
            </Button>
            
            <Button
              onClick={handleImport}
              disabled={importing}
              className="bg-purple-600 hover:bg-purple-700 text-white min-h-[44px] px-6"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Import Events
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults && (
          <Card className={`bg-gray-900 border-2 mb-6 ${testResults.success ? 'border-green-500' : 'border-red-500'}`}>
            <CardContent className="p-4">
              <p className={`font-semibold mb-2 ${testResults.success ? 'text-green-400' : 'text-red-400'}`}>
                {testResults.message}
              </p>
              {testResults.sampleEvent && (
                <p className="text-gray-300 text-sm">
                  Sample event: {testResults.sampleEvent}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results && (
          <Card className="bg-gray-900 border-green-500 mb-6">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Import Successful!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{results.total}</div>
                  <div className="text-sm text-gray-400">Total Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{results.imported}</div>
                  <div className="text-sm text-gray-400">Imported</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{results.skipped}</div>
                  <div className="text-sm text-gray-400">Updated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{results.errors.length}</div>
                  <div className="text-sm text-gray-400">Errors</div>
                </div>
              </div>
              
              {results.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Errors ({results.errors.length})
                  </h4>
                  <div className="bg-gray-800 rounded-lg p-4 max-h-40 overflow-y-auto">
                    {results.errors.map((err, idx) => (
                      <div key={idx} className="text-sm text-gray-300 mb-1">
                        • <span className="font-medium">{err.event}</span>: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="bg-gray-900 border-red-500 mb-6">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Import Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Info className="w-5 h-5" />
              Import Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-white font-semibold mb-2">What gets imported:</h4>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>• Events within 25 miles of Salt Lake City</li>
                  <li>• Only future events (from today onwards)</li>
                  <li>• Complete event details (title, venue, date, price)</li>
                  <li>• Event images and ticket links</li>
                  <li>• Properly categorized events</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">How it works:</h4>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>• Automatically maps Eventbrite categories</li>
                  <li>• Skips duplicate events based on external ID</li>
                  <li>• Updates existing events if they've changed</li>
                  <li>• Rate limited to prevent API issues</li>
                  <li>• Imports up to 5 pages of results</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
