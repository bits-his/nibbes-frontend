import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle, Package, ChefHat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OrderWithItems } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export function Docket() {
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Get user-specific active orders
  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders/active/customer"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/orders/active/customer');
      return response.json();
    },
    refetchInterval: 5000, // Fallback polling every 5 seconds
  });

  // Show all orders including completed ones
  const activeOrders = orders;

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
        queryClient.invalidateQueries({ queryKey: ["/api/orders/active/customer"] });
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
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case "preparing":
        return <ChefHat className="w-4 h-4 text-primary" />;
      case "ready":
        return <Package className="w-4 h-4 text-primary" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-200 text-yellow-800",
      preparing: "bg-orange-200 text-orange-800",
      ready: "",
      completed: "bg-red-200 text-red-800",
      cancelled: "bg-black-200 text-black-800",
    };

    const config = statusColors[status] || "bg-gray-500 text-gray-800";

    return (
      <Badge variant="default" className={`text-xs capitalize ${config}`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-primary" />
          Your Orders
        </h2>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">
            {activeOrders?.length || 0} Orders
          </Badge>
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Live updates" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="h-4 bg-muted rounded animate-pulse w-16 mb-1" />
                    <div className="h-3 bg-muted rounded animate-pulse w-24" />
                  </div>
                  <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activeOrders && activeOrders.length > 0 ? (
        <div className="space-y-3">
          {activeOrders.map((order) => (
            <Card 
              key={order.id} 
              className="overflow-hidden border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.location.hash = `#/order-status?id=${order.id}`}
            >
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(order.status)}
                      <span className="font-semibold text-sm">#{order.orderNumber}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{order.orderItems.length} items</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(order.status)}
                    <div className="text-xs mt-1">
                      ₦{parseFloat(order.totalAmount).toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <ChefHat className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No orders yet</p>
        </div>
      )}
    </div>
  );
}