import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Clock, ChefHat } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OrderWithItems } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function KitchenDisplay() {
  const { toast } = useToast();
  const [ws, setWs] = useState<WebSocket | null>(null);

  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders/active"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/orders/active');
      const data = await response.json();
      // Sort orders by createdAt in descending order (newest first)
      return data.sort((a: OrderWithItems, b: OrderWithItems) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    refetchInterval: 5000, // Fallback polling every 5 seconds
  });

  // WebSocket connection for real-time updates now
  // WebSocket connection for real-time updates now

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "order_update" || data.type === "new_order" || data.type === "order_status_change") {
        queryClient.invalidateQueries({ queryKey: ["/api/orders/active"] });
        
        if (data.type === "new_order") {
          toast({
            title: "New Order!",
            description: `Order #${data.orderNumber} has been placed.`,
          });
        }
      } else if (data.type === "menu_item_update") {
        // Refresh menu data when items are updated
        queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [toast]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/active"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    },
  });

const getStatusBadge = (status: string) => {
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-200 px-6 py-3 capitalize text-yellow-800",
    preparing: "bg-orange-200 px-6 py-3 capitalize text-orange-800",
    ready: "px-6 py-3 capitalize ",
    completed: "bg-red-200 px-6 py-3 capitalize text-red-800",
    cancelled: "bg-black-200 px-6 py-3 capitalize text-black-800",
  };

  const config = statusColors[status] || "bg-gray-500 text-gray-800 px-6 py-3 ";

  return (
    <Badge variant="default" className={config}>
      {status}
    </Badge>
  );
};

  const activeOrders = orders?.filter((order) => 
    order.status !== "completed" && order.status !== "cancelled"
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-primary" />
            <h1 className="font-serif text-4xl font-bold">Kitchen Display</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="px-4 py-2 text-base">
              Active Orders: {activeOrders?.length || 0}
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
        ) : activeOrders && activeOrders.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeOrders.map((order) => (
              <Card
                key={order.id}
                className="overflow-hidden border-2"
                data-testid={`card-order-${order.id}`}
              >
                <CardHeader className="p-6 bg-card space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-4xl font-bold mb-1" data-testid={`text-order-number-${order.id}`}>
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
                    {order.orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between gap-3" data-testid={`order-item-${item.id}`}>
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

                  <div className="pt-3 border-t space-y-2">
                    {order.status === "pending" && (
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "preparing" })}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-start-${order.id}`}
                      >
                        Start Preparing
                      </Button>
                    )}
                    {order.status === "preparing" && (
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "ready" })}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-ready-${order.id}`}
                      >
                        Mark as Ready
                      </Button>
                    )}
                    {order.status === "ready" && (
                      <Button
                        className="w-full"
                        size="lg"
                        variant="secondary"
                        onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "completed" })}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-complete-${order.id}`}
                      >
                        Complete Order
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <ChefHat className="w-24 h-24 mx-auto text-muted-foreground mb-6" />
            <h2 className="text-2xl font-semibold mb-2">No Active Orders</h2>
            <p className="text-muted-foreground">
              New orders will appear here automatically
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
