import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle, XCircle, ChefHat, Package, ClipboardList, Volume2, Search, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OrderWithItems } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { getGuestSession } from "@/lib/guestSession";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { DeliveryStatusCard } from "@/components/DeliveryStatusCard";
import { playOrderReadyBeep, requestAudioPermission, isAudioPermissionGranted } from "@/utils/audio";
import { useToast } from "@/hooks/use-toast";

export default function DocketPage() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const guestSession = getGuestSession();
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if we just came from payment (URL parameter detection)
  const [justPaid, setJustPaid] = useState(false);
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success' || urlParams.get('from') === 'payment') {
      console.log('🎉 Detected payment success redirect - will refetch orders');
      setJustPaid(true);
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Get user-specific or guest-specific active orders
  // CRITICAL FIX: Add polling fallback when WebSocket is disconnected or after payment
  const { data: orders, isLoading, refetch } = useQuery<OrderWithItems[]>({
    queryKey: user 
      ? ["/api/orders/active/customer"] 
      : guestSession 
        ? ["/api/guest/orders", guestSession.guestId]
        : lookupPhone
          ? ["/api/guest/orders", "phone", lookupPhone]
          : [],
    queryFn: async () => {
      if (user) {
        // Authenticated user - fetch their orders
        const response = await apiRequest('GET', '/api/orders/active/customer');
        return response.json();
      } else if (guestSession) {
        // Guest user - fetch orders by guestId
        const response = await apiRequest('GET', `/api/guest/orders?guestId=${guestSession.guestId}`);
        const data = await response.json();
        return data.orders || [];
      } else if (lookupPhone) {
        // Lookup orders by phone number
        const response = await apiRequest('GET', `/api/guest/orders?phone=${encodeURIComponent(lookupPhone)}`);
        const data = await response.json();
        return data.orders || [];
      }
      return [];
    },
    enabled: !!(user || guestSession || lookupPhone),
    // CRITICAL FIX: Add polling fallback
    // Poll every 5 seconds when WebSocket is disconnected OR for 30 seconds after payment
    refetchInterval: (!isWsConnected || justPaid) ? 5000 : false,
    refetchIntervalInBackground: false,
  });

  // Stop polling 30 seconds after payment redirect
  useEffect(() => {
    if (justPaid) {
      const timer = setTimeout(() => {
        console.log('✅ 30 seconds passed since payment - stopping extra polling');
        setJustPaid(false);
      }, 30000); // 30 seconds
      return () => clearTimeout(timer);
    }
  }, [justPaid]);

  // Force refetch 2 seconds after landing on page from payment
  useEffect(() => {
    if (justPaid) {
      const timer = setTimeout(() => {
        console.log('🔄 Force refetching orders 2 seconds after payment redirect');
        refetch();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [justPaid, refetch]);

  // Handle phone number lookup
  const handlePhoneLookup = () => {
    if (!lookupPhone.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your phone number to view your orders.",
        variant: "destructive",
      });
      return;
    }

    // Phone number will trigger the query automatically via queryKey
    setIsLookingUp(true);
    refetch().finally(() => setIsLookingUp(false));
  };

  // Manual refresh handler
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "✅ Refreshed",
        description: "Orders updated successfully!",
      });
    } catch (error) {
      toast({
        title: "❌ Refresh Failed",
        description: "Could not refresh orders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter orders to only show paid orders
  const activeOrders = orders?.filter(order => {
    // For authenticated users: only show paid orders (prevents showing pending payment orders)
    if (user) {
      return order.paymentStatus === 'paid';
    }
    // For guest users: show all orders (including pending payment)
    // Guests need to see their order immediately after placing it
    return true;
  });

  // Request notification and audio permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
        console.log("Notification permission:", permission);
      });
    }
  }, []);

  // WebSocket connection for real-time updates with auto-reconnect
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const baseReconnectDelay = 1000;

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log("✅ Docket WebSocket connected");
          setIsWsConnected(true);
          reconnectAttempts = 0;
          
          // CRITICAL FIX: Refetch orders after reconnection to sync state
          console.log("🔄 Refetching orders after WebSocket reconnection");
          refetch();
        };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Use WebSocket data directly - no HTTP refetch needed!
      if (data.type === "order_update" || data.type === "new_order" || data.type === "order_status_change") {
        if (data.order) {
          // IMPORTANT: Only process orders that belong to the current user/guest/phone lookup
          const orderBelongsToUser = user && (data.order.userId === user.id || data.order.customerEmail === user.email);
          const orderBelongsToGuest = guestSession && data.order.guestId === guestSession.guestId;
          const orderBelongsToPhone = lookupPhone && data.order.customerPhone && 
            data.order.customerPhone.replace(/\D/g, '') === lookupPhone.replace(/\D/g, '');
          
          if (!orderBelongsToUser && !orderBelongsToGuest && !orderBelongsToPhone) {
            // This order doesn't belong to the current user - ignore it
            return;
          }

          console.log(`📦 Docket received ${data.type} for order #${data.order.orderNumber}`, {
            paymentStatus: data.order.paymentStatus,
            status: data.order.status,
            belongsToUser: orderBelongsToUser || orderBelongsToGuest || orderBelongsToPhone
          });

          // Normalize order structure
          const normalizeOrder = (order: any): OrderWithItems => {
            const normalized = { ...order };
            if (!normalized.orderItems || !Array.isArray(normalized.orderItems)) {
              normalized.orderItems = [];
            }
            normalized.orderItems = normalized.orderItems.map((item: any) => {
              const menuItemName = (item.menuItemName && typeof item.menuItemName === 'string' && item.menuItemName.trim())
                ? item.menuItemName.trim()
                : (item.menuItem?.name && typeof item.menuItem.name === 'string' && item.menuItem.name.trim()
                  ? item.menuItem.name.trim()
                  : 'Unknown Item');
              
              return {
                ...item,
                menuItemName: menuItemName,
                menuItem: menuItemName !== 'Unknown Item' ? { name: menuItemName } : (item.menuItem || null)
              };
            });
            return normalized as OrderWithItems;
          };

          // Update query data directly based on user type
          if (user) {
            // Authenticated user orders
            queryClient.setQueryData(
              ["/api/orders/active/customer"],
              (old: OrderWithItems[] = []) => {
                const normalizedOrder = normalizeOrder(data.order);
                
                // Filter to only show paid orders
                if (normalizedOrder.paymentStatus !== 'paid') {
                  console.log(`🚫 Removing unpaid order #${normalizedOrder.orderNumber} from docket`);
                  return old.filter(o => o.id !== normalizedOrder.id);
                }
                
                // CRITICAL FIX: Treat order_status_change with paid status as new order if not in cache
                const index = old.findIndex(o => o.id === normalizedOrder.id);
                
                if (data.type === "new_order" || index < 0) {
                  // New order or order not in cache - add it
                  const exists = old.some(o => o.id === normalizedOrder.id);
                  if (!exists && normalizedOrder.paymentStatus === 'paid') {
                    console.log(`➕ Adding new paid order #${normalizedOrder.orderNumber} to docket`);
                    return [normalizedOrder, ...old].sort((a, b) =>
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                  }
                } else {
                  // Order exists - update it
                  console.log(`🔄 Updating existing order #${normalizedOrder.orderNumber} in docket`);
                  const updated = [...old];
                  updated[index] = normalizedOrder;
                  return updated.sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  );
                }
                
                // Check if order became ready and play notification sound
                if (data.type === "order_status_change" && normalizedOrder.status === 'ready' && audioEnabled) {
                  playOrderReadyBeep();
                  toast({
                    title: "🔔 Order Ready!",
                    description: `Your order #${normalizedOrder.orderNumber} is ready for pickup!`,
                    duration: 5000,
                  });
                }
                
                return old;
              }
            );
          } else if (guestSession) {
            // Guest orders
            queryClient.setQueryData(
              ["/api/guest/orders", guestSession.guestId],
              (old: { orders: OrderWithItems[] } = { orders: [] }) => {
                const normalizedOrder = normalizeOrder(data.order);
                
                // Filter to only show paid orders
                if (normalizedOrder.paymentStatus !== 'paid') {
                  console.log(`🚫 Removing unpaid order #${normalizedOrder.orderNumber} from docket`);
                  return { orders: old.orders.filter(o => o.id !== normalizedOrder.id) };
                }
                
                // CRITICAL FIX: Treat order_status_change with paid status as new order if not in cache
                const index = old.orders.findIndex(o => o.id === normalizedOrder.id);
                
                if (data.type === "new_order" || index < 0) {
                  // New order or order not in cache - add it
                  const exists = old.orders.some(o => o.id === normalizedOrder.id);
                  if (!exists && normalizedOrder.paymentStatus === 'paid') {
                    console.log(`➕ Adding new paid order #${normalizedOrder.orderNumber} to docket`);
                    return {
                      orders: [normalizedOrder, ...old.orders].sort((a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )
                    };
                  }
                } else {
                  // Order exists - update it
                  console.log(`🔄 Updating existing order #${normalizedOrder.orderNumber} in docket`);
                  const updated = [...old.orders];
                  updated[index] = normalizedOrder;
                  return {
                    orders: updated.sort((a, b) =>
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )
                  };
                }
                
                // Check if order became ready and play notification sound
                if (data.type === "order_status_change" && normalizedOrder.status === 'ready' && audioEnabled) {
                  playOrderReadyBeep();
                  toast({
                    title: "🔔 Order Ready!",
                    description: `Your order #${normalizedOrder.orderNumber} is ready for pickup!`,
                    duration: 5000,
                  });
                }
                
                return old;
              }
            );
          } else if (lookupPhone) {
            // Guest orders by phone number
            queryClient.setQueryData(
              ["/api/guest/orders", "phone", lookupPhone],
              (old: { orders: OrderWithItems[] } = { orders: [] }) => {
                const normalizedOrder = normalizeOrder(data.order);
                
                // Filter to only show paid orders
                if (normalizedOrder.paymentStatus !== 'paid') {
                  console.log(`🚫 Removing unpaid order #${normalizedOrder.orderNumber} from docket`);
                  return { orders: old.orders.filter(o => o.id !== normalizedOrder.id) };
                }
                
                // CRITICAL FIX: Treat order_status_change with paid status as new order if not in cache
                const index = old.orders.findIndex(o => o.id === normalizedOrder.id);
                
                if (data.type === "new_order" || index < 0) {
                  // New order or order not in cache - add it
                  const exists = old.orders.some(o => o.id === normalizedOrder.id);
                  if (!exists && normalizedOrder.paymentStatus === 'paid') {
                    console.log(`➕ Adding new paid order #${normalizedOrder.orderNumber} to docket`);
                    return {
                      orders: [normalizedOrder, ...old.orders].sort((a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )
                    };
                  }
                } else {
                  // Order exists - update it
                  console.log(`🔄 Updating existing order #${normalizedOrder.orderNumber} in docket`);
                  const updated = [...old.orders];
                  updated[index] = normalizedOrder;
                  return {
                    orders: updated.sort((a, b) =>
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )
                  };
                }
                
                // Check if order became ready and play notification sound
                if (data.type === "order_status_change" && normalizedOrder.status === 'ready' && audioEnabled) {
                  playOrderReadyBeep();
                  toast({
                    title: "🔔 Order Ready!",
                    description: `Your order #${normalizedOrder.orderNumber} is ready for pickup!`,
                    duration: 5000,
                  });
                }
                
                return old;
              }
            );
          }
        }
      } else if (data.type === "order_ready_notification") {
        // Check if this notification is for the current user/guest/phone lookup
        const isForCurrentUser = 
          (user && data.customerEmail === user.email) ||
          (guestSession && data.guestId === guestSession.guestId) ||
          (lookupPhone && data.customerPhone && 
            data.customerPhone.replace(/\D/g, '') === lookupPhone.replace(/\D/g, ''));
        
        if (isForCurrentUser) {
          // Show browser notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Order Ready! 🎉", {
              body: data.message,
              icon: "/logo.png",
              badge: "/logo.png",
              tag: `order-${data.orderNumber}`,
              requireInteraction: true
            });
          }
          
          // Update order status directly via WebSocket data
          if (data.order) {
            const normalizeOrder = (order: any): OrderWithItems => {
              const normalized = { ...order };
              if (!normalized.orderItems || !Array.isArray(normalized.orderItems)) {
                normalized.orderItems = [];
              }
              normalized.orderItems = normalized.orderItems.map((item: any) => {
                const menuItemName = (item.menuItemName && typeof item.menuItemName === 'string' && item.menuItemName.trim())
                  ? item.menuItemName.trim()
                  : (item.menuItem?.name && typeof item.menuItem.name === 'string' && item.menuItem.name.trim()
                    ? item.menuItem.name.trim()
                    : 'Unknown Item');
                
                return {
                  ...item,
                  menuItemName: menuItemName,
                  menuItem: menuItemName !== 'Unknown Item' ? { name: menuItemName } : (item.menuItem || null)
                };
              });
              return normalized as OrderWithItems;
            };

            if (user) {
              queryClient.setQueryData(
                ["/api/orders/active/customer"],
                (old: OrderWithItems[] = []) => {
                  const normalizedOrder = normalizeOrder(data.order);
                  const index = old.findIndex(o => o.id === normalizedOrder.id);
                  if (index >= 0) {
                    const updated = [...old];
                    updated[index] = normalizedOrder;
                    return updated;
                  }
                  return old;
                }
              );
            } else if (guestSession) {
              queryClient.setQueryData(
                ["/api/guest/orders", guestSession.guestId],
                (old: { orders: OrderWithItems[] } = { orders: [] }) => {
                  const normalizedOrder = normalizeOrder(data.order);
                  const index = old.orders.findIndex(o => o.id === normalizedOrder.id);
                  if (index >= 0) {
                    const updated = [...old.orders];
                    updated[index] = normalizedOrder;
                    return { orders: updated };
                  }
                  return old;
                }
              );
            } else if (lookupPhone) {
              queryClient.setQueryData(
                ["/api/guest/orders", "phone", lookupPhone],
                (old: { orders: OrderWithItems[] } = { orders: [] }) => {
                  const normalizedOrder = normalizeOrder(data.order);
                  const index = old.orders.findIndex(o => o.id === normalizedOrder.id);
                  if (index >= 0) {
                    const updated = [...old.orders];
                    updated[index] = normalizedOrder;
                    return { orders: updated };
                  }
                  return old;
                }
              );
            }
          }
        }
      }
    };

        socket.onerror = (error) => {
          console.error("❌ Docket WebSocket error:", error);
          setIsWsConnected(false);
        };

        socket.onclose = () => {
          console.log("🔌 Docket WebSocket disconnected");
          setIsWsConnected(false);
          socket = null;
          
          // Auto-reconnect with exponential backoff
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
            reconnectAttempts++;
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`);
            reconnectTimeout = setTimeout(() => {
              connect();
            }, delay);
          } else {
            console.error("❌ Max reconnection attempts reached for Docket WebSocket");
          }
        };

        setWs(socket);
      } catch (error) {
        console.error("❌ Error creating WebSocket connection:", error);
        setIsWsConnected(false);
        // Retry connection
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
          reconnectAttempts++;
          reconnectTimeout = setTimeout(() => {
            connect();
          }, delay);
        }
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [user, guestSession, lookupPhone, refetch]);

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <Clock className="w-5 h-5 text-muted-foreground" />;
    case "preparing":
      return <ChefHat className="w-5 h-5 text-yellow-500" />;
    case "ready":
      return <Package className="w-5 h-5 text-green-500" />;
    case "completed":
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "cancelled":
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Clock className="w-5 h-5 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: string) => {
  const statusColors: Record<string, string> = {
    pending: "bg-red-200 px-6 py-3 capitalize text-red-800",
    preparing: "bg-yellow-200 px-6 py-3 capitalize text-yellow-800",
    ready: "bg-green-200 px-6 py-3 capitalize text-green-800",
    completed: "bg-gray-300 px-6 py-3 capitalize text-gray-800",
    cancelled: "bg-gray-400 px-6 py-3 capitalize text-gray-900",
  };

  const config = statusColors[status] || "bg-gray-500 text-gray-800 px-6 py-3 ";

  return (
    <Badge variant="default" className={config}>
      {status}
    </Badge>
  );
};

const getStatusCardColor = (status: string) => {
  const cardColors: Record<string, string> = {
    pending: "bg-red-100 border-red-400",
    preparing: "bg-yellow-100 border-yellow-400",
    ready: "bg-green-200 border-green-400",
    completed: "bg-gray-200 border-gray-400",
    cancelled: "bg-gray-300 border-gray-500",
  };

  return cardColors[status] || "bg-gray-200 border-gray-400";
};
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            {user?.role === "admin" ? (
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold">Order Docket</h1>
            ) : (
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold">My Orders</h1>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-normal">
            {/* Manual Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            
            {/* Audio notification toggle */}
            <Button
              variant={audioEnabled ? "default" : "outline"}
              size="sm"
              onClick={async () => {
                if (!audioEnabled) {
                  const granted = await requestAudioPermission();
                  if (granted) {
                    setAudioEnabled(true);
                    toast({
                      title: "🔔 Audio Notifications Enabled",
                      description: "You'll hear a beep when your order is ready!",
                    });
                  } else {
                    toast({
                      title: "Audio Permission Required",
                      description: "Please interact with the page first, then try again.",
                      variant: "destructive",
                    });
                  }
                } else {
                  setAudioEnabled(false);
                  toast({
                    title: "🔇 Audio Notifications Disabled",
                    description: "You won't hear beeps for ready orders.",
                  });
                }
              }}
              className="flex items-center gap-2"
            >
              <Volume2 className="w-4 h-4" />
              {audioEnabled ? "🔔 On" : "🔇 Off"}
            </Button>
            <Badge variant="outline" className="px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base whitespace-nowrap">
              Orders: {activeOrders?.length || 0}
            </Badge>
            <div 
              className={`h-3 w-3 rounded-full ${isWsConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} 
              title={isWsConnected ? "Live updates" : "Reconnecting..."}
            />
          </div>
        </div>

        {/* Connection Status Banner */}
        {!isWsConnected && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-700" />
            <span className="text-sm text-yellow-700">Reconnecting to live updates...</span>
          </div>
        )}

        {/* Payment Success Banner */}
        {justPaid && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 rounded-lg flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-sm text-green-800">
              🎉 Payment successful! Your order will appear here shortly...
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="p-6">
                  <div className="h-12 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-6 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !user && !guestSession && !lookupPhone ? (
          // Show phone lookup form for guests without session
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Find Your Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your phone number to view your orders
              </p>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="08012345678"
                  value={lookupPhone}
                  onChange={(e) => setLookupPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePhoneLookup();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handlePhoneLookup}
                  disabled={isLookingUp || !lookupPhone.trim()}
                >
                  {isLookingUp ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Find
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : activeOrders && activeOrders.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeOrders.map((order) => (
              <Card 
                key={order.id} 
                className={`overflow-hidden border-2 hover:shadow-lg transition-shadow ${getStatusCardColor(order.status)}`}
              >
                <CardHeader className="p-6 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-4xl font-bold mb-1">
                        #{order.orderNumber}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline">{order.orderType}</Badge>
                    {order.paymentStatus === 'pending' && !user && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                        Payment Pending
                      </Badge>
                    )}
                    <span className="font-medium">{order.customerName}</span>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    {order.orderItems?.map((item) => (
                      <div key={item.id} className="flex justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-semibold text-lg">
                            {item.quantity}x {item.menuItem?.name || 'Unknown Item'}
                          </div>
                          {item.specialInstructions && (
                            <div className="text-sm text-muted-foreground italic mt-1">
                              Note: {item.specialInstructions}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.notes && order.orderItems && order.orderItems.length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Notes:</span> {order.notes}
                      </p>
                    </div>
                  )}

                  {/* Delivery Status Card - Show for delivery/online orders with tracking */}
                  {(order.orderType === "delivery" || order.orderType === "online") && (order.trackingNumber || order.deliveryRequestId) && (
                    <DeliveryStatusCard
                      trackingNumber={order.trackingNumber || undefined}
                      requestNumber={order.deliveryRequestId || undefined}
                      orderType={order.orderType}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <ClipboardList className="w-24 h-24 mx-auto text-muted-foreground mb-6" />
            <h2 className="text-2xl font-semibold mb-2">No Orders Yet</h2>
            <p className="text-muted-foreground mb-6">
              Your orders will appear here when you place them
            </p>
            <Button onClick={() => setLocation('/')}>
              Back to Menu
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}