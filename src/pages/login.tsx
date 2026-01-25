"use client"

import type React from "react"
import { v4 as uuidv4 } from 'uuid';
import { useState } from "react"
import { useLocation } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { apiRequest } from "@/lib/queryClient"
import { useAuth } from "@/hooks/useAuth"

export default function Login() {
  const [, setLocation] = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await apiRequest("POST", "/api/auth/login", { email, password })
      const data = await response.json()

      // Check if there's a guest session that needs to be archived
      const guestSession = localStorage.getItem('guestSession');
      if (guestSession) {
        try {
          const sessionData = JSON.parse(guestSession);
          if (sessionData.isGuest && sessionData.guestId) {
            // Move the guestId to archivedGuestId
            localStorage.setItem('archivedGuestId', sessionData.guestId);
          }
        } catch (parseError) {
          console.error('Error parsing guest session:', parseError);
        }
        
        // Remove guest session data after archiving
        localStorage.removeItem('guestSession');
      }

      // Proceed with normal login
      login(data.user, data.token)

      switch (data.user.role) {
        case "admin":
          setLocation("/orders")
          break
        case "kitchen":
          setLocation("/kitchen")
          break
        case "customer":
          setLocation("/")
          break
        default:
          setLocation("/")
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      try {
        // Try to parse error response
        const errorMatch = err.message.match(/\d+:\s*({.*})/)
        if (errorMatch && errorMatch[1]) {
          const errorData = JSON.parse(errorMatch[1])
          
          // Display specific error message based on error type
          if (errorData.errorType === 'USER_NOT_FOUND') {
            setError(errorData.error || 'No account found with this email address')
          } else if (errorData.errorType === 'INVALID_PASSWORD') {
            setError(errorData.error || 'Incorrect password')
          } else if (errorData.errorType === 'MISSING_FIELDS') {
            setError('Please enter both email and password')
          } else if (errorData.errorType === 'SERVER_ERROR') {
            setError('Server error. Please try again in a few moments.')
          } else {
            setError(errorData.error || 'Login failed. Please try again.')
          }
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          setError('Connection error. Please check your internet and try again.')
        } else {
          setError(err.message || 'Login failed. Please try again.')
        }
      } catch (parseError) {
        // Fallback for unparseable errors
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          setError('Connection error. Please check your internet and try again.')
        } else {
          setError('Login failed. Please check your credentials and try again.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = (role: "admin" | "kitchen" | "customer") => {
    switch (role) {
      case "admin":
        setEmail("admin@example.com")
        setPassword("admin123")
        break
      case "kitchen":
        setEmail("kitchen@example.com")
        setPassword("kitchen123")
        break
      case "customer":
        setEmail("customer@example.com")
        setPassword("customer123")
        break
    }

    setTimeout(() => {
      const loginButton = document.querySelector('button[type="submit"]') as HTMLButtonElement
      if (loginButton) loginButton.focus()
    }, 100)
  }

  const handleContinueAsGuest = async () => {
    try {
      // Generate a unique guest ID
      const guestId = uuidv4();
      
      // Store guest session in localStorage
      localStorage.setItem('guestSession', JSON.stringify({
        isGuest: true,
        guestId,
        timestamp: new Date().toISOString()
      }));
      
      // Redirect to menu page
      setLocation("/");
    } catch (error) {
      console.error("Error starting guest session:", error);
      setError("Failed to start guest session. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg border border-border/50 backdrop-blur-sm">
        <CardHeader className="text-center pb-8 pt-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/5 rounded-full blur-xl"></div>
              <img
                src="/nibbles.jpg"
                alt="Nibbles Logo"
                className="h-20 w-auto object-contain relative z-10 rounded-full transition-transform duration-300 hover:scale-105"
              />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight sr-only">Nibbles</CardTitle>
          <CardDescription className="text-base text-foreground/70">Welcome back to Nibbles</CardDescription>
          <p className="text-sm text-muted-foreground mt-2">Sign in to manage your account</p>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                Password
              </Label>
              <div className="relative group">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-200"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2 pb-8">
            <Button
              type="submit"
              className="w-full h-11 font-semibold text-base transition-all duration-200 hover:shadow-md active:scale-95"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </div>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="space-y-3 pt-2">
              {/* <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-xs text-muted-foreground font-medium">Quick Checkout</span>
                <div className="flex-1 h-px bg-border"></div>
              </div> */}

              {/* <Button
                type="button"
                variant="default"
                className="w-full h-11 font-semibold transition-all duration-200 hover:shadow-md bg-primary/90 hover:bg-primary"
                onClick={() => setLocation("/guest-checkout")}
              >
                Continue as Guest
              </Button> */}

              {/* <p className="text-xs text-center text-muted-foreground">
                No account needed. Create one later to track orders.
              </p> */}

              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-xs text-muted-foreground font-medium">New to Nibbles?</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-10 transition-all duration-200 hover:bg-muted bg-transparent"
                onClick={() => setLocation("/signup")}
              >
                Create an account
              </Button>

              {/* <Button
                type="button"
                variant="ghost"
                className="w-full h-10 text-muted-foreground hover:text-foreground transition-colors duration-200"
                onClick={() => setLocation("/forgot-password")}
              >
                Forgot your password?
              </Button> */}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
