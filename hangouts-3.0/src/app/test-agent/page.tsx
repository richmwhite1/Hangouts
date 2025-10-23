'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Sparkles, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { calculateTokenUsage } from '@/lib/agent-utils'

interface TestResult {
  query: string
  timestamp: string
  success: boolean
  data: any
  error?: string
  responseTime?: number
}

export default function TestAgentPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [totalTokens, setTotalTokens] = useState(0)
  const [totalCost, setTotalCost] = useState(0)

  const runTest = async (query: string) => {
    setIsLoading(true)
    const startTime = Date.now()

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationId,
        }),
      })

      const data = await response.json()
      const responseTime = Date.now() - startTime

      // Estimate tokens
      const messages = [
        { role: 'user', content: query },
        { role: 'assistant', content: data.data?.message || '' },
      ]
      const { estimatedTokens, estimatedCost } = calculateTokenUsage(messages)
      setTotalTokens(prev => prev + estimatedTokens)
      setTotalCost(prev => prev + estimatedCost)

      setTestResults(prev => [
        {
          query,
          timestamp: new Date().toLocaleTimeString(),
          success: response.ok,
          data: data.data,
          error: response.ok ? undefined : data.error,
          responseTime,
        },
        ...prev,
      ])

      if (response.ok && data.data.conversationId) {
        setConversationId(data.data.conversationId)
      }

      if (response.ok) {
        toast.success(`Test completed in ${responseTime}ms`)
      } else {
        toast.error(`Test failed: ${data.error}`)
      }
    } catch (error: any) {
      setTestResults(prev => [
        {
          query,
          timestamp: new Date().toLocaleTimeString(),
          success: false,
          data: null,
          error: error.message,
        },
        ...prev,
      ])
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
    setConversationId(null)
    setTotalTokens(0)
    setTotalCost(0)
    toast.info('Results cleared')
  }

  const testScenarios = [
    { label: 'Find Concerts', query: 'Find concerts this weekend' },
    { label: 'Comedy Shows', query: 'Show me comedy shows Friday night' },
    { label: 'Tonight Events', query: "What's happening tonight?" },
    { label: 'Restaurants', query: 'Find good restaurants near me' },
    { label: 'Create Hangout', query: 'Help me create a hangout with friends' },
    { label: 'Art Exhibitions', query: 'Are there any art exhibitions this month?' },
    { label: 'General Help', query: 'How does this app work?' },
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-8">
        <div className="text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold mb-2">AI Agent Testing Dashboard</h1>
          <p className="text-muted-foreground">
            Test the conversational AI agent with various scenarios
          </p>
        </div>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Session Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{testResults.length}</p>
                <p className="text-sm text-muted-foreground">Tests Run</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Est. Tokens</p>
              </div>
              <div>
                <p className="text-2xl font-bold">${totalCost.toFixed(4)}</p>
                <p className="text-sm text-muted-foreground">Est. Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Test Scenarios */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Test Scenarios</CardTitle>
            <CardDescription>
              Click any button to test the agent with predefined queries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {testScenarios.map((scenario) => (
                <Button
                  key={scenario.label}
                  onClick={() => runTest(scenario.query)}
                  disabled={isLoading}
                  variant="outline"
                >
                  {scenario.label}
                </Button>
              ))}
              <Button variant="destructive" onClick={clearResults}>
                Clear Results
              </Button>
            </div>
            
            {conversationId && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground">
                  Active Conversation: <code className="text-xs">{conversationId}</code>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                Most recent tests appear first
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-md border ${
                      result.success
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          Query: {result.query}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.timestamp}
                          {result.responseTime && ` • ${result.responseTime}ms`}
                        </p>
                      </div>
                      <div
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          result.success
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}
                      >
                        {result.success ? 'Success' : 'Failed'}
                      </div>
                    </div>

                    {result.data && (
                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="text-sm font-semibold mb-1">Response:</p>
                          <p className="text-sm bg-white dark:bg-gray-800 p-2 rounded border">
                            {result.data.message}
                          </p>
                        </div>

                        {result.data.intent && (
                          <div>
                            <p className="text-xs font-semibold">
                              Intent: <span className="text-primary">{result.data.intent}</span>
                            </p>
                          </div>
                        )}

                        {result.data.actionHint && (
                          <div>
                            <p className="text-xs font-semibold">
                              Action: <span className="text-primary">{result.data.actionHint}</span>
                            </p>
                          </div>
                        )}

                        {result.data.actionData && (
                          <details className="mt-2">
                            <summary className="text-xs font-semibold cursor-pointer">
                              Raw Data (click to expand)
                            </summary>
                            <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto max-h-60">
                              {JSON.stringify(result.data.actionData, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}

                    {result.error && (
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                          Error:
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {result.error}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold">What to Test:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                  <li>Event discovery queries (concerts, restaurants, shows)</li>
                  <li>Hangout creation flows</li>
                  <li>Multi-turn conversations (test continuity)</li>
                  <li>Error handling (invalid queries, edge cases)</li>
                  <li>Response times and token usage</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold">Success Criteria:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                  <li>Responses should be conversational and helpful</li>
                  <li>Intent detection should be accurate</li>
                  <li>Action hints should trigger appropriate UI</li>
                  <li>Response times should be under 3 seconds</li>
                  <li>Conversation context should be maintained</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

