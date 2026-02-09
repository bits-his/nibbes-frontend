import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { useToast } from "@/hooks/use-toast"

// Extend Window interface for Interswitch
declare global {
  interface Window {
    webpayCheckout: (config: any) => void
  }
}

interface InterswitchPayButtonProps {
  amount: number
  transactionRef: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  orderId?: number
  orderNumber?: string
  onSuccess?: (response: any) => void
  onError?: (error: any) => void
  onClose?: () => void
  disabled?: boolean
  className?: string
  label?: string
  mode?: "TEST" | "LIVE"
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://server.brainstorm.ng/nibbleskitchen"

export default function InterswitchPayButton({
  amount,
  transactionRef,
  customerName,
  customerEmail = "customer@nibbleskitchen.com",
  customerPhone = "",
  orderId,
  orderNumber,
  onSuccess,
  onError,
  onClose,
  disabled = false,
  className = "",
  label = "Pay Now",
  mode = "LIVE",
}: InterswitchPayButtonProps) {
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  const amountInKobo = Math.round(amount * 100)

  const handlePayment = async () => {
    if (typeof window.webpayCheckout !== "function") {
      toast({
        title: "Payment Unavailable",
        description: "Payment system not loaded. Please refresh.",
        variant: "destructive",
      })
      onError?.({ message: "Interswitch script not loaded" })
      return
    }

    setIsProcessing(true)

    const paymentConfig = {
      merchant_code: "MX169500",
      pay_item_id: "Default_Payable_MX169500",
      txn_ref: transactionRef,
      amount: amountInKobo,
      currency: 566,
      site_redirect_url: window.location.origin,
      cust_id: orderId?.toString() || transactionRef,
      cust_name: customerName.replace("'", "&#x27;"),
      cust_email: customerEmail,
      cust_phone: customerPhone,
      merchant_name: "Nibbles Kitchen",
      logo_url: `${window.location.origin}/nibbles.jpg`,
      mode,
      payment_channels: ["card", "bank"],

      onComplete: async (response: any) => {
        console.log("🔔 Interswitch onComplete triggered:", response)
        console.log("📋 Transaction Ref:", transactionRef)
        console.log("📋 Order ID:", orderId)
        console.log("📋 Order Number:", orderNumber)
        const respCode = response.resp || response.responseCode
        console.log("📋 Response code:", respCode)

        // Show verifying message
        toast({
          title: "Verifying Payment...",
          description: "Please wait while we confirm your payment with the bank. This may take up to 2 minutes.",
          duration: 120000, // 2 minutes
        })

        setIsProcessing(true)

        // Call verify-with-retry endpoint - waits until payment is confirmed
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050'
        
        try {
          console.log("🔄 Calling verify-with-retry endpoint...")
          console.log("🔄 Backend URL:", backendUrl)
          console.log("🔄 Request body:", { transactionRef, orderId })
          
          const verifyResponse = await fetch(`${backendUrl}/api/payments/verify-with-retry`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionRef: transactionRef,
              orderId: orderId,
            }),
          })
          
          console.log("📡 Response status:", verifyResponse.status)
          console.log("📡 Response ok:", verifyResponse.ok)
          
          const verifyData = await verifyResponse.json()
          console.log("✅ Verification response:", verifyData)
          
          setIsProcessing(false)
          
          if (verifyData.success && verifyData.verified) {
            // Payment confirmed!
            console.log(`✅ Payment verified after ${verifyData.attempts} attempts`)
            
            toast({
              title: "Payment Confirmed! 🎉",
              description: orderNumber
                ? `Order #${orderNumber} is confirmed and being prepared. Redirecting...`
                : "Payment confirmed successfully. Redirecting...",
              duration: 3000,
            })
            
            onSuccess?.(response)
            // Redirect to docket
            setTimeout(() => setLocation("/docket?payment=success"), 2000)
          } else {
            // Payment not confirmed yet (timeout after 2 minutes)
            toast({
              title: "Payment Processing",
              description: verifyData.message || "Your payment is still being processed. Please check your orders in a few minutes.",
              variant: "default",
              duration: 10000,
            })
            
            // Still redirect to docket so they can check later
            setTimeout(() => setLocation("/docket"), 3000)
          }
        } catch (err) {
          console.error("❌ Payment verification error:", err)
          setIsProcessing(false)
          
          toast({
            title: "Verification Error",
            description: "Could not verify payment. Please check your orders page or contact support.",
            variant: "destructive",
            duration: 7000,
          })
          
          // Redirect anyway so they can try manual verify
          setTimeout(() => setLocation("/docket"), 3000)
        }
      },

      onClose: () => {
        setIsProcessing(false)
        toast({ title: "Payment Cancelled", description: "You closed the payment window." })
        onClose?.()
      },

      onError: (error: any) => {
        setIsProcessing(false)
        toast({
          title: "Payment Error",
          description: "An error occurred during payment.",
          variant: "destructive",
        })
        onError?.(error)
      },
    }

    window.webpayCheckout(paymentConfig)
  }

  return (
    <button
      type="button"
      onClick={handlePayment}
      disabled={disabled || isProcessing}
      className={`w-full h-12 bg-[#262B40] text-white font-semibold rounded-lg hover:bg-[#1a1e2e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {isProcessing ? "Processing..." : label}
    </button>
  )
}
