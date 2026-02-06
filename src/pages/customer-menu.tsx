import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  MapPin,
  QrCode,
  Search,
  ChevronDown,
  ChefHat,
  AlertCircle,
  Wifi,
  Check,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { startTransition } from "react";
import { getGuestSession, saveGuestSession } from "@/lib/guestSession";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import type { MenuItem } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
// PERFORMANCE: Hero image hosted on Cloudinary for optimization
// TODO: Replace with your Cloudinary URL after uploading the optimized image
// Recommended: Upload as WebP format, quality 85, max width 1920px
// PERFORMANCE: Hero image hosted on Cloudinary with automatic optimization
// Cloudinary transformations: f_auto (WebP/AVIF), q_85 (quality), w_1920 (max width)
const heroImage = import.meta.env.VITE_HERO_IMAGE_URL || "https://res.cloudinary.com/ddls0gpui/image/upload/v1768411975/WhatsApp_Image_2026-01-06_at_23.36.28_dyhvre.jpg";
import { queryClient } from "@/lib/queryClient";
import { SEO } from "@/components/SEO";
import { useCart } from "@/context/CartContext";
import { apiRequest } from "@/lib/queryClient";
// PERFORMANCE: Removed unused imageCDN imports - using OptimizedImage component instead
import { MenuItemCard } from "@/components/MenuItemCard";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { measurePerformance, logPerformanceMetrics } from "@/utils/performance";
import { useSettings } from "@/context/SettingsContext";
import { useServiceCharges } from "@/context/ServiceChargesContext";

