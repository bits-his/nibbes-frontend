import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Clock, CheckCircle, ChefHat, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { OrderWithItems } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { queryClient } from "@/lib/queryClient";

export default function OrderStatus() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const orderId = new URLSearchParams(search).get("id");
  const [ws, setWs] = useState<WebSocket | null>(null);

  const { data: order, isLoading } = useQuery<OrderWithItems>({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId,
    // Remove refetchInterval since we're using WebSockets for real-time updates
  });

  // WebSocket for real-time updates
  useEffect(() => {
    if (!orderId) return;

    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "order_update" && data.orderId === orderId) {
        // Refetch order data
        window.location.reload();
      } else if (data.type === "order_status_change" && data.orderId === orderId) {
        // Refetch order data for status changes
        window.location.reload();
      } else if (data.type === "new_order" && data.orderId === orderId) {
        // Refetch order data for new orders
        window.location.reload();
      } else if (data.type === "menu_item_update") {
        // Refresh menu data when items are updated
        queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      }
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [orderId]);

  if (!orderId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No order ID provided</p>
            <Button onClick={() => setLocation("/")} data-testid="button-back-home">
              Back to Menu
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-8 h-8 text-muted-foreground" />;
      case "preparing":
        return <ChefHat className="w-8 h-8 text-primary" />;
      case "ready":
        return <Package className="w-8 h-8 text-primary" />;
      case "completed":
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      default:
        return <Clock className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "pending":
        return "Your order has been received and will be prepared shortly.";
      case "preparing":
        return "Our chefs are preparing your delicious meal!";
      case "ready":
        return "Your order is ready for pickup!";
      case "completed":
        return "Order completed. Thank you for choosing Nibbles Kitchen!";
      default:
        return "Order status unknown.";
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-200 px-6 py-3 capitalize text-yellow-800",
      preparing: "bg-orange-200 px-6 py-3 capitalize text-orange-800",
      ready: "px-6 py-3 capitalize",
      completed: "bg-red-200 px-6 py-3 capitalize text-red-800",
      cancelled: "bg-black-200 px-6 py-3 capitalize text-black-800",
    };

    const config = statusColors[status] || "bg-gray-500 text-gray-800 px-6 py-3";

    return (
      <Badge variant="default" className={config}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6"
          data-testid="button-back-home"
        >
          Back to Menu
        </Button>

        {isLoading ? (
          <Card>
            <CardContent className="p-12">
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse" />
                <div className="h-6 bg-muted rounded animate-pulse" />
                <div className="h-6 bg-muted rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ) : order ? (
          <div className="space-y-6">
            {/* Order Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Order #{order.orderNumber}</CardTitle>
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" title="Live updates" />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4 p-6 bg-muted rounded-lg">
                  {getStatusIcon(order.status)}
                  <div className="flex-1">
                    <div className="mb-2">
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getStatusMessage(order.status)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Customer Name</div>
                    <div className="font-medium">{order.customerName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Order Time</div>
                    <div className="font-medium">
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Order Type</div>
                    <div className="font-medium capitalize">{order.orderType}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Payment Status</div>
                    <Badge variant={order.paymentStatus === "paid" ? "default" : "secondary"}>
                      {order.paymentStatus}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.orderItems.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 bg-muted rounded-lg">
                    <img
                      src={item.menuItem.imageUrl}
                      alt={item.menuItem.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{item.menuItem.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Quantity: {item.quantity}
                      </div>
                      {item.specialInstructions && (
                        <div className="text-sm text-muted-foreground italic mt-1">
                          Note: {item.specialInstructions}
                        </div>
                      )}
                    </div>
                    <div className="font-semibold">
                      ₦{(parseFloat(item.price) * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center text-lg pt-4 border-t">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-2xl">
                    ₦{parseFloat(order.totalAmount).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">Order not found</p>
              <Button onClick={() => setLocation("/")} data-testid="button-back-home">
                Back to Menu
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
