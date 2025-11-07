import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import DrillDownModal from '@/components/drill-down-modal';


interface WebSocketMessage {
  event: string;
  data: any;
}

// Data types
interface KPIData {
  revenue: string;
  orders: number;
  avgOrderValue: string;
  profitEstimate: string;
}

interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface PaymentMethodData {
  [key: string]: number;
}

interface InventoryData {
  totalItems: number;
  lowStockItems: Array<{
    name: string;
    quantity: number;
    minThreshold: number;
  }>;
}

interface DashboardData {
  kpis: KPIData;
  charts: {
    paymentMethods: PaymentMethodData;
    topItems: TopItem[];
  };
  inventory: InventoryData;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drillDownModal, setDrillDownModal] = useState<{
    isOpen: boolean;
    title: string;
    dataType: 'top-items' | 'sales-trends' | 'payment-breakdown' | 'customer-analytics' | 'inventory';
    columns: { key: string; label: string; render?: (value: any) => React.ReactNode }[];
  }>({
    isOpen: false,
    title: '',
    dataType: 'top-items',
    columns: []
  });

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let from = new Date();
    
    switch(dateRange) {
      case '7':
        from.setDate(now.getDate() - 7);
        break;
      case '30':
        from.setDate(now.getDate() - 30);
        break;
      case '90':
        from.setDate(now.getDate() - 90);
        break;
      case '365':
        from.setDate(now.getDate() - 365);
        break;
      default:
        from.setDate(now.getDate() - 30);
        break;
    }
    
    return {
      from: from.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0]
    };
  };

  // WebSocket for real-time updates
  const wsRef = useRef<WebSocket | null>(null);
  
  // Fetch dashboard data from API and set up WebSocket
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { from, to } = getDateRange();
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://server.brainstorm.ng/nibbleskitchen';
        const response = await fetch(`${BACKEND_URL}/api/analytics/dashboard?from=${from}&to=${to}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`API call failed: ${response.status}`);
        }
        
        const result = await response.json();
        setDashboardData(result.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // Connect to WebSocket
    const connectWebSocket = () => {
      try {
        const wsUrl = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';
        
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
          console.log('Analytics WebSocket connected');
        };
        
        wsRef.current.onmessage = (event) => {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch(message.event) {
            case 'analytics-update':
              setDashboardData(message.data.dashboardData);
              break;
            case 'sales-change':
              // Update sales-related data
              setDashboardData(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  kpis: {
                    ...prev.kpis,
                    revenue: message.data.newRevenue,
                    orders: message.data.newOrderCount,
                    avgOrderValue: message.data.newAvgOrderValue
                  }
                };
              });
              break;
            case 'inventory-change':
              // Update inventory data
              setDashboardData(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  inventory: message.data.inventory
                };
              });
              break;
            default:
              console.log('Received unknown event:', message.event);
          }
        };
        
        wsRef.current.onclose = () => {
          console.log('Analytics WebSocket disconnected');
          // Attempt to reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };
        
        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
      }
    };

    fetchData();
    connectWebSocket();

    // Cleanup function
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [dateRange]);

  const openDrillDown = (dataType: 'top-items' | 'sales-trends' | 'payment-breakdown' | 'customer-analytics' | 'inventory', title: string) => {
    // Define columns for different data types
    let columns = [];

    switch(dataType) {
      case 'top-items':
        columns = [
          { key: 'name', label: 'Item Name' },
          { key: 'quantity', label: 'Quantity Sold' },
          { key: 'revenue', label: 'Revenue (₦)' },
          { key: 'avgOrderValue', label: 'Avg. Order Value (₦)' },
          { key: 'category', label: 'Category' },
        ];
        break;
      case 'sales-trends':
        columns = [
          { key: 'date', label: 'Date' },
          { key: 'revenue', label: 'Revenue (₦)' },
          { key: 'orders', label: 'Number of Orders' },
          { key: 'avgOrderValue', label: 'Avg. Order Value (₦)' },
        ];
        break;
      case 'payment-breakdown':
        columns = [
          { key: 'method', label: 'Payment Method' },
          { key: 'count', label: 'Transaction Count' },
          { key: 'amount', label: 'Total Amount (₦)' },
          { key: 'percentage', label: 'Percentage (%)', render: (value: number) => `${(Number(value) || 0).toFixed(1)}%` },
        ];
        break;
      case 'inventory':
        columns = [
          { key: 'name', label: 'Item Name' },
          { key: 'quantity', label: 'Current Stock' },
          { key: 'minThreshold', label: 'Min Threshold' },
          { key: 'unit', label: 'Unit' },
          { key: 'category', label: 'Category' },
          { key: 'supplier', label: 'Supplier' },
          { key: 'pricePerUnit', label: 'Price/Unit (₦)' },
        ];
        break;
      case 'customer-analytics':
        columns = [
          { key: 'name', label: 'Customer Name' },
          { key: 'email', label: 'Email' },
          { key: 'orders', label: 'Total Orders' },
          { key: 'spent', label: 'Total Spent (₦)' },
          { key: 'lastOrder', label: 'Last Order Date' },
          { key: 'frequency', label: 'Order Freq. (per month)' },
        ];
        break;
    }

    setDrillDownModal({
      isOpen: true,
      title,
      dataType,
      columns
    });
  };

  // Prepare data for charts
  const paymentMethodData = dashboardData ? Object.entries(dashboardData.charts.paymentMethods).map(([name, value]) => ({
    name,
    value
  })) : [];

  const topItemsData = dashboardData ? dashboardData.charts.topItems : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
        <div className="flex items-center space-x-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">Export Report</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p>Loading analytics...</p>
        </div>
      ) : dashboardData ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₦{dashboardData.kpis.revenue}</div>
                <p className="text-xs text-muted-foreground">+20.1% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.kpis.orders}</div>
                <p className="text-xs text-muted-foreground">+18.4% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₦{dashboardData.kpis.avgOrderValue}</div>
                <p className="text-xs text-muted-foreground">+2.1% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profit Estimate</CardTitle>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₦{dashboardData.kpis.profitEstimate}</div>
                <p className="text-xs text-muted-foreground">+12.8% from last month</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Trend Chart */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDrillDown('sales-trends', 'Sales Trend Analysis')}>
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={[
                      { name: 'Jan', revenue: 4000 },
                      { name: 'Feb', revenue: 3000 },
                      { name: 'Mar', revenue: 2000 },
                      { name: 'Apr', revenue: 2780 },
                      { name: 'May', revenue: 1890 },
                      { name: 'Jun', revenue: 2390 },
                      { name: 'Jul', revenue: 3490 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₦${value}`, 'Revenue']} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Methods Chart */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDrillDown('payment-breakdown', 'Payment Methods Breakdown')}>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(Number(percent) * 100 || 0).toFixed(0)}%`}
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} orders`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Items and Inventory Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Items */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDrillDown('top-items', 'Top Selling Items Analysis')}>
              <CardHeader>
                <CardTitle>Top Selling Items</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={topItemsData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₦${value}`, 'Revenue']} />
                    <Legend />
                    <Bar dataKey="quantity" fill="#8884d8" name="Quantity" />
                    <Bar dataKey="revenue" fill="#82ca9d" name="Revenue (₦)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDrillDown('inventory', 'Inventory Details')}>
              <CardHeader>
                <CardTitle>Inventory Alert</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Min Threshold</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.inventory.lowStockItems.map((item, index) => (
                      <TableRow key={`${item.name}-${index}`}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.minThreshold}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            item.quantity === 0 
                              ? 'bg-red-100 text-red-800' 
                              : item.quantity <= item.minThreshold
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {item.quantity === 0 
                              ? 'Out of Stock' 
                              : item.quantity <= item.minThreshold
                              ? 'Low Stock'
                              : 'In Stock'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-10">
          <p>No analytics data available</p>
        </div>
      )}
      
      {/* Drill Down Modal */}
      <DrillDownModal
        isOpen={drillDownModal.isOpen}
        onClose={() => setDrillDownModal({...drillDownModal, isOpen: false})}
        title={drillDownModal.title}
        dataType={drillDownModal.dataType}
        columns={drillDownModal.columns}
      />
    </div>
  );
}