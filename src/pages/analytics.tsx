import React, { useState, useEffect } from 'react';
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

// Mock data types
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

// Mock data
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dateRange, setDateRange] = useState('7');
  const [loading, setLoading] = useState(true);
  const [drillDownModal, setDrillDownModal] = useState({
    isOpen: false,
    title: '',
    dataType: 'top-items' as 'top-items' | 'sales-trends' | 'payment-breakdown' | 'customer-analytics' | 'inventory',
    data: [],
    columns: []
  });

  // Mock fetch dashboard data
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockData: DashboardData = {
        kpis: {
          revenue: '15420.50',
          orders: 127,
          avgOrderValue: '121.42',
          profitEstimate: '4626.15'
        },
        charts: {
          paymentMethods: {
            'Cash': 45,
            'Interswitch': 67,
            'POS': 15
          },
          topItems: [
            { name: 'Jollof Rice', quantity: 89, revenue: 8900 },
            { name: 'Fried Rice', quantity: 76, revenue: 7600 },
            { name: 'Chicken Platter', quantity: 65, revenue: 9750 },
            { name: 'Beef Pepper Soup', quantity: 54, revenue: 4320 },
            { name: 'Plantain', quantity: 120, revenue: 2400 }
          ]
        },
        inventory: {
          totalItems: 24,
          lowStockItems: [
            { name: 'Rice', quantity: 3, minThreshold: 5 },
            { name: 'Chicken', quantity: 2, minThreshold: 4 },
            { name: 'Beef', quantity: 1, minThreshold: 3 },
            { name: 'Palm Oil', quantity: 0, minThreshold: 2 }
          ]
        }
      };
      setDashboardData(mockData);
      setLoading(false);
    }, 1000);
  }, [dateRange]);

  const openDrillDown = (dataType: 'top-items' | 'sales-trends' | 'payment-breakdown' | 'customer-analytics' | 'inventory', title: string) => {
    let data = [];
    let columns = [];

    switch(dataType) {
      case 'top-items':
        data = [
          { name: 'Jollof Rice', quantity: 89, revenue: 8900, avgOrderValue: 100, category: 'Rice' },
          { name: 'Fried Rice', quantity: 76, revenue: 7600, avgOrderValue: 100, category: 'Rice' },
          { name: 'Chicken Platter', quantity: 65, revenue: 9750, avgOrderValue: 150, category: 'Protein' },
          { name: 'Beef Pepper Soup', quantity: 54, revenue: 4320, avgOrderValue: 80, category: 'Soup' },
          { name: 'Plantain', quantity: 120, revenue: 2400, avgOrderValue: 20, category: 'Side' },
          { name: 'Grilled Chicken', quantity: 45, revenue: 6750, avgOrderValue: 150, category: 'Protein' },
          { name: 'Fish Pepper Soup', quantity: 38, revenue: 3800, avgOrderValue: 100, category: 'Soup' },
          { name: 'Eba', quantity: 92, revenue: 4600, avgOrderValue: 50, category: 'Swallow' },
        ];
        columns = [
          { key: 'name', label: 'Item Name' },
          { key: 'quantity', label: 'Quantity Sold' },
          { key: 'revenue', label: 'Revenue (₦)' },
          { key: 'avgOrderValue', label: 'Avg. Order Value (₦)' },
          { key: 'category', label: 'Category' },
        ];
        break;
      case 'sales-trends':
        data = [
          { date: '2025-10-01', revenue: 45000, orders: 25, avgOrderValue: 1800 },
          { date: '2025-10-02', revenue: 52000, orders: 28, avgOrderValue: 1857 },
          { date: '2025-10-03', revenue: 48000, orders: 26, avgOrderValue: 1846 },
          { date: '2025-10-04', revenue: 61000, orders: 32, avgOrderValue: 1906 },
          { date: '2025-10-05', revenue: 70000, orders: 38, avgOrderValue: 1842 },
          { date: '2025-10-06', revenue: 58000, orders: 30, avgOrderValue: 1933 },
          { date: '2025-10-07', revenue: 65000, orders: 35, avgOrderValue: 1857 },
        ];
        columns = [
          { key: 'date', label: 'Date' },
          { key: 'revenue', label: 'Revenue (₦)' },
          { key: 'orders', label: 'Number of Orders' },
          { key: 'avgOrderValue', label: 'Avg. Order Value (₦)' },
        ];
        break;
      case 'payment-breakdown':
        data = [
          { method: 'Cash', count: 45, amount: 90000, percentage: 27.3 },
          { method: 'Interswitch', count: 67, amount: 134000, percentage: 40.6 },
          { method: 'POS', count: 15, amount: 30000, percentage: 9.1 },
          { method: 'Mobile Money', count: 8, amount: 16000, percentage: 4.8 },
          { method: 'Bank Transfer', count: 12, amount: 24000, percentage: 7.3 },
          { method: 'Credit Card', count: 7, amount: 14000, percentage: 4.2 },
        ];
        columns = [
          { key: 'method', label: 'Payment Method' },
          { key: 'count', label: 'Transaction Count' },
          { key: 'amount', label: 'Total Amount (₦)' },
          { key: 'percentage', label: 'Percentage (%)', render: (value: number) => `${value.toFixed(1)}%` },
        ];
        break;
      case 'inventory':
        data = [
          { name: 'Rice', quantity: 3, minThreshold: 5, unit: 'kg', category: 'Grains', supplier: 'Golden Farms', pricePerUnit: 1200 },
          { name: 'Chicken', quantity: 2, minThreshold: 4, unit: 'kg', category: 'Meat', supplier: 'Farm Fresh', pricePerUnit: 2500 },
          { name: 'Beef', quantity: 1, minThreshold: 3, unit: 'kg', category: 'Meat', supplier: 'Premium Meats', pricePerUnit: 3000 },
          { name: 'Palm Oil', quantity: 0, minThreshold: 2, unit: 'liters', category: 'Oil', supplier: 'Nigerian Oil', pricePerUnit: 1800 },
          { name: 'Onions', quantity: 15, minThreshold: 5, unit: 'kg', category: 'Vegetables', supplier: 'Green Valley', pricePerUnit: 400 },
          { name: 'Tomatoes', quantity: 8, minThreshold: 10, unit: 'kg', category: 'Vegetables', supplier: 'Market Vendor', pricePerUnit: 300 },
        ];
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
        data = [
          { name: 'John Doe', email: 'john@example.com', orders: 25, spent: 45000, lastOrder: '2025-10-29', frequency: 3.2 },
          { name: 'Jane Smith', email: 'jane@example.com', orders: 18, spent: 32000, lastOrder: '2025-10-28', frequency: 2.1 },
          { name: 'Mike Johnson', email: 'mike@example.com', orders: 12, spent: 15000, lastOrder: '2025-10-27', frequency: 1.5 },
          { name: 'Sarah Williams', email: 'sarah@example.com', orders: 10, spent: 12000, lastOrder: '2025-10-26', frequency: 1.2 },
          { name: 'David Brown', email: 'david@example.com', orders: 8, spent: 9800, lastOrder: '2025-10-25', frequency: 0.9 },
        ];
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
      data,
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
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                      <TableRow key={index}>
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
        data={drillDownModal.data}
        columns={drillDownModal.columns}
      />
    </div>
  );
}