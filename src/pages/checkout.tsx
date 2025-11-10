"use client"

import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { ArrowLeft, MapPin, Check, ChefHat } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { apiRequest, queryClient } from "@/lib/queryClient"
import type { CartItem } from "@shared/schema"
import { useAuth } from "@/hooks/useAuth"
import { getGuestSession } from "@/lib/guestSession"

const checkoutFormSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerPhone: z.string().optional(),
  orderType: z.enum(["delivery", "pickup"], {
    required_error: "Please select an order type",
  }),
})

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>

// function StepIndicator({ currentStep }: { currentStep: number }) {
//   const steps = ["Contact", "Delivery", "Payment"]
//   return (
//     <div className="flex items-center justify-between mb-8">
//       {steps.map((step, index) => (
//         <div key={index} className="flex items-center">
//           <div
//             className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
//               index < currentStep
//                 ? "bg-accent -foreground"
//                 : index === currentStep
//                   ? "bg-primary text-primary-foreground"
//                   : "bg-muted text-muted-foreground"
//             }`}
//           >
//             {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
//           </div>
//           <span className={`ml-2 font-medium ${index <= currentStep ? "text-foreground" : "text-muted-foreground"}`}>
//             {step}
//           </span>
//           {index < steps.length - 1 && (
//             <div className={`w-12 h-0.5 mx-2 ${index < currentStep ? "bg-accent" : "bg-muted"}`} />
//           )}
//         </div>
//       ))}
//     </div>
//   )
// }

function CartSummaryHeader({ itemCount, subtotal }: { itemCount: number; subtotal: number }) {
  return (
    <div className="bg-gradient-to-r from-accent/10 to-primary/5 border border-accent/20 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="w-5 h-5 " />
          <div>
            <p className="text-sm text-muted-foreground">Your Order</p>
            <p className="font-semibold text-foreground">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Subtotal</p>
          <p className="text-lg font-bold ">
            ₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Checkout() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const { user, loading } = useAuth()
  const [cart, setCart] = useState<CartItem[]>([])
  const [locationData, setLocationData] = useState<{ latitude: number; longitude: number; address: string } | null>(
    null,
  )
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || "wss://server.brainstorm.ng/nibbleskitchen/ws"
    const socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      console.log("Checkout WebSocket connected")
    }

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "menu_item_update") {
        queryClient.invalidateQueries({ queryKey: ["/api/menu"] })
      } else if (data.type === "order_update" || data.type === "new_order" || data.type === "order_status_change") {
        queryClient.invalidateQueries({ queryKey: ["/api/orders/active/customer"] })
      }
    }

    socket.onerror = (error) => {
      console.error("Checkout WebSocket error:", error)
    }

    socket.onclose = () => {
      console.log("Checkout WebSocket disconnected")
    }

    return () => {
      socket.close()
    }
  }, [])

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      customerName: user?.username || "",
      customerPhone: "",
      orderType: "delivery",
    },
  })

  useEffect(() => {
    if (loading) return

    const guestSession = getGuestSession()
    if (!user && !guestSession) {
      const savedCart = localStorage.getItem("cart")
      if (savedCart) {
        localStorage.setItem("pendingCheckoutCart", savedCart)
      }

      setLocation("/login?redirect=/checkout")
      return
    }

    const savedCart = localStorage.getItem("cart")
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    } else {
      setLocation("/")
    }

    const savedLocation = localStorage.getItem("location")
    if (savedLocation) {
      try {
        const parsedLocation = JSON.parse(savedLocation)
        setLocationData(parsedLocation)
      } catch (error) {
        console.error("Error parsing location data:", error)
      }
    }

    if (user) {
      form.setValue("customerName", user.username || user.email)
    } else if (guestSession) {
      form.setValue("customerName", guestSession.guestName)
      form.setValue("customerPhone", guestSession.guestPhone)
    }
  }, [user, loading, setLocation, form])

  const subtotal = cart.reduce((sum, item) => sum + Number.parseFloat(item.menuItem.price) * item.quantity, 0)

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/orders", data)
      return await response.json()
    },
    onSuccess: (data: any) => {
      toast({
        title: "Order Placed!",
        description: `Your order #${data.orderNumber} has been received and placed.`,
      })
      localStorage.removeItem("cart")
      form.reset()
      setTimeout(() => {
        setLocation("/docket")
      }, 1500)
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (values: CheckoutFormValues) => {
    if (!values.orderType) {
      toast({
        title: "Delivery Method Required",
        description: "Please select a delivery method (Delivery or Pickup) to continue.",
        variant: "destructive",
      })
      return
    }

    const guestSession = getGuestSession()

    const orderData = {
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      orderType: values.orderType,
      ...(guestSession && {
        guestId: guestSession.guestId,
        guestName: guestSession.guestName,
        guestPhone: guestSession.guestPhone,
        guestEmail: guestSession.guestEmail,
      }),
      ...(locationData &&
        values.orderType === "delivery" && {
          location: {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            address: locationData.address,
          },
        }),
      items: cart.map((item) => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        price: item.menuItem.price,
        specialInstructions: item.specialInstructions,
      })),
    }

    createOrderMutation.mutate(orderData)
  }

  if (cart.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-8 text-muted-foreground hover:text-foreground"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Menu
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">Complete Your Order</h1>
          <p className="text-muted-foreground">Secure checkout • Fast delivery • Real-time tracking</p>
        </div>

        {/* <StepIndicator currentStep={currentStep} /> */}

        <CartSummaryHeader itemCount={cart.length} subtotal={subtotal} />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Left column - Form sections */}
              <div className="lg:col-span-2 space-y-6">
                {/* Contact Information Card */}
                <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="bg-muted/30 border-b border-border/30">
                    <CardTitle className="text-lg">1. Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John Doe"
                              {...field}
                              readOnly={!!user}
                              className="h-11 text-base rounded-lg border-border/50"
                              data-testid="input-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="08012345678"
                              {...field}
                              className="h-11 text-base rounded-lg border-border/50"
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Order Type Selection Card */}
                <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="bg-muted/30 border-b border-border/30">
                    <CardTitle className="text-lg">2. Delivery Method</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="orderType"
                        render={({ field }) => (
                          <>
                            <FormItem>
                              <FormControl>
                                <button
                                  type="button"
                                  className={`w-full p-4 rounded-lg border-2 text-center transition-all font-semibold ${
                                    field.value === "delivery"
                                      ? "border-accent bg-accent/10 "
                                      : "border-border/50 bg-muted/30 text-foreground hover:border-border"
                                  }`}
                                  onClick={() => {
                                    field.onChange("delivery")
                                    setCurrentStep(1)
                                  }}
                                >
                                  <div className="font-semibold text-base">🚗 Delivery</div>
                                  <div className="text-sm text-muted-foreground mt-1">To your location</div>
                                </button>
                              </FormControl>
                            </FormItem>
                            <FormItem>
                              <FormControl>
                                <button
                                  type="button"
                                  className={`w-full p-4 rounded-lg border-2 text-center transition-all font-semibold ${
                                    field.value === "pickup"
                                      ? "border-accent bg-accent/10 "
                                      : "border-border/50 bg-muted/30 text-foreground hover:border-border"
                                  }`}
                                  onClick={() => {
                                    field.onChange("pickup")
                                    setCurrentStep(1)
                                  }}
                                >
                                  <div className="font-semibold text-base">🏪 Pickup</div>
                                  <div className="text-sm text-muted-foreground mt-1">At our location</div>
                                </button>
                              </FormControl>
                            </FormItem>
                          </>
                        )}
                      />
                    </div>
                    <FormMessage />
                  </CardContent>
                </Card>

                {/* Location Information Card */}
                {locationData && form.watch("orderType") === "delivery" && (
                  <Card className="border-accent/30 bg-accent/5 shadow-sm">
                    <CardHeader className="bg-accent/10 border-b border-accent/20">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MapPin className="w-5 h-5 " />
                        Delivery Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4 p-4 bg-background/50 rounded-lg border border-accent/20">
                        <MapPin className="w-5 h-5  mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{locationData.address}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Payment Method Card */}
                <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="bg-muted/30 border-b border-border/30">
                    <CardTitle className="text-lg">3. Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 p-4 border border-border/50 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="w-12 h-8 bg-gradient-to-r from-primary to-accent rounded flex items-center justify-center text-white text-xs font-bold">
                        💳
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">Secure Payment</p>
                        <p className="text-sm text-muted-foreground">Interswitch WebPAY • Debit/Credit Card</p>
                      </div>
                      <Check className="w-5 h-5 " />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right column - Order Summary */}
              <div>
                <Card className="sticky top-4 border-border/50 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/5 border-b border-accent/20 rounded-t-lg">
                    <CardTitle className="text-lg">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {/* Cart items */}
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.menuItem.id} className="flex justify-between gap-4 p-3 bg-muted/20 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{item.menuItem.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">× {item.quantity}</p>
                          </div>
                          <p className="font-semibold  whitespace-nowrap">
                            ₦{(Number.parseFloat(item.menuItem.price) * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Divider and total */}
                    <div className="border-t border-border/30 pt-4 space-y-3">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Subtotal</span>
                        <span>₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Delivery</span>
                        <span className={form.watch("orderType") === "pickup" ? " font-semibold" : ""}>
                          {form.watch("orderType") === "pickup" ? "Free" : "₦500"}
                        </span>
                      </div>
                      <div className="border-t border-border/30 pt-3 flex justify-between text-lg">
                        <span className="font-semibold text-foreground">Total</span>
                        <span className="text-2xl font-bold " data-testid="text-total">
                          ₦
                          {(subtotal + (form.watch("orderType") === "pickup" ? 0 : 500)).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-all rounded-lg"
                      disabled={createOrderMutation.isPending}
                      data-testid="button-place-order"
                    >
                      {createOrderMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                          Processing
                        </span>
                      ) : (
                        "Complete Order"
                      )}
                    </Button>

                    {/* Security note */}
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      🔒 Secure checkout • Your data is encrypted
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
