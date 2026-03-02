import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function ActivityLogs() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: today,
    to: endOfDay
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["/api/activity/logs", dateRange, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.from?.toISOString() || '',
        endDate: dateRange.to?.toISOString() || '',
        page: page.toString(),
        limit: '50'
      });
      const response = await apiRequest("GET", `/api/activity/logs?${params}`);
      const data = await response.json();
      console.log('📊 Activity logs data:', data);
      console.log('📊 First log sample:', data.logs?.[0]);
      return data;
    },
    enabled: !!dateRange.from && !!dateRange.to
  });

  const { data: suspicious } = useQuery({
    queryKey: ["/api/activity/logs/suspicious"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/activity/logs/suspicious");
      return await response.json();
    },
  });

  const handleExport = async () => {
    const params = new URLSearchParams({
      startDate: dateRange.from?.toISOString() || '',
      endDate: dateRange.to?.toISOString() || '',
      format: 'csv'
    });
    window.open(`/api/activity/logs/export?${params}`, '_blank');
  };

  const toggleOrder = (orderNum: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderNum)) {
      newExpanded.delete(orderNum);
    } else {
      newExpanded.add(orderNum);
    }
    setExpandedOrders(newExpanded);
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      order_created: 'bg-blue-100 text-blue-800 border-blue-200',
      order_cancelled: 'bg-red-100 text-red-800 border-red-200',
      order_completed: 'bg-green-100 text-green-800 border-green-200',
      order_refunded: 'bg-orange-100 text-orange-800 border-orange-200',
      order_status_changed: 'bg-purple-100 text-purple-800 border-purple-200',
      receipt_printed: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      payment_initiated: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      payment_success: 'bg-green-100 text-green-800 border-green-200',
      payment_failed: 'bg-red-100 text-red-800 border-red-200',
      payment_abandoned: 'bg-gray-100 text-gray-800 border-gray-200',
      manual_payment: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    return colors[action] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-4xl font-bold text-gray-900 mb-2">Activity Logs & Audit Trail</h1>
          <p className="text-gray-600">Complete transaction history and system activities</p>
        </div>

        {/* Suspicious Activity Alert */}
        {suspicious && (suspicious.multipleReceipts?.length > 0 || suspicious.manualPayments?.length > 0) && (
          <Card className="mb-6 border-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-5 h-5" />
                Suspicious Activities Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {suspicious.multipleReceipts?.length > 0 && (
                  <div className="text-sm">
                    <strong>{suspicious.multipleReceipts.length}</strong> orders with multiple receipt prints
                  </div>
                )}
                {suspicious.manualPayments?.length > 0 && (
                  <div className="text-sm">
                    <strong>{suspicious.manualPayments.length}</strong> manual payment entries
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Summary */}
        {logsData?.breakdown && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">Total Logs</div>
                    <div className="text-3xl font-bold text-gray-900">{logsData.total}</div>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">Activity Logs</div>
                    <div className="text-3xl font-bold text-green-600">{logsData.breakdown.activity}</div>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📝</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">Receipt Prints</div>
                    <div className="text-3xl font-bold text-purple-600">{logsData.breakdown.receipt}</div>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🖨️</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">Payment Logs</div>
                    <div className="text-3xl font-bold text-orange-600">{logsData.breakdown.payment}</div>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">💳</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6 shadow-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="text-xs font-semibold text-gray-700 mb-2 block uppercase tracking-wide">Search</label>
                <Input
                  placeholder="🔍 Search by order #, staff name, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-2 block uppercase tracking-wide">From Date & Time</label>
                <input
                  type="datetime-local"
                  value={dateRange.from ? format(dateRange.from, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value ? new Date(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-2 block uppercase tracking-wide">To Date & Time</label>
                <input
                  type="datetime-local"
                  value={dateRange.to ? format(dateRange.to, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value ? new Date(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {logsData?.total && `Showing ${logsData.logs?.length || 0} of ${logsData.total} logs`}
              </div>
              <Button onClick={handleExport} variant="outline" className="shadow-sm">
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-xl font-semibold text-gray-900">Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  // Group logs by order number
                  const groupedLogs = logsData?.logs
                    ?.filter((log: any) => {
                      if (!searchQuery) return true;
                      const search = searchQuery.toLowerCase();
                      return (
                        log.orderNumber?.toString().includes(search) ||
                        log.userName?.toLowerCase().includes(search) ||
                        log.description?.toLowerCase().includes(search) ||
                        log.actionType?.toLowerCase().includes(search)
                      );
                    })
                    ?.reduce((acc: any, log: any) => {
                      const orderNum = log.orderNumber || 'No Order';
                      if (!acc[orderNum]) {
                        acc[orderNum] = [];
                      }
                      acc[orderNum].push(log);
                      return acc;
                    }, {});

                  return Object.entries(groupedLogs || {}).map(([orderNum, logs]: [string, any]) => {
                    const isExpanded = expandedOrders.has(orderNum);
                    const firstLog = logs[0];
                    
                    return (
                      <div key={orderNum} className="border rounded-lg overflow-hidden shadow-sm">
                        <button
                          onClick={() => toggleOrder(orderNum)}
                          className="w-full bg-muted hover:bg-muted/80 px-4 py-3 border-b flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="text-left">
                              <h3 className="font-semibold text-lg">
                                {orderNum === 'No Order' ? '🔧 System Activities' : `📦 Order #${orderNum}`}
                              </h3>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-sm text-muted-foreground">{logs.length} activities</p>
                                {firstLog?.userName && (
                                  <span className="text-xs text-muted-foreground">
                                    Staff: {firstLog.userName}
                                  </span>
                                )}
                                {firstLog?.amount && (
                                  <span className="text-xs font-semibold text-green-600">
                                    ₦{parseFloat(firstLog.amount).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="ml-auto">
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </Badge>
                        </button>
                        
                        {isExpanded && (
                          <div className="divide-y bg-white">
                            {logs.map((log: any, index: number) => (
                              <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                                <div className="flex items-start gap-4">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <Badge className={getActionBadge(log.actionType)}>
                                        {log.actionType.replace(/_/g, ' ').toUpperCase()}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(log.createdAt), "MMM dd, yyyy • hh:mm:ss a")}
                                      </span>
                                    </div>
                                    
                                    <p className="text-sm font-medium text-gray-700">{log.description}</p>
                                    
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                      {log.userName && (
                                        <div className="flex items-center gap-1">
                                          <span className="font-medium">👤</span>
                                          <span>{log.userName}</span>
                                        </div>
                                      )}
                                      {log.userRole && (
                                        <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                                          <span className="capitalize">{log.userRole}</span>
                                        </div>
                                      )}
                                      {log.amount && (
                                        <div className="flex items-center gap-1">
                                          <span className="font-medium">💰</span>
                                          <span className="font-semibold text-green-600">
                                            ₦{parseFloat(log.amount).toLocaleString()}
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-blue-700">
                                        <span className="capitalize">{log.logType}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Pagination */}
            {logsData && logsData.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="py-2 px-4">
                  Page {page} of {logsData.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(logsData.totalPages, p + 1))}
                  disabled={page === logsData.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
