import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle, ChefHat, Package, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OrderWithItems } from "@shared/schema";

export default function DocketPage() {
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

  const activeOrders = orders?.filter((order) => 
    order.status !== "completed" && order.status !== "cancelled"
  );

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
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
        return <Clock className="w-5 h-5 text-muted-foreground" />;
      case "preparing":
        return <ChefHat className="w-5 h-5 text-primary" />;
      case "ready":
        return <Package className="w-5 h-5 text-primary" />;
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      preparing: { variant: "default", label: "Preparing" },
      ready: { variant: "default", label: "Ready" },
      completed: { variant: "secondary", label: "Completed" },
    };
    const config = variants[status] || { variant: "secondary", label: status };
    return (
      <Badge variant={config.variant} className="px-3 py-1 text-sm">
        {config.label}
      </Badge>
    );
  };
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-primary" />
            <h1 className="font-serif text-4xl font-bold">Order Docket</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="px-4 py-2 text-base">
              Active Orders: {activeOrders?.length || 0}
            </Badge>
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" title="Live updates" />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="p-6">
                  <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-6 bg-muted rounded animate-pulse" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : activeOrders && activeOrders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeOrders.map((order) => (
              <Card 
                key={order.id} 
                className="overflow-hidden border-2 hover:shadow-lg transition-shadow"
              >
                <CardHeader className="p-6 bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      <CardTitle className="text-2xl">#{order.orderNumber}</CardTitle>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <ClipboardList className="w-24 h-24 mx-auto text-muted-foreground mb-6" />
            <h2 className="text-2xl font-semibold mb-2">No Active Orders</h2>
            <p className="text-muted-foreground mb-6">
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