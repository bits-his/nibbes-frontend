"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Package, AlertTriangle, Warehouse, Boxes, DollarSign } from "lucide-react"

interface StoreItem {
  id: string
  itemCode: string
  name: string
  description: string
  currentBalance: number
  unit: string
  minimumStock: number
  costPrice: number
  category: string
}

interface WebSocketMessage {
  type: string;
  data: any;
}

export default function StoreManagement() {
  const [items, setItems] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const { toast } = useToast()
  const wsRef = useRef<WebSocket | null>(null);

  const [formData, setFormData] = useState({
    itemCode: "",
    name: "",
    description: "",
    currentBalance: 0,
    unit: "pcs",
    minimumStock: 0,
    costPrice: 0,
    category: "",
  })

  // Set up WebSocket to receive real-time updates for store items
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("Store Management WebSocket connected");
    };

    socket.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      switch(message.type) {
        case 'inventory_update':
        case 'store_item_update':
        case 'stock_movement':
        case 'order_completed':
          // Refresh store items when inventory changes
          fetchItems();
          break;
        default:
          console.log('Store Management WebSocket received unknown event:', message.type);
      }
    };

    socket.onerror = (error) => {
      console.error("Store Management WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("Store Management WebSocket disconnected");
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (typeof document !== 'undefined' && !document.hidden) {
          // Only reconnect if the page is visible to the user
          const wsUrl = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';
          const newSocket = new WebSocket(wsUrl);
          wsRef.current = newSocket;
        }
      }, 5000);
    };

    wsRef.current = socket;

    // Cleanup function to close the WebSocket connection
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const response = await apiRequest("GET", "/api/store/items")
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error("Error fetching items:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch store items",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiRequest("POST", "/api/store/items", formData)
      toast({
        title: "Success",
        description: "Store item created successfully",
      })
      setShowAddDialog(false)
      fetchItems()
      setFormData({
        itemCode: "",
        name: "",
        description: "",
        currentBalance: 0,
        unit: "pcs",
        minimumStock: 0,
        costPrice: 0,
        category: "",
      })
    } catch (error) {
      console.error("Error creating item:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create store item",
      })
    }
  }

  const lowStockItems = items.filter((item) => item.currentBalance <= item.minimumStock)
  const totalValue = items.reduce((sum, item) => sum + item.currentBalance * item.costPrice, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-[#50BAA8] to-teal-600 rounded-lg">
                <Warehouse className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Store Management</h1>
            </div>
            <p className="text-gray-600 mt-2">Manage inventory and optimize stock movements</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#50BAA8] to-teal-600 hover:from-[#3da896] hover:to-teal-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all">
                <Plus className="w-5 h-5 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-xl text-gray-900">Add New Store Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700 font-semibold">Item Code *</Label>
                    <Input
                      value={formData.itemCode}
                      onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                      placeholder="e.g., RICE-001"
                      required
                      className="bg-white border-slate-300 text-gray-900 placeholder-gray-500 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-semibold">Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Basmati Rice"
                      required
                      className="bg-white border-slate-300 text-gray-900 placeholder-gray-500 mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-700 font-semibold">Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                    className="bg-white border-slate-300 text-gray-900 placeholder-gray-500 mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700 font-semibold">Initial Quantity *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.currentBalance}
                      onChange={(e) =>
                        setFormData({ ...formData, currentBalance: Number.parseFloat(e.target.value) || 0 })
                      }
                      required
                      className="bg-white border-slate-300 text-gray-900 placeholder-gray-500 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-semibold">Unit *</Label>
                    <Input
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="e.g., kg, pcs"
                      required
                      className="bg-white border-slate-300 text-gray-900 placeholder-gray-500 mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700 font-semibold">Minimum Stock *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.minimumStock}
                      onChange={(e) =>
                        setFormData({ ...formData, minimumStock: Number.parseFloat(e.target.value) || 0 })
                      }
                      required
                      className="bg-white border-slate-300 text-gray-900 placeholder-gray-500 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-semibold">Cost Price (₦) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: Number.parseFloat(e.target.value) || 0 })}
                      required
                      className="bg-white border-slate-300 text-gray-900 placeholder-gray-500 mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-700 font-semibold">Category *</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Grains, Vegetables"
                    required
                    className="bg-white border-slate-300 text-gray-900 placeholder-gray-500 mt-1"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#50BAA8] to-teal-600 hover:from-[#3da896] hover:to-teal-700 text-white font-semibold mt-6"
                >
                  Create Item
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-white border-slate-200 hover:border-[#50BAA8] transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-gray-600">Total Items</CardTitle>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Boxes className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{items.length}</div>
            <p className="text-xs text-gray-500 mt-2">Active inventory items</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 hover:border-[#50BAA8] transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-gray-600">Low Stock Alerts</CardTitle>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{lowStockItems.length}</div>
            <p className="text-xs text-gray-500 mt-2">Items need restocking</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 hover:border-[#50BAA8] transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-gray-600">Total Value</CardTitle>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">₦{(totalValue / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-gray-500 mt-2">Current inventory value</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-slate-200">
        <CardHeader className="border-b border-slate-200 pb-4">
          <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#50BAA8]" />
            Store Inventory
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#50BAA8]"></div>
              <p className="mt-3 text-gray-600">Loading inventory...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Warehouse className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-700 text-lg">No store items yet</p>
              <p className="text-sm text-gray-500 mt-2">Click "Add Item" to create your first store item</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="text-gray-700">Code</TableHead>
                    <TableHead className="text-gray-700">Name</TableHead>
                    <TableHead className="text-gray-700 hidden sm:table-cell">Category</TableHead>
                    <TableHead className="text-gray-700 text-right">Stock</TableHead>
                    <TableHead className="text-gray-700 text-right hidden md:table-cell">Min Stock</TableHead>
                    <TableHead className="text-gray-700 text-right hidden lg:table-cell">Cost Price</TableHead>
                    <TableHead className="text-gray-700 text-right">Value</TableHead>
                    <TableHead className="text-gray-700">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isLowStock = item.currentBalance <= item.minimumStock
                    const itemValue = item.currentBalance * item.costPrice

                    return (
                      <TableRow
                        key={item.id}
                        className={`border-slate-200 transition-colors ${
                          isLowStock ? "bg-orange-50 hover:bg-orange-100" : "hover:bg-slate-50"
                        }`}
                      >
                        <TableCell className="font-semibold text-[#50BAA8]">{item.itemCode}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{item.name}</div>
                            {item.description && <div className="text-sm text-gray-500 mt-1">{item.description}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700 hidden sm:table-cell">{item.category}</TableCell>
                        <TableCell className="text-right text-gray-900 font-medium">
                          {item.currentBalance} {item.unit}
                        </TableCell>
                        <TableCell className="text-right text-gray-600 hidden md:table-cell">
                          {item.minimumStock} {item.unit}
                        </TableCell>
                        <TableCell className="text-right text-gray-600 hidden lg:table-cell">
                          ₦{item.costPrice.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-gray-900">
                          ₦{itemValue.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {isLowStock ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-300">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
                              ✓ OK
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
