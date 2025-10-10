"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, AlertCircle } from "lucide-react"

export function AuthForm() {
  const router = useRouter()
  const { signIn, signUp, isLoading } = useAuth()
  
  const [mounted, setMounted] = useState(false)
  const [isSignIn, setIsSignIn] = useState(true)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    name: ""})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Client-side validation for signup
    if (!isSignIn) {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match")
        return
      }
      if (formData.password.length < 8) {
        setError("Password must be at least 8 characters long")
        return
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        setError("Password must contain at least one uppercase letter, one lowercase letter, and one number")
        return
      }
      if (!/^[a-zA-Z\s]+$/.test(formData.name)) {
        setError("Name can only contain letters and spaces")
        return
      }
    }

    try {
      if (isSignIn) {
        await signIn({ email: formData.email, password: formData.password })
      } else {
        await signUp({
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          username: formData.username,
          name: formData.name})
      }
      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed")
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white text-center">
            {isSignIn ? "Sign In" : "Sign Up"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={isSignIn ? "signin" : "signup"} onValueChange={(value) => setIsSignIn(value === "signin")}>
            <TabsList className="grid w-full grid-cols-2 bg-gray-700">
              <TabsTrigger value="signin" className="text-white">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-white">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Input
                    type="text"
                    placeholder="Username"
                    value={formData.username}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Sign Up"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

