"use client"

import { useState, useEffect, startTransition } from "react"
import { useLocation } from "wouter"
import { ArrowLeft, MapPin, Check, ChefHat, CreditCard, Banknote, Smartphone, Lock, Plus, X } from "lucide-react"
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
import { usePrint } from "@/hooks/usePrint"

// Service Charge interface
interface ServiceCharge {
  id: string
  description: string
  type: 'fixed' | 'percentage'
  amount: number
  status: 'active' | 'inactive'
}

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
  const { printInvoice } = usePrint()
  
  const [cart, setCart] = useState<CartItem[]>([])
  const [walkInOrder, setWalkInOrder] = useState<any>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("card")
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [transactionRef, setTransactionRef] = useState("")
  const [locationData, setLocationData] = useState<{ latitude: number; longitude: number; address: string } | null>(
    null,
  )
  const [deliveryFee, setDeliveryFee] = useState<number>(0)
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false)
  const [geoPricingId, setGeoPricingId] = useState<string | null>(null)
  const [deliveryRoute, setDeliveryRoute] = useState<{ from: string; to: string } | null>(null)
  const [tempAddress, setTempAddress] = useState<string>("")
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  
  // Multi-payment state for walk-in orders
  const [multiPaymentEnabled, setMultiPaymentEnabled] = useState(false)
  const [paymentSplits, setPaymentSplits] = useState<Array<{ method: string; amount: number }>>([{ method: 'cash', amount: 0 }])
  
  // Service charges state
  const [serviceCharges, setServiceCharges] = useState<ServiceCharge[]>([])
  const [loadingCharges, setLoadingCharges] = useState(true)
  
  // Kitchen status state
  const [kitchenStatus, setKitchenStatus] = useState<{ isOpen: boolean }>({ isOpen: true })

  // Payment methods available for customer checkout (online orders)
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

  // Payment methods available for walk-in orders (staff checkout)
  const walkInPaymentMethods: PaymentMethod[] = [
    {
      id: 'cash',
      name: 'Cash Payment',
      description: 'Customer pays with cash',
      icon: Banknote,
      type: 'cash',
    },
    {
      id: 'pos',
      name: 'POS Terminal',
      description: 'Pay with POS at counter',
      icon: CreditCard,
      type: 'pos',
    },
    {
      id: 'transfer',
      name: 'Bank Transfer',
      description: 'Customer paid via bank transfer',
      icon: Smartphone,
      type: 'transfer',
    },
  ]

  // Generate transaction reference
  useEffect(() => {
    const txnRef = `NIB-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    setTransactionRef(txnRef)
  }, [])
  
  // Fetch active service charges
  useEffect(() => {
    const fetchServiceCharges = async () => {
      try {
        setLoadingCharges(true)
        const response = await apiRequest("GET", "/api/service-charges/active")
        if (response.ok) {
          const charges = await response.json()
          setServiceCharges(charges)
          console.log('✅ Service charges loaded:', charges)
        }
      } catch (error) {
        console.error('❌ Error fetching service charges:', error)
        // Don't show error to user, just use empty array
        setServiceCharges([])
      } finally {
        setLoadingCharges(false)
      }
    }
    
    fetchServiceCharges()
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
      orderType: "pickup", // Default to pickup - delivery button commented out temporarily
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
          setSelectedPaymentMethod('cash') // Default to cash for walk-in orders
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

  // F2 keyboard shortcut to confirm payment for walk-in orders
  // This will be set up after handleWalkInPayment is defined

  // Calculate delivery fee when order type is delivery and location is available
  useEffect(() => {
    const calculateDeliveryFee = async () => {
      const orderType = form.watch("orderType")
      
      // Only calculate for delivery orders with location
      if (orderType !== "delivery" || !locationData?.address) {
        setDeliveryFee(0)
        setGeoPricingId(null)
        setDeliveryRoute(null)
        return
      }

      setIsCalculatingDelivery(true)
      try {
        const response = await apiRequest("POST", "/api/delivery/calculate-fee", {
          deliveryLocation: locationData.address
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setDeliveryFee(result.data.price)
            setGeoPricingId(result.data.geoPricingId)
            setDeliveryRoute({
              from: result.data.fromLocation || 'Nibbles Kitchen',
              to: result.data.toLocation || 'Your Location'
            })
            console.log('✅ Delivery fee calculated:', result.data)
          } else {
            console.warn('⚠️ No delivery pricing found for this location')
            setDeliveryFee(0)
            setGeoPricingId(null)
            setDeliveryRoute(null)
          }
        } else {
          console.error('❌ Failed to calculate delivery fee')
          setDeliveryFee(0)
          setGeoPricingId(null)
          setDeliveryRoute(null)
        }
      } catch (error) {
        console.error('❌ Error calculating delivery fee:', error)
        setDeliveryFee(0)
        setGeoPricingId(null)
        setDeliveryRoute(null)
      } finally {
        setIsCalculatingDelivery(false)
      }
    }

    calculateDeliveryFee()
  }, [form.watch("orderType"), locationData])

  // For walk-in orders, calculate subtotal from items (total already includes VAT)
  // For regular orders, calculate from cart
  const subtotal = walkInOrder 
    ? (walkInOrder.items?.reduce((sum: number, item: any) => sum + (Number.parseFloat(item.price) * item.quantity), 0) || 0)
    : cart.reduce((sum, item) => sum + Number.parseFloat(item.menuItem.price) * item.quantity, 0)

  // Helper function to try getting location with specific options
  const tryGetLocation = (options: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"))
        return
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, options)
    })
  }

  // Reverse geocode coordinates to address
  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      // Try OpenStreetMap Nominatim first
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            'User-Agent': 'NibblesKitchen/1.0' // Nominatim requires a user agent
          }
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.display_name) {
          return data.display_name
        }
      }
    } catch (error) {
      console.warn("Nominatim geocoding failed:", error)
    }

    // Fallback to coordinates if geocoding fails
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
  }

  // Check location using browser geolocation with retry logic
  const checkLocation = async () => {
    setLocationLoading(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser. Please enter your address manually below.")
      setLocationLoading(false)
      return
    }

    try {
      let position: GeolocationPosition | null = null
      
      // First attempt: High accuracy with 10 second timeout
      try {
        console.log("Attempting high-accuracy location detection...")
        position = await tryGetLocation({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        })
        console.log("High-accuracy location obtained:", position)
      } catch (highAccuracyError: any) {
        console.warn("High-accuracy location failed:", highAccuracyError.message)
        
        // Second attempt: Low accuracy with 30 second timeout
        if (highAccuracyError.code === 2 || highAccuracyError.code === 3) {
          console.log("Retrying with low-accuracy location detection...")
          try {
            position = await tryGetLocation({
              enableHighAccuracy: false,
              timeout: 30000,
              maximumAge: 60000 // Accept cached location up to 1 minute old
            })
            console.log("Low-accuracy location obtained:", position)
          } catch (lowAccuracyError: any) {
            console.error("Low-accuracy location also failed:", lowAccuracyError.message)
            throw lowAccuracyError // Re-throw to be caught by outer catch
          }
        } else {
          throw highAccuracyError // Re-throw permission denied or other errors
        }
      }

      if (!position) {
        throw new Error("Unable to obtain location")
      }

      const { latitude, longitude } = position.coords
      console.log("Location coordinates:", { latitude, longitude })

      // Get address from coordinates
      const address = await reverseGeocode(latitude, longitude)
      console.log("Reverse geocoded address:", address)

      const locationInfo = { latitude, longitude, address }
      setLocationData(locationInfo)
      setTempAddress(address)

      // Store location in localStorage
      localStorage.setItem("location", JSON.stringify(locationInfo))

      // Show success message
      toast({
        title: "Location Detected ✓",
        description: address,
      })

    } catch (error: any) {
      console.error("Location detection error:", error)
      
      let errorMessage = ""
      let helpText = ""
      
      if (error.code === 1) {
        // PERMISSION_DENIED
        errorMessage = "Location access denied."
        helpText = "Please enable location access in your browser settings and try again, or enter your address manually below."
      } else if (error.code === 2) {
        // POSITION_UNAVAILABLE
        errorMessage = "Location information is unavailable."
        helpText = "Your device cannot determine your location. This may happen if:\n• Location services are disabled on your device\n• You're using a desktop computer without GPS\n• Your network connection is blocking location services\n\nPlease enter your delivery address manually below."
      } else if (error.code === 3) {
        // TIMEOUT
        errorMessage = "Location request timed out."
        helpText = "The location request took too long. Please check your internet connection and try again, or enter your address manually below."
      } else {
        errorMessage = "Unable to detect location."
        helpText = "Please enter your delivery address manually below."
      }
      
      setLocationError(`${errorMessage} ${helpText}`)
      
      // Show toast with error
      toast({
        title: "Location Detection Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLocationLoading(false)
    }
  }

  const calculateTotal = () => {
    // Don't calculate if there are no items
    const hasItems = walkInOrder 
      ? (walkInOrder.items?.length > 0)
      : (cart.length > 0)
    
    if (!hasItems) {
      return 0
    }
    
    const baseAmount = subtotal + deliveryFee // Add delivery fee to subtotal
    
    // Apply service charges only if there are items
    let totalWithCharges = baseAmount
    if (hasItems) {
      serviceCharges.forEach(charge => {
        const chargeAmount = Number(charge.amount) || 0
        if (charge.type === 'percentage') {
          totalWithCharges += (baseAmount * (chargeAmount / 100))
        } else {
          totalWithCharges += chargeAmount
        }
      })
    }
    
    return totalWithCharges
  }
  
  // Helper function to calculate individual service charge amounts
  const calculateServiceChargeAmount = (charge: ServiceCharge) => {
    // Don't calculate if there are no items
    const hasItems = walkInOrder 
      ? (walkInOrder.items?.length > 0)
      : (cart.length > 0)
    
    if (!hasItems) {
      return 0
    }
    
    const baseAmount = subtotal + deliveryFee
    const chargeAmount = Number(charge.amount) || 0
    if (charge.type === 'percentage') {
      return (baseAmount * (chargeAmount / 100))
    }
    return chargeAmount
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
      // Always use calculateTotal() which includes VAT (7.5%) to ensure correct payment amount
      const amount = Math.round(calculateTotal() * 100) // Amount in kobo (includes VAT)

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
        console.error('Interswitch script not loaded - redirecting to home')
        toast({
          title: "Payment System Unavailable",
          description: "Redirecting to home page...",
          variant: "destructive",
        })
        // Fallback to home
        startTransition(() => {
          setTimeout(() => {
            setLocation("/")
          }, 1500)
        })
        return
      }

      // Interswitch Inline Checkout Configuration - LIVE MODE
      const paymentConfig = {
        // TEST MODE CREDENTIALS (COMMENTED OUT)
        // merchant_code: "MX250773",
        // pay_item_id: "Default_Payable_MX250773",
        
        // LIVE MODE CREDENTIALS (ACTIVE)
        merchant_code: "MX162337",
        pay_item_id: "MX162337_MERCHANT_APP",
        
        txn_ref: txnRef,
        amount: amount,
        currency: 566, // NGN currency code
        site_redirect_url: window.location.origin + "/docket",
        cust_id: createdOrder.id.toString(),
        cust_name: orderData.customerName,
        cust_email: orderData.customerEmail || "customer@nibbleskitchen.com",
        cust_phone: orderData.customerPhone || "",
        
        // Merchant information
        merchant_name: "Nibbles Kitchen",
        logo_url: window.location.origin + "/nibbles.jpg",
        
        // TEST MODE - Test payments (COMMENTED OUT)
        // mode: "TEST",
        
        // LIVE MODE (ACTIVE)
        mode: "LIVE",
        
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
            
            // Redirect to docket (works for both authenticated users and guests)
            startTransition(() => {
              setTimeout(() => {
                setLocation("/docket")
              }, 1500)
            })
          } else if (response.resp === "10" || response.responseCode === "10") {
            // Payment pending (e.g., bank transfer initiated)
            toast({
              title: "Payment Pending",
              description: "Your payment is being processed. You'll be notified when confirmed.",
            })
            
            startTransition(() => {
              setTimeout(() => {
                setLocation("/docket")
              }, 1500)
            })
          } else {
            // Payment failed or other status
            console.error('Payment failed with response:', response)
            toast({
              title: "Payment Failed",
              description: "Payment could not be completed. Redirecting to home page...",
              variant: "destructive",
            })
            
            // Redirect to home
            startTransition(() => {
              setTimeout(() => {
                setLocation("/")
              }, 2000)
            })
          }
        },
        
        // Callback when modal is closed without completing payment
        onClose: function() {
          console.log('Payment modal closed by user')
          toast({
            title: "Payment Cancelled",
            description: "Redirecting to home page...",
          })
          
          // Use startTransition to avoid Suspense error
          startTransition(() => {
            setTimeout(() => {
              setLocation("/")
            }, 1000)
          })
        },
        
        // Error callback
        onError: function(error: any) {
          console.error('Payment error:', error)
          toast({
            title: "Payment Error",
            description: "An error occurred. Redirecting to home page...",
            variant: "destructive",
          })
          
          // Use startTransition to avoid Suspense error
          startTransition(() => {
            setTimeout(() => {
              setLocation("/")
            }, 2000)
          })
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
          description: "Could not open payment modal. Redirecting to home page...",
          variant: "destructive",
        })
        
        // Fallback to home
        startTransition(() => {
          setTimeout(() => {
            setLocation("/")
          }, 2000)
        })
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
    // Check if kitchen is closed
    if (!kitchenStatus.isOpen) {
      toast({
        title: "Kitchen is Closed",
        description: "The kitchen is currently closed. Please try again later.",
        variant: "destructive",
      })
      return
    }

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
      orderType: "online", // Customer checkout is always "online" order type
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
          // Include delivery pricing information
          geoPricingId: geoPricingId,
          deliveryFee: deliveryFee,
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
      
      // Prepare order data for printing
      const orderDataForPrint = {
        orderNumber: data.orderNumber,
        createdAt: data.createdAt || new Date().toISOString(),
        customerName: walkInOrder?.customerName || data.customerName || 'N/A',
        orderType: 'walk-in',
        items: walkInOrder?.items || data.items || [],
        total: parseFloat(data.totalAmount || walkInOrder?.total || 0),
        paymentMethod: data.paymentMethod || 'N/A',
        paymentStatus: data.paymentStatus || 'paid',
        tendered: parseFloat(data.totalAmount || walkInOrder?.total || 0)
      }
      
      // 🖨️ Show print preview immediately for walk-in orders
      console.log('🖨️ Showing print preview for walk-in order #' + data.orderNumber)
      
      // Show print preview immediately with walk-in receipt type (no card list)
      printInvoice(orderDataForPrint, 'walk-in')
      
      // Clear walk-in order and redirect after a short delay to allow print window to open
      setTimeout(() => {
        setWalkInOrder(null)
        localStorage.removeItem("pendingWalkInOrder")
        // Redirect to staff page to avoid blank page
        setLocation("/staff")
      }, 500)
      
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      })
    },
  })

  // Multi-payment helper functions
  const addPaymentSplit = () => {
    setPaymentSplits([...paymentSplits, { method: 'cash', amount: 0 }])
  }

  const removePaymentSplit = (index: number) => {
    if (paymentSplits.length > 1) {
      setPaymentSplits(paymentSplits.filter((_, i) => i !== index))
    }
  }

  const updatePaymentSplit = (index: number, field: 'method' | 'amount', value: string | number) => {
    const updated = [...paymentSplits]
    if (field === 'method') {
      updated[index].method = value as string
    } else {
      updated[index].amount = Number(value)
    }
    setPaymentSplits(updated)
  }

  const getTotalPaid = () => {
    return paymentSplits.reduce((sum, split) => sum + split.amount, 0)
  }

  const getRemainingAmount = () => {
    const total = walkInOrder?.total || subtotal || 0
    return total - getTotalPaid()
  }

  const isPaymentValid = () => {
    if (!multiPaymentEnabled) return true
    const total = walkInOrder?.total || subtotal || 0
    const paid = getTotalPaid()
    return Math.abs(total - paid) < 0.01 // Allow for floating point errors
  }

  const handleWalkInPayment = async () => {
    // Check if kitchen is closed
    if (!kitchenStatus.isOpen) {
      toast({
        title: "Kitchen is Closed",
        description: "The kitchen is currently closed. Please try again later.",
        variant: "destructive",
      })
      return
    }

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

        // Interswitch Inline Checkout Configuration - LIVE MODE
        const paymentConfig = {
          // TEST MODE CREDENTIALS (COMMENTED OUT)
          // merchant_code: "MX250773",
          // pay_item_id: "Default_Payable_MX250773",
          
          // LIVE MODE CREDENTIALS (ACTIVE)
          merchant_code: "MX162337",
          pay_item_id: "MX162337_MERCHANT_APP",
          
          txn_ref: transactionRef,
          amount: amountInKobo,
          currency: 566, // NGN
          site_redirect_url: `${window.location.origin}/docket`,
          
          // Merchant information
          merchant_name: "Nibbles Kitchen",
          logo_url: window.location.origin + "/nibbles.jpg",
          
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
              startTransition(() => {
                setLocation("/docket")
              })
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
          // TEST MODE - Test payments (COMMENTED OUT)
          // mode: "TEST"
          
          // LIVE MODE (ACTIVE)
          mode: "LIVE"
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
      // Validate multi-payment if enabled
      if (multiPaymentEnabled && !isPaymentValid()) {
        toast({
          title: "Invalid Payment Amount",
          description: `Total payment (₦${getTotalPaid().toLocaleString()}) must equal order total (₦${(walkInOrder.total || subtotal || 0).toLocaleString()})`,
          variant: "destructive",
        })
        return
      }

      // For cash/POS/transfer payments, create order directly with paid status
      const orderData = {
        customerName: walkInOrder.customerName,
        customerPhone: walkInOrder.customerPhone || "N/A",
        orderType: "walk-in",
        paymentMethod: multiPaymentEnabled 
          ? paymentSplits.map(s => s.method).join(' + ') 
          : selectedPaymentMethod,
        paymentStatus: "paid",
        items: walkInOrder.items,
        // Add payment splits info if multi-payment is enabled
        ...(multiPaymentEnabled && {
          paymentSplits: paymentSplits.map(split => ({
            method: split.method,
            amount: split.amount
          }))
        })
      }
      
      createWalkInOrderMutation.mutate(orderData)
    }
  }

  // F2 keyboard shortcut to confirm payment for walk-in orders
  // Supports: F2, Cmd+F2 (Mac), Ctrl+F2 (Windows)
  useEffect(() => {
    if (!walkInOrder) return; // Only set up listener for walk-in orders
    
    const handleKeyPress = (event: KeyboardEvent) => {
      const isF2 = event.key === 'F2' || event.key === 'f2';
      const isMac = event.metaKey; // Cmd key on Mac
      const isWindows = event.ctrlKey; // Ctrl key on Windows
      
      // Check if F2 is pressed (with or without modifier) and it's a walk-in order
      if (isF2 && !createWalkInOrderMutation.isPending && !isProcessingPayment && (isMac || isWindows || !event.metaKey && !event.ctrlKey)) {
        event.preventDefault();
        // Only trigger if not in a text input/textarea
        const target = event.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          handleWalkInPayment();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [walkInOrder, createWalkInOrderMutation.isPending, isProcessingPayment]);

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

          {/* Kitchen Closed Alert */}
          {!kitchenStatus.isOpen && (
            <Card className="mb-6 border-red-500 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <ChefHat className="w-6 h-6 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-900">Kitchen is Closed</h3>
                    <p className="text-sm text-red-700">The kitchen is currently closed and not accepting orders. Please try again later.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Confirm Payment</h1>
            <p className="text-muted-foreground">{walkInOrder.customerName} - {cart.length || walkInOrder.items?.length || 0} items</p>
          </div>

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/5 border-b border-accent/20">
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Multi-payment toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-semibold">Split Payment</p>
                  <p className="text-sm text-muted-foreground">Use multiple payment methods</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMultiPaymentEnabled(!multiPaymentEnabled)
                    if (!multiPaymentEnabled) {
                      // Initialize with first split
                      setPaymentSplits([{ method: 'cash', amount: 0 }])
                    } else {
                      // Reset to single payment
                      setPaymentSplits([{ method: 'cash', amount: 0 }])
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    multiPaymentEnabled ? 'bg-[#4EB5A4]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      multiPaymentEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Single payment method selection */}
              {!multiPaymentEnabled && (
                <div className="space-y-3">
                  {walkInPaymentMethods.map((method) => {
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
              )}

              {/* Multi-payment splits */}
              {multiPaymentEnabled && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">Payment Splits</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addPaymentSplit}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Payment
                    </Button>
                  </div>

                  {paymentSplits.map((split, index) => {
                    const selectedMethod = walkInPaymentMethods.find(m => m.id === split.method)
                    const IconComponent = selectedMethod?.icon || Banknote
                    
                    return (
                      <div key={index} className="p-4 border-2 border-border/50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Payment {index + 1}</span>
                          {paymentSplits.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removePaymentSplit(index)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Method</label>
                            <select
                              value={split.method}
                              onChange={(e) => updatePaymentSplit(index, 'method', e.target.value)}
                              className="w-full p-2 border rounded-md bg-background"
                            >
                              {walkInPaymentMethods.map((method) => (
                                <option key={method.id} value={method.id}>
                                  {method.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-2 block">Amount</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                              <Input
                                type="number"
                                value={split.amount || ''}
                                onChange={(e) => updatePaymentSplit(index, 'amount', e.target.value)}
                                className="pl-8"
                                placeholder="0"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Payment summary */}
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Paid:</span>
                      <span className="font-semibold">₦{getTotalPaid().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Order Total:</span>
                      <span className="font-semibold">₦{(walkInOrder.total || subtotal || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Remaining:</span>
                      <span className={`font-bold ${
                        getRemainingAmount() > 0 ? 'text-orange-500' : 
                        getRemainingAmount() < 0 ? 'text-red-500' : 
                        'text-green-500'
                      }`}>
                        ₦{Math.abs(getRemainingAmount()).toLocaleString()}
                        {getRemainingAmount() > 0 && ' (underpaid)'}
                        {getRemainingAmount() < 0 && ' (overpaid)'}
                        {getRemainingAmount() === 0 && ' ✓'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                {!multiPaymentEnabled && (
                  <div className="space-y-3 mb-6">
                    {/* Service Charges - Dynamic from API */}
                    {walkInOrder && walkInOrder.items?.length > 0 ? (
                      // Walk-in order: show breakdown with service charges
                      <>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Subtotal</span>
                          <span>₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        {serviceCharges.map((charge) => (
                          <div key={charge.id} className="flex justify-between text-sm text-muted-foreground">
                            <span>
                              {charge.description}
                              {charge.type === 'percentage' ? ` (${charge.amount}%)` : ''}
                            </span>
                            <span>₦{calculateServiceChargeAmount(charge).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-2xl font-bold border-t pt-3">
                          <span>Total</span>
                          <span className="text-[#4EB5A4]">₦{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    ) : (
                      // Regular checkout - calculate and show service charges
                      <>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Subtotal</span>
                          <span>₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        {serviceCharges.map((charge) => (
                          <div key={charge.id} className="flex justify-between text-sm text-muted-foreground">
                            <span>
                              {charge.description}
                              {charge.type === 'percentage' ? ` (${charge.amount}%)` : ''}
                            </span>
                            <span>₦{calculateServiceChargeAmount(charge).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-2xl font-bold border-t pt-3">
                          <span>Total</span>
                          <span className="text-[#4EB5A4]">₦{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

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

        {/* Kitchen Closed Alert */}
        {!kitchenStatus.isOpen && (
          <Card className="mb-6 border-red-500 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ChefHat className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">Kitchen is Closed</h3>
                  <p className="text-sm text-red-700">The kitchen is currently closed and not accepting orders. Please try again later.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                    <div className="flex justify-center">
                      {/* Delivery button temporarily commented out - will be re-enabled when delivery people are available */}
                      {/* {["pickup", "delivery"].map((type) => {
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
                      })} */}
                      {/* Only show pickup option for now - centered */}
                      {["pickup"].map((type) => {
                        const isActive = form.watch("orderType") === type
                        return (
                          <button
                            key={type}
                            type="button"
                            className={`w-full max-w-xs p-4 rounded-xl border-2 text-center transition-all font-semibold focus:outline-none
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

                {/* Delivery Location Input - Show when delivery is selected but no location set */}
                {!locationData && form.watch("orderType") === "delivery" && (
                  <Card className="border-orange-300 bg-orange-50/50 shadow-sm">
                    <CardHeader className="bg-orange-100/50 border-b border-orange-200">
                      <CardTitle className="flex items-center gap-2 text-lg text-orange-900">
                        <MapPin className="w-5 h-5" />
                        Enter Delivery Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <Alert className="border-orange-300 bg-orange-50">
                        <MapPin className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-900">
                          Please enter your delivery location
                        </AlertDescription>
                      </Alert>

                      {/* Error message - More prominent */}
                      {locationError && (
                        <Alert variant="destructive" className="border-red-400 bg-red-50">
                          <AlertDescription className="text-red-900 whitespace-pre-line">
                            <strong className="block mb-2">{locationError.split('.')[0]}.</strong>
                            {locationError.split('.').slice(1).join('.').trim()}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-3">
                        {/* Manual address input - Now primary */}
                        <div>
                          <label className="text-sm font-semibold mb-2 block text-foreground">
                            Delivery Address
                          </label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter your delivery address (e.g., Hadejia Road, Fagge C, Kano)"
                              value={tempAddress}
                              onChange={(e) => setTempAddress(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && tempAddress.trim()) {
                                  const newLocationData = {
                                    address: tempAddress.trim(),
                                    latitude: 0,
                                    longitude: 0
                                  }
                                  setLocationData(newLocationData)
                                  localStorage.setItem("location", JSON.stringify(newLocationData))
                                  setLocationError(null)
                                }
                              }}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              onClick={() => {
                                if (tempAddress.trim()) {
                                  const newLocationData = {
                                    address: tempAddress.trim(),
                                    latitude: 0,
                                    longitude: 0
                                  }
                                  setLocationData(newLocationData)
                                  localStorage.setItem("location", JSON.stringify(newLocationData))
                                  setLocationError(null)
                                  toast({
                                    title: "Address Set",
                                    description: "Delivery address has been set successfully.",
                                  })
                                }
                              }}
                              disabled={!tempAddress.trim() || isCalculatingDelivery}
                              className="bg-[#4EB5A4] hover:bg-[#4EB5A4]/90"
                            >
                              {isCalculatingDelivery ? "Calculating..." : "Set Address"}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            💡 Tip: Include landmarks for easier delivery (e.g., "Near Central Mosque, Kano")
                          </p>
                        </div>

                        {/* Divider */}
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-orange-200" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-orange-50 px-2 text-orange-600">Or use auto-detect</span>
                          </div>
                        </div>

                        {/* Auto-detect location button - Now secondary */}
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={checkLocation}
                            disabled={locationLoading}
                            className="border-orange-300 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                          >
                            {locationLoading ? (
                              <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                Detecting Location...
                              </>
                            ) : (
                              <>
                                <MapPin className="w-4 h-4 mr-2" />
                                Auto-Detect My Location
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Help section */}
                        <details className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                          <summary className="cursor-pointer font-semibold text-foreground mb-2">
                            📱 How to enable location services
                          </summary>
                          <div className="space-y-2 mt-2 pl-2">
                            <div>
                              <strong>On Chrome (Desktop):</strong>
                              <ol className="list-decimal list-inside pl-2 mt-1">
                                <li>Click the lock icon in the address bar</li>
                                <li>Find "Location" and select "Allow"</li>
                                <li>Refresh the page and try again</li>
                              </ol>
                            </div>
                            <div>
                              <strong>On Mobile (iOS/Android):</strong>
                              <ol className="list-decimal list-inside pl-2 mt-1">
                                <li>Go to Settings → Privacy → Location Services</li>
                                <li>Enable Location Services</li>
                                <li>Find your browser and set to "While Using"</li>
                                <li>Return to this page and try again</li>
                              </ol>
                            </div>
                            <div className="pt-2 border-t">
                              <strong>Still not working?</strong> No problem! Just enter your address manually above.
                            </div>
                          </div>
                        </details>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Location Information - Show when location is set */}
                {locationData && form.watch("orderType") === "delivery" && (
                  <Card className="border-accent/30 bg-accent/5 shadow-sm">
                    <CardHeader className="bg-accent/10 border-b border-accent/20">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MapPin className="w-5 h-5 " />
                        Delivery Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-start gap-4 p-4 bg-background/50 rounded-lg border border-accent/20">
                        <MapPin className="w-5 h-5  mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{locationData.address}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTempAddress(locationData.address)
                            setLocationData(null)
                            localStorage.removeItem("location")
                          }}
                          className="flex-shrink-0"
                        >
                          Edit
                        </Button>
                      </div>
                      {isCalculatingDelivery && (
                        <Alert className="border-blue-300 bg-blue-50">
                          <AlertDescription className="text-blue-900">
                            Calculating delivery fee...
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Payment Method Card - Removed: Payment automatically processed via Interswitch when order is completed */}
                {/* <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
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
                </Card> */}
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
                      {form.watch("orderType") === "delivery" && deliveryFee > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Delivery Fee</span>
                            {isCalculatingDelivery ? (
                              <span className="text-xs">Calculating...</span>
                            ) : (
                              <span>₦{deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            )}
                          </div>
                          {deliveryRoute && (
                            <div className="font-bold text-lg text-muted-foreground/70 pl-0">
                              {deliveryRoute.from} → {deliveryRoute.to}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Service Charges - Dynamic from API */}
                      {serviceCharges.length > 0 && serviceCharges.map((charge) => (
                        <div key={charge.id} className="flex justify-between text-sm text-muted-foreground">
                          <span>
                            {charge.description} 
                            {charge.type === 'percentage' ? ` (${charge.amount}%)` : ''}
                          </span>
                          <span>₦{calculateServiceChargeAmount(charge).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
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
                  {form.watch("orderType") === "delivery" && deliveryFee > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Delivery Fee</span>
                        <span>₦{deliveryFee.toLocaleString()}</span>
                      </div>
                      {deliveryRoute && (
                        <div className="text-xs text-muted-foreground pl-0">
                          {deliveryRoute.from} → {deliveryRoute.to}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Service Charges - Dynamic from API */}
                  {serviceCharges.length > 0 && serviceCharges.map((charge) => (
                    <div key={charge.id} className="flex justify-between">
                      <span>
                        {charge.description}
                        {charge.type === 'percentage' ? ` (${charge.amount}%)` : ''}
                      </span>
                      <span>₦{calculateServiceChargeAmount(charge).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Total</span>
                    <span>₦{calculateTotal().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Information */}
              {form.watch("orderType") === "delivery" && locationData && (
                <div className="rounded-lg bg-green-50 p-4">
                  <h4 className="mb-2 font-medium flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-green-600" />
                    Delivery Location
                  </h4>
                  <p className="text-sm text-gray-700">{locationData.address}</p>
                </div>
              )}

              {/* Pickup Information */}
              {form.watch("orderType") === "pickup" && (
                <div className="rounded-lg bg-orange-50 p-4">
                  <h4 className="mb-2 font-medium flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-orange-600" />
                    Pickup Location
                  </h4>
                  <p className="text-sm text-gray-700">Lafiya Road Nasarawa GRA, Kano</p>
                  <p className="text-xs text-gray-500 mt-1">Nibbles Kitchen</p>
                </div>
              )}

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
                disabled={isProcessingPayment || createOrderMutation.isPending || !kitchenStatus.isOpen}
              >
                {isProcessingPayment || createOrderMutation.isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : !kitchenStatus.isOpen ? (
                  <>
                    <ChefHat className="mr-2 h-4 w-4" />
                    Kitchen Closed
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
