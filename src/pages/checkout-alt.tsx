"use client"

import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { ArrowLeft, ChefHat, MapPin } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useAuth } from "@/hooks/useAuth"
import { getGuestSession } from "@/lib/guestSession"
import { useCart } from "@/context/CartContext"
import InterswitchPayButton from "@/components/InterswitchPayButton"

interface ServiceCharge {
  id: string
  description: string
  type: "fixed" | "percentage"
  amount: number
}

export default function CheckoutAlt() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const { user, loading } = useAuth()
  const { cart, clearCart } = useCart()

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [transactionRef, setTransactionRef] = useState("")
  const [orderId, setOrderId] = useState<number | null>(null)
  const [orderNumber, setOrderNumber] = useState("")
  const [orderCreated, setOrderCreated] = useState(false)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [serviceCharges, setServiceCharges] = useState<ServiceCharge[]>([])

  // Generate transaction reference
  useEffect(() => {
    setTransactionRef(`NKO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  }, [])

  // Fetch service charges
  useEffect(() => {
    apiRequest("GET", "/api/service-charges/active")
      .then((res) => res.json())
      .then(setServiceCharges)
      .catch(() => setServiceCharges([]))
  }, [])

  // Initialize user data
  useEffect(() => {
    if (loading) return

    const guestSession = getGuestSession()
    if (!user && !guestSession) {
      if (cart.length > 0) {
        localStorage.setItem("pendingCheckoutCart", JSON.stringify(cart))
      }
      setLocation("/guest-checkout")
      return
    }

    if (cart.length === 0) {
      setLocation("/")
      return
    }

    if (user) {
      setCustomerName(user.username || user.email || "")
    } else if (guestSession) {
      setCustomerName(guestSession.guestName)
      setCustomerPhone(guestSession.guestPhone)
    }
  }, [user, loading, cart, setLocation])

  const subtotal = cart.reduce(
    (sum, item) => sum + Number.parseFloat(item.menuItem.price) * item.quantity,
    0
  )

  const calculateServiceChargeAmount = (charge: ServiceCharge) => {
    if (cart.length === 0) return 0
    return charge.type === "percentage" ? subtotal * (charge.amount / 100) : charge.amount
  }

  const total = serviceCharges.reduce(
    (sum, charge) => sum + calculateServiceChargeAmount(charge),
    subtotal
  )

  const createOrder = async () => {
    if (!customerName.trim()) {
      toast({ title: "Name Required", description: "Please enter your name.", variant: "destructive" })
      return
    }

    setIsCreatingOrder(true)
    const guestSession = getGuestSession()

    try {
      const response = await apiRequest("POST", "/api/orders", {
        customerName,
        customerPhone,
        orderType: "online",
        paymentMethod: "card",
        paymentStatus: "pending",
        transactionRef,
        ...(guestSession && {
          guestId: guestSession.guestId,
          guestName: guestSession.guestName,
          guestPhone: guestSession.guestPhone,
          guestEmail: guestSession.guestEmail,
        }),
        items: cart.map((item) => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          price: item.menuItem.price,
          specialInstructions: item.specialInstructions,
        })),
      })

      const order = await response.json()
      setOrderId(order.id)
      setOrderNumber(order.orderNumber)
      setOrderCreated(true)

      localStorage.setItem(
        "pendingPaymentOrder",
        JSON.stringify({ orderId: order.id, orderNumber: order.orderNumber, txnRef: transactionRef })
      )
      
      // Invalidate queries to refresh orders and menu items stock balances
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] })
      queryClient.invalidateQueries({ queryKey: ["/api/menu/all"] })
    } catch (error) {
      toast({ title: "Order Failed", description: "Unable to create order.", variant: "destructive" })
    } finally {
      setIsCreatingOrder(false)
    }
  }

  const handlePaymentSuccess = () => {
    clearCart()
  }

  if (cart.length === 0) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-lg mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Menu
        </Button>

        <h1 className="text-3xl font-bold mb-2">Checkout</h1>
        <p className="text-muted-foreground mb-6">
          {cart.length} {cart.length === 1 ? "item" : "items"} • ₦{subtotal.toLocaleString()}
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="John Doe"
                disabled={orderCreated}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="08012345678"
                disabled={orderCreated}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.map((item) => (
              <div key={item.menuItem.id} className="flex justify-between text-sm">
                <span>
                  {item.menuItem.name} × {item.quantity}
                </span>
                <span>₦{(Number.parseFloat(item.menuItem.price) * item.quantity).toLocaleString()}</span>
              </div>
            ))}

            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>₦{subtotal.toLocaleString()}</span>
              </div>
              {serviceCharges.map((charge) => (
                <div key={charge.id} className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {charge.description}
                    {charge.type === "percentage" ? ` (${charge.amount}%)` : ""}
                  </span>
                  <span>₦{calculateServiceChargeAmount(charge).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-[#4EB5A4]">₦{total.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {!orderCreated ? (
          <Button
            onClick={createOrder}
            disabled={isCreatingOrder || !customerName.trim()}
            className="w-full h-12 bg-gradient-to-r from-accent to-primary"
          >
            {isCreatingOrder ? "Creating Order..." : `Proceed to Pay ₦${total.toLocaleString()}`}
          </Button>
        ) : (
          <InterswitchPayButton
            amount={total}
            transactionRef={transactionRef}
            customerName={customerName}
            customerPhone={customerPhone}
            orderId={orderId!}
            orderNumber={orderNumber}
            onSuccess={handlePaymentSuccess}
            label={`Pay ₦${total.toLocaleString()}`}
          />
        )}

        <p className="text-xs text-muted-foreground text-center mt-4">
          🔒 Secured by Interswitch
        </p>
      </div>
    </div>
  )
}
