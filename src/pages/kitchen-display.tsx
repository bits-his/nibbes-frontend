import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Clock, ChefHat, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OrderWithItems } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { usePrint } from "@/hooks/kitchendisplay";

export default function KitchenDisplay() {
  const { toast } = useToast();
  const { printInvoice } = usePrint();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

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
    // Remove refetchInterval since we're using WebSockets for real-time updates
  });

  // WebSocket connection for real-time updates now
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';
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
          
          // Automatically print kitchen display for new orders
          // Find the order in the current orders list or use data.order
          const order = data.order || orders?.find(o => o.id === (data.orderId || data.order?.id));
          if (order) {
            console.log(`🖨️ Frontend: Triggering print for order ${order.orderNumber}`);
            try {
              // Transform OrderWithItems to OrderData format
              const orderData = {
                orderNumber: order.orderNumber,
                createdAt: order.createdAt,
                customerName: order.customerName,
                orderType: order.orderType,
                items: order.orderItems.map((item: OrderWithItems['orderItems'][0]) => ({
                  name: item.menuItem.name,
                  quantity: item.quantity,
                  price: item.price,
                  specialInstructions: item.specialInstructions || null,
                })),
                total: parseFloat(order.totalAmount) || 0,
                paymentMethod: order.paymentMethod || 'N/A',
                paymentStatus: order.paymentStatus,
                tendered: parseFloat(order.totalAmount) || 0,
              };
              printInvoice(orderData);
            } catch (error) {
              console.error('Failed to print kitchen order:', error);
              // Don't show error to user, just log it
            }
          } else {
            console.warn('Order not found for printing:', data);
          }
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

  // Filter orders based on search term
  const filteredOrders = orders?.filter((order) => {
    if (!searchTerm) return true; // If no search term, show all orders
    // Check if the search term matches the order number (case insensitive)
    return order.orderNumber.toString().toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  const activeOrders = filteredOrders?.filter((order) => {
    // Exclude completed and cancelled orders
    if (order.status === "completed" || order.status === "cancelled") {
      return false;
    }
    // Exclude orders with pending payment (waiting for Interswitch confirmation)
    if (order.paymentStatus === 'pending' && order.status === 'pending') {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <ChefHat className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold">Kitchen Display</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            {/* Search Input - Made responsive */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by order number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
              />
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <Badge variant="outline" className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base whitespace-nowrap">
                Active: {activeOrders?.length || 0}
              </Badge>
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" title="Live updates" />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="p-4 sm:p-6">
                  <div className="h-10 sm:h-12 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-5 sm:h-6 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activeOrders && activeOrders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {activeOrders.map((order) => (
              <Card
                key={order.id}
                className="overflow-hidden border-2"
                data-testid={`card-order-${order.id}`}
              >
                <CardHeader className="p-4 sm:p-6 bg-card space-y-2 sm:space-y-3">
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div>
                      <div className="text-3xl sm:text-4xl font-bold mb-1" data-testid={`text-order-number-${order.id}`}>
                        #{order.orderNumber}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <Badge variant="outline" className="text-xs sm:text-sm">{order.orderType}</Badge>
                    <span className="font-medium text-sm sm:text-base">{order.customerName}</span>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    {order.orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between gap-2 sm:gap-3" data-testid={`order-item-${item.id}`}>
                        <div className="flex-1">
                          <div className="font-semibold text-base sm:text-lg">
                            {item.quantity}x {item.menuItem.name}
                          </div>
                          {item.specialInstructions && (
                            <div className="text-xs sm:text-sm text-muted-foreground italic mt-1">
                              Note: {item.specialInstructions}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="pt-2 sm:pt-3 border-t">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        <span className="font-semibold">Notes:</span> {order.notes}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 sm:pt-3 border-t space-y-2">
                    {order.status === "pending" && (
                      <Button
                        className="w-full text-sm sm:text-base"
                        size="lg"
                        onClick={() => updateStatusMutation.mutate({ orderId: String(order.id), status: "preparing" })}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-start-${order.id}`}
                      >
                        Start Preparing
                      </Button>
                    )}
                    {order.status === "preparing" && (
                      <Button
                        className="w-full text-sm sm:text-base"
                        size="lg"
                        onClick={() => updateStatusMutation.mutate({ orderId: String(order.id), status: "ready" })}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-ready-${order.id}`}
                      >
                        Mark as Ready
                      </Button>
                    )}
                    {order.status === "ready" && (
                      <Button
                        className="w-full text-sm sm:text-base"
                        size="lg"
                        variant="secondary"
                        onClick={() => updateStatusMutation.mutate({ orderId: String(order.id), status: "completed" })}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-complete-${order.id}`}
                      >
                        Collected ✅
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 sm:py-20 md:py-24">
            <ChefHat className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto text-muted-foreground mb-4 sm:mb-6" />
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">No Active Orders</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              New orders will appear here automatically
            </p>
          </div>
        )}
      </div>
    </div>
  );
}