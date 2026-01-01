import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, Filter, Eye, CalendarIcon, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OrderWithItems } from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";

export default function OrderManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ 
    from: new Date(new Date().setHours(0, 0, 0, 0)),  // Start of today
    to: new Date(new Date().setHours(23, 59, 59, 999))   // End of today
  });
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("Order Management WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (
        data.type === "order_update" || 
        data.type === "new_order" || 
        data.type === "order_status_change" ||
        data.type === "menu_item_update"
      ) {
        // Refresh orders data when there are changes
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      }
    };

    socket.onerror = (error) => {
      console.error("Order Management WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("Order Management WebSocket disconnected");
    };

    // Cleanup function to close the WebSocket connection
    return () => {
      socket.close();
    };
  }, []);

  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders", dateRange.from?.toDateString(), dateRange.to?.toDateString()],
    queryFn: async () => {
      // Build query parameters with proper date range (start of from date to end of to date)
      const params = new URLSearchParams();
      if (dateRange.from) {
        // Set time to start of the day (00:00:00)
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        params.append('from', fromDate.toISOString());

        // If no 'to' date is set, use the same date as 'from' (single day selection)
        const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
        toDate.setHours(23, 59, 59, 999);
        params.append('to', toDate.toISOString());

        console.log(`📅 Frontend fetching orders from ${fromDate.toISOString()} to ${toDate.toISOString()}`);
      }

      const queryString = params.toString();
      const url = queryString ? `/api/orders?${queryString}` : '/api/orders';

      const response = await apiRequest("GET", url);
      return await response.json();
    },
  });

  const { data: stats } = useQuery<{
    todayOrders: number;
    todayRevenue: number;
    pendingOrders: number;
    completedOrders: number;
  }>({
    queryKey: ["/api/orders/stats", dateRange.from?.toDateString(), dateRange.to?.toDateString()],
    queryFn: async () => {
      // Build query parameters with proper date range (start of from date to end of to date)
      const params = new URLSearchParams();
      if (dateRange.from) {
        // Set time to start of the day (00:00:00)
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        params.append('from', fromDate.toISOString());

        // If no 'to' date is set, use the same date as 'from' (single day selection)
        const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
        toDate.setHours(23, 59, 59, 999);
        params.append('to', toDate.toISOString());
      }

      const queryString = params.toString();
      const url = queryString ? `/api/orders/stats?${queryString}` : '/api/orders/stats';

      const response = await apiRequest("GET", url);
      return await response.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/stats"] });
      toast({
        title: "Success",
        description: "Order status updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    },
  });

  const filteredOrders = orders?.filter((order) => {
    const matchesSearch =
      order.orderNumber.toString().includes(searchQuery) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    // Filter by date range if dates are selected
    const orderDate = new Date(order.createdAt);
    
    // Convert order date to start of day for comparison
    const orderStartOfDay = new Date(orderDate);
    orderStartOfDay.setHours(0, 0, 0, 0);
    
    // Convert date range dates to start/end of day for comparison
    const rangeStartOfDay = dateRange.from ? new Date(dateRange.from) : null;
    if (rangeStartOfDay) rangeStartOfDay.setHours(0, 0, 0, 0);
    
    const rangeEndOfDay = dateRange.to ? new Date(dateRange.to) : null;
    if (rangeEndOfDay) rangeEndOfDay.setHours(23, 59, 59, 999);

    const matchesDateRange = 
      (!rangeStartOfDay || orderStartOfDay >= rangeStartOfDay) && 
      (!rangeEndOfDay || orderStartOfDay <= rangeEndOfDay);

    return matchesSearch && matchesStatus && matchesDateRange;
  });

const getStatusBadge = (status: string) => {
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-200 capitalize text-yellow-800",
    preparing: "bg-orange-200 capitalize text-orange-800",
    ready: " capitalize",
    completed: "bg-red-200 capitalize text-red-800",
    cancelled: "bg-black-200 capitalize text-black-800",
  };

  const config = statusColors[status] || "bg-black-200 text-black-800";

  return (
    <Badge variant="default" className={config}>
      {status}
    </Badge>
  );
};

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <h1 className="font-serif text-4xl font-bold mb-8">Order Management</h1>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Today's Orders</div>
              <div className="text-3xl font-bold" data-testid="stat-today-orders">
                {stats?.todayOrders || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Revenue</div>
              <div className="text-3xl font-bold" data-testid="stat-revenue">
                ₦{(stats?.todayRevenue || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Pending</div>
              <div className="text-3xl font-bold" data-testid="stat-pending">
                {stats?.pendingOrders || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Completed</div>
              <div className="text-3xl font-bold" data-testid="stat-completed">
                {stats?.completedOrders || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order number or customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Date Range Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-range"
                    variant="outline"
                    className={cn(
                      "w-full md:w-[280px] justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from && dateRange.to ? (
                      // Check if it's showing today's data (default)
                      (dateRange.from.toDateString() === new Date().toDateString() && 
                       dateRange.to.toDateString() === new Date().toDateString()) ? (
                        <span>Today</span>
                      ) : (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3 border-b">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const today = new Date();
                        setDateRange({
                          from: new Date(today.setHours(0, 0, 0, 0)),
                          to: new Date(today.setHours(23, 59, 59, 999))
                        });
                      }}
                    >
                      Reset to Today
                    </Button>
                  </div>
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from || undefined}
                    selected={{
                      from: dateRange.from || undefined,
                      to: dateRange.to || undefined
                    }}
                    onSelect={(range) => {
                      if (range) {
                        // If range is provided (even if same date for both from and to)
                        setDateRange({
                          from: range.from || null,
                          to: range.to || range.from || null
                        });
                      } else {
                        // If range is null/undefined (user cleared selection)
                        setDateRange({ from: null, to: null });
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : filteredOrders && filteredOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="p-4 font-semibold">Order #</th>
                      <th className="p-4 font-semibold">Customer</th>
                      <th className="p-4 font-semibold">Type</th>
                      <th className="p-4 font-semibold">Items</th>
                      <th className="p-4 font-semibold">Total</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold">Time</th>
                      <th className="p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b hover-elevate"
                        data-testid={`row-order-${order.id}`}
                      >
                        <td className="p-4 font-medium" data-testid={`text-order-number-${order.id}`}>
                          #{order.orderNumber}
                        </td>
                        <td className="p-4">{order.customerName}</td>
                        <td className="p-4">
                          <Badge variant="outline">{order.orderType}</Badge>
                        </td>
                        <td className="p-4">{order.orderItems.length}</td>
                        <td className="p-4 font-semibold">
                          ₦{parseFloat(order.totalAmount).toLocaleString()}
                        </td>
                        <td className="p-4">{getStatusBadge(order.status)}</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {format(new Date(order.createdAt), "MMM dd, HH:mm")}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setSelectedOrder(order)}
                              data-testid={`button-view-${order.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                // Prepare order data for PDF preview
                                const orderData = {
                                  orderNumber: order.orderNumber,
                                  createdAt: order.createdAt,
                                  customerName: order.customerName,
                                  items: order.orderItems.map(item => ({
                                    name: item.menuItem.name,
                                    quantity: item.quantity,
                                    price: item.price,
                                    specialInstructions: item.specialInstructions
                                  })),
                                  total: parseFloat(order.totalAmount),
                                  paymentMethod: order.paymentMethod || 'N/A',
                                  tendered: parseFloat(order.totalAmount)
                                };
                                // Open receipt in new tab
                                const receiptUrl = `/print-receipt?order_id=${order.id}&order_number=${order.orderNumber}&type=order_management`;
                                window.open(receiptUrl, '_blank');
                              }}
                              data-testid={`button-print-${order.id}`}
                              title="Print Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Select
                              value={order.status}
                              onValueChange={(status) =>
                                updateStatusMutation.mutate({ orderId: String(order.id), status })
                              }
                            >
                              <SelectTrigger className="w-32" data-testid={`select-status-${order.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="preparing">Preparing</SelectItem>
                                <SelectItem value="ready">Ready</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                No orders found
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-order-details">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Customer</div>
                  <div className="font-medium">{selectedOrder.customerName}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="font-medium">{selectedOrder.customerPhone || "N/A"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Order Type</div>
                  <div className="font-medium">{selectedOrder.orderType}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div>{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Payment Method</div>
                  <div className="font-medium">{selectedOrder.paymentMethod || "N/A"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Payment Status</div>
                  <div className="font-medium">{selectedOrder.paymentStatus}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <div className="font-medium">
                          {item.quantity}x {item.menuItem.name}
                        </div>
                        {item.specialInstructions && (
                          <div className="text-sm text-muted-foreground italic">
                            {item.specialInstructions}
                          </div>
                        )}
                      </div>
                      <div className="font-semibold">
                        ₦{(parseFloat(item.price) * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-lg pt-4 border-t">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-2xl">
                  ₦{parseFloat(selectedOrder.totalAmount).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
