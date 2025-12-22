"use client"

import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { ArrowLeft, MapPin, Check, ChefHat, CreditCard, Banknote, Smartphone, Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { apiRequest, queryClient } from "@/lib/queryClient"
import type { CartItem } from "@shared/schema"
import { useAuth } from "@/hooks/useAuth"
import { getGuestSession } from "@/lib/guestSession"
import { useCart } from "@/context/CartContext"

// Extend Window interface for Interswitch
declare global {
  interface Window {
    webpayCheckout: (config: any) => void;
  }
}

const checkoutFormSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerPhone: z.string().optional(),
  orderType: z.enum(["delivery", "pickup"], {
    required_error: "Please select an order type",
  }),
})

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>

interface PaymentMethod {
  id: string
  name: string
  description: string
  icon: any
  type: 'card' | 'cash' | 'pos' | 'transfer'
}

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
  const [location] = useLocation()
  const [, setLocation] = useLocation()
  const { toast} = useToast()
  const { user, loading } = useAuth()
  const { cart: cartFromContext, clearCart } = useCart() // Get cart from context
  const [cart, setCart] = useState<CartItem[]>([])
  const [walkInOrder, setWalkInOrder] = useState<any>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("card")
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [transactionRef, setTransactionRef] = useState("")
  const [locationData, setLocationData] = useState<{ latitude: number; longitude: number; address: string } | null>(
    null,
  )

  // Payment methods available
  const paymentMethods: PaymentMethod[] = [
    // {
    //   id: 'cash',
    //   name: 'Cash Payment',
    //   description: 'Pay with cash on delivery/pickup',
    //   icon: Banknote,
    //   type: 'cash',
    // },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Pay securely with Interswitch',
      icon: CreditCard,
      type: 'card',
    },
    {
      id: 'pos',
      name: 'POS Terminal',
      description: 'Pay with POS (Walk-in only)',
      icon: CreditCard,
      type: 'pos',
    },
    // {
    //   id: 'transfer',
    //   name: 'Bank Transfer',
    //   description: 'Direct bank transfer',
    //   icon: Smartphone,
    //   type: 'transfer',
    // },
  ]

  // Generate transaction reference
  useEffect(() => {
    const txnRef = `NIB-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    setTransactionRef(txnRef)
  }, [])

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

    // Check for walk-in order ONLY if on staff checkout route
    const isStaffCheckout = location === '/staff/checkout'
    
    if (isStaffCheckout) {
      const pendingWalkIn = localStorage.getItem("pendingWalkInOrder")
      if (pendingWalkIn) {
        try {
          const orderData = JSON.parse(pendingWalkIn)
          setWalkInOrder(orderData)
          return
        } catch (error) {
          console.error("Error parsing walk-in order:", error)
          localStorage.removeItem("pendingWalkInOrder")
        }
      }
    }

    const guestSession = getGuestSession()
    if (!user && !guestSession) {
      // Save current cart to pending checkout before redirecting
      if (cartFromContext.length > 0) {
        localStorage.setItem("pendingCheckoutCart", JSON.stringify(cartFromContext))
      }

      setLocation("/guest-checkout")
      return
    }

    // Use cart from context instead of localStorage
    if (cartFromContext.length > 0) {
      setCart(cartFromContext as any)
    } else {
      // If cart is empty, redirect to home
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
  }, [user, loading, setLocation, form, cartFromContext])

  const subtotal = walkInOrder 
    ? (walkInOrder.total || (walkInOrder.items?.reduce((sum: number, item: any) => sum + (Number.parseFloat(item.price) * item.quantity), 0) || 0))
    : cart.reduce((sum, item) => sum + Number.parseFloat(item.menuItem.price) * item.quantity, 0)

  const calculateTotal = () => {
    const baseAmount = subtotal // Removed delivery charge
    const totalWithVat = form.watch("orderType") === "delivery"
      ? baseAmount * 1.075 // Add 7.5% VAT for delivery
      : baseAmount
    return totalWithVat
  }

  // Handle Interswitch card payment - Inline Checkout
  const handleCardPayment = async (orderData: any) => {
    console.log('handleCardPayment called with orderData:', orderData)
    setIsProcessingPayment(true)

    try {
      toast({
        title: "Creating Order",
        description: "Please wait...",
      })

      console.log('Sending order to API with pending status...')
      // Create order with pending payment status
      const response = await apiRequest("POST", "/api/orders", {
        ...orderData,
        paymentStatus: "pending",
        paymentMethod: "card",
      })
      
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('HTTP error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
      }
      
      let createdOrder
      try {
        createdOrder = await response.json()
        console.log('Order created successfully:', createdOrder)
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError)
        throw new Error('Failed to parse order response')
      }
      
      if (!createdOrder || !createdOrder.id) {
        console.error('Invalid order response:', createdOrder)
        throw new Error('Invalid order response - missing order ID')
      }

      setIsProcessingPayment(false)
      setShowPaymentModal(false)

      // Generate transaction reference
      const txnRef = `NKO-${createdOrder.orderNumber}-${Date.now()}`
      const amount = Math.round((createdOrder.totalAmount || calculateTotal()) * 100) // Amount in kobo

      // Store order info
      localStorage.setItem('pendingPaymentOrder', JSON.stringify({
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        txnRef: txnRef
      }))

      console.log('Initializing Interswitch inline checkout...')
      console.log('Transaction Reference:', txnRef)
      console.log('Amount (kobo):', amount)
      console.log('Checking if webpayCheckout is available:', typeof (window as any).webpayCheckout)
      
      // Check if Interswitch script is loaded
      if (typeof (window as any).webpayCheckout === 'undefined') {
        console.error('Interswitch script not loaded - redirecting to payment instructions')
        toast({
          title: "Order Created!",
          description: "Redirecting to payment instructions...",
        })
        // Fallback to payment instructions
        setTimeout(() => {
          setLocation("/payment-instructions?id=" + createdOrder.id + "&orderNumber=" + createdOrder.orderNumber + "&amount=" + (createdOrder.totalAmount || calculateTotal()))
        }, 1500)
        return
      }

      // Interswitch Inline Checkout Configuration - TEST MODE
      const paymentConfig = {
        // TEST MODE CREDENTIALS
        merchant_code: "MX250773",
        pay_item_id: "Default_Payable_MX250773",
        
        // LIVE MODE CREDENTIALS (commented out)
        // merchant_code: "MX162337",
        // pay_item_id: "MX162337_MERCHANT_APP",
        
        txn_ref: txnRef,
        amount: amount,
        currency: 566, // NGN currency code
        site_redirect_url: window.location.origin + "/order-status?id=" + createdOrder.id,
        cust_id: createdOrder.id.toString(),
        cust_name: orderData.customerName,
        cust_email: orderData.customerEmail || "customer@nibbleskitchen.com",
        cust_phone: orderData.customerPhone || "",
        
        // TEST MODE - Test payments (no real money charged)
        mode: "TEST",
        
        // LIVE MODE (commented out)
        // mode: "LIVE",
        
        // Payment channels - Enable all payment options
        // Remove or comment out to show all available options
        // payment_channels: ["card", "bank", "ussd", "qr"], 
        
        // Callback when payment is completed
        onComplete: function(response: any) {
          console.log('Payment completed:', response)
          console.log('Response code:', response.resp || response.responseCode)
          
          // Clear cart on any response using context method
          clearCart()
          
          // Check payment response
          // Interswitch success codes: "00" or "10" (pending)
          if (response.resp === "00" || response.responseCode === "00") {
            // Payment successful
            toast({
              title: "Payment Successful! 🎉",
              description: `Order #${createdOrder.orderNumber} has been paid and sent to kitchen.`,
            })
            
            // Clear cart using context method
            clearCart()
            
            // Redirect to order status with success flag
            setTimeout(() => {
              setLocation("/order-status?id=" + createdOrder.id + "&payment=success")
            }, 1500)
          } else if (response.resp === "10" || response.responseCode === "10") {
            // Payment pending (e.g., bank transfer initiated)
            toast({
              title: "Payment Pending",
              description: "Your payment is being processed. You'll be notified when confirmed.",
            })
            
            setTimeout(() => {
              setLocation("/order-status?id=" + createdOrder.id + "&payment=pending")
            }, 1500)
          } else {
            // Payment failed or other status
            console.error('Payment failed with response:', response)
            toast({
              title: "Payment Issue",
              description: "Payment could not be completed. Please try again or use bank transfer.",
              variant: "destructive",
            })
            
            // Redirect to payment instructions as fallback
            setTimeout(() => {
              setLocation("/payment-instructions?id=" + createdOrder.id + "&orderNumber=" + createdOrder.orderNumber + "&amount=" + (createdOrder.totalAmount || calculateTotal()))
            }, 2000)
          }
        },
        
        // Callback when modal is closed without completing payment
        onClose: function() {
          console.log('Payment modal closed by user')
          toast({
            title: "Payment Cancelled",
            description: "You can complete payment later from order status page.",
          })
          
          // Redirect to order status
          setTimeout(() => {
            setLocation("/order-status?id=" + createdOrder.id)
          }, 1000)
        },
        
        // Error callback
        onError: function(error: any) {
          console.error('Payment error:', error)
          toast({
            title: "Payment Error",
            description: "An error occurred. Please try again or use bank transfer.",
            variant: "destructive",
          })
          
          // Redirect to payment instructions as fallback
          setTimeout(() => {
            setLocation("/payment-instructions?id=" + createdOrder.id + "&orderNumber=" + createdOrder.orderNumber + "&amount=" + (createdOrder.totalAmount || calculateTotal()))
          }, 2000)
        }
      }

      console.log('Opening Interswitch payment modal with config:', {
        ...paymentConfig,
        onComplete: '[Function]',
        onClose: '[Function]',
        onError: '[Function]'
      })
      
      // Open Interswitch payment modal
      try {
        ;(window as any).webpayCheckout(paymentConfig)
      } catch (error) {
        console.error('Error opening Interswitch modal:', error)
        toast({
          title: "Payment System Error",
          description: "Could not open payment modal. Redirecting to alternative payment method...",
          variant: "destructive",
        })
        
        // Fallback to payment instructions
        setTimeout(() => {
          setLocation("/payment-instructions?id=" + createdOrder.id + "&orderNumber=" + createdOrder.orderNumber + "&amount=" + (createdOrder.totalAmount || calculateTotal()))
        }, 2000)
      }
      
    } catch (error: any) {
      console.error('Order creation error:', error)
      console.error('Error type:', typeof error)
      console.error('Error message:', error?.message)
      console.error('Error stack:', error?.stack)
      
      toast({
        title: "Order Failed",
        description: error?.message || "Unable to create order. Please try again.",
        variant: "destructive",
      })
      setIsProcessingPayment(false)
      setShowPaymentModal(false)
    }
  }

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
      clearCart() // Use clearCart from context
      form.reset()
      
      // If payment method is card, redirect to payment
      if (selectedPaymentMethod === 'card' && data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        setTimeout(() => {
          setLocation("/docket")
        }, 1500)
      }
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

    // Show payment modal for confirmation
    setShowPaymentModal(true)
  }

  const handlePaymentConfirmation = () => {
    const values = form.getValues()
    const guestSession = getGuestSession()

    const orderData = {
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      orderType: values.orderType,
      paymentMethod: selectedPaymentMethod,
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

    // If card payment, initiate Interswitch inline checkout
    if (selectedPaymentMethod === 'card') {
      handleCardPayment(orderData)
    } else {
      // For cash/transfer, create order directly
      createOrderMutation.mutate(orderData)
      setShowPaymentModal(false)
    }
  }

  const createWalkInOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData)
      return await response.json()
    },
    onSuccess: (data: any) => {
      toast({
        title: "Order Created & Payment Recorded!",
        description: `Order #${data.orderNumber} has been created and sent to kitchen.`,
      })
      localStorage.removeItem("pendingWalkInOrder")
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] })
      setTimeout(() => {
        setLocation("/docket")
      }, 1000)
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      })
    },
  })

  const handleWalkInPayment = async () => {
    // For card payments, use Interswitch inline checkout
    if (selectedPaymentMethod === 'card') {
      try {
        setIsProcessingPayment(true)
        
        // Create order with pending payment status
        const orderData = {
          customerName: walkInOrder.customerName,
          customerPhone: walkInOrder.customerPhone || "N/A",
          orderType: "walk-in",
          paymentMethod: 'card',
          paymentStatus: "pending",
          items: walkInOrder.items,
        }

        console.log("Creating walk-in order for card payment:", orderData)

        // Create order via API
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        })

        if (!response.ok) {
          throw new Error('Failed to create order')
        }

        const createdOrder = await response.json()
        console.log("Walk-in order created:", createdOrder)

        // Check if Interswitch script is loaded
        if (typeof window.webpayCheckout !== 'function') {
          console.error('Interswitch script not loaded')
          toast({
            title: "Payment Error",
            description: "Payment system not available. Please try another payment method.",
            variant: "destructive",
          })
          setIsProcessingPayment(false)
          return
        }

        // Calculate amount in kobo (multiply by 100)
        const amountInKobo = Math.round((walkInOrder.total || 0) * 100)
        const transactionRef = `NKO-${createdOrder.orderNumber}-${Date.now()}`

        console.log("Opening Interswitch modal for walk-in order...")
        console.log("Transaction Reference:", transactionRef)
        console.log("Amount (kobo):", amountInKobo)

        // Interswitch Inline Checkout Configuration - TEST MODE
        const paymentConfig = {
          // TEST MODE CREDENTIALS
          merchant_code: "MX250773",
          pay_item_id: "Default_Payable_MX250773",
          
          // LIVE MODE CREDENTIALS (commented out)
          // merchant_code: "MX162337",
          // pay_item_id: "MX162337_MERCHANT_APP",
          
          txn_ref: transactionRef,
          amount: amountInKobo,
          currency: 566, // NGN
          site_redirect_url: `${window.location.origin}/order-status?id=${createdOrder.id}`,
          onComplete: function (response: any) {
            console.log("Walk-in payment completed:", response)
            console.log("Response code:", response.responseCode)
            
            if (response.responseCode === '00') {
              // Payment successful
              toast({
                title: "Payment Successful!",
                description: `Order #${createdOrder.orderNumber} has been paid.`,
              })
              
              // Clear walk-in order and redirect
              localStorage.removeItem("pendingWalkInOrder")
              setLocation(`/order-status?id=${createdOrder.id}`)
            } else {
              // Payment failed
              toast({
                title: "Payment Failed",
                description: response.responseDescription || "Payment was not successful. Please try again.",
                variant: "destructive",
              })
            }
            setIsProcessingPayment(false)
          },
          onClose: function () {
            console.log("Walk-in payment modal closed")
            setIsProcessingPayment(false)
          },
          onError: function (error: any) {
            console.error("Walk-in payment error:", error)
            toast({
              title: "Payment Error",
              description: "An error occurred during payment. Please try again.",
              variant: "destructive",
            })
            setIsProcessingPayment(false)
          },
          // TEST MODE - Test payments (no real money charged)
          mode: "TEST"
          
          // LIVE MODE (commented out)
          // mode: "LIVE"
        }

        console.log("Opening Interswitch payment modal with config:", paymentConfig)
        window.webpayCheckout(paymentConfig)

      } catch (error) {
        console.error("Walk-in card payment error:", error)
        toast({
          title: "Order Failed",
          description: "Unable to process card payment. Please try again.",
          variant: "destructive",
        })
        setIsProcessingPayment(false)
      }
    } else {
      // For cash/POS/transfer payments, create order directly with paid status
      const orderData = {
        customerName: walkInOrder.customerName,
        customerPhone: walkInOrder.customerPhone || "N/A",
        orderType: "walk-in",
        paymentMethod: selectedPaymentMethod,
        paymentStatus: selectedPaymentMethod === 'cash' || selectedPaymentMethod === 'pos' ? "paid" : "pending",
        items: walkInOrder.items,
      }
      
      createWalkInOrderMutation.mutate(orderData)
    }
  }

  // Handle walk-in order payment
  if (walkInOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Button
            variant="ghost"
            className="mb-8 text-muted-foreground hover:text-foreground"
            onClick={() => {
              localStorage.removeItem("pendingWalkInOrder")
              setLocation("/staff")
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Walk-in Orders
          </Button>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Confirm Payment</h1>
            <p className="text-muted-foreground">{walkInOrder.customerName} - {cart.length || walkInOrder.items?.length || 0} items</p>
          </div>

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/5 border-b border-accent/20">
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const IconComponent = method.icon
                  return (
                    <button
                      key={method.id}
                      type="button"
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        selectedPaymentMethod === method.id
                          ? "border-[#4EB5A4] bg-[#4EB5A4]/10"
                          : "border-border/50 hover:border-accent/50"
                      }`}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <IconComponent className="w-5 h-5 text-[#4EB5A4]" />
                          <div>
                            <p className="font-semibold">{method.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {method.description}
                            </p>
                          </div>
                        </div>
                        {selectedPaymentMethod === method.id && <Check className="w-5 h-5 text-[#4EB5A4]" />}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="border-t pt-6">
                <div className="flex justify-between text-2xl font-bold mb-6">
                  <span>Total Amount</span>
                  <span className="text-[#4EB5A4]">₦{(walkInOrder.total || subtotal || 0).toLocaleString()}</span>
                </div>

                <Button
                  onClick={handleWalkInPayment}
                  disabled={createWalkInOrderMutation.isPending}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-accent to-primary"
                >
                  {createWalkInOrderMutation.isPending ? "Creating Order..." : "Confirm Payment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
                              readOnly={!!user && !!user.username}
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
                      {["pickup", "delivery"].map((type) => {
                        const isActive = form.watch("orderType") === type
                        return (
                          <button
                            key={type}
                            type="button"
                            className={`w-full p-4 rounded-xl border-2 text-center transition-all font-semibold focus:outline-none
                              ${
                                isActive
                                  ? "border-[#4EB5A4] bg-[#4EB5A4]/10 text-foreground shadow-md"
                                  : "hover:border-accent/50 bg-muted/30 text-foreground hover:border-accent/70"
                              }`}
                            onClick={() => {
                              form.setValue("orderType", type as "delivery" | "pickup")
                            }}
                          >
                            <div className="font-semibold text-base capitalize">{type}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {type === "pickup" ? "At our location" : "To your location"}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <FormMessage />
                  </CardContent>
                </Card>

                {/* Location Information */}
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
                  <CardContent className="pt-6 space-y-3">
                    <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                      {paymentMethods.filter(m => m.id !== 'pos').map((method) => {
                        const IconComponent = method.icon
                        return (
                          <div
                            key={method.id}
                            className="flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-all hover:bg-gray-50"
                          >
                            <RadioGroupItem
                              value={method.id}
                              id={method.id}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <label htmlFor={method.id} className="cursor-pointer">
                                <div className="mb-2 flex items-center space-x-2">
                                  <IconComponent className="h-5 w-5 text-[#4EB5A4]" />
                                  <span className="font-medium">{method.name}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {method.description}
                                </p>
                              </label>
                            </div>
                          </div>
                        )
                      })}
                    </RadioGroup>

                    {/* Payment method specific information */}
                    {selectedPaymentMethod === 'card' && (
                      <Alert className="border-purple-200 bg-purple-50">
                        <Lock className="h-4 w-4" />
                        <AlertDescription>
                          <div className="mt-2 space-y-2">
                            <div className="font-semibold">Secure Card Payment:</div>
                            <div className="space-y-1 text-sm">
                              <div>• Powered by Interswitch payment gateway</div>
                              <div>• Supports Visa, Mastercard, and Verve</div>
                              <div>• No card information stored on our servers</div>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {selectedPaymentMethod === 'transfer' && (
                      <Alert className="border-blue-200 bg-blue-50">
                        <Banknote className="h-4 w-4" />
                        <AlertDescription>
                          <div className="mt-2 space-y-2">
                            <div className="font-semibold">Bank Transfer Details:</div>
                            <div className="space-y-1 text-sm">
                              <div><strong>Bank:</strong> Sadiq Bank</div>
                              <div><strong>Account Number:</strong> 1234567890</div>
                              <div><strong>Account Name:</strong> Nibbles Kitchen</div>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
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
                      {form.watch("orderType") === "delivery" && (
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>VAT (7.5%)</span>
                          <span>₦{(subtotal * 0.075).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="border-t border-border/30 pt-3 flex justify-between text-lg">
                        <span className="font-semibold text-foreground">Total</span>
                        <span className="text-2xl font-bold " data-testid="text-total">
                          ₦{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-all rounded-lg"
                      disabled={createOrderMutation.isPending || isProcessingPayment}
                      data-testid="button-place-order"
                    >
                      {createOrderMutation.isPending || isProcessingPayment ? (
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

        {/* Payment Confirmation Modal */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                {selectedPaymentMethod === 'card' && (
                  <CreditCard className="mr-2 h-5 w-5 text-blue-600" />
                )}
                {selectedPaymentMethod === 'cash' && (
                  <Banknote className="mr-2 h-5 w-5 text-green-600" />
                )}
                {selectedPaymentMethod === 'transfer' && (
                  <Smartphone className="mr-2 h-5 w-5 text-purple-600" />
                )}
                Confirm Your Order
              </DialogTitle>
              <DialogDescription>
                Please review your order details before proceeding.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Order Summary */}
              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 font-medium">Order Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Items ({cart.length})</span>
                    <span>₦{subtotal.toLocaleString()}</span>
                  </div>
                  {form.watch("orderType") === "delivery" && (
                    <div className="flex justify-between">
                      <span>VAT (7.5%)</span>
                      <span>₦{(subtotal * 0.075).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Total</span>
                    <span>₦{calculateTotal().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Info */}
              <div className="rounded-lg bg-blue-50 p-4">
                <h4 className="mb-2 font-medium">Payment Method</h4>
                <div className="flex items-center space-x-2">
                  {selectedPaymentMethod === 'card' && (
                    <CreditCard className="h-4 w-4 text-blue-600" />
                  )}
                  {selectedPaymentMethod === 'cash' && (
                    <Banknote className="h-4 w-4 text-green-600" />
                  )}
                  {selectedPaymentMethod === 'transfer' && (
                    <Smartphone className="h-4 w-4 text-purple-600" />
                  )}
                  <span className="text-sm">
                    {paymentMethods.find(m => m.id === selectedPaymentMethod)?.name}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col space-y-2">
              <Button
                onClick={handlePaymentConfirmation}
                className="w-full bg-gradient-to-r from-[#4EB5A4] to-teal-600 text-white hover:from-[#3da896] hover:to-teal-700"
                disabled={isProcessingPayment || createOrderMutation.isPending}
              >
                {isProcessingPayment || createOrderMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Confirm Order
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
