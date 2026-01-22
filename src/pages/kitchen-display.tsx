import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Clock, ChefHat, Search, Printer, Power } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OrderWithItems } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { usePrint } from "@/hooks/usePrint";

export default function KitchenDisplay() {
  const { toast } = useToast();
  const { printInvoice } = usePrint();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'active' | 'canceled'>('active');
  const [kitchenStatus, setKitchenStatus] = useState<{ isOpen: boolean; updatedAt?: string }>({ isOpen: true });
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Fetch kitchen status
  const { data: kitchenStatusData, refetch: refetchKitchenStatus } = useQuery<{ isOpen: boolean; updatedAt?: string }>({
    queryKey: ["/api/kitchen/status"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/kitchen/status');
      return await response.json();
    },
  });

  useEffect(() => {
    if (kitchenStatusData) {
      setKitchenStatus(kitchenStatusData);
    }
  }, [kitchenStatusData]);

  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders/active"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/orders/active');
      const data = await response.json();
      
      // Normalize order items to ensure menuItemName is always present
      const normalizedData = data.map((order: any) => {
        if (order.orderItems && Array.isArray(order.orderItems)) {
          order.orderItems = order.orderItems.map((item: any) => {
            const menuItemName = (item.menuItemName && typeof item.menuItemName === 'string' && item.menuItemName.trim())
              || (item.menuItem?.name && typeof item.menuItem.name === 'string' && item.menuItem.name.trim())
              || 'Unknown Item';
            return {
              ...item,
              menuItemName: menuItemName,
              menuItem: menuItemName !== 'Unknown Item' ? { name: menuItemName } : (item.menuItem || null)
            };
          });
        }
        return order;
      });
      
      // Sort orders by createdAt in descending order (newest first)
      return normalizedData.sort((a: OrderWithItems, b: OrderWithItems) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    // Remove refetchInterval since we're using WebSockets for real-time updates
  });

  // Fetch canceled orders for today
  const { data: canceledOrders, isLoading: isLoadingCanceled } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders/canceled/today"],
    queryFn: async () => {
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const to = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
      
      const response = await apiRequest('GET', `/api/orders?from=${from}&to=${to}&status=cancelled`);
      const data = await response.json();
      
      // Normalize canceled orders same as active orders
      const normalizedData = data.map((order: any) => {
        if (order.orderItems && Array.isArray(order.orderItems)) {
          order.orderItems = order.orderItems.map((item: any) => {
            const menuItemName = (item.menuItemName && typeof item.menuItemName === 'string' && item.menuItemName.trim())
              || (item.menuItem?.name && typeof item.menuItem.name === 'string' && item.menuItem.name.trim())
              || 'Unknown Item';
            return {
              ...item,
              menuItemName: menuItemName,
              menuItem: menuItemName !== 'Unknown Item' ? { name: menuItemName } : (item.menuItem || null)
            };
          });
        }
        return order;
      });
      
      return normalizedData.sort((a: OrderWithItems, b: OrderWithItems) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    enabled: activeTab === 'canceled', // Only fetch when canceled tab is active
  });

  // WebSocket connection for real-time updates with auto-reconnect
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const baseReconnectDelay = 1000; // Start with 1 second

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log("WebSocket connected");
          reconnectAttempts = 0; // Reset on successful connection
        };

        socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "order_update" || data.type === "new_order" || data.type === "order_status_change") {
        // Use WebSocket data directly - no HTTP query needed for instant updates!
        if (data.order) {
          // Normalize order structure to ensure orderItems are properly formatted
          const normalizeOrder = (order: any): OrderWithItems => {
            const normalized = { ...order };
            // Ensure orderItems is an array
            if (!normalized.orderItems || !Array.isArray(normalized.orderItems)) {
              normalized.orderItems = [];
            }
            // Ensure each orderItem has menuItem structure for display
            normalized.orderItems = normalized.orderItems.map((item: any) => {
              // Get menuItemName, handling empty strings
              const menuItemName = (item.menuItemName && typeof item.menuItemName === 'string' && item.menuItemName.trim()) 
                ? item.menuItemName.trim() 
                : (item.menuItem?.name && typeof item.menuItem.name === 'string' && item.menuItem.name.trim() 
                  ? item.menuItem.name.trim() 
                  : null);
              
              // Create menuItem structure if we have a valid name
              const menuItem = menuItemName ? { name: menuItemName } : null;
              
              return {
                ...item,
                menuItemName: menuItemName || 'Unknown Item', // Always include menuItemName
                menuItem: menuItem
              };
            });
            return normalized as OrderWithItems;
          };

          queryClient.setQueryData(
            ["/api/orders/active"],
            (old: OrderWithItems[] = []) => {
              if (data.type === "new_order") {
                // Add new order to the list
                const newOrder = normalizeOrder(data.order);
                
                // CRITICAL FIX: If orderItems are missing or empty, don't add the order
                // Backend should always send complete data, but if it doesn't, we skip it
                // to avoid showing blank orders. The order will appear when backend sends complete data.
                if (!newOrder.orderItems || newOrder.orderItems.length === 0) {
                  console.warn('⚠️ Order received without items via WebSocket, skipping until complete data arrives:', newOrder.id);
                  return old; // Don't add incomplete order - wait for complete WebSocket message
                }
                
                // Check if order already exists (avoid duplicates)
                const exists = old.some(o => o.id === newOrder.id);
                if (!exists) {
                  const updated = [newOrder, ...old];
                  // Sort by createdAt descending (newest first)
                  return updated.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  );
                }
                return old;
              } else if (data.type === "order_status_change" || data.type === "order_update") {
                // Update existing order or remove if completed/cancelled
                const updatedOrder = normalizeOrder(data.order);
                
                // CRITICAL FIX: If orderItems are missing, keep existing order data
                // Don't replace order with incomplete data - preserve existing items
                if (!updatedOrder.orderItems || updatedOrder.orderItems.length === 0) {
                  console.warn('⚠️ Order update received without items via WebSocket, preserving existing data:', updatedOrder.id);
                  // Find existing order and only update status, keep existing items
                  const existingIndex = old.findIndex(o => o.id === updatedOrder.id);
                  if (existingIndex >= 0) {
                    const existingOrder = old[existingIndex];
                    // Only update status, keep existing orderItems
                    const updated = [...old];
                    updated[existingIndex] = {
                      ...existingOrder,
                      status: updatedOrder.status,
                      paymentStatus: updatedOrder.paymentStatus,
                      // Keep existing orderItems
                      orderItems: existingOrder.orderItems || []
                    };
                    return updated.sort((a, b) => 
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                  }
                  // If order doesn't exist and has no items, don't add it
                  return old;
                }
                
                if (updatedOrder.status === "completed" || updatedOrder.status === "cancelled") {
                  // Remove completed/cancelled orders from active list
                  return old.filter(o => o.id !== updatedOrder.id);
                } else {
                  // Update existing order with complete data
                  const index = old.findIndex(o => o.id === updatedOrder.id);
                  if (index >= 0) {
                    const updated = [...old];
                    updated[index] = updatedOrder;
                    return updated.sort((a, b) => 
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                  } else {
                    // Order not in list, add it (might have been filtered out before)
                    const updated = [updatedOrder, ...old];
                    return updated.sort((a, b) => 
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                  }
                }
              }
              return old;
            }
          );
        } else {
          // Fallback: if order data not in WebSocket message, log warning
          // Don't invalidate query - keep existing data (WebSocket-only approach)
          console.warn('⚠️ WebSocket message received without order data:', data);
        }

        if (data.type === "new_order") {
          toast({
            title: "New Order!",
            description: `Order #${data.orderNumber} has been placed.`,
          });
          
          // Automatically print kitchen ticket for new orders
          const order = data.order || orders?.find(o => o.id === (data.orderId || data.order?.id));
          if (order) {
            console.log(`🖨️ Kitchen: Auto-printing ticket for order #${order.orderNumber}`);
            try {
              // Transform OrderWithItems to kitchen ticket format
              const kitchenTicketData = {
                orderNumber: order.orderNumber.toString(),
                createdAt: order.createdAt,
                customerName: order.customerName,
                items: (order.orderItems || []).map((item: any) => ({
                  name: item.menuItem?.name || item.menuItemName || 'Unknown Item',
                  quantity: item.quantity,
                  price: item.price,
                  specialInstructions: item.specialInstructions || null,
                })),
              };

              // Auto-print kitchen ticket - COMMENTED OUT PER REQUEST
              // autoPrintKitchenTicket(kitchenTicketData);
            } catch (error) {
              console.error('❌ Failed to print kitchen ticket:', error);
              // Don't show error to user, just log it
            }
          } else {
            console.warn('⚠️ Order not found for printing:', data);
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
          
          // Auto-reconnect with exponential backoff
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
            console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
            
            reconnectTimeout = setTimeout(() => {
              reconnectAttempts++;
              connect();
            }, delay);
          } else {
            console.error("Max reconnection attempts reached. Please refresh the page.");
            toast({
              title: "Connection Lost",
              description: "WebSocket connection failed. Please refresh the page to reconnect.",
              variant: "destructive",
            });
          }
        };

        setWs(socket);
      } catch (error) {
        console.error("Failed to create WebSocket:", error);
      }
    };

    // Initial connection
    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [toast]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      setUpdatingOrderId(orderId);
      return await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
    },
    onMutate: async ({ orderId, status }) => {
      // Optimistic update - instantly update UI
      queryClient.setQueryData(
        ["/api/orders/active"],
        (old: OrderWithItems[] = []) => {
          return old.map(order => 
            order.id === parseInt(orderId) 
              ? { ...order, status } 
              : order
          );
        }
      );
    },
    onSuccess: () => {
      setUpdatingOrderId(null);
    },
    onError: (error, { orderId }) => {
      setUpdatingOrderId(null);
      // Revert on error - WebSocket will send correct state
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    },
    // Remove invalidateQueries - WebSocket handles updates
  });

  // Kitchen status toggle mutation
  const updateKitchenStatusMutation = useMutation({
    mutationFn: async (isOpen: boolean) => {
      const response = await apiRequest("PATCH", "/api/kitchen/status", { isOpen });
      return await response.json();
    },
    onSuccess: (data) => {
      setKitchenStatus(data.status);
      refetchKitchenStatus();
      toast({
        title: data.status.isOpen ? "Kitchen Opened" : "Kitchen Closed",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update kitchen status.",
        variant: "destructive",
      });
    },
  });
const convertOrderForPrint = (order: OrderWithItems) => {
    return {
      orderNumber: order.orderNumber.toString(),
      createdAt: order.createdAt,
      customerName: order.customerName,
      orderType: order.orderType,
      items: (order.orderItems || []).map((item: any) => {
        const itemName = (item.menuItem?.name && typeof item.menuItem.name === 'string' && item.menuItem.name.trim())
          || (item.menuItemName && typeof item.menuItemName === 'string' && item.menuItemName.trim())
          || 'Unknown Item';
        return {
          name: itemName,
          quantity: item.quantity,
          price: parseFloat(item.price),
          specialInstructions: item.specialInstructions || null
        };
      }),
      total: parseFloat(order.totalAmount),
      paymentMethod: order.paymentMethod || 'N/A',
      paymentStatus: order.paymentStatus || 'paid',
      tendered: parseFloat(order.totalAmount)
    };
  };
  // Function to print kitchen ticket for a specific order
  // Print immediately and update status in parallel
  const handlePrintPreview = (order: OrderWithItems) => {
    const printData = convertOrderForPrint(order);
    
    // Print immediately - don't wait
    printInvoice(printData, 'receipt');
    
    // Update status in parallel if order is pending
    if (order.status === 'pending') {
      updateStatusMutation.mutate({ orderId: String(order.id), status: 'preparing' });
    }
  };

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

  // Filter orders based on search term and active tab
  const filteredOrders = (activeTab === 'active' ? orders : canceledOrders)?.filter((order) => {
    if (!searchTerm) return true; // If no search term, show all orders
    // Check if the search term matches the order number (case insensitive)
    return order.orderNumber.toString().toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  const activeOrders = activeTab === 'active' ? filteredOrders?.filter((order) => {
    // Exclude completed and cancelled orders
    if (order.status === "completed" || order.status === "cancelled") {
      return false;
    }
    // Exclude orders with pending payment (waiting for Interswitch confirmation)
    if (order.paymentStatus === 'pending' && order.status === 'pending') {
      return false;
    }
    return true;
  }) : filteredOrders; // For canceled tab, show all filtered canceled orders

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <ChefHat className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold">Kitchen Display</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            {/* Kitchen Status Toggle */}
            <Button
              onClick={() => updateKitchenStatusMutation.mutate(!kitchenStatus.isOpen)}
              disabled={updateKitchenStatusMutation.isPending}
              variant={kitchenStatus.isOpen ? "default" : "destructive"}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Power className="w-4 h-4" />
              {kitchenStatus.isOpen ? "Kitchen Open" : "Kitchen Closed"}
            </Button>
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
              {/* Tab Buttons */}
              <div className="flex bg-muted rounded-lg p-1">
                <Button
                  variant={activeTab === 'active' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('active')}
                  className="text-xs sm:text-sm"
                >
                  Active: {orders?.filter(o => o.status !== "completed" && o.status !== "cancelled" && !(o.paymentStatus === 'pending' && o.status === 'pending')).length || 0}
                </Button>
                <Button
                  variant={activeTab === 'canceled' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('canceled')}
                  className="text-xs sm:text-sm"
                >
                  Canceled: {canceledOrders?.length || 0}
                </Button>
              </div>
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" title="Live updates" />
            </div>
          </div>
        </div>

        {(activeTab === 'active' ? isLoading : isLoadingCanceled) ? (
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
                className={`overflow-hidden border-2 ${activeTab === 'canceled' ? 'border-red-200 bg-red-50' : ''}`}
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
                    {(order.orderItems || []).map((item: any) => {
                      // Get item name with proper fallback handling
                      const itemName = (item.menuItem?.name && typeof item.menuItem.name === 'string' && item.menuItem.name.trim()) 
                        || (item.menuItemName && typeof item.menuItemName === 'string' && item.menuItemName.trim())
                        || 'Unknown Item';
                      
                      return (
                      <div key={item.id} className="flex justify-between gap-2 sm:gap-3" data-testid={`order-item-${item.id}`}>
                        <div className="flex-1">
                          <div className="font-semibold text-base sm:text-lg">
                            {item.quantity}x {itemName}
                          </div>
                          {item.specialInstructions && (
                            <div className="text-xs sm:text-sm text-muted-foreground italic mt-1">
                              Note: {item.specialInstructions}
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  {order.notes && (
                    <div className="pt-2 sm:pt-3 border-t">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        <span className="font-semibold">Notes:</span> {order.notes}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 sm:pt-3 border-t">
                    <div className="flex gap-2">
                      {order.status === "pending" && (
                        <Button
                          className="flex-1 text-sm sm:text-base"
                          size="lg"
                          onClick={() => updateStatusMutation.mutate({ orderId: String(order.id), status: "preparing" })}
                          disabled={updatingOrderId === String(order.id)}
                          data-testid={`button-start-${order.id}`}
                        >
                          {updatingOrderId === String(order.id) ? "Updating..." : "Start Preparing"}
                        </Button>
                      )}
                      {order.status === "preparing" && (
                        <Button
                          className="flex-1 text-sm sm:text-base"
                          size="lg"
                          onClick={() => updateStatusMutation.mutate({ orderId: String(order.id), status: "ready" })}
                          disabled={updatingOrderId === String(order.id)}
                          data-testid={`button-ready-${order.id}`}
                        >
                          {updatingOrderId === String(order.id) ? "Updating..." : "Mark as Ready"}
                        </Button>
                      )}
                      {order.status === "ready" && (
                        <Button
                          className="flex-1 text-sm sm:text-base"
                          size="lg"
                          variant="secondary"
                          onClick={() => updateStatusMutation.mutate({ orderId: String(order.id), status: "completed" })}
                          disabled={updatingOrderId === String(order.id)}
                          data-testid={`button-complete-${order.id}`}
                        >
                          {updatingOrderId === String(order.id) ? "Updating..." : "Collected ✅"}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 flex items-center justify-center gap-2"
                        onClick={() => handlePrintPreview(order)}
                      >
                        <Printer className="w-4 h-4" />
                        Print Ticket
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 sm:py-20 md:py-24">
            <ChefHat className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto text-muted-foreground mb-4 sm:mb-6" />
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">
              {activeTab === 'active' ? 'No Active Orders' : 'No Canceled Orders Today'}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {activeTab === 'active' 
                ? 'New orders will appear here automatically' 
                : 'Canceled orders for today will appear here'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}