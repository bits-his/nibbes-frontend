import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { OrderWithItems } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

export default function DucketDisplay() {
  const { data: orders, refetch } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders/active/customer"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/orders/active/customer');
      return response.json();
    },
    // Remove refetchInterval since we're using WebSockets for real-time updates
  });

  // Filter orders that are ready or completed
  const readyOrders = orders?.filter(order => 
    order.status === 'ready' || order.status === 'completed'
  ) || [];

  // Set up WebSocket to receive real-time updates
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected for Ducket Display");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "order_update" || data.type === "new_order" || data.type === "order_status_change") {
        // Refetch orders when there's an update
        refetch();
      } else if (data.type === "menu_item_update") {
        // Refresh menu data when items are updated
        queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      }
    };

    return () => {
      socket.close();
    };
  }, [refetch]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Ducket Display</h1>
        <p className="text-muted-foreground">Your ready orders</p>
      </div>

      {readyOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No ready orders at the moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {readyOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Order #{order.orderNumber}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  {getStatusBadge(order.status)}
                  <span className="text-sm text-muted-foreground">
                    {new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Customer:</span>
                    <span>{order.customerName}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Total:</span>
                    <span>₦{parseFloat(order.totalAmount).toLocaleString()}</span>
                  </div>
                  
                  <div className="mt-3">
                    <span className="font-medium">Items:</span>
                    <ul className="mt-1 space-y-1">
                      {order.orderItems.map((item) => (
                        <li key={item.id} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.menuItem.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}