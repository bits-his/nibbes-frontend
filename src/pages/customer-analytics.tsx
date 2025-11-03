"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, ShoppingCart, RefreshCw, Search, User, Package, Calendar, ChevronRight, Zap, Star } from "lucide-react"
import { apiRequest } from "@/lib/queryClient"
import { toast } from "@/hooks/use-toast"

interface CustomerAnalytics {
  id: string
  customerEmail: string
  customerName: string
  totalOrders: number
  totalSpent: number
  favoriteItems: Array<{
    name: string
    totalQuantity: number
    orderCount: number
  }> | null
  lastOrderDate: string
  createdAt: string
  updatedAt: string
}

interface OrderItem {
  id: string
  orderId: string
  menuItemId: string
  menuItemName: string
  quantity: number
  price: string
}

interface Order {
  id: string
  customerName: string
  customerEmail: string
  orderNumber: number
  totalAmount: string
  status: string
  paymentStatus: string
  orderType: string
  createdAt: string
  updatedAt: string
  orderItems: OrderItem[]
}

interface CustomerDetail {
  analytics: CustomerAnalytics
  orders: Order[]
}

const CustomerAnalyticsPage: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerAnalytics[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [dateRange, setDateRange] = useState({
    from: "",
    to: "",
  })

  useEffect(() => {
    loadCustomerAnalytics()
  }, [])

  const handleDateRangeChange = (from: string, to: string) => {
    setDateRange({ from, to })
  }

  const loadCustomerAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (dateRange.from) params.append("from", dateRange.from)
      if (dateRange.to) params.append("to", dateRange.to)

      const queryString = params.toString()
      const url = `/api/analytics/customers${queryString ? `?${queryString}` : ""}`

      console.log("API call to:", url)
      const response = await apiRequest("GET", url)
      console.log("API response:", response)

      if (response.ok) {
        const result = await response.json()
        setCustomers(result.data)
      } else {
        toast({
          title: "Error",
          description: "Failed to load customer analytics",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("API call failed:", error)
      toast({
        title: "Error",
        description: error?.message || error || "Failed to load customer analytics. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomerAnalytics()
  }, [dateRange])

  const handleRefreshAnalytics = async () => {
    try {
      setRefreshing(true)
      const response = await apiRequest("POST", "/api/analytics/refresh")
      if (response.ok) {
        toast({
          title: "Success",
          description: "Customer analytics refreshed successfully",
        })
        loadCustomerAnalytics()
      } else {
        toast({
          title: "Error",
          description: "Failed to refresh analytics",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh analytics. Please try again.",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const handleCustomerSelect = async (email: string) => {
    try {
      const params = new URLSearchParams()
      if (dateRange.from) params.append("from", dateRange.from)
      if (dateRange.to) params.append("to", dateRange.to)

      const queryString = params.toString()
      const url = `/api/analytics/customers/${email}${queryString ? `?${queryString}` : ""}`

      console.log("API call to detail:", url)
      const response = await apiRequest("GET", url)
      console.log("API detail response:", response)

      if (response.ok) {
        const result = await response.json()
        if (result.data) {
          setSelectedCustomer(result.data)
        } else {
          toast({
            title: "Error",
            description: "Invalid response format from server",
            variant: "destructive",
          })
        }
      } else {
        const errorText = await response.text()
        toast({
          title: "Error",
          description: `Failed to load customer details: ${response.status} - ${errorText}`,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("API detail call failed:", error)
      toast({
        title: "Error",
        description: error?.message || error || "Failed to load customer details. Please try again.",
        variant: "destructive",
      })
    }
  }

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const sortedCustomers = [...filteredCustomers].sort((a, b) => b.totalOrders - a.totalOrders)

  // const totalRevenue = customers.reduce((sum, customer) => sum + Number.parseFloat(customer.totalSpent.toString()), 0)

  const totalOrders = customers.reduce((sum, customer) => sum + customer.totalOrders, 0)
  const topCustomer =
    customers.length > 0
      ? customers.reduce((top, customer) => (customer.totalOrders > top.totalOrders ? customer : top), customers[0])
      : null

  const topFiveCustomers = [...customers].sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 5)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header Section */}
      <div className="border-b border-slate-200 bg-white">
        <div className="container mx-auto px-4 py-8 md:py-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Customer Analytics</h1>
              <p className="text-slate-600 text-base">Track customer behavior, orders, and preferences in real-time</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    className="pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                    value={dateRange.from}
                    onChange={(e) => {
                      setDateRange({ ...dateRange, from: e.target.value })
                      if (selectedCustomer) {
                        setTimeout(() => handleCustomerSelect(selectedCustomer.analytics.customerEmail), 100)
                      }
                    }}
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    className="pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                    value={dateRange.to}
                    onChange={(e) => {
                      setDateRange({ ...dateRange, to: e.target.value })
                      if (selectedCustomer) {
                        setTimeout(() => handleCustomerSelect(selectedCustomer.analytics.customerEmail), 100)
                      }
                    }}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDateRange({ from: "", to: "" })
                    setTimeout(() => loadCustomerAnalytics(), 100)
                  }}
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Clear
                </Button>
              </div>
              <Button
                onClick={handleRefreshAnalytics}
                disabled={refreshing}
                className="bg-teal-600 hover:bg-teal-700 text-white font-medium transition duration-200 w-full sm:w-auto"
              >
                {refreshing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Refresh Analytics
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-lg">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <Card className="border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all duration-300 overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-semibold text-slate-600">Total Customers</CardTitle>
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{customers.length}</div>
                  <p className="text-xs text-slate-500 mt-2">Active customers</p>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all duration-300 overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-semibold text-slate-600">Total Orders</CardTitle>
                    <ShoppingCart className="h-5 w-5 text-emerald-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">{totalOrders}</div>
                  <p className="text-xs text-slate-500 mt-2">All time</p>
                </CardContent>
              </Card>

              {topCustomer && (
                <Card className="border border-amber-300 hover:shadow-lg hover:border-amber-400 transition-all duration-300 overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-50">
                  <div className="h-1.5 bg-gradient-to-r from-amber-500 to-yellow-500"></div>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                        <Star className="h-5 w-5 text-amber-600 fill-amber-600" />
                        Top Customer
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="p-2 rounded-lg bg-white border border-amber-200 text-center hover:shadow-md transition">
                      <p className="font-bold text-slate-900 text-base">{topCustomer.customerName}</p>
                      <p className="text-xs text-slate-500 mt-1">{topCustomer.totalOrders} orders</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border border-amber-300 hover:shadow-lg hover:border-amber-400 transition-all duration-300 overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-50">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 to-yellow-500"></div>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                      <Star className="h-5 w-5 text-amber-600 fill-amber-600" />
                      Top 5 Customers
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {topFiveCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="p-2 rounded-lg bg-white border border-amber-200 hover:shadow-md transition text-center"
                      >
                        <p className="font-semibold text-slate-900 text-sm truncate">{customer.customerName}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 pb-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle className="text-xl text-slate-900">Customers</CardTitle>
                    <CardDescription className="text-slate-600 mt-1">
                      All customer ordering patterns and metrics
                    </CardDescription>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center items-center h-72">
                    <div className="flex flex-col items-center gap-4">
                      <RefreshCw className="h-10 w-10 text-teal-500 animate-spin" />
                      <p className="text-slate-600 font-medium">Loading customer data...</p>
                    </div>
                  </div>
                ) : sortedCustomers.length === 0 ? (
                  <div className="flex justify-center items-center h-72">
                    <div className="text-center">
                      <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 font-medium">No customers found</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow className="hover:bg-slate-50">
                          <TableHead className="text-slate-700 font-semibold">Customer</TableHead>
                          <TableHead className="text-slate-700 font-semibold">Email</TableHead>
                          <TableHead className="text-slate-700 font-semibold text-right">Orders</TableHead>
                          <TableHead className="text-slate-700 font-semibold text-right">Total Spent</TableHead>
                          <TableHead className="text-slate-700 font-semibold">Favorites</TableHead>
                          <TableHead className="text-slate-700 font-semibold">Last Order</TableHead>
                          <TableHead className="text-slate-700 font-semibold text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedCustomers.map((customer) => (
                          <TableRow
                            key={customer.id}
                            className="hover:bg-slate-50 border-b border-slate-100 transition-colors"
                          >
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-semibold text-sm">
                                  {customer.customerName.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-slate-900">{customer.customerName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600 text-sm">{customer.customerEmail}</TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold">
                                {customer.totalOrders}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-900">
                              ₦
                              {Number.parseFloat(customer.totalSpent.toString()).toLocaleString("en-US", {
                                maximumFractionDigits: 0,
                              })}
                            </TableCell>
                            <TableCell>
                              {customer.favoriteItems && customer.favoriteItems.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {customer.favoriteItems.slice(0, 2).map((item, index) => (
                                    <Badge key={index} variant="outline" className="text-xs bg-slate-50">
                                      {item.name}
                                    </Badge>
                                  ))}
                                  {customer.favoriteItems.length > 2 && (
                                    <Badge variant="outline" className="text-xs bg-slate-50 font-semibold">
                                      +{customer.favoriteItems.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-600 text-sm">
                              {new Date(customer.lastOrderDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                className="bg-teal-600 hover:bg-teal-700 text-white transition group"
                                onClick={() => {
                                  handleCustomerSelect(customer.customerEmail)
                                  setActiveTab("details")
                                }}
                              >
                                <span className="flex items-center gap-1">
                                  View
                                  <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
                                </span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            {selectedCustomer ? (
              <div className="space-y-6">
                <Card className="border border-slate-200 shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-teal-500 to-emerald-500"></div>
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
                    <div className="flex items-start gap-4">
                      <div className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-full w-16 h-16 flex items-center justify-center font-bold text-2xl">
                        {selectedCustomer.analytics.customerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-2xl text-slate-900">
                          {selectedCustomer.analytics.customerName}
                        </CardTitle>
                        <CardDescription className="text-slate-600">
                          {selectedCustomer.analytics.customerEmail}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                        <p className="text-slate-600 text-sm font-medium mb-1">Total Orders</p>
                        <p className="text-3xl font-bold text-slate-900">{selectedCustomer.analytics.totalOrders}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                        <p className="text-slate-600 text-sm font-medium mb-1">Total Spent</p>
                        <p className="text-3xl font-bold text-slate-900">
                          ₦
                          {Number.parseFloat(selectedCustomer.analytics.totalSpent.toString()).toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                        <p className="text-slate-600 text-sm font-medium mb-1">Avg Order Value</p>
                        <p className="text-3xl font-bold text-slate-900">
                          ₦
                          {(
                            Number.parseFloat(selectedCustomer.analytics.totalSpent.toString()) /
                              selectedCustomer.analytics.totalOrders || 0
                          ).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                        <p className="text-slate-600 text-sm font-medium mb-1">Last Order</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {new Date(selectedCustomer.analytics.lastOrderDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <CardTitle className="text-slate-900">Favorite Items</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {selectedCustomer.analytics.favoriteItems && selectedCustomer.analytics.favoriteItems.length > 0 ? (
                      <div className="space-y-3">
                        {selectedCustomer.analytics.favoriteItems.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-slate-50 to-transparent border border-slate-200 hover:shadow-md transition"
                          >
                            <div className="flex items-center gap-3">
                              <Package className="h-5 w-5 text-teal-500" />
                              <div>
                                <p className="font-semibold text-slate-900">{item.name}</p>
                                <p className="text-xs text-slate-500">
                                  {item.orderCount} {item.orderCount === 1 ? "order" : "orders"}
                                </p>
                              </div>
                            </div>
                            <Badge className="bg-teal-100 text-teal-700 font-semibold">Qty: {item.totalQuantity}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-600 font-medium">No favorite items yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <CardTitle className="text-slate-900">Order History</CardTitle>
                    <CardDescription className="text-slate-600">All orders placed by this customer</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50 border-b border-slate-200">
                          <TableRow className="hover:bg-slate-50">
                            <TableHead className="text-slate-700 font-semibold">Order #</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Date</TableHead>
                            <TableHead className="text-slate-700 font-semibold text-right">Amount</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Status</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Payment</TableHead>
                            <TableHead className="text-slate-700 font-semibold">Items</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedCustomer.orders.map((order) => (
                            <TableRow key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                              <TableCell className="font-bold text-slate-900 py-4">#{order.orderNumber}</TableCell>
                              <TableCell className="text-slate-600">
                                {new Date(order.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "2-digit",
                                })}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-slate-900">
                                ₦{order.totalAmount}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    order.status === "completed"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : order.status === "cancelled"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-amber-100 text-amber-700"
                                  }
                                >
                                  {order.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    order.paymentStatus === "paid"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : order.paymentStatus === "failed"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-slate-100 text-slate-700"
                                  }
                                >
                                  {order.paymentStatus}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {order.orderItems.slice(0, 2).map((item, index) => (
                                    <Badge key={index} variant="outline" className="text-xs bg-slate-50">
                                      {item.menuItemName}
                                    </Badge>
                                  ))}
                                  {order.orderItems.length > 2 && (
                                    <Badge variant="outline" className="text-xs bg-slate-50">
                                      +{order.orderItems.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border border-slate-200 shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-full w-20 h-20 flex items-center justify-center mb-6">
                    <User className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No Customer Selected</h3>
                  <p className="text-slate-600 mb-6 max-w-sm">
                    Select a customer from the overview tab to view detailed analytics and order history
                  </p>
                  <Button
                    onClick={() => setActiveTab("overview")}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-medium"
                  >
                    Browse Customers
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default CustomerAnalyticsPage