export default function CustomerMenu() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth(); // Add user authentication
  const { cart, addToCart: addToCartContext, updateQuantity: updateQuantityContext, removeFromCart, clearCart, updateSpecialInstructions } = useCart();
  const { settings } = useSettings();
  const { serviceChargeRate, vatRate, serviceCharges } = useServiceCharges();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cartOpen, setCartOpen] = useState(false);
  const [expandedCartItem, setExpandedCartItem] = useState<string | null>(null); // Track which cart item is expanded
  const [orderType, setOrderType] = useState<"pickup" | "delivery">("pickup"); // Delivery method selection
  const [locationData, setLocationData] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [tempAddress, setTempAddress] = useState<string>("");
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showGuestDataModal, setShowGuestDataModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [isCreatingGuestSession, setIsCreatingGuestSession] = useState(false);
  
  // Kitchen status state
  const [kitchenStatus, setKitchenStatus] = useState<{ isOpen: boolean }>({ isOpen: true });
  
  // Network status for adaptive loading
  const networkStatus = useNetworkStatus();
  
  // Performance monitoring
  useEffect(() => {
    // Measure performance after page load
    const timer = setTimeout(() => {
      const metrics = measurePerformance();
      logPerformanceMetrics(metrics);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // PERFORMANCE: WebSocket connection deferred - don't block initial render
  useEffect(() => {
    // Defer WebSocket connection to avoid blocking FCP/LCP
    // Use requestIdleCallback or setTimeout to connect after page is interactive
    const connectWebSocket = () => {
      const wsUrl = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';
      const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("Customer Menu WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "menu_item_update") {
        // Refresh menu data when items are updated
        queryClient.invalidateQueries({ queryKey: ["/api/menu/all"] });
      } else if (data.type === "kitchen-status") {
        // Update kitchen status in real-time
        setKitchenStatus(data.status);
        console.log("Kitchen status updated:", data.status);
      } else if (data.type === "service-charges-updated") {
        // Trigger service charges refresh by dispatching custom event
        window.dispatchEvent(new CustomEvent('service-charges-updated', { detail: data.charges }));
      } else if (
        data.type === "order_update" ||
        data.type === "new_order" ||
        data.type === "order_status_change"
      ) {
        // Refresh active orders when there are changes
        queryClient.invalidateQueries({
          queryKey: ["/api/orders/active/customer"],
        });
        // Also refresh menu items to update stock balances after orders
        queryClient.invalidateQueries({ queryKey: ["/api/menu/all"] });
      }
    };

    socket.onerror = (error) => {
      console.error("Customer Menu WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("Customer Menu WebSocket disconnected");
    };

      // Cleanup function to close the WebSocket connection
      return () => {
        socket.close();
      };
    };

    // Defer WebSocket connection - connect after page is interactive
    if ('requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(connectWebSocket, { timeout: 2000 });
      return () => {
        (window as any).cancelIdleCallback(id);
      };
    } else {
      const timeoutId = setTimeout(connectWebSocket, 2000);
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, []); // Empty deps - WebSocket doesn't block rendering
  
  // Fetch kitchen status on mount and poll every 30 seconds
  useEffect(() => {
    const fetchKitchenStatus = async () => {
      try {
        const response = await apiRequest("GET", "/api/kitchen/status");
        if (response.ok) {
          const status = await response.json();
          console.log('🍳 Kitchen status fetched:', status);
          setKitchenStatus(status);
        }
      } catch (error) {
        console.error('❌ Error fetching kitchen status:', error);
        // Default to open if check fails
        setKitchenStatus({ isOpen: true });
      }
    };
    
    fetchKitchenStatus();
    // Poll kitchen status every 30 seconds
    const interval = setInterval(fetchKitchenStatus, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const [showQRCode, setShowQRCode] = useState(false);

  // Check URL parameter to open cart when navigating from checkout
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openCart') === 'true') {
      setCartOpen(true);
      // Clean up URL parameter without reloading page
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Fetch menu items with SHORT stale time for real-time stock updates
  const { data: menuItems, isLoading: menuLoading, error: menuError } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/all"],
    staleTime: 30 * 1000, // 30 seconds - refresh often for accurate stock levels
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds for stock updates
    retry: 3, // Retry up to 3 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Extract unique categories from menu items (memoized)
  const categories = useMemo(() => {
    if (!menuItems) return ["All"];
    return ["All", ...Array.from(new Set(menuItems.map(item => item.category)))];
  }, [menuItems]);

  // Use loading state from menu only
  const isLoading = menuLoading;
  
  // Handle menu loading errors with better UX
  useEffect(() => {
    if (menuError) {
      console.error("Error loading menu:", menuError);
      toast({
        title: "Unable to Load Menu",
        description: "There was a problem loading the menu. Please refresh the page or try again later.",
        variant: "destructive",
      });
    }
  }, [menuError, toast]);

  // Helper function to sort items by displayOrder (from database)
  const sortByDisplayOrder = (items: any[]) => {
    return [...items].sort((a, b) => {
      // Sort by displayOrder first (lower number appears first)
      const aOrder = a.displayOrder ?? 999;
      const bOrder = b.displayOrder ?? 999;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // If same displayOrder, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  };

  // Filter items (memoized to prevent unnecessary recalculations)
  const filteredItems = useMemo(() => {
    if (!menuItems) return [];
    
    const filtered = menuItems.filter(
      (item) => {
        // Hide delivery items from customers (show only for staff/cashiers)
        // Check for various delivery category names
        const isDeliveryItem = item.category?.toLowerCase().includes('delivery') || 
                              item.name?.toLowerCase().includes('delivery');
        
        if (isDeliveryItem && (!user || user?.role === 'customer')) {
          return false;
        }
        
        // Show all items (including unavailable) - they will show as "sold out"
        return (selectedCategory === "All" || item.category === selectedCategory) &&
          (searchQuery === "" ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()));
      }
    );

    // Sort: Use displayOrder from database (set via Menu Management)
    // Items are sorted by displayOrder (lower number appears first)
    // If displayOrder is the same, items are sorted alphabetically
    return sortByDisplayOrder(filtered);
  }, [menuItems, selectedCategory, searchQuery, user?.role]);

  // Infinite scroll for pagination (reduces initial payload)
  const {
    displayedItems: visibleItems,
    hasMore,
    isLoading: isLoadingMore,
    loadMore,
    reset: resetPagination,
    sentinelRef,
  } = useInfiniteScroll(filteredItems, {
    itemsPerLoad: networkStatus.isSlow ? 6 : 12, // Load fewer items on slow networks
    threshold: 300,
    enabled: true,
  });

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [selectedCategory, searchQuery, resetPagination]);

  // Memoize callbacks to prevent unnecessary re-renders
  const addToCart = useCallback((menuItem: MenuItem) => {
    // Debug: Log kitchen status
    console.log('🔍 addToCart called - Kitchen status:', kitchenStatus);
    
    // Check if kitchen is closed
    if (!kitchenStatus.isOpen) {
      console.log('❌ Kitchen is closed - blocking add to cart');
      toast({
        title: "Kitchen is Closed",
        description: "The kitchen is currently closed. Please try again later.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    console.log('✅ Kitchen is open - allowing add to cart');

    // Prevent adding unavailable items to cart
    if (!menuItem.available) {
      toast({
        title: "Item Unavailable",
        description: `${menuItem.name} is currently sold out.`,
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    // Check stock balance
    if (menuItem.stockBalance !== null && menuItem.stockBalance !== undefined && menuItem.stockBalance <= 0) {
      toast({
        title: "SOLD OUT",
        description: `${menuItem.name} is currently SOLD OUT.`,
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    // Check if adding would exceed available stock
    const currentInCart = cart.find(item => String(item.menuItem.id) === String(menuItem.id))?.quantity || 0;
    if (menuItem.stockBalance !== null && menuItem.stockBalance !== undefined) {
      if (currentInCart >= menuItem.stockBalance) {
        toast({
          title: "Maximum Quantity Reached",
          description: `Only ${menuItem.stockBalance} portion${menuItem.stockBalance !== 1 ? 's' : ''} available. You already have ${currentInCart} in your cart.`,
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
    }

    addToCartContext({ menuItem: menuItem as any });
    toast({
      title: "Added to Cart",
      description: `${menuItem.name} has been added to your cart.`,
      duration: 1000,
    });
  }, [kitchenStatus.isOpen, cart, menuItems, toast, addToCartContext]);

  const updateQuantity = useCallback((menuItemId: string, delta: number) => {
    const item = cart.find(item => item.menuItem.id === menuItemId);
    if (item) {
      const newQuantity = item.quantity + delta;

      // If decreasing, allow it
      if (delta < 0) {
        if (newQuantity <= 0) {
          removeFromCart(menuItemId);
        } else {
          updateQuantityContext(menuItemId, newQuantity);
        }
        return;
      }

      // If increasing, check stock availability
      const menuItem = menuItems && Array.isArray(menuItems)
        ? menuItems.find((m: MenuItem) => String(m.id) === String(menuItemId))
        : undefined;
      if (menuItem && menuItem.stockBalance !== null && menuItem.stockBalance !== undefined) {
        if (newQuantity > menuItem.stockBalance) {
          toast({
            title: "Maximum Quantity Reached",
            description: `Only ${menuItem.stockBalance} portion${menuItem.stockBalance !== 1 ? 's' : ''} available for ${menuItem.name}.`,
            variant: "destructive",
            duration: 3000,
          });
          return;
        }
      }

      updateQuantityContext(menuItemId, newQuantity);
    }
  }, [cart, menuItems, toast, updateQuantityContext, removeFromCart]);

  const updateInstructions = useCallback((menuItemId: string, instructions: string) => {
    updateSpecialInstructions(menuItemId, instructions);
  }, [updateSpecialInstructions]);

  const subtotal = cart.reduce(
    (sum, item) => sum + parseFloat(item.menuItem.price) * item.quantity,
    0
  );

  const checkLocation = () => {
    setLocationLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Reverse geocode to get address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();

          const address =
            data.display_name ||
            `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

          const locationInfo = { latitude, longitude, address };
          setLocationData(locationInfo);

          // Store location in localStorage
          localStorage.setItem("location", JSON.stringify(locationInfo));

          // Show success message
          toast({
            title: "Location Detected",
            description: address,
          });
        } catch (error) {
          console.error("Error getting address:", error);
          // If reverse geocoding fails, still store coordinates
          const locationInfo = {
            latitude,
            longitude,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          };
          setLocationData(locationInfo);
          localStorage.setItem("location", JSON.stringify(locationInfo));
          toast({
            title: "Location Detected",
            description: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          });
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        let errorMessage = "";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location access denied. Please allow location access in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "The request to get location timed out.";
            break;
          default:
            errorMessage = "An unknown error occurred.";
            break;
        }
        setLocationError(errorMessage);
        setLocationLoading(false);
      }
    );
  };

  // Load orderType and location from localStorage on mount
  useEffect(() => {
    const savedOrderType = localStorage.getItem("orderType");
    if (savedOrderType === "delivery" || savedOrderType === "pickup") {
      setOrderType(savedOrderType);
    }

    // Load saved location
    const savedLocation = localStorage.getItem("location");
    if (savedLocation) {
      try {
        const parsedLocation = JSON.parse(savedLocation);
        if (parsedLocation && parsedLocation.address) {
          setLocationData(parsedLocation);
          setTempAddress(parsedLocation.address);
        }
      } catch (error) {
        console.error("Error parsing saved location:", error);
      }
    }
  }, []);

  // Calculate delivery fee when orderType is delivery and location is available
  useEffect(() => {
    const calculateDeliveryFee = async () => {
      if (orderType !== "delivery" || !locationData?.address) {
        setDeliveryFee(0);
        return;
      }

      setIsCalculatingDelivery(true);
      try {
        const response = await apiRequest("POST", "/api/delivery/calculate-fee", {
          deliveryLocation: locationData.address
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setDeliveryFee(result.data.price);
          } else {
            setDeliveryFee(0);
          }
        } else {
          setDeliveryFee(0);
        }
      } catch (error) {
        console.error('Error calculating delivery fee:', error);
        setDeliveryFee(0);
      } finally {
        setIsCalculatingDelivery(false);
      }
    };

    calculateDeliveryFee();
  }, [orderType, locationData]);

  // Calculate total with charges
  const calculateTotal = useMemo(() => {
    if (cart.length === 0) return 0;
    
    const baseAmount = subtotal + deliveryFee;
    
    // Apply all service charges if available, otherwise use legacy rates
    let totalCharges = 0;
    if (serviceCharges.length > 0) {
      totalCharges = serviceCharges.reduce((total, charge) => {
        return total + (baseAmount * (Number(charge.amount) / 100));
      }, 0);
    } else {
      // Fallback to legacy calculation
      totalCharges = (baseAmount * (serviceChargeRate / 100)) + (baseAmount * (vatRate / 100));
    }
    
    return baseAmount + totalCharges;
  }, [subtotal, deliveryFee, serviceCharges, serviceChargeRate, vatRate]);

  const handleOrderTypeChange = (type: "pickup" | "delivery") => {
    setOrderType(type);
    localStorage.setItem("orderType", type);
  };

  const handleCheckout = () => {
    // Check if kitchen is closed
    if (!kitchenStatus.isOpen) {
      toast({
        title: "Kitchen is Closed",
        description: "The kitchen is currently closed. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    // Check if delivery is selected but no location is set
    if (orderType === "delivery" && !locationData) {
      toast({
        title: "Delivery Location Required",
        description: "Please enter or detect your delivery location to continue.",
        variant: "destructive",
      });
      return;
    }

    // Check if user is logged in or has guest session
    const guestSession = getGuestSession();
    if (!user && !guestSession) {
      // Show guest data capture modal first
      setShowGuestDataModal(true);
      return;
    }

    // Store location info in localStorage if available
    if (locationData) {
      localStorage.setItem("location", JSON.stringify(locationData));
    }
    // Store orderType
    localStorage.setItem("orderType", orderType);

    // Open confirmation modal
    setShowConfirmModal(true);
  };

  // Handle guest data submission
  const handleGuestDataSubmit = async () => {
    if (!guestName.trim() || !guestPhone.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide your name and phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingGuestSession(true);

    try {
      const response = await apiRequest("POST", "/api/guest/session", {
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim() || undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create guest session");
      }

      const data = await response.json();

      // Save guest session
      saveGuestSession({
        guestId: data.guestId,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        guestEmail: data.guestEmail,
        createdAt: new Date().toISOString(),
        expiresAt: data.expiresAt,
      });

      // Close guest data modal and open confirmation modal
      setShowGuestDataModal(false);
      setShowConfirmModal(true);

      toast({
        title: "Guest Session Created",
        description: "You can now proceed with your order.",
      });
    } catch (error: any) {
      console.error("Error creating guest session:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create guest session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingGuestSession(false);
    }
  };

  // Handle Interswitch payment directly from cart
  const handleConfirmOrder = async () => {
    if (isProcessingPayment) return;

    // Validate that we have customer data
    const guestSession = getGuestSession();
    if (!user && !guestSession) {
      toast({
        title: "Guest Information Required",
        description: "Please provide your information to continue.",
        variant: "destructive",
      });
      setShowConfirmModal(false);
      setShowGuestDataModal(true);
      return;
    }

    const customerName = user?.username || guestSession?.guestName;
    const customerPhone = user?.phone || guestSession?.guestPhone;

    if (!customerName || !customerPhone) {
      toast({
        title: "Missing Information",
        description: "Please provide your name and phone number.",
        variant: "destructive",
      });
      setShowConfirmModal(false);
      setShowGuestDataModal(true);
      return;
    }

    setIsProcessingPayment(true);

    try {
      toast({
        title: "Creating Order",
        description: "Please wait...",
      });

      const txnRef = `NKO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const orderData = {
        customerName,
        customerPhone,
        orderType: "online",
        paymentMethod: "transfer",
        paymentStatus: "pending",
        transactionRef: txnRef,
        ...(locationData &&
          orderType === "delivery" && {
            location: {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              address: locationData.address,
            },
            deliveryFee: deliveryFee,
          }),
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
      };

      const response = await apiRequest("POST", "/api/orders", orderData);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const createdOrder = await response.json();

      if (!createdOrder || !createdOrder.id) {
        throw new Error("Invalid order response - missing order ID");
      }

      setIsProcessingPayment(false);
      setShowConfirmModal(false);

      const amount = Math.round(calculateTotal * 100); // Amount in kobo

      localStorage.setItem(
        "pendingPaymentOrder",
        JSON.stringify({
          orderId: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          txnRef: txnRef,
        })
      );

      // Check if Interswitch script is loaded
      if (typeof (window as any).webpayCheckout === "undefined") {
        toast({
          title: "Payment System Unavailable",
          description: "Redirecting to home page...",
          variant: "destructive",
        });
        startTransition(() => {
          setTimeout(() => {
            setLocation("/");
          }, 1500);
        });
        return;
      }

      // Interswitch Inline Checkout Configuration - LIVE MODE
      const paymentConfig = {
        merchant_code: "MX169500",
        pay_item_id: "Default_Payable_MX169500",
        txn_ref: txnRef,
        amount: amount,
        currency: 566, // NGN
        site_redirect_url: window.location.origin + "/docket",
        cust_id: createdOrder.id.toString(),
        cust_name: orderData.customerName,
        cust_email: guestSession?.guestEmail || user?.email || "customer@nibbleskitchen.com",
        cust_phone: orderData.customerPhone || "",
        merchant_name: "Nibbles Kitchen",
        logo_url: window.location.origin + "/nibbles.jpg",
        mode: "LIVE",
        payment_channels: ["card", "bank"],
        onComplete: async function (response: any) {
          console.log("🔔 Payment completed:", response);
          if (response.desc === "Approved by Financial Institution") {
            // Clear cart and show success message immediately
            clearCart();
            toast({
              title: "Payment Successful! 🎉",
              description: `Order #${createdOrder.orderNumber} has been paid.`,
            });
            
            // Navigate immediately to docket
            startTransition(() => {
              setLocation("/docket");
            });

            // Verify payment and call backend callback in the background (non-blocking)
            try {
              const verifyUrl = `https://webpay.interswitchng.com/collections/api/v1/gettransaction.json?merchantcode=MX169500&transactionreference=${txnRef}&amount=${amount}`;
              const verifyResponse = await fetch(verifyUrl, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
              });
              const verifyData = await verifyResponse.json();

              if (verifyData.ResponseCode === "00") {
                const backendUrl =
                  import.meta.env.VITE_BACKEND_URL ||
                  "https://server.brainstorm.ng/nibbleskitchen";
                let callbackSuccess = false;

                for (let attempt = 1; attempt <= 3 && !callbackSuccess; attempt++) {
                  try {
                    const callbackRes = await fetch(`${backendUrl}/api/payment/callback`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        txnref: txnRef,
                        resp: "00",
                        amount: amount,
                        orderId: createdOrder.id,
                        interswitchResponse: verifyData,
                      }),
                    });
                    const callbackData = await callbackRes.json();
                    console.log("✅ Backend callback response:", callbackData);
                    callbackSuccess = true;
                  } catch (err) {
                    console.error(`❌ Backend callback attempt ${attempt} failed:`, err);
                    if (attempt < 3) await new Promise((r) => setTimeout(r, 1000));
                  }
                }
              } else {
                console.error("❌ Payment verification failed:", verifyData);
              }
            } catch (error) {
              console.error("❌ Error verifying payment:", error);
              // Don't show error to user since they're already redirected
            }
          } else {
            // Payment was not approved by Interswitch
            toast({
              title: "Payment Failed",
              description: response.desc || "Payment was not approved.",
              variant: "destructive",
            });
          }
        },
        onClose: function () {
          console.log("Payment modal closed by user");
          toast({
            title: "Payment Cancelled",
            description: "Redirecting to home page...",
          });
          startTransition(() => {
            setTimeout(() => {
              setLocation("/");
            }, 1000);
          });
        },
        onError: function (error: any) {
          console.error("Payment error:", error);
          toast({
            title: "Payment Error",
            description: "An error occurred. Redirecting to home page...",
            variant: "destructive",
          });
          startTransition(() => {
            setTimeout(() => {
              setLocation("/");
            }, 2000);
          });
        },
      };

      (window as any).webpayCheckout(paymentConfig);
    } catch (error: any) {
      console.error("Order creation error:", error);
      toast({
        title: "Order Failed",
        description: error?.message || "Unable to create order. Please try again.",
        variant: "destructive",
      });
      setIsProcessingPayment(false);
    }
  };

  return (
    <>
      <SEO
        title="Home - Order Authentic Nigerian Cuisine Online"
        description="Browse our menu of delicious Nigerian dishes. Order jollof rice, suya, pounded yam, egusi soup, pepper soup, fried rice and more. Fast online ordering with pickup service. Fresh meals prepared daily."
        keywords="Nigerian food menu, order jollof rice online, suya delivery, Nigerian restaurant menu, African food online, pounded yam, egusi soup, order Nigerian food, online food ordering"
        ogUrl="https://nibblesfastfood.com/"
        canonicalUrl="https://nibblesfastfood.com/"
      />
      <main className="min-h-screen bg-background" role="main" aria-label="Menu page">
        {/* Kitchen Closed Banner - Very Prominent */}
        {!kitchenStatus.isOpen && (
          <div className="bg-primary text-primary-foreground py-4 px-4 shadow-lg border-b-4 border-primary/80" role="alert" aria-live="polite">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
              <AlertCircle className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0 animate-pulse" aria-hidden="true" />
              <div className="text-center">
                <h2 className="text-lg md:text-2xl font-bold mb-1">⚠️ KITCHEN IS CLOSED</h2>
                <p className="text-sm md:text-base">We are currently not accepting orders. Please check back later.</p>
              </div>
              <ChefHat className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0 animate-pulse" aria-hidden="true" />
            </div>
          </div>
        )}
        
        {/* Network Status Indicator (subtle) */}
        {networkStatus.isSlow && (
          <div className="bg-orange-50 dark:bg-orange-950 border-b border-orange-200 dark:border-orange-800 py-1 px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs text-orange-700 dark:text-orange-300">
              <Wifi className="w-3 h-3" />
              <span>Slow network detected - Optimizing for faster loading</span>
            </div>
          </div>
        )}
        
        {/* Hero Section */}
      <section className="relative h-[40vh] xs:h-[45vh] sm:h-[50vh] md:h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          {/* PERFORMANCE: Hero image from Cloudinary - automatically optimized via OptimizedImage */}
          <OptimizedImage
            src={heroImage}
            alt="Nibbles Kitchen - Authentic Nigerian Cuisine"
            aspectRatio="auto"
            priority={true} // Load hero image immediately (critical for LCP)
            width={1920}
            height={1080}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto w-full">
          {/* Brand Taglines */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6 mb-6 sm:mb-8">
            {/* Main Tagline */}
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight drop-shadow-2xl">
              <span className="block mb-2">The place you eat Everyday</span>
            </h1>
            
            {/* Secondary Tagline */}
            {/* <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white/95 font-semibold drop-shadow-lg">
              Quality food that moves fast.
            </p> */}
            
            {/* Call to Action Tagline */}
            {/* <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/90 font-medium drop-shadow-md">
              Eat more. Pay less. Move on.
            </p> */}
          </div>
        </div>
      </section>

      {/* Category Navigation and Search */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 py-2 sm:py-3">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  id="search-menu-desktop"
                  name="search-menu"
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 text-sm py-2 sm:py-3"
                  data-testid="input-search"
                  aria-label="Search menu items"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto min-w-0">
              <div className="flex gap-1 sm:gap-2">
                {categories.map((category: string) => (
                  <Badge
                    key={category}
                    variant={
                      selectedCategory === category ? "default" : "secondary"
                    }
                    className="cursor-pointer whitespace-nowrap px-2 sm:px-3 py-1 text-xs sm:py-1.5 hover-elevate"
                    onClick={() => setSelectedCategory(category)}
                    data-testid={`filter-${category
                      .toLowerCase()
                      .replace(" ", "-")}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Filter by ${category} category`}
                    aria-pressed={selectedCategory === category}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedCategory(category);
                      }
                    }}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-1 sm:gap-2">
              <Button
                size="icon"
                variant="default"
                className="relative shrink-0"
                onClick={() => setCartOpen(true)}
                data-testid="button-cart"
                aria-label={`Shopping cart${cart.length > 0 ? ` with ${cart.length} item${cart.length !== 1 ? 's' : ''}` : ''}`}
              >
                <ShoppingCart className="w-4 h-4" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[0.5rem] flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-1.5 sm:space-y-2">
            {/* Search Bar - Full width on mobile */}
            <div className="relative w-full">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                id="search-menu-mobile"
                name="search-menu-mobile"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 sm:pl-8 text-xs py-1.5"
                data-testid="input-search-mobile"
                aria-label="Search menu items"
                autoComplete="off"
              />
            </div>

            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              {/* Scrollable Category Buttons */}
              <div className="flex-1 overflow-x-auto -mx-3 px-3 mr-[1px]">
                <div className="flex gap-1.5 sm:gap-2 w-max">
                  {categories.map((category: string) => (
                    <Badge
                      key={category}
                      variant={
                        selectedCategory === category ? "default" : "secondary"
                      }
                      className="cursor-pointer whitespace-nowrap px-2 py-1 text-xs hover-elevate flex-shrink-0 min-w-[50px]"
                      onClick={() => setSelectedCategory(category)}
                      data-testid={`filter-mobile-${category
                        .toLowerCase()
                        .replace(" ", "-")}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`Filter by ${category} category`}
                      aria-pressed={selectedCategory === category}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedCategory(category);
                        }
                      }}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Cart Button */}
              <Button
                size="icon"
                variant="default"
                className="relative shrink-0 ml-1"
                onClick={() => setCartOpen(true)}
                aria-label="Open cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center font-bold">
                    {cart.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <section id="menu" className="max-w-7xl mx-auto px-3 xs:px-4 py-4 sm:py-6">
        <h2 className="font-serif text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold mb-3 sm:mb-4">Our Menu</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="aspect-square bg-gradient-to-br from-muted to-muted/50" />
                <CardContent className="p-2.5 sm:p-3.5 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted/70 rounded w-full" />
                  <div className="h-3 bg-muted/70 rounded w-2/3" />
                  <div className="h-6 bg-muted rounded w-1/2 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : menuError ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Unable to Load Menu</h3>
              <p className="text-sm text-red-700 mb-4">
                There was a problem loading the menu. Please check your connection and try again.
              </p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {(visibleItems || []).map((item) => {
                const isInCart = cart.some(
                  (cartItem) => String(cartItem.menuItem.id) === String(item.id)
                );
                const cartItem = cart.find((cartItem) => String(cartItem.menuItem.id) === String(item.id));
                
                // Determine if item is SOLD OUT: prioritize stock balance over manual available setting
                const isOutOfStock = (item.stockBalance !== null && item.stockBalance !== undefined)
                  ? item.stockBalance <= 0  // Stock tracked: SOLD OUT if balance <= 0
                  : !item.available;        // Stock not tracked: use manual available setting
                
                const isUnavailable = !item.available;
                
                const canAddMore = !isUnavailable && (
                  item.stockBalance === null || 
                  item.stockBalance === undefined || 
                  (cartItem ? cartItem.quantity < item.stockBalance : true)
                );
                
                return (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    isInCart={isInCart}
                    cartQuantity={cartItem?.quantity}
                    isOutOfStock={isOutOfStock}
                    canAddMore={canAddMore}
                    onAddToCart={addToCart}
                    onUpdateQuantity={updateQuantity}
                  />
                );
              })}
            </div>
            
            {/* Infinite Scroll Load More Button (fallback if intersection observer fails) */}
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="min-w-[120px]"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    `Load More (${filteredItems.length - visibleItems.length} remaining)`
                  )}
                </Button>
              </div>
            )}
            
            {/* Infinite Scroll Sentinel (for automatic loading) */}
            {hasMore && (
              <div
                ref={sentinelRef}
                className="h-1 w-full"
                aria-hidden="true"
              />
            )}
          </>
        )}
      </section>

      {/* Cart Sidebar */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          <div className="w-full sm:w-[90vw] sm:max-w-md md:w-96 bg-background border-l flex flex-col shadow-2xl">
            {/* Cart Header */}
            <div className="p-3 sm:p-5 border-b bg-gradient-to-r from-accent/10 to-primary/5 flex items-center justify-between sticky top-0 bg-background z-10">
              <div>
                <h2 className="text-lg sm:text-2xl font-semibold sm:font-bold text-foreground">Your Cart</h2>
                {cart.length > 0 && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    {cart.length} {cart.length === 1 ? 'item' : 'items'}
                  </p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCartOpen(false)}
                data-testid="button-close-cart"
                className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label="Close cart"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5">
              {cart.length === 0 ? (
                <div className="text-center py-16 sm:py-20">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                    <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
                  </div>
                  <p className="text-base sm:text-lg font-medium text-foreground mb-2">Your cart is empty</p>
                  <p className="text-sm text-muted-foreground">Add items from the menu to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {cart.map((item) => (
                    <Card
                      key={item.menuItem.id}
                      data-testid={`cart-item-${item.menuItem.id}`}
                      className="border-border/50 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer relative"
                      onClick={() => setExpandedCartItem(item.menuItem.id)}
                    >
                      <CardContent className="p-0 relative">
                        {/* Top badges container */}
                        <div className="absolute top-1.5 left-1.5 right-1.5 z-10 flex justify-between items-start">
                          {/* Quantity Badge */}
                          <div className="bg-[#4EB5A4] text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-bold shadow-md">
                            {item.quantity}
                          </div>

                          {/* Remove Button */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              item.menuItem.id && removeFromCart(item.menuItem.id);
                            }}
                            className="h-5 w-5 sm:h-6 sm:w-6 bg-destructive/90 hover:bg-destructive text-white rounded-full p-0"
                            aria-label={`Remove ${item.menuItem.name} from cart`}
                          >
                            <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </Button>
                        </div>

                        {/* Image Only */}
                        <OptimizedImage
                          src={item.menuItem.imageUrl || ''}
                          alt={item.menuItem.name || 'Menu item'}
                          width={120}
                          height={120}
                          aspectRatio="square"
                          priority={false}
                          className="w-full aspect-square object-cover"
                        />
                      </CardContent>
                    </Card>
                ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-3 sm:p-5 border-t bg-muted/30 space-y-3 sm:space-y-4 sticky bottom-0 bg-background">
                {/* Delivery Method Selection */}
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-semibold text-foreground">1. Delivery Method</p>
                  <div className="flex gap-2 sm:gap-3">
                    {(settings.deliveryEnabled ? ["pickup", "delivery"] : ["pickup"]).map((type) => {
                      const isActive = orderType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          className={`flex-1 p-2 sm:p-3 rounded-lg border-2 text-center transition-all font-semibold focus:outline-none text-xs sm:text-sm ${
                            isActive
                              ? "border-[#4EB5A4] bg-[#4EB5A4]/10 text-foreground shadow-md"
                              : "hover:border-accent/50 bg-muted/30 text-foreground hover:border-accent/70"
                          }`}
                          onClick={() => handleOrderTypeChange(type as "pickup" | "delivery")}
                        >
                          <div className="font-semibold capitalize">{type}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {type === "pickup" ? "At our location" : "To your location"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery Location Input - Show when delivery is selected but no location set */}
                {orderType === "delivery" && !locationData && (
                  <Card className="border-orange-300 bg-orange-50/50 shadow-sm mt-4">
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

                      {/* Error message */}
                      {locationError && (
                        <Alert variant="destructive" className="border-red-400 bg-red-50">
                          <AlertDescription className="text-red-900 whitespace-pre-line">
                            <strong className="block mb-2">{locationError.split('.')[0]}.</strong>
                            {locationError.split('.').slice(1).join('.').trim()}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-3">
                        {/* Manual address input */}
                        <div>
                          <label className="text-sm font-semibold mb-2 block text-foreground">
                            Delivery Address
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
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
                                  };
                                  setLocationData(newLocationData);
                                  localStorage.setItem("location", JSON.stringify(newLocationData));
                                  setLocationError(null);
                                }
                              }}
                              className="flex-1 min-w-0 text-sm sm:text-base"
                            />
                            <Button
                              type="button"
                              onClick={() => {
                                if (tempAddress.trim()) {
                                  const newLocationData = {
                                    address: tempAddress.trim(),
                                    latitude: 0,
                                    longitude: 0
                                  };
                                  setLocationData(newLocationData);
                                  localStorage.setItem("location", JSON.stringify(newLocationData));
                                  setLocationError(null);
                                  toast({
                                    title: "Address Set",
                                    description: "Delivery address has been set successfully.",
                                  });
                                }
                              }}
                              disabled={!tempAddress.trim() || isCalculatingDelivery}
                              className="bg-[#4EB5A4] hover:bg-[#4EB5A4]/90 text-sm sm:text-base whitespace-nowrap"
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

                        {/* Auto-detect location button */}
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
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Location Display - Show when location is set */}
                {orderType === "delivery" && locationData && (
                  <Card className="border-accent/30 bg-accent/5 shadow-sm mt-4">
                    <CardHeader className="bg-accent/10 border-b border-accent/20">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MapPin className="w-5 h-5" />
                        Delivery Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-2 sm:gap-4 p-3 sm:p-4 bg-background/50 rounded-lg border border-accent/20">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm sm:text-base text-foreground break-words">{locationData.address}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-all">
                            {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTempAddress(locationData.address);
                            setLocationData(null);
                            localStorage.removeItem("location");
                          }}
                          className="flex-shrink-0 text-xs sm:text-sm"
                        >
                          Edit
                        </Button>
                      </div>
                      {isCalculatingDelivery && (
                        <Alert className="border-blue-300 bg-blue-50 mt-4">
                          <AlertDescription className="text-blue-900">
                            Calculating delivery fee...
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Charges Breakdown */}
                <div className="space-y-1.5 sm:space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold text-foreground">
                      ₦{subtotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  
                  {orderType === "delivery" && (
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span className="font-semibold text-foreground">
                        {isCalculatingDelivery ? (
                          <span className="text-xs">Calculating...</span>
                        ) : (
                          `₦${deliveryFee.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        )}
                      </span>
                    </div>
                  )}

                  {/* Service Charges */}
                  {serviceCharges.length > 0 ? (
                    serviceCharges.map((charge) => (
                      <div key={charge.id} className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">
                          {charge.description} ({charge.amount}%)
                        </span>
                        <span className="font-semibold text-foreground">
                          ₦{((subtotal + deliveryFee) * (Number(charge.amount) / 100)).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <>
                      {serviceChargeRate > 0 && (
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">
                            Service charge ({serviceChargeRate}%)
                          </span>
                          <span className="font-semibold text-foreground">
                            ₦{((subtotal + deliveryFee) * (serviceChargeRate / 100)).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      )}
                      {vatRate > 0 && (
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">VAT ({vatRate}%)</span>
                          <span className="font-semibold text-foreground">
                            ₦{((subtotal + deliveryFee) * (vatRate / 100)).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm sm:text-lg font-bold text-foreground">Total</span>
                    <span className="font-bold text-base sm:text-xl text-[#4EB5A4]" data-testid="text-total">
                      ₦{calculateTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full h-11 sm:h-14 text-sm sm:text-lg font-semibold bg-gradient-to-r from-[#4EB5A4] to-teal-600 hover:from-[#3da896] hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all"
                  onClick={handleCheckout}
                  disabled={isCalculatingDelivery}
                  data-testid="button-checkout"
                >
                  {isCalculatingDelivery ? "Calculating..." : "Proceed to Checkout"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cart Item Detail Modal */}
      <Dialog open={!!expandedCartItem} onOpenChange={(open) => !open && setExpandedCartItem(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md p-0 gap-0 overflow-hidden">
          {expandedCartItem && (() => {
            const item = cart.find(i => i.menuItem.id === expandedCartItem);
            if (!item) return null;
            
            return (
              <div className="flex flex-col">
                {/* Top: Compact Image Section */}
                <div className="relative w-full bg-gradient-to-br from-muted to-muted/50 flex-shrink-0 overflow-hidden">
                  <div className="aspect-[5/2]">
                    <OptimizedImage
                      src={item.menuItem.imageUrl || ''}
                      alt={item.menuItem.name || 'Menu item'}
                      width={400}
                      height={160}
                      aspectRatio="auto"
                      priority={false}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Close button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setExpandedCartItem(null)}
                    className="absolute top-2 right-2 h-7 w-7 bg-white/90 hover:bg-white text-foreground rounded-full shadow-lg"
                    aria-label="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Bottom: Content Section */}
                <div className="flex flex-col p-4">
                  {/* Header */}
                  <div className="mb-3">
                    <h2 className="text-base sm:text-lg font-bold text-foreground mb-1.5 leading-tight line-clamp-2">
                      {item.menuItem.name}
                    </h2>
                    <span className="text-xl sm:text-2xl font-bold text-[#4EB5A4]">
                      ₦{parseFloat(item.menuItem.price).toLocaleString()}
                    </span>
                  </div>

                  {/* Quantity Section - Inline */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between p-3 bg-gradient-to-br from-[#4EB5A4]/10 to-[#4EB5A4]/5 border border-[#4EB5A4]/20 rounded-lg">
                      <span className="text-sm font-semibold text-foreground">Quantity</span>
                      <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => item.menuItem.id && updateQuantity(item.menuItem.id, -1)}
                          className="h-8 w-8 hover:bg-red-50 hover:text-destructive rounded-md"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <span className="w-8 text-center font-bold text-lg">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => item.menuItem.id && updateQuantity(item.menuItem.id, 1)}
                          className="h-8 w-8 hover:bg-[#4EB5A4]/10 hover:text-[#4EB5A4] rounded-md"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b">
                    <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
                    <span className="text-lg font-bold text-[#4EB5A4]">
                      ₦{(parseFloat(item.menuItem.price) * item.quantity).toLocaleString()}
                    </span>
                  </div>

                  {/* Special Instructions */}
                  <div className="mb-3">
                    <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                      <ChefHat className="w-3.5 h-3.5 text-[#4EB5A4]" />
                      <span>Special Instructions</span>
                      <Badge variant="secondary" className="text-xs">Optional</Badge>
                    </label>
                    <Textarea
                      placeholder="Any special requests?"
                      value={item.specialInstructions || ""}
                      onChange={(e) =>
                        item.menuItem.id && updateInstructions(item.menuItem.id, e.target.value)
                      }
                      className="text-sm resize-none h-16 focus:ring-1 focus:ring-[#4EB5A4]/30 rounded-lg"
                      rows={2}
                    />
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      item.menuItem.id && removeFromCart(item.menuItem.id);
                      setExpandedCartItem(null);
                    }}
                    className="w-full h-9 text-sm font-medium border border-destructive/30 text-destructive hover:bg-destructive hover:text-white rounded-lg"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Remove from Cart
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      {/* {showQRCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-full mx-auto border">
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-3 right-3"
              onClick={() => setShowQRCode(false)}
              data-testid="button-close-qr-modal"
            >
              <X className="w-5 h-5" />
            </Button>
            
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-3">Scan to Share Menu</h3>
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-white border rounded-lg">
                  <QRCodeSVG 
                    value={window.location.origin} 
                    size={180}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2 text-center">
                Scan this QR code with your phone's camera or access from other devices:
              </p>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md mb-4">
                <p className="mb-1"><strong>Note:</strong> To access from other devices:</p>
                <p className="mb-1">1. Ensure devices are on the same network</p>
                <p className="mb-1">2. Run dev server with: <code className="font-mono bg-gray-200 p-0.5 rounded">npm run dev</code></p>
                <p className="mt-1">The QR code contains the correct IP address for your network.</p>
              </div>
              <Button 
                onClick={() => navigator.clipboard && navigator.clipboard.writeText(window.location.origin)}
                variant="outline"
                className="w-full"
              >
                Copy Link
              </Button>
            </div>
          </div>
        </div>
      )} */}
      {/* Guest Data Capture Modal */}
      <Dialog open={showGuestDataModal} onOpenChange={setShowGuestDataModal}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] mx-4">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Guest Information</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Please provide your details to complete your order
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">
                Full Name <span className="text-destructive">*</span>
              </label>
              <Input
                // placeholder=""
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">
                Phone Number <span className="text-destructive">*</span>
              </label>
              <Input
                type="tel"
                // placeholder=""
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                We'll use this to send you order updates
              </p>
            </div>

            {/* <div>
              <label className="text-sm font-semibold mb-2 block">
                Email Address <span className="text-xs text-muted-foreground">(Optional)</span>
              </label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full"
              />
            </div> */}
          </div>

          <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
            <Button
              variant="outline"
              onClick={() => setShowGuestDataModal(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGuestDataSubmit}
              disabled={isCreatingGuestSession || !guestName.trim() || !guestPhone.trim()}
              className="w-full sm:w-auto bg-gradient-to-r from-[#4EB5A4] to-teal-600 text-white hover:from-[#3da896] hover:to-teal-700"
            >
              {isCreatingGuestSession ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Session...
                </span>
              ) : (
                "Continue"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center text-base sm:text-lg break-words">
              <Check className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-[#4EB5A4] flex-shrink-0" />
              <span className="break-words">Confirm Your Order</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm break-words">
              Please review your order details before proceeding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Order Summary */}
            <div className="rounded-lg bg-gray-50 p-3 sm:p-4">
              <h4 className="mb-2 font-medium text-sm sm:text-base">Order Summary</h4>
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="flex justify-between gap-2">
                  <span className="break-words min-w-0">Items ({cart.length})</span>
                  <span className="whitespace-nowrap flex-shrink-0">₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                {orderType === "delivery" && deliveryFee > 0 && (
                  <div className="flex justify-between gap-2">
                    <span className="break-words min-w-0">Delivery Fee</span>
                    <span className="whitespace-nowrap flex-shrink-0">₦{deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {/* Service Charges */}
                {serviceCharges.length > 0 ? (
                  serviceCharges.map((charge) => (
                    <div key={charge.id} className="flex justify-between gap-2">
                      <span className="break-words min-w-0">{charge.description} ({charge.amount}%)</span>
                      <span className="whitespace-nowrap flex-shrink-0">
                        ₦{((subtotal + deliveryFee) * (Number(charge.amount) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))
                ) : (
                  <>
                    {serviceChargeRate > 0 && (
                      <div className="flex justify-between gap-2">
                        <span className="break-words min-w-0">Service charge ({serviceChargeRate}%)</span>
                        <span className="whitespace-nowrap flex-shrink-0">
                          ₦{((subtotal + deliveryFee) * (serviceChargeRate / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {vatRate > 0 && (
                      <div className="flex justify-between gap-2">
                        <span className="break-words min-w-0">VAT ({vatRate}%)</span>
                        <span className="whitespace-nowrap flex-shrink-0">
                          ₦{((subtotal + deliveryFee) * (vatRate / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between border-t pt-2 font-semibold gap-2">
                  <span className="break-words min-w-0">Total</span>
                  <span className="whitespace-nowrap flex-shrink-0">₦{calculateTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Location Information */}
            {orderType === "pickup" ? (
              <div className="rounded-lg bg-orange-50 p-3 sm:p-4">
                <h4 className="mb-2 font-medium flex items-center text-sm sm:text-base">
                  <MapPin className="h-4 w-4 mr-2 text-orange-600 flex-shrink-0" />
                  <span className="break-words">Pickup Location</span>
                </h4>
                <p className="text-xs sm:text-sm text-gray-700 break-words">Lafiya Road Nasarawa GRA, Kano</p>
                <p className="text-xs text-gray-500 mt-1 break-words">Nibbles Kitchen</p>
              </div>
            ) : locationData ? (
              <div className="rounded-lg bg-green-50 p-3 sm:p-4">
                <h4 className="mb-2 font-medium flex items-center text-sm sm:text-base">
                  <MapPin className="h-4 w-4 mr-2 text-green-600 flex-shrink-0" />
                  <span className="break-words">Delivery Location</span>
                </h4>
                <p className="text-xs sm:text-sm text-gray-700 break-words">{locationData.address}</p>
              </div>
            ) : null}

            {/* Payment Method Info */}
            <div className="rounded-lg bg-blue-50 p-3 sm:p-4">
              <h4 className="mb-2 font-medium text-sm sm:text-base break-words">Payment Method</h4>
              <div className="flex items-center space-x-2 min-w-0">
                <CreditCard className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm break-words min-w-0">Card/Transfer</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col space-y-2">
            <div className="w-full">
              <Button
                className="w-full bg-gradient-to-r from-[#4EB5A4] to-teal-600 text-white hover:from-[#3da896] hover:to-teal-700 text-sm sm:text-base"
                onClick={handleConfirmOrder}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <>
                    Confirm Order
                    <Check className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </main>
    </>
  );
}