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
        const respCode = response.resp || response.responseCode
        console.log("📝 Response code:", respCode)

        // Call backend callback
        // For ngrok testing, use ngrok URL directly
        const callbackUrl = `https://properly-sentinellike-stevie.ngrok-free.dev/api/payment/callback`
        // const callbackUrl = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050'}/api/payment/callback`
        console.log("🌐 Calling callback URL:", callbackUrl)
        
        try {
          const callbackResponse = await fetch(callbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              txnref: transactionRef,
              resp: respCode,
              amount: amountInKobo,
            }),
          })
          console.log("✅ Callback response status:", callbackResponse.status)
          const callbackData = await callbackResponse.text()
          console.log("✅ Callback response data:", callbackData)
        } catch (err) {
          console.error("❌ Payment callback error:", err)
        }

        setIsProcessing(false)

        if (respCode === "00") {
          toast({
            title: "Payment Successful! 🎉",
            description: orderNumber
              ? `Order #${orderNumber} has been paid.`
              : "Payment completed successfully.",
          })
          onSuccess?.(response)
          setTimeout(() => setLocation("/docket"), 1500)
        } else {
          toast({
            title: "Payment Failed",
            description: response.desc || "Payment could not be completed.",
            variant: "destructive",
          })
          onError?.(response)
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
