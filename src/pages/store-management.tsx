"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Package, AlertTriangle, Warehouse, Boxes, DollarSign, Loader } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface StoreItem {
  id: string
  itemCode: string
  name: string
  description: string
  initialQuantity: number
  currentBalance: number
  unit: string
  minimumStock: number
  costPrice: number
  category: string
  imageUrl?: string
  totalIn: number
  totalOut: number
}

interface MenuItem {
  id: number
  itemCode: string
  name: string
  description: string
  price: string
  category: string
  imageUrl: string
  available: boolean
  stockBalance: number
  unit?: string
}

interface Category {
  name: string
}

interface WebSocketMessage {
  type: string;
  data: any;
}

const initialStockFormState = {
  selectedItemId: "",
  quantity: 0,
  operationType: 'add' as 'add' | 'remove',
  notes: "",
}

type StockFormState = typeof initialStockFormState

export default function StoreManagement() {
  const { user } = useAuth()
  const [items, setItems] = useState<StoreItem[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMenuItems, setLoadingMenuItems] = useState(false)
  const [showAddStockDialog, setShowAddStockDialog] = useState(false)
  const [selectedItemForRestock, setSelectedItemForRestock] = useState<StoreItem | null>(null)
  const [stockFormData, setStockFormData] = useState<StockFormState>(initialStockFormState)
  const [showTransactionsDialog, setShowTransactionsDialog] = useState(false)
  const [selectedItemTransactions, setSelectedItemTransactions] = useState<any[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const { toast } = useToast()
  const wsRef = useRef<WebSocket | null>(null);

  // Check if user is kitchen staff (not admin)
  const isKitchenStaff = user?.role !== 'admin'

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
  }, [])

  useEffect(() => {
    fetchItems()
    fetchMenuItems()
  }, [])

  const fetchMenuItems = async () => {
    try {
      setLoadingMenuItems(true)
      const response = await apiRequest("GET", "/api/menu/all")
      const data = await response.json()
      setMenuItems(data)
      console.log('Fetched menu items for stock management:', data.length)
    } catch (error) {
      console.error("Error fetching menu items:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch menu items",
      })
    } finally {
      setLoadingMenuItems(false)
    }
  }

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

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stockFormData.selectedItemId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select an item",
      })
      return
    }
    
    if (stockFormData.quantity <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid quantity",
      })
      return
    }
    
    const selectedMenuItem = menuItems.find(item => item.id.toString() === stockFormData.selectedItemId)
    if (!selectedMenuItem) return
    
    // Find the store item by itemCode
    const storeItem = items.find(item => item.itemCode === selectedMenuItem.itemCode)
    
    if (!storeItem) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Store item not found",
      })
      return
    }
    
    // Check if removing more than available
    if (stockFormData.operationType === 'remove' && stockFormData.quantity > storeItem.currentBalance) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Cannot remove ${stockFormData.quantity}. Only ${storeItem.currentBalance} available.`,
      })
      return
    }
    
    try {
      // Use the stock movement endpoint
      await apiRequest("POST", `/api/store/movements`, {
        storeItemId: storeItem.id,
        type: stockFormData.operationType === 'add' ? "IN" : "OUT",
        quantity: stockFormData.quantity,
        reference: stockFormData.operationType === 'add' ? "restock" : "stock removal",
        notes: stockFormData.notes || `${stockFormData.operationType === 'add' ? 'Added' : 'Removed'} ${stockFormData.quantity} portions`,
      })
      
      toast({
        title: "Success",
        description: `${stockFormData.operationType === 'add' ? 'Added' : 'Removed'} ${stockFormData.quantity} portions ${stockFormData.operationType === 'add' ? 'to' : 'from'} ${selectedMenuItem.name}`,
      })
      
      setShowAddStockDialog(false)
      setStockFormData(initialStockFormState)
      fetchItems()
    } catch (error) {
      console.error("Error updating stock:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update stock",
      })
    }
  }

  const setSearchTerm = (term: string) => {
    if (term.trim() === "") {
      // If search term is empty, fetch all items
      fetchItems()
    } else {
      const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(term.toLowerCase()) ||
        item.itemCode.toLowerCase().includes(term.toLowerCase())
      )
      setItems(filteredItems)
    }
  }
  
  const lowStockItems = items.filter((item) => item.currentBalance < 10)
  const criticalStockItems = items.filter((item) => item.currentBalance < 5)
  const totalValue = items.reduce((sum, item) => sum + item.currentBalance * item.costPrice, 0)

  const handleViewItemTransactions = async (item: StoreItem) => {
    try {
      setTransactionsLoading(true);
      const response = await apiRequest("GET", `/api/store-entries/item-code/${item.itemCode}`);
      const data = await response.json();
      // Extract entries from the data object
      const entries = data.data?.entries || data.entries || [];
      setSelectedItemTransactions(entries);
      setShowTransactionsDialog(true);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch item transactions",
      });
      setSelectedItemTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-[#50BAA8] to-teal-600 rounded-lg">
                <Warehouse className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Main Kitchen</h1>
            </div>
            <p className="text-gray-600 mt-2">Manage inventory and optimize stock movements</p>
          </div>
          <Dialog open={showAddStockDialog} onOpenChange={(open) => {
            setShowAddStockDialog(open)
            if (!open) {
              setStockFormData(initialStockFormState)
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#50BAA8] to-teal-600 hover:from-[#3da896] hover:to-teal-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all">
                <Plus className="w-5 h-5 mr-2" />
                Add/Remove Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-xl text-gray-900">Add or Remove Stock</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Select an existing menu item and adjust its stock quantity
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleStockSubmit} className="space-y-5">
                {/* Select Menu Item */}
                <div>
                  <Label className="text-gray-700 font-semibold">Select Item *</Label>
                  {loadingMenuItems ? (
                    <Input
                      value="Loading items..."
                      disabled
                      className="bg-gray-100 border-slate-300 text-gray-500 mt-1"
                    />
                  ) : (
                    <select
                      value={stockFormData.selectedItemId}
                      onChange={(e) => setStockFormData({ ...stockFormData, selectedItemId: e.target.value })}
                      required
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#50BAA8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                    >
                      <option value="">Select a menu item</option>
                      {menuItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.itemCode}) - Current: {item.stockBalance || 0} portions
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                {/* Selected Item Info Display */}
                {stockFormData.selectedItemId && (() => {
                  const selectedMenuItem = menuItems.find(item => item.id.toString() === stockFormData.selectedItemId);
                  const storeItem = items.find(item => item.itemCode === selectedMenuItem?.itemCode);
                  return storeItem ? (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <h3 className="font-semibold text-gray-900 text-lg">{storeItem.name}</h3>
                      {storeItem.description && (
                        <p className="text-sm text-gray-600 mt-1">{storeItem.description}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-gray-600">Current Stock:</span>
                        <span className="font-semibold text-gray-900">
                          {storeItem.currentBalance} {storeItem.unit}
                        </span>
                      </div>
                    </div>
                  ) : null;
                })()}
                
                {/* Operation Type Tabs */}
                <div>
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setStockFormData({ ...stockFormData, operationType: 'add' })}
                      className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                        stockFormData.operationType === 'add'
                          ? 'bg-white text-green-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Add Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockFormData({ ...stockFormData, operationType: 'remove' })}
                      className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                        stockFormData.operationType === 'remove'
                          ? 'bg-white text-red-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Remove Stock
                    </button>
                  </div>
                </div>
                
                {/* Quantity */}
                <div>
                  <Label className="text-gray-700 font-semibold">Quantity *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={stockFormData.quantity || ""}
                    onChange={(e) => setStockFormData({ ...stockFormData, quantity: parseInt(e.target.value) || 0 })}
                    placeholder="Enter quantity"
                    required
                    className="bg-white border-slate-300 text-gray-900 placeholder-gray-500 mt-1"
                  />
                </div>
                
                {/* New Stock Level Preview */}
                {stockFormData.quantity > 0 && stockFormData.selectedItemId && (() => {
                  const selectedMenuItem = menuItems.find(item => item.id.toString() === stockFormData.selectedItemId);
                  const storeItem = items.find(item => item.itemCode === selectedMenuItem?.itemCode);
                  if (!storeItem) return null;
                  
                  const newBalance = stockFormData.operationType === 'add'
                    ? storeItem.currentBalance + stockFormData.quantity
                    : storeItem.currentBalance - stockFormData.quantity;
                  
                  return (
                    <div className={`p-4 rounded-lg border ${
                      stockFormData.operationType === 'add'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">New Stock Level:</span>
                        <span className={`font-bold ${
                          stockFormData.operationType === 'add' ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {newBalance} {storeItem.unit}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Notes */}
                <div>
                  <Label className="text-gray-700 font-semibold">Notes (Optional)</Label>
                  <Input
                    value={stockFormData.notes}
                    onChange={(e) => setStockFormData({ ...stockFormData, notes: e.target.value })}
                    placeholder="Add any notes..."
                    className="bg-white border-slate-300 text-gray-900 placeholder-gray-500 mt-1"
                  />
                </div>
                
                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#50BAA8] to-teal-600 hover:from-[#3da896] hover:to-teal-700 text-white font-semibold mt-6"
                >
                  {stockFormData.operationType === 'add' ? 'Add Stock' : 'Remove Stock'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        <Card className="bg-white border-slate-200 hover:border-red-500 transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-gray-600">Critical Stock</CardTitle>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{criticalStockItems.length}</div>
            <p className="text-xs text-gray-500 mt-2">Urgent restocking needed</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 hover:border-orange-500 transition-all hover:shadow-lg">
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

        {!isKitchenStaff && (
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
        )}
      </div>

      <Card className="bg-white border-slate-200">
        <CardHeader className="border-b border-slate-200 pb-4">
          <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#50BAA8]" />
            Store Inventory
            <Input
              type="search"
              className="ml-2 px-3 py-2 border border-slate-200 rounded-md"
              placeholder="Search by item name or item code"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                <TableHeader className="font-semibold">
                  <TableRow className="border-slate-200 hover:bg-transparent">
                    <TableHead className="text-gray-700">Name</TableHead>
                    {!isKitchenStaff && <TableHead className="text-gray-700 text-right">Quantity</TableHead>}
                    <TableHead className="text-gray-700 text-right">Remaining</TableHead>
                    {!isKitchenStaff && <TableHead className="text-gray-700 text-right">Used/Sold</TableHead>}
                    {!isKitchenStaff && <TableHead className="text-gray-700 text-right">Total Value</TableHead>}
                    <TableHead className="text-right text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const totalItemValue = item.currentBalance * item.costPrice;
                    const quantityUsed = item.totalOut || 0;

                    return (
                      <TableRow
                        key={item.id}
                        onClick={() => {
                          // Find the corresponding menu item
                          const menuItem = menuItems.find(mi => mi.itemCode === item.itemCode);
                          if (menuItem) {
                            setStockFormData({
                              selectedItemId: menuItem.id.toString(),
                              quantity: 0,
                              operationType: 'add',
                              notes: '',
                            });
                            setShowAddStockDialog(true);
                          }
                        }}
                        className="border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium font-semibold text-gray-900">{item.name}</div>
                            {item.description && <div className="text-sm text-gray-500 mt-1">{item.description}</div>}
                          </div>
                        </TableCell>
                        {!isKitchenStaff && (
                          <TableCell className="text-right text-gray-900 font-medium">
                            {item.totalIn} {item.unit}
                          </TableCell>
                        )}
                        <TableCell className="text-right text-green-600 font-semibold">
                          {item.currentBalance} {item.unit}
                        </TableCell>
                        {!isKitchenStaff && (
                          <TableCell className="text-right text-red-600 font-semibold">
                            {quantityUsed} {item.unit}
                          </TableCell>
                        )}
                        {!isKitchenStaff && (
                          <TableCell className="text-right font-semibold text-gray-900">
                            ₦{totalItemValue.toLocaleString()}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewItemTransactions(item);
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            View History
                          </Button>
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

      {/* Transactions Dialog */}
      <Dialog open={showTransactionsDialog} onOpenChange={setShowTransactionsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Item Transaction History</DialogTitle>
            <DialogDescription>
              All stock movements and transactions for this item
            </DialogDescription>
          </DialogHeader>

          {transactionsLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader className="h-10 w-10 animate-spin text-[#50BAA8]" />
              <p className="mt-3 text-gray-600">Loading transactions...</p>
            </div>
          ) : selectedItemTransactions.length === 0 ? (
            <div className="text-center py-10">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No transactions found for this item</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty In</TableHead>
                    <TableHead className="text-right">Qty Out</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItemTransactions.map((transaction: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="text-sm">
                        {new Date(transaction.date).toLocaleDateString()}
                        <div className="text-xs text-gray-500">
                          {new Date(transaction.date).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.qtyIn > 0 ? "default" : "destructive"}>
                          {transaction.qtyIn > 0 ? 'IN' : 'OUT'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">
                        {transaction.qtyIn || '-'}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-semibold">
                        {transaction.qtyOut || '-'}
                      </TableCell>
                      <TableCell className="text-sm">{transaction.source || '-'}</TableCell>
                      <TableCell className="text-sm">{transaction.destination || '-'}</TableCell>
                      <TableCell className="text-sm">{transaction.performedBy || '-'}</TableCell>
                      <TableCell className="text-sm">{transaction.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
