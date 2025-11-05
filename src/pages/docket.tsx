import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle, XCircle, ChefHat, Package, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OrderWithItems } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { getSession, getArchivedGuestId } from "@/utils/session";

export default function DocketPage() {
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Get user-specific orders (including cancelled and completed), guest orders, and archived guest orders
  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders/combined"],
    queryFn: async () => {
      const session = getSession();
      const archivedGuestId = getArchivedGuestId();
      
      let allOrders: OrderWithItems[] = [];

      // Fetch orders based on session type
      if (session.type === "user") {
        // Fetch user orders
        try {
          const response = await apiRequest('GET', `/api/orders?user_id=${session.id}`);
          const userOrders = await response.json();
          allOrders.push(...userOrders);
        } catch (error) {
          console.error("Failed to fetch user orders:", error);
        }
      }

      if (session.type === "guest") {
        // Fetch guest orders
        try {
          const response = await apiRequest('GET', `/api/orders?guest_id=${session.id}`);
          const guestOrders = await response.json();
          allOrders.push(...guestOrders);
        } catch (error) {
          console.error("Failed to fetch guest orders:", error);
        }
      }

      // Fetch archived guest orders (if any)
      if (archivedGuestId) {
        try {
          const response = await apiRequest('GET', `/api/orders?guest_id=${archivedGuestId}`);
          const archivedOrders = await response.json();
          allOrders.push(...archivedOrders);
        } catch (error) {
          console.error("Failed to fetch archived guest orders:", error);
        }
      }

      // Sort orders by createdAt in descending order (newest first)
      return allOrders.sort((a: OrderWithItems, b: OrderWithItems) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
  });

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
        // Invalidate the combined query to refresh all orders
        queryClient.invalidateQueries({ queryKey: ["/api/orders/combined"] });
      } else if (data.type === "menu_item_update") {
        // Refresh menu data when items are updated
        queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
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
    pending: "bg-yellow-200 px-6 py-3 capitalize text-yellow-800",
    preparing: "bg-orange-200 px-6 py-3 capitalize text-orange-800",
    ready: "px-6 py-3 capitalize ",
    completed: "bg-green-200 px-6 py-3 capitalize text-green-800",
    cancelled: "bg-red-200 px-6 py-3 capitalize text-red-800",
  };

  const config = statusColors[status] || "bg-gray-500 text-gray-800 px-6 py-3 ";

  return (
    <Badge variant="default" className={config}>
      {status}
    </Badge>
  );
};
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-primary" />
            <h1 className="font-serif text-4xl font-bold">Order Docket</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="px-4 py-2 text-base">
              Orders: {orders?.length || 0}
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
                className="overflow-hidden border-2"
              >
                <CardHeader className="p-6 bg-card space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-4xl font-bold mb-1">
                        #{order.orderNumber}
                      </div>
                      {order.guestId && (
                        <div className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full mb-1">
                          Guest Order
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  {/* <div className="flex items-center gap-3">
                    <Badge variant="outline">{order.orderType}</Badge>
                    <span className="font-medium">{order.customerName}</span>
                  </div> */}
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    {order.orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-semibold text-lg">
                            {item.quantity}x {item.menuItem.name}
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

                  {order.notes && (
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
            <h2 className="text-2xl font-semibold mb-2">No Orders</h2>
            <p className="text-muted-foreground">
              Your orders will appear here when you place them
            </p>
            <Button asChild>
              <a href="#/">Back to Menu</a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}