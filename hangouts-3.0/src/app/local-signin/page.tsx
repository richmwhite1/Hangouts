'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

export default function LocalSignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Local development sign-in is not implemented. Please use production environment or configure Clerk keys for full authentication.')
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Card className="w-full max-w-md bg-gray-900 border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-white text-2xl">Local Development</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 bg-blue-900/20 border-blue-700">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-300">
              Sign-in is disabled in local development. To test authentication, please:
              <br />
              1. Configure Clerk keys in your environment
              <br />
              2. Or use the production environment
            </AlertDescription>
          </Alert>
          
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="Enter your email"
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="Enter your password"
                disabled
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled
            >
              Sign In (Disabled)
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Button 
              variant="outline" 
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              onClick={() => window.location.href = '/'}
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
