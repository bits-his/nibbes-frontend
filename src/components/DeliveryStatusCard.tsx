import { useQuery } from "@tanstack/react-query";
import { Package, MapPin, Clock, CheckCircle, Truck, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";

interface DeliveryStatusCardProps {
  trackingNumber?: string | null;
  requestNumber?: string | null;
  orderType: string;
}

interface DeliveryStatusData {
  id: string;
  requestNumber: string;
  trackingNumber: string;
  status: string;
  deliveryFee: number;
  currency: string;
  pickupAddress: {
    fullAddress: string;
    city: string;
    state: string;
    country: string;
  };
  deliveryAddress: {
    fullAddress: string;
    city: string;
    state: string;
    country: string;
  };
  packageDescription: string;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    notes?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case "in_transit":
    case "in transit":
      return <Truck className="w-4 h-4 text-blue-500" />;
    case "delivered":
    case "completed":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "cancelled":
    case "failed":
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Package className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "in_transit":
    case "in transit":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "delivered":
    case "completed":
      return "bg-green-100 text-green-800 border-green-300";
    case "cancelled":
    case "failed":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

const formatStatus = (status: string) => {
  return status
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export function DeliveryStatusCard({ trackingNumber, requestNumber, orderType }: DeliveryStatusCardProps) {
  // Show for delivery/online orders with tracking info
  // Note: Frontend sends 'online' for delivery orders, backend may use 'delivery' or 'online'
  const isDeliveryOrder = orderType === "delivery" || orderType === "online";
  const hasTrackingInfo = trackingNumber || requestNumber;
  
  if (!isDeliveryOrder || !hasTrackingInfo) {
    return null;
  }

  // Determine polling interval based on status
  const getPollingInterval = (status?: string) => {
    if (!status) return 30000; // 30 seconds for unknown status
    const statusLower = status.toLowerCase();
    if (statusLower === "pending" || statusLower === "in_transit" || statusLower === "in transit") {
      return 30000; // 30 seconds for active deliveries
    }
    if (statusLower === "delivered" || statusLower === "completed") {
      return 300000; // 5 minutes for completed
    }
    return false; // Don't poll for cancelled/failed
  };

  const { data, isLoading, error } = useQuery<{ success: boolean; data: DeliveryStatusData }>({
    queryKey: ["/api/delivery/status", trackingNumber || requestNumber],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (trackingNumber) params.append("trackingNumber", trackingNumber);
      if (requestNumber) params.append("requestNumber", requestNumber);
      
      const response = await apiRequest("GET", `/api/delivery/status?${params.toString()}`);
      return response.json();
    },
    enabled: !!(trackingNumber || requestNumber),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      return getPollingInterval(status);
    },
    retry: 2,
    retryDelay: 1000,
  });

  if (isLoading) {
    return (
      <Card className="mt-4 border-2 border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 animate-pulse text-blue-500" />
            <span className="text-sm text-muted-foreground">Loading delivery status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.success || !data.data) {
    return (
      <Card className="mt-4 border-2 border-gray-200 bg-gray-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>Delivery status unavailable</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const deliveryData = data.data;
  const currentStatus = deliveryData.status;

  return (
    <Card className="mt-4 border-2 border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>Delivery Status</span>
          </div>
          <Badge className={`${getStatusBadgeColor(currentStatus)} border`}>
            <div className="flex items-center gap-1">
              {getStatusIcon(currentStatus)}
              <span className="text-xs font-semibold">{formatStatus(currentStatus)}</span>
            </div>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tracking Info */}
        <div className="space-y-1 text-sm">
          {deliveryData.trackingNumber && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">Tracking:</span>
              <span className="font-mono text-xs">{deliveryData.trackingNumber}</span>
            </div>
          )}
          {deliveryData.requestNumber && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">Request:</span>
              <span className="font-mono text-xs">{deliveryData.requestNumber}</span>
            </div>
          )}
        </div>

        {/* Addresses */}
        <div className="space-y-2 text-sm">
          {deliveryData.pickupAddress && (
            <div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-muted-foreground text-xs">Pickup:</div>
                  <div className="text-xs">{deliveryData.pickupAddress.fullAddress}</div>
                </div>
              </div>
            </div>
          )}
          {deliveryData.deliveryAddress && (
            <div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-muted-foreground text-xs">Delivery:</div>
                  <div className="text-xs">{deliveryData.deliveryAddress.fullAddress}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status History */}
        {deliveryData.statusHistory && deliveryData.statusHistory.length > 0 && (
          <div className="space-y-2">
            <div className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Status History</span>
            </div>
            <div className="space-y-2 pl-6 border-l-2 border-blue-200">
              {deliveryData.statusHistory.map((historyItem, index) => (
                <div key={index} className="relative">
                  <div className="absolute -left-[1.625rem] top-1 w-3 h-3 rounded-full bg-blue-400 border-2 border-white" />
                  <div className="text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(historyItem.status)}
                      <span className="font-semibold">{formatStatus(historyItem.status)}</span>
                    </div>
                    <div className="text-muted-foreground mb-1">
                      {formatDistanceToNow(new Date(historyItem.timestamp), { addSuffix: true })}
                    </div>
                    {historyItem.notes && (
                      <div className="text-muted-foreground italic text-xs">
                        {historyItem.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Last updated: {formatDistanceToNow(new Date(deliveryData.updatedAt), { addSuffix: true })}
        </div>
      </CardContent>
    </Card>
  );
}

