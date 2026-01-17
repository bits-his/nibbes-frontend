"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Users, DollarSign, ShoppingCart, TrendingUp, TrendingDown, CreditCard, Clock, Calendar, Award, Target, Activity } from "lucide-react"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts'

interface CashierMetric {
  cashierId: string
  cashierName: string
  totalOrders: number
  paidOrders: string
  pendingOrders: string
  cancelledOrders: string
  totalRevenue: string
  avgOrderValue: string
  firstOrder: string
  lastOrder: string
}

interface PaymentMethod {
  cashierId: string
  cashierName: string
  paymentMethod: string
  transactionCount: number
  totalAmount: string
}

interface HourlyPerformance {
  cashierId: string
  cashierName: string
  hour: number
  orderCount: number
  revenue: string
}

interface DailyPerformance {
  cashierId: string
  cashierName: string
  date: string
  orderCount: number
  revenue: string
}

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

export default function CashierAnalytics() {
  const [cashierMetrics, setCashierMetrics] = useState<CashierMetric[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [hourlyPerformance, setHourlyPerformance] = useState<HourlyPerformance[]>([])
  const [dailyPerformance, setDailyPerformance] = useState<DailyPerformance[]>([])
  const [selectedCashier, setSelectedCashier] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async (start?: string, end?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (start) params.append('startDate', start)
      if (end) params.append('endDate', end)
      
      const url = `/api/cashier-analytics${params.toString() ? '?' + params.toString() : ''}`
      const response = await apiRequest('GET', url)
      const data: any = await response.json()
      
      if (data.success) {
        setCashierMetrics(data.data.cashierMetrics)
        setPaymentMethods(data.data.paymentMethods)
        setHourlyPerformance(data.data.hourlyPerformance)
        setDailyPerformance(data.data.dailyPerformance)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch cashier analytics",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => {
    fetchAnalytics(startDate, endDate)
  }

  const handleReset = () => {
    setStartDate("")
    setEndDate("")
    setSelectedCashier("all")
    fetchAnalytics()
  }

  // Filter data by selected cashier
  const filteredMetrics = selectedCashier === "all" 
    ? cashierMetrics 
    : cashierMetrics.filter(m => m.cashierId === selectedCashier)

  const filteredPaymentMethods = selectedCashier === "all"
    ? paymentMethods
    : paymentMethods.filter(p => p.cashierId === selectedCashier)

  const filteredHourlyPerformance = selectedCashier === "all"
    ? hourlyPerformance
    : hourlyPerformance.filter(h => h.cashierId === selectedCashier)

  const filteredDailyPerformance = selectedCashier === "all"
    ? dailyPerformance.slice(0, 30)
    : dailyPerformance.filter(d => d.cashierId === selectedCashier).slice(0, 30)

  // Calculate totals
  const totalOrders = filteredMetrics.reduce((sum, m) => sum + Number(m.totalOrders), 0)
  const totalRevenue = filteredMetrics.reduce((sum, m) => sum + Number(m.totalRevenue), 0)
  const totalPaidOrders = filteredMetrics.reduce((sum, m) => sum + Number(m.paidOrders), 0)
  const totalPendingOrders = filteredMetrics.reduce((sum, m) => sum + Number(m.pendingOrders), 0)
  const totalCancelledOrders = filteredMetrics.reduce((sum, m) => sum + Number(m.cancelledOrders), 0)
  const avgOrderValue = totalPaidOrders > 0 ? totalRevenue / totalPaidOrders : 0
  const successRate = totalOrders > 0 ? (totalPaidOrders / totalOrders) * 100 : 0

  // Top performer
  const topPerformer = filteredMetrics.length > 0 
    ? filteredMetrics.reduce((prev, current) => 
        Number(current.totalRevenue) > Number(prev.totalRevenue) ? current : prev
      )
    : null

  // Payment method chart data
  const paymentMethodData = filteredPaymentMethods.reduce((acc: any[], pm) => {
    const existing = acc.find(item => item.name === pm.paymentMethod)
    if (existing) {
      existing.value += Number(pm.totalAmount)
      existing.count += Number(pm.transactionCount)
    } else {
      acc.push({
        name: pm.paymentMethod || 'Unknown',
        value: Number(pm.totalAmount),
        count: Number(pm.transactionCount)
      })
    }
    return acc
  }, [])

  // Hourly performance chart data
  const hourlyChartData = Array.from({ length: 24 }, (_, hour) => {
    const hourData = filteredHourlyPerformance.filter(h => h.hour === hour)
    return {
      hour: `${hour}:00`,
      orders: hourData.reduce((sum, h) => sum + Number(h.orderCount), 0),
      revenue: hourData.reduce((sum, h) => sum + Number(h.revenue), 0)
    }
  }).filter(d => d.orders > 0)

  // Daily performance chart data
  const dailyChartData = filteredDailyPerformance.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    orders: Number(d.orderCount),
    revenue: Number(d.revenue)
  })).reverse()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-orange-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
              Cashier Performance Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Real-time insights into cashier operations and revenue</p>
          </div>
          
          {topPerformer && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl shadow-lg">
              <Award className="h-6 w-6" />
              <div>
                <p className="text-xs opacity-90">Top Performer</p>
                <p className="font-bold text-lg">{topPerformer.cashierName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[180px]">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border-gray-200 focus:border-orange-500 focus:ring-orange-500"
              placeholder="Start Date"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border-gray-200 focus:border-orange-500 focus:ring-orange-500"
              placeholder="End Date"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Select value={selectedCashier} onValueChange={setSelectedCashier}>
              <SelectTrigger className="border-gray-200 focus:border-orange-500 focus:ring-orange-500">
                <SelectValue placeholder="All Cashiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cashiers</SelectItem>
                {cashierMetrics.map(cashier => (
                  <SelectItem key={cashier.cashierId} value={cashier.cashierId}>
                    {cashier.cashierName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleFilter} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg">
            <Activity className="h-4 w-4 mr-2" />
            Apply
          </Button>
          <Button onClick={handleReset} variant="outline" className="border-gray-200 hover:bg-gray-50">
            Reset
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totalOrders.toLocaleString()}</div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-white/20 text-white border-none">
                {successRate.toFixed(1)}% Success
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">₦{(totalRevenue / 1000000).toFixed(1)}M</div>
            <p className="text-sm opacity-90 mt-2">From {totalPaidOrders.toLocaleString()} paid orders</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">₦{(avgOrderValue / 1000).toFixed(1)}K</div>
            <p className="text-sm opacity-90 mt-2">Per transaction</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Cashiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{filteredMetrics.length}</div>
            <p className="text-sm opacity-90 mt-2">Currently tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
          <TabsTrigger value="overview" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-lg">
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-lg">
            Performance
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-lg">
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Cashier Leaderboard */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-500" />
                Cashier Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-semibold text-gray-700">Rank</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Cashier</th>
                      <th className="text-right p-4 font-semibold text-gray-700">Orders</th>
                      <th className="text-right p-4 font-semibold text-gray-700">Revenue</th>
                      <th className="text-right p-4 font-semibold text-gray-700">Avg Order</th>
                      <th className="text-center p-4 font-semibold text-gray-700">Success Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMetrics.map((cashier, index) => {
                      const successRate = Number(cashier.totalOrders) > 0 
                        ? (Number(cashier.paidOrders) / Number(cashier.totalOrders)) * 100 
                        : 0
                      return (
                        <tr key={cashier.cashierId} className="border-b hover:bg-orange-50 transition-colors">
                          <td className="p-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                              index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-gray-300 text-gray-700' :
                              index === 2 ? 'bg-orange-300 text-orange-900' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-gray-900">{cashier.cashierName}</div>
                            <div className="text-sm text-gray-500">{Number(cashier.paidOrders).toLocaleString()} paid orders</div>
                          </td>
                          <td className="p-4 text-right font-medium">{Number(cashier.totalOrders).toLocaleString()}</td>
                          <td className="p-4 text-right">
                            <div className="font-bold text-green-600">₦{Number(cashier.totalRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                          </td>
                          <td className="p-4 text-right font-medium">₦{Number(cashier.avgOrderValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="p-4 text-center">
                            <Badge variant={successRate >= 95 ? "default" : "secondary"} className={
                              successRate >= 95 ? "bg-green-500" : "bg-yellow-500"
                            }>
                              {successRate.toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Daily Trend */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                Daily Performance Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={dailyChartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#666" />
                  <YAxis yAxisId="left" stroke="#666" />
                  <YAxis yAxisId="right" orientation="right" stroke="#666" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any) => Number(value).toLocaleString()} 
                  />
                  <Legend />
                  <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#f97316" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue (₦)" />
                  <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={3} name="Orders" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Hourly Performance */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Hourly Performance Pattern
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={hourlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 12 }} stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: any) => Number(value).toLocaleString()} 
                  />
                  <Legend />
                  <Bar dataKey="orders" fill="#f97316" radius={[8, 8, 0, 0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          {/* Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-orange-500" />
                  Payment Method Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `₦${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
                <CardTitle>Payment Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {paymentMethodData.map((pm, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <div>
                          <div className="font-semibold text-gray-900 capitalize">{pm.name}</div>
                          <div className="text-sm text-gray-500">{pm.count} transactions</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">₦{Number(pm.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <div className="text-sm text-gray-500">{((pm.value / totalRevenue) * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
