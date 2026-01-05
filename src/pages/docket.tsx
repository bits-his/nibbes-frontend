import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle, XCircle, ChefHat, Package, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OrderWithItems } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { getGuestSession } from "@/lib/guestSession";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

export default function DocketPage() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const guestSession = getGuestSession();

  // Get user-specific or guest-specific active orders
  const { data: orders, isLoading, refetch } = useQuery<OrderWithItems[]>({
    queryKey: user ? ["/api/orders/active/customer"] : ["/api/guest/orders", guestSession?.guestId],
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
      }
      return [];
    },
    enabled: !!(user || guestSession), // Only run query if user or guest session exists
    // Remove all polling options since we're using WebSockets for real-time updates
  });

  // Filter orders to only show paid orders
  const activeOrders = orders?.filter(order => {
    // Only show orders with paymentStatus === 'paid'
    return order.paymentStatus === 'paid';
  });

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
        console.log("Notification permission:", permission);
      });
    }
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("Docket WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (
        data.type === "order_update" || 
        data.type === "new_order" || 
        data.type === "order_status_change"
      ) {
        // Invalidate both authenticated user orders and guest orders
        queryClient.invalidateQueries({ queryKey: ["/api/orders/active/customer"] });
        queryClient.invalidateQueries({ queryKey: ["/api/guest/orders"] });
      } else if (data.type === "menu_item_update") {
        // Refresh menu data when items are updated
        queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      } else if (data.type === "order_ready_notification") {
        // Check if this notification is for the current user/guest
        const isForCurrentUser = 
          (user && data.customerEmail === user.email) ||
          (guestSession && data.guestId === guestSession.guestId);
        
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
          
          // Also show toast notification
          console.log("🎉 Your order is ready!", data.message);
          
          // Refresh orders to show updated status
          queryClient.invalidateQueries({ queryKey: ["/api/orders/active/customer"] });
          queryClient.invalidateQueries({ queryKey: ["/api/guest/orders"] });
        }
      }
    };

    socket.onerror = (error) => {
      console.error("Docket WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("Docket WebSocket disconnected");
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, []);

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
            <Badge variant="outline" className="px-3 py-1 sm:px-4 sm:py-2 text-sm sm:text-base whitespace-nowrap">
              Orders: {activeOrders?.length || 0}
            </Badge>
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" title="Live updates" />
          </div>
        </div>

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
        ) : orders && orders.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {orders.map((order) => (
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

                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{order.orderType}</Badge>
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