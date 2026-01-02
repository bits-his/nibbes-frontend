"use client"

import { useState } from "react"
import { useLocation } from "wouter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, ShoppingCart } from "lucide-react"
import { apiRequest } from "@/lib/queryClient"
import { saveGuestSession } from "@/lib/guestSession"

export default function GuestCheckout() {
  const [, setLocation] = useLocation()
  const [guestName, setGuestName] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleGuestCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await apiRequest("POST", "/api/guest/session", {
        guestName,
        guestPhone,
        guestEmail: guestEmail || undefined
      })
      
      const data = await response.json()

      // Save guest session to localStorage
      saveGuestSession({
        guestId: data.guestId,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        guestEmail: data.guestEmail,
        createdAt: new Date().toISOString(),
        expiresAt: data.expiresAt
      })

      // Redirect to checkout
      setLocation("/checkout")
    } catch (err: any) {
      try {
        const errorMatch = err.message.match(/\d+:\s*({.*})/)
        if (errorMatch && errorMatch[1]) {
          const errorData = JSON.parse(errorMatch[1])
          if (errorData.details && Array.isArray(errorData.details)) {
            setError(errorData.details.join(", "))
          } else {
            setError(errorData.error || "Failed to create guest session")
          }
        } else {
          setError("Failed to create guest session. Please try again.")
        }
      } catch (parseError) {
        setError(err.message || "Failed to create guest session")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg border border-border/50 backdrop-blur-sm">
        <CardHeader className="text-center pb-8 pt-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/5 rounded-full blur-xl"></div>
              <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center relative z-10">
                <ShoppingCart className="h-10 w-10 text-primary" />
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Guest Checkout</CardTitle>
          <CardDescription className="text-base text-foreground/70">
            Continue without creating an account
          </CardDescription>
          <p className="text-sm text-muted-foreground mt-2">
            You can create an account later to track your orders
          </p>
        </CardHeader>

        <form onSubmit={handleGuestCheckout}>
          <CardContent className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-2.5">
              <Label htmlFor="guestName" className="text-sm font-semibold text-foreground">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="guestName"
                type="text"
                placeholder="John Doe"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="guestPhone" className="text-sm font-semibold text-foreground">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="guestPhone"
                type="tel"
                placeholder="+234 801 234 5678"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                required
                className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                We'll use this to track your order
              </p>
            </div>

            {/* <div className="space-y-2.5">
              <Label htmlFor="guestEmail" className="text-sm font-semibold text-foreground">
                Email Address <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Input
                id="guestEmail"
                type="email"
                placeholder="you@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                For order confirmation and updates
              </p>
            </div> */}
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
                  Processing...
                </div>
              ) : (
                "Continue to Checkout"
              )}
            </Button>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-xs text-muted-foreground font-medium">Already have an account?</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-10 transition-all duration-200 hover:bg-muted bg-transparent"
                onClick={() => setLocation("/login")}
              >
                Sign In
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
