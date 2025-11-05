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
import { Badge } from "@/components/ui/badge";
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
  Cell,

} from 'recharts';
import {
  Calendar,
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  Target,
  Activity,
  Zap,
  AlertCircle
} from "lucide-react";

interface WebSocketMessage {
  event: string;
  data: any;
}

// Data types
interface CustomerSegment {
  customerEmail: string;
  customerName: string;
  totalOrders: number;
  totalSpent: string;
  avgOrderValue: string;
  lastOrderDate: string;
  firstOrderDate: string;
}

interface CustomerEngagement {
  dayOfWeek: number;
  hourOfDay: number;
  orderCount: number;
  totalRevenue: string;
}

interface CustomerLTV {
  customerEmail: string;
  customerName: string;
  totalOrders: number;
  totalSpent: string;
  avgOrderValue: string;
  estimatedLTV: string;
  lastOrderDate: string;
}

interface MenuRecommendation {
  item1: string;
  item2: string;
  frequency: number;
}

interface ActionableInsight {
  id: number;
  title: string;
  description: string;
  priority: string;
  action?: string;
}

interface CustomerOverviewData {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  churnRate: number;
  avgOrderFrequency: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

export default function CustomerAnalyticsDashboard() {
  const [customerOverview, setCustomerOverview] = useState<CustomerOverviewData | null>(null);
  const [customerSegments, setCustomerSegments] = useState<{highValue: CustomerSegment[], mediumValue: CustomerSegment[], lowValue: CustomerSegment[], newCustomers: CustomerSegment[]} | null>(null);
  const [engagementData, setEngagementData] = useState<CustomerEngagement[] | null>(null);
  const [ltvData, setLtvData] = useState<CustomerLTV[] | null>(null);
  const [recommendations, setRecommendations] = useState<MenuRecommendation[] | null>(null);
  const [insights, setInsights] = useState<ActionableInsight[] | null>(null);
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

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

  const wsRef = useRef<WebSocket | null>(null);
  
  // Fetch customer analytics data from API and set up WebSocket
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { from, to } = getDateRange();
        
        // Fetch all required data in parallel
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://server.brainstorm.ng/nibbleskitchen';
        const [overviewRes, segmentsRes, engagementRes, ltvRes, recommendationsRes, insightsRes] =
          await Promise.all([
            fetch(`${BACKEND_URL}/api/analytics/customers-stats?from=${from}&to=${to}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            }),
            fetch(`${BACKEND_URL}/api/analytics/customers/segments?from=${from}&to=${to}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            }),
            fetch(`${BACKEND_URL}/api/analytics/customers/engagement?from=${from}&to=${to}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            }),
            fetch(`${BACKEND_URL}/api/analytics/customers/ltv?from=${from}&to=${to}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            }),
            fetch(`${BACKEND_URL}/api/analytics/customers/recommendations?from=${from}&to=${to}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            }),
            fetch(`${BACKEND_URL}/api/analytics/customers/insights?from=${from}&to=${to}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            })
          ]);

        // Check responses
        if (!overviewRes.ok) throw new Error(`Overview API failed: ${overviewRes.status}`);
        if (!segmentsRes.ok) throw new Error(`Segments API failed: ${segmentsRes.status}`);
        if (!engagementRes.ok) throw new Error(`Engagement API failed: ${engagementRes.status}`);
        if (!ltvRes.ok) throw new Error(`LTV API failed: ${ltvRes.status}`);
        if (!recommendationsRes.ok) throw new Error(`Recommendations API failed: ${recommendationsRes.status}`);
        if (!insightsRes.ok) throw new Error(`Insights API failed: ${insightsRes.status}`);

        // Parse responses
        const overviewData = await overviewRes.json();
        const segmentsData = await segmentsRes.json();
        const engagementData = await engagementRes.json();
        const ltvData = await ltvRes.json();
        const recommendationsData = await recommendationsRes.json();
        const insightsData = await insightsRes.json();

        // Calculate overview metrics from insights data
        const overviewMetrics: CustomerOverviewData = {
          totalCustomers: segmentsData.data?.highValue?.length + 
                         segmentsData.data?.mediumValue?.length + 
                         segmentsData.data?.lowValue?.length + 
                         segmentsData.data?.newCustomers?.length || 0,
          newCustomers: segmentsData.data?.newCustomers?.length || 0,
          activeCustomers: segmentsData.data?.highValue?.length + 
                         segmentsData.data?.mediumValue?.length + 
                         segmentsData.data?.lowValue?.length || 0,
          churnRate: engagementData.data?.churnCount || 0,
          avgOrderFrequency: segmentsData.data?.highValue?.reduce((sum: number, cust: any) => sum + cust.totalOrders, 0) / 
                           (segmentsData.data?.highValue?.length || 1) || 0
        };

        setCustomerOverview(overviewMetrics);
        setCustomerSegments(segmentsData.data);
        setEngagementData(engagementData.data?.engagementHeatmap || []);
        setLtvData(ltvData.data);
        setRecommendations(recommendationsData.data?.frequentlyBoughtTogether || []);
        setInsights(insightsData.data);
      } catch (err) {
        console.error('Error fetching customer analytics data:', err);
        setError('Failed to load customer analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // Connect to WebSocket for real-time updates
    const connectWebSocket = () => {
      try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.hostname}:${window.location.port}/ws`;
        
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
          console.log('Customer Analytics WebSocket connected');
        };
        
        wsRef.current.onmessage = (event) => {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch(message.event) {
            case 'customer-analytics-update':
              // Reload all data when there's an update
              fetchAllData();
              break;
            case 'customer-order-updated':
            case 'customer-new-order':
              // Reload data when orders change
              fetchAllData();
              break;
            case 'customer-segment-changed':
              // Update segment data specifically
              // In a real app you would only update specific data but for now we'll reload everything
              fetchAllData();
              break;
            default:
              console.log('Received unknown event:', message.event);
          }
        };
        
        wsRef.current.onclose = () => {
          console.log('Customer Analytics WebSocket disconnected');
          // Attempt to reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };
        
        wsRef.current.onerror = (error) => {
          console.error('Customer Analytics WebSocket error:', error);
        };
      } catch (error) {
        console.error('Error connecting to Customer Analytics WebSocket:', error);
      }
    };

    fetchAllData();
    connectWebSocket();

    // Cleanup function
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [dateRange]);

  // Prepare engagement data for charts
  const prepareEngagementData = () => {
    if (!engagementData) return [];
    
    // Group engagement data by day of week
    const dayOfWeekCounts: Record<number, number> = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0};
    const dayOfWeekRevenue: Record<number, number> = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0};
    
    engagementData.forEach(dataPoint => {
      dayOfWeekCounts[dataPoint.dayOfWeek] += dataPoint.orderCount;
      dayOfWeekRevenue[dataPoint.dayOfWeek] += parseFloat(dataPoint.totalRevenue);
    });
    
    return Object.keys(dayOfWeekCounts).map(day => ({
      day: parseInt(day),
      dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][parseInt(day) - 1],
      orderCount: dayOfWeekCounts[parseInt(day)],
      revenue: dayOfWeekRevenue[parseInt(day)]
    }));
  };

  const engagementChartData = prepareEngagementData();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Analytics Dashboard</h1>
          <p className="text-gray-600">Deep insights into customer behavior and engagement</p>
        </div>
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

      {/* Navigation Tabs */}
      <div className="flex border-b">
        <Button
          variant={activeTab === 'overview' ? 'secondary' : 'ghost'}
          className="rounded-none border-b-2 border-transparent hover:border-transparent"
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </Button>
        <Button
          variant={activeTab === 'segments' ? 'secondary' : 'ghost'}
          className="rounded-none border-b-2 border-transparent hover:border-transparent"
          onClick={() => setActiveTab('segments')}
        >
          Customer Segments
        </Button>
        <Button
          variant={activeTab === 'engagement' ? 'secondary' : 'ghost'}
          className="rounded-none border-b-2 border-transparent hover:border-transparent"
          onClick={() => setActiveTab('engagement')}
        >
          Engagement & Behavior
        </Button>
        <Button
          variant={activeTab === 'ltv' ? 'secondary' : 'ghost'}
          className="rounded-none border-b-2 border-transparent hover:border-transparent"
          onClick={() => setActiveTab('ltv')}
        >
          LTV & Retention
        </Button>
        <Button
          variant={activeTab === 'recommendations' ? 'secondary' : 'ghost'}
          className="rounded-none border-b-2 border-transparent hover:border-transparent"
          onClick={() => setActiveTab('recommendations')}
        >
          Recommendations
        </Button>
        <Button
          variant={activeTab === 'insights' ? 'secondary' : 'ghost'}
          className="rounded-none border-b-2 border-transparent hover:border-transparent"
          onClick={() => setActiveTab('insights')}
        >
          Actionable Insights
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p>Loading customer analytics...</p>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && customerOverview && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{customerOverview.totalCustomers}</div>
                    <p className="text-xs text-muted-foreground">+12% from last month</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">New Customers</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{customerOverview.newCustomers}</div>
                    <p className="text-xs text-muted-foreground">+15% from last month</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{customerOverview.activeCustomers}</div>
                    <p className="text-xs text-muted-foreground">+8% from last month</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{customerOverview.churnRate}%</div>
                    <p className="text-xs text-muted-foreground">-2.1% from last month</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Order Freq.</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{customerOverview.avgOrderFrequency}</div>
                    <p className="text-xs text-muted-foreground">orders/month</p>
                  </CardContent>
                </Card>
              </div>

              {/* Engagement Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Engagement by Day of Week</CardTitle>
                  <p className="text-sm text-muted-foreground">Orders and revenue by day of week</p>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={engagementChartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="dayName" />
                        <YAxis yAxisId="left" orientation="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip formatter={(value, name) => {
                          if (name === 'orderCount') return [value, 'Order Count'];
                          if (name === 'revenue') return [`₦${value}`, 'Revenue'];
                          return [value, name];
                        }} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="orderCount" name="Order Count" fill="#8884d8" />
                        <Bar yAxisId="right" dataKey="revenue" name="Revenue (₦)" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Performing Customers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Customers by LTV</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Total Orders</TableHead>
                        <TableHead>Total Spent</TableHead>
                        <TableHead>LTV Estimate</TableHead>
                        <TableHead>Last Order</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ltvData?.slice(0, 5).map((customer, index) => (
                        <TableRow key={customer.customerEmail || `ltv-customer-${index}`}>
                          <TableCell className="font-medium">{customer.customerName}</TableCell>
                          <TableCell>{customer.customerEmail}</TableCell>
                          <TableCell>{customer.totalOrders}</TableCell>
                          <TableCell>₦{customer.totalSpent}</TableCell>
                          <TableCell>₦{customer.estimatedLTV}</TableCell>
                          <TableCell>{customer.lastOrderDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Customer Segments Tab */}
          {activeTab === 'segments' && customerSegments && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* High Value Customers */}
                <Card>
                  <CardHeader>
                    <CardTitle>High Value Customers</CardTitle>
                    <p className="text-sm text-muted-foreground">Customers spending ₦10,000+</p>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Total Orders</TableHead>
                          <TableHead>Total Spent</TableHead>
                          <TableHead>Avg. Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerSegments.highValue.map((customer, index) => (
                          <TableRow key={customer.customerEmail || `high-value-${index}`}>
                            <TableCell className="font-medium">{customer.customerName}</TableCell>
                            <TableCell>{customer.totalOrders}</TableCell>
                            <TableCell>₦{customer.totalSpent}</TableCell>
                            <TableCell>₦{customer.avgOrderValue}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Medium Value Customers */}
                <Card>
                  <CardHeader>
                    <CardTitle>Medium Value Customers</CardTitle>
                    <p className="text-sm text-muted-foreground">Customers spending ₦5,000-9,999</p>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Total Orders</TableHead>
                          <TableHead>Total Spent</TableHead>
                          <TableHead>Avg. Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerSegments.mediumValue.map((customer, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{customer.customerName}</TableCell>
                            <TableCell>{customer.totalOrders}</TableCell>
                            <TableCell>₦{customer.totalSpent}</TableCell>
                            <TableCell>₦{customer.avgOrderValue}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Value Customers */}
                <Card>
                  <CardHeader>
                    <CardTitle>Low Value Customers</CardTitle>
                    <p className="text-sm text-muted-foreground">Customers spending &lt;₦5,000</p>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Total Orders</TableHead>
                          <TableHead>Total Spent</TableHead>
                          <TableHead>Avg. Order</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerSegments.lowValue.map((customer, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{customer.customerName}</TableCell>
                            <TableCell>{customer.totalOrders}</TableCell>
                            <TableCell>₦{customer.totalSpent}</TableCell>
                            <TableCell>₦{customer.avgOrderValue}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* New Customers */}
                <Card>
                  <CardHeader>
                    <CardTitle>New Customers</CardTitle>
                    <p className="text-sm text-muted-foreground">Joined in the last 30 days</p>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Total Orders</TableHead>
                          <TableHead>Total Spent</TableHead>
                          <TableHead>Joined Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerSegments.newCustomers.map((customer, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{customer.customerName}</TableCell>
                            <TableCell>{customer.totalOrders}</TableCell>
                            <TableCell>₦{customer.totalSpent}</TableCell>
                            <TableCell>{customer.firstOrderDate}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Engagement & Behavior Tab */}
          {activeTab === 'engagement' && engagementData && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Engagement by Hour</CardTitle>
                  <p className="text-sm text-muted-foreground">Orders and revenue by hour of day</p>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={engagementData.slice(0, 24)} // Limit to 24 hours for visibility
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hourOfDay" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="orderCount" name="Order Count" fill="#8884d8" />
                        <Bar dataKey="revenue" name="Revenue (₦)" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Order Patterns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={engagementData.slice(0, 10)}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="dayOfWeek" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="orderCount" stroke="#8884d8" name="Order Count" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Hour</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={engagementData.slice(0, 12)}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hourOfDay" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`₦${value}`, 'Revenue']} />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue (₦)" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* LTV & Retention Tab */}
          {activeTab === 'ltv' && ltvData && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Lifetime Value Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={ltvData.slice(0, 10)}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="customerName" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`₦${value}`, 'LTV']} />
                        <Legend />
                        <Bar dataKey="estimatedLTV" name="LTV (₦)" fill="#8884d8">
                          {ltvData.slice(0, 10).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Customers by LTV</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Total Orders</TableHead>
                          <TableHead>Total Spent</TableHead>
                          <TableHead>LTV Estimate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ltvData.slice(0, 5).map((customer, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{customer.customerName}</TableCell>
                            <TableCell>{customer.totalOrders}</TableCell>
                            <TableCell>₦{customer.totalSpent}</TableCell>
                            <TableCell>₦{customer.estimatedLTV}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Customer Retention Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Active Customers', value: 890 },
                            { name: 'New Customers', value: 45 },
                            { name: 'Inactive Customers', value: 185 },
                            { name: 'Churned Customers', value: 130 }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {[
                            { name: 'Active Customers', value: 890 },
                            { name: 'New Customers', value: 45 },
                            { name: 'Inactive Customers', value: 185 },
                            { name: 'Churned Customers', value: 130 }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}`, 'Customers']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && recommendations && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Bought Together</CardTitle>
                  <p className="text-sm text-muted-foreground">Menu items frequently ordered together</p>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item 1</TableHead>
                        <TableHead>Item 2</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Recommendation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recommendations.map((combo, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{combo.item1}</TableCell>
                          <TableCell>{combo.item2}</TableCell>
                          <TableCell>{combo.frequency} times</TableCell>
                          <TableCell>
                            <Badge variant="secondary">Bundle Offer</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Seasonal Trends</CardTitle>
                  <p className="text-sm text-muted-foreground">Menu items performance by season</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={[
                        { month: 'Jan', 'Jollof Rice': 120, 'Fried Rice': 95, 'Grilled Chicken': 80 },
                        { month: 'Feb', 'Jollof Rice': 140, 'Fried Rice': 110, 'Grilled Chicken': 90 },
                        { month: 'Mar', 'Jollof Rice': 110, 'Fried Rice': 85, 'Grilled Chicken': 70 },
                        { month: 'Apr', 'Jollof Rice': 160, 'Fried Rice': 130, 'Grilled Chicken': 100 },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Jollof Rice" name="Jollof Rice" fill="#8884d8" />
                      <Bar dataKey="Fried Rice" name="Fried Rice" fill="#82ca9d" />
                      <Bar dataKey="Grilled Chicken" name="Grilled Chicken" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Actionable Insights Tab */}
          {activeTab === 'insights' && insights && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Actionable Insights</CardTitle>
                  <p className="text-sm text-muted-foreground">Data-driven recommendations for business growth</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights.map((insight) => (
                      <div 
                        key={insight.id} 
                        className={`p-4 rounded-lg border-l-4 ${
                          insight.priority === 'high' 
                            ? 'border-red-500 bg-red-50' 
                            : insight.priority === 'medium' 
                              ? 'border-yellow-500 bg-yellow-50' 
                              : 'border-green-500 bg-green-50'
                        }`}
                      >
                        <div className="flex items-start">
                          <div className="mr-3">
                            {insight.priority === 'high' ? (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            ) : (
                              <Target className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{insight.title}</h3>
                            <p className="text-sm text-gray-600">{insight.description}</p>
                            {insight.action && (
                              <div className="mt-2">
                                <Badge variant="outline" className="text-xs">
                                  Action: {insight.action}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}