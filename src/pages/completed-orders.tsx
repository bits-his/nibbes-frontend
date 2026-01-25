import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Eye, CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function CompletedOrders() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
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
      console.log("Completed Orders WebSocket connected");
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
        queryClient.invalidateQueries({ queryKey: ["/api/orders/completed"] });
      }
    };

    socket.onerror = (error) => {
      console.error("Completed Orders WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("Completed Orders WebSocket disconnected");
    };

    // Cleanup function to close the WebSocket connection
    return () => {
      socket.close();
    };
  }, []);

  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders/completed", dateRange.from?.toDateString(), dateRange.to?.toDateString()],
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

        console.log(`📅 Frontend fetching completed orders from ${fromDate.toISOString()} to ${toDate.toISOString()}`);
      }

      const queryString = params.toString();
      const url = queryString ? `/api/orders/completed?${queryString}` : '/api/orders/completed';

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

  const filteredOrders = orders?.filter((order) => {
    const matchesSearch =
      order.orderNumber.toString().includes(searchQuery) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());

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

    return matchesSearch && matchesDateRange;
  });

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      preparing: "bg-orange-100 text-orange-800 border-orange-200",
      ready: "bg-blue-100 text-blue-800 border-blue-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    };

    const config = statusColors[status] || "bg-gray-100 text-gray-800 border-gray-200";

    return (
      <Badge variant="outline" className={`border ${config}`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Archived Orders</h1>
          <p className="text-gray-600">
            Completed orders that have been fulfilled
          </p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-lg text-gray-700">
            Showing <span className="font-semibold text-gray-900">{filteredOrders?.length || 0}</span> completed order{filteredOrders?.length !== 1 ? 's' : ''}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full sm:w-64"
                data-testid="input-search"
              />
            </div>

            {/* Date Range Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-range"
                  variant="outline"
                  className={cn(
                    "w-full sm:w-auto justify-start text-left font-normal px-4 py-2",
                    !dateRange.from && "text-gray-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from && dateRange.to ? (
                    (dateRange.from.toDateString() === new Date().toDateString() &&
                     dateRange.to.toDateString() === new Date().toDateString()) ? (
                      <span>Today</span>
                    ) : (
                      <>
                        {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, y")}
                      </>
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
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
                      setDateRange({
                        from: range.from || null,
                        to: range.to || range.from || null
                      });
                    } else {
                      setDateRange({ from: null, to: null });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Orders List - Using a modern card-based design */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-1/4 mt-4"></div>
                </div>
              ))}
            </div>
          ) : filteredOrders && filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="text-lg font-semibold text-gray-900">#{order.orderNumber}</span>
                      {getStatusBadge(order.status)}
                      <Badge variant="outline" className="text-xs capitalize">
                        {order.orderType}
                      </Badge>
                    </div>
                    <div className="text-gray-700 font-medium mb-1">{order.customerName}</div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span>{order.orderItems.length} item{order.orderItems.length !== 1 ? 's' : ''}</span>
                      <span>₦{parseFloat(order.totalAmount).toLocaleString()}</span>
                      <span>{format(new Date(order.createdAt), "MMM dd, HH:mm")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                      }}
                      data-testid={`button-view-${order.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-gray-100 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No completed orders</h3>
              <p className="text-gray-500">Orders that have been completed will appear here.</p>
            </div>
          )}
        </div>
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