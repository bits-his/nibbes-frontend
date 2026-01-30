"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Users, DollarSign, ShoppingCart, TrendingUp, CreditCard, Clock, Calendar, Download, X } from "lucide-react"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

interface CashierMetric {
  cashierId: string
  cashierName: string
  totalOrders: number
  paidOrders: number
  pendingOrders: number
  cancelledOrders: number
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d']

interface Transaction {
  id: string
  orderNumber: number
  customerName: string
  customerPhone: string
  paymentMethod: string
  paymentStatus: string
  status: string
  totalAmount: string
  createdAt: string
  orderType: string
}

/**
 * Normalize payment method string (same as backend)
 * Removes duplicates and sorts alphabetically
 */
function normalizePaymentMethod(paymentMethod: string | null | undefined): string {
  if (!paymentMethod) return 'Unknown';
  
  const methods = paymentMethod.split(' + ').map(m => m.trim().toLowerCase()).filter(Boolean);
  const uniqueMethods = Array.from(new Set(methods));
  uniqueMethods.sort();
  
  return uniqueMethods.join(' + ');
}

export default function CashierAnalytics() {
  const [cashierMetrics, setCashierMetrics] = useState<CashierMetric[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [hourlyPerformance, setHourlyPerformance] = useState<HourlyPerformance[]>([])
  const [dailyPerformance, setDailyPerformance] = useState<DailyPerformance[]>([])
  const [selectedCashier, setSelectedCashier] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [showTransactions, setShowTransactions] = useState(false)
  const [selectedCashierId, setSelectedCashierId] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchAnalytics(startDate, endDate)
  }, [startDate, endDate])

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

  const fetchTransactions = async (cashierId: string, date?: string) => {
    try {
      setLoadingTransactions(true)
      const params = new URLSearchParams()
      if (date) params.append('date', date)
      
      const url = `/api/cashier-analytics/${cashierId}/transactions${params.toString() ? '?' + params.toString() : ''}`
      const response = await apiRequest('GET', url)
      const data: any = await response.json()
      
      if (data.success) {
        setTransactions(data.data)
        setShowTransactions(true)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch transactions",
        variant: "destructive"
      })
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleCashierClick = (cashierId: string) => {
    setSelectedCashierId(cashierId)
    setSelectedDate("")
    fetchTransactions(cashierId)
  }

  const handleDateClick = (cashierId: string, date: string) => {
    setSelectedCashierId(cashierId)
    setSelectedDate(date)
    fetchTransactions(cashierId, date)
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

  // Payment method chart data (normalize payment methods)
  const paymentMethodData = filteredPaymentMethods.reduce((acc: any[], pm) => {
    const normalizedMethod = normalizePaymentMethod(pm.paymentMethod)
    const existing = acc.find(item => item.name === normalizedMethod)
    if (existing) {
      existing.value += Number(pm.totalAmount)
      existing.count += Number(pm.transactionCount)
    } else {
      acc.push({
        name: normalizedMethod,
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
  })

  // Daily performance chart data
  const dailyChartData = filteredDailyPerformance.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    dateValue: d.date, // Store original date for click handler
    cashierId: d.cashierId, // Store cashier ID for click handler
    orders: Number(d.orderCount),
    revenue: Number(d.revenue)
  })).reverse()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cashier analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Cashier Analytics</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Monitor cashier performance and transactions</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs md:text-sm font-medium text-gray-700 mb-1 block">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-sm"
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs md:text-sm font-medium text-gray-700 mb-1 block">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-sm"
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs md:text-sm font-medium text-gray-700 mb-1 block">Cashier</label>
            <Select value={selectedCashier} onValueChange={setSelectedCashier}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select cashier" />
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
          <div className="col-span-1 flex items-end">
            <Button onClick={handleFilter} className="w-full bg-[#FF6B35] hover:bg-[#FF5722] text-white text-sm">
              Apply
            </Button>
          </div>
          <div className="col-span-1 flex items-end">
            <Button onClick={handleReset} variant="outline" className="w-full text-sm">
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <ShoppingCart className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{totalOrders.toLocaleString()}</div>
            <p className="text-[10px] md:text-xs text-gray-600 mt-1">
              {totalPaidOrders} paid, {totalPendingOrders} pending, {totalCancelledOrders} cancelled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">₦{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <p className="text-[10px] md:text-xs text-gray-600 mt-1">From paid orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Avg Order Value</CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">₦{avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <p className="text-[10px] md:text-xs text-gray-600 mt-1">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Success Rate</CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <p className="text-[10px] md:text-xs text-gray-600 mt-1">Orders completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-gray-600">Active Cashiers</CardTitle>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{filteredMetrics.length}</div>
            <p className="text-[10px] md:text-xs text-gray-600 mt-1">Currently tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Cashier Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cashier Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-gray-600">Cashier</th>
                  <th className="text-right p-3 font-medium text-gray-600">Total Orders</th>
                  <th className="text-right p-3 font-medium text-gray-600">Paid</th>
                  <th className="text-right p-3 font-medium text-gray-600">Pending</th>
                  <th className="text-right p-3 font-medium text-gray-600">Cancelled</th>
                  <th className="text-right p-3 font-medium text-gray-600">Revenue</th>
                  <th className="text-right p-3 font-medium text-gray-600">Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {filteredMetrics.map((cashier) => (
                  <tr 
                    key={cashier.cashierId} 
                    className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleCashierClick(cashier.cashierId)}
                    title="Click to view transactions"
                  >
                    <td className="p-3 font-medium">{cashier.cashierName}</td>
                    <td className="p-3 text-right">{Number(cashier.totalOrders).toLocaleString()}</td>
                    <td className="p-3 text-right text-green-600">{Number(cashier.paidOrders).toLocaleString()}</td>
                    <td className="p-3 text-right text-yellow-600">{Number(cashier.pendingOrders).toLocaleString()}</td>
                    <td className="p-3 text-right text-red-600">{Number(cashier.cancelledOrders).toLocaleString()}</td>
                    <td className="p-3 text-right font-medium">₦{Number(cashier.totalRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="p-3 text-right">₦{Number(cashier.avgOrderValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
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
            <div className="mt-4 space-y-2">
              {paymentMethodData.map((pm, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    {pm.name}
                  </span>
                  <span className="font-medium">{pm.count} transactions</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hourly Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Hourly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip formatter={(value: any) => Number(value).toLocaleString()} />
                <Legend />
                <Bar dataKey="orders" fill="#0088FE" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Daily Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Performance (Last 30 Days)
            <span className="text-xs font-normal text-gray-500 ml-2">(Click on a point to view transactions)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value: any) => Number(value).toLocaleString()}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as any
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="font-semibold">{data.date}</p>
                        <p className="text-sm">Orders: {data.orders}</p>
                        <p className="text-sm">Revenue: ₦{data.revenue.toLocaleString()}</p>
                        {selectedCashier !== "all" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDateClick(data.cashierId, data.dateValue)
                            }}
                            className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer transition-colors"
                          >
                            View Transactions →
                          </button>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="orders" 
                stroke="#0088FE" 
                name="Orders"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="revenue" 
                stroke="#00C49F" 
                name="Revenue (₦)"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Transactions Modal */}
      <Dialog open={showTransactions} onOpenChange={setShowTransactions}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Transactions
              {selectedCashierId && cashierMetrics.find(c => c.cashierId === selectedCashierId) && (
                <span className="text-base font-normal text-gray-600 ml-2">
                  - {cashierMetrics.find(c => c.cashierId === selectedCashierId)?.cashierName}
                </span>
              )}
              {selectedDate && (
                <span className="text-base font-normal text-gray-600 ml-2">
                  - {new Date(selectedDate).toLocaleDateString()}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {loadingTransactions ? "Loading transactions..." : `${transactions.length} transaction(s) found`}
            </DialogDescription>
          </DialogHeader>
          
          {loadingTransactions ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions found for the selected criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-gray-600">Order #</th>
                    <th className="text-left p-3 font-medium text-gray-600">Customer</th>
                    <th className="text-left p-3 font-medium text-gray-600">Phone</th>
                    <th className="text-left p-3 font-medium text-gray-600">Payment Method</th>
                    <th className="text-right p-3 font-medium text-gray-600">Amount</th>
                    <th className="text-left p-3 font-medium text-gray-600">Status</th>
                    <th className="text-left p-3 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">#{transaction.orderNumber}</td>
                      <td className="p-3">{transaction.customerName}</td>
                      <td className="p-3">{transaction.customerPhone}</td>
                      <td className="p-3">{normalizePaymentMethod(transaction.paymentMethod)}</td>
                      <td className="p-3 text-right font-medium">₦{Number(transaction.totalAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
