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
}

interface Category {
  name: string
}

interface WebSocketMessage {
  type: string;
  data: any;
}

const initialFormState = {
  itemCode: "",
  name: "",
  description: "",
  currentBalance: 0,
  unit: "pcs",
  costPrice: 0,
  category: "",
}

type FormState = typeof initialFormState

export default function StoreManagement() {
  const { user } = useAuth()
  const [items, setItems] = useState<StoreItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<StoreItem | null>(null)
  const [selectedItemForDelete, setSelectedItemForDelete] = useState<StoreItem | null>(null)
  const [showRestockDialog, setShowRestockDialog] = useState(false)
  const [selectedItemForRestock, setSelectedItemForRestock] = useState<StoreItem | null>(null)
  const [restockQuantity, setRestockQuantity] = useState(0)
  const [stockOperationType, setStockOperationType] = useState<'add' | 'remove'>('add')
  const [formData, setFormData] = useState<FormState>(initialFormState)
  const [nextItemCode, setNextItemCode] = useState("")
  const [generatingCode, setGeneratingCode] = useState(false)
  const [showTransactionsDialog, setShowTransactionsDialog] = useState(false)
  const [selectedItemTransactions, setSelectedItemTransactions] = useState<any[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const { toast } = useToast()
  const wsRef = useRef<WebSocket | null>(null);

  // Check if user is kitchen staff (not admin)
  const isKitchenStaff = user?.role !== 'admin'

  const fetchNextItemCode = useCallback(async () => {
    try {
      setGeneratingCode(true)
      const response = await apiRequest("GET", "/api/store/items/next-code")
      const data = await response.json()
      const code = data.code ?? ""
      setNextItemCode(code)
      setFormData((prev) => ({ ...prev, itemCode: code }))
    } catch (error) {
      console.error("Error generating item code:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate item code",
      })
    } finally {
      setGeneratingCode(false)
    }
  }, [toast])

  const resetFormFields = useCallback(
    (code?: string) => {
      setFormData({
        ...initialFormState,
        itemCode: code ?? nextItemCode ?? "",
      })
    },
    [nextItemCode]
  )

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
    fetchInventoryCategories()
    fetchNextItemCode()
  }, [fetchNextItemCode])

  const fetchInventoryCategories = async () => {
    try {
      setLoadingCategories(true)
      // Fetch menu categories for Main Kitchen (store items)
      const response = await apiRequest("GET", "/api/menu/categories")
      const data = await response.json()
      console.log('Main Kitchen - Fetched menu categories:', data)
      
      // Extract category names from the response data
      if (Array.isArray(data)) {
        setCategories(data)
        console.log('Main Kitchen - Categories set:', data)
      } else if (data.data && Array.isArray(data.data)) {
        const categoryNames = data.data.map((cat: any) => cat.name || cat)
        setCategories(categoryNames)
        console.log('Main Kitchen - Categories set:', categoryNames)
      } else {
        console.error('Main Kitchen - Unexpected categories format:', data)
        // Fallback to defaults
        setCategories(["Main Course", "Appetizer", "Dessert", "Drinks", "Snacks"])
      }
    } catch (error) {
      console.error("Error fetching menu categories:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch menu categories",
      })
      // Fallback to defaults
      setCategories(["Main Course", "Appetizer", "Dessert", "Drinks", "Snacks"])
    } finally {
      setLoadingCategories(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.itemCode) {
      toast({
        variant: "destructive",
        title: "Item code not ready",
        description: "Please wait for the system to generate the next item code",
      })
      return
    }

    try {
      await apiRequest("POST", "/api/store/items", formData)
      toast({
        title: "Success",
        description: "Store item created successfully",
      })
      setShowAddDialog(false)
      fetchItems()
      resetFormFields()
      fetchNextItemCode()
    } catch (error) {
      console.error("Error creating item:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create store item",
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

  const handleRestockClick = (item: StoreItem) => {
    setSelectedItemForRestock(item)
    setRestockQuantity(0)
    setStockOperationType('add')
    setShowRestockDialog(true)
  }

  const handleRestockSubmit = async () => {
    if (!selectedItemForRestock || restockQuantity <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Please enter a valid quantity to ${stockOperationType === 'add' ? 'add' : 'remove'}`,
      })
      return
    }

    // Check if removing more than available
    if (stockOperationType === 'remove' && restockQuantity > selectedItemForRestock.currentBalance) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Cannot remove ${restockQuantity} ${selectedItemForRestock.unit}. Only ${selectedItemForRestock.currentBalance} ${selectedItemForRestock.unit} available.`,
      })
      return
    }

    try {
      // Use the stock movement endpoint to properly log the stock change
      await apiRequest("POST", `/api/store/movements`, {
        storeItemId: selectedItemForRestock.id,
        type: stockOperationType === 'add' ? "IN" : "OUT",
        quantity: restockQuantity,
        reference: stockOperationType === 'add' ? "restock" : "stock removal",
        notes: `${stockOperationType === 'add' ? 'Restocked' : 'Removed'} ${restockQuantity} ${selectedItemForRestock.unit} of ${selectedItemForRestock.name}`,
      })
      
      toast({
        title: "Success",
        description: `${stockOperationType === 'add' ? 'Added' : 'Removed'} ${restockQuantity} ${selectedItemForRestock.unit} ${stockOperationType === 'add' ? 'to' : 'from'} ${selectedItemForRestock.name}`,
      })
      setShowRestockDialog(false)
      setSelectedItemForRestock(null)
      setRestockQuantity(0)
      setStockOperationType('add')
      fetchItems()
    } catch (error) {
      console.error("Error updating stock:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${stockOperationType === 'add' ? 'add' : 'remove'} stock`,
      })
    }
  }

  const handleEditClick = (item: StoreItem) => {
    setSelectedItemForEdit(item)
    setFormData({
      itemCode: item.itemCode,
      name: item.name,
      description: item.description,
      currentBalance: item.currentBalance,
      unit: item.unit,
      costPrice: item.costPrice,
      category: item.category,
    })
    setShowEditDialog(true)
  }

  const handleEditSubmit = async () => {
    if (!selectedItemForEdit) return

    try {
      await apiRequest("PUT", `/api/store/items/${selectedItemForEdit.id}`, formData)
      toast({
        title: "Success",
        description: "Item updated successfully",
      })
      setShowEditDialog(false)
      setSelectedItemForEdit(null)
      setFormData(initialFormState)
      fetchItems()
    } catch (error) {
      console.error("Error updating item:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update item",
      })
    }
  }

  const handleDeleteClick = (item: StoreItem) => {
    setSelectedItemForDelete(item)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedItemForDelete) return

    try {
      await apiRequest("DELETE", `/api/store/items/${selectedItemForDelete.id}`)
      toast({
        title: "Success",
        description: "Item deleted successfully",
      })
      setShowDeleteDialog(false)
      setSelectedItemForDelete(null)
      fetchItems()
    } catch (error) {
      console.error("Error deleting item:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete item",
      })
    }
  }

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
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a category name",
      });
      return;
    }

    try {
      // Post to menu categories endpoint for Main Kitchen
      await apiRequest("POST", "/api/menu/categories", {
        name: newCategoryName.trim(),
      });

      toast({
        title: "Success",
        description: "Category created successfully",
      });

      setShowAddCategoryDialog(false);
      setNewCategoryName("");
      fetchInventoryCategories(); // Refresh the categories list
    } catch (error) {
      console.error("Error creating category:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create category",
      });
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
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open)
            if (open) {
              resetFormFields()
              fetchNextItemCode()
            } else {
              resetFormFields()
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#50BAA8] to-teal-600 hover:from-[#3da896] hover:to-teal-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all">
                <Plus className="w-5 h-5 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-xl text-gray-900">Add New Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700 font-semibold">Item Code *</Label>
                    <Input
                      value={formData.itemCode}
                      readOnly
                      placeholder={generatingCode ? "Generating code..." : "Auto-generated"}
                      required
                      className="bg-gray-100 border-slate-300 text-gray-700 placeholder-gray-500 mt-1 cursor-not-allowed"
                      title="Item code is auto-generated"
                    />
                    <p className="text-xs text-gray-500 mt-1">Codes use the format ITEM-XXX (e.g., ITEM-001, ITEM-002)</p>
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
                <div>
                  <Label className="text-gray-700 font-semibold">Category *</Label>
                  {loadingCategories ? (
                    <Input
                      value="Loading categories..."
                      disabled
                      className="bg-gray-100 border-slate-300 text-gray-500 mt-1"
                    />
                  ) : (
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#50BAA8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#50BAA8] to-teal-600 hover:from-[#3da896] hover:to-teal-700 text-white font-semibold mt-6"
                  disabled={generatingCode}
                >
                  {generatingCode ? "Preparing item code..." : "Create Item"}
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
                    const quantityUsed = item.initialQuantity - item.currentBalance;

                    return (
                      <TableRow
                        key={item.id}
                        onClick={() => handleRestockClick(item)}
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
                            {item.initialQuantity} {item.unit}
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
                          <div className="flex justify-end gap-2">
                            {/* {!isKitchenStaff && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(item);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(item);
                                  }}
                                  className="text-red-600 hover:text-red-800 hover:underline"
                                >
                                  Delete
                                </button>
                              </>
                            )} */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewItemTransactions(item);
                              }}
                              className="text-green-600 hover:text-green-800 hover:underline"
                            >
                              View
                            </button>
                          </div>
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

      {/* Restock Dialog */}
      <Dialog open={showRestockDialog} onOpenChange={setShowRestockDialog}>
        <DialogContent className="max-w-md bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">
              {stockOperationType === 'add' ? 'Add Stock' : 'Remove Stock'}
            </DialogTitle>
          </DialogHeader>
          {selectedItemForRestock && (
            <div className="space-y-4">
              {/* Operation Type Tabs */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  onClick={() => setStockOperationType('add')}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                    stockOperationType === 'add'
                      ? 'bg-white text-green-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Add Stock
                </button>
                <button
                  onClick={() => setStockOperationType('remove')}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                    stockOperationType === 'remove'
                      ? 'bg-white text-red-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Remove Stock
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 text-lg">{selectedItemForRestock.name}</h3>
                {selectedItemForRestock.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedItemForRestock.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600">Current Stock:</span>
                  <span className="font-semibold text-gray-900">
                    {selectedItemForRestock.currentBalance} {selectedItemForRestock.unit}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-gray-700 font-semibold">
                  Quantity to {stockOperationType === 'add' ? 'Add' : 'Remove'} *
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(Number.parseFloat(e.target.value) || 0)}
                  placeholder={`Enter quantity to ${stockOperationType === 'add' ? 'add' : 'remove'}`}
                  className="bg-white border-slate-300 text-gray-900 mt-1"
                  autoFocus
                />
              </div>
              {restockQuantity > 0 && (
                <div className={`p-4 rounded-lg border ${
                  stockOperationType === 'add'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">New Stock Level:</span>
                    <span className={`font-bold ${
                      stockOperationType === 'add' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {stockOperationType === 'add'
                        ? selectedItemForRestock.currentBalance + restockQuantity
                        : selectedItemForRestock.currentBalance - restockQuantity
                      } {selectedItemForRestock.unit}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRestockDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleRestockSubmit}
                  className={`flex-1 font-semibold text-white ${
                    stockOperationType === 'add'
                      ? 'bg-gradient-to-r from-[#50BAA8] to-teal-600 hover:from-[#3da896] hover:to-teal-700'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                  }`}
                  disabled={restockQuantity <= 0}
                >
                  {stockOperationType === 'add' ? 'Add Stock' : 'Remove Stock'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">Edit Item</DialogTitle>
            <DialogDescription>
              Update the details of this store item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 font-semibold">Item Code</Label>
                <Input
                  value={formData.itemCode}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label className="text-gray-700 font-semibold">Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Item name"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-700 font-semibold">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Item description"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-700 font-semibold">Current Balance *</Label>
                <Input
                  type="number"
                  value={formData.currentBalance}
                  onChange={(e) => setFormData({ ...formData, currentBalance: Number.parseFloat(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-gray-700 font-semibold">Unit *</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="pcs, kg, liters"
                />
              </div>
              <div>
                <Label className="text-gray-700 font-semibold">Cost Price *</Label>
                <Input
                  type="number"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: Number.parseFloat(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-700 font-semibold">Category *</Label>
              {loadingCategories ? (
                <Input
                  value="Loading categories..."
                  disabled
                  className="bg-gray-100"
                />
              ) : (
                <div className="flex gap-2">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#50BAA8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowAddCategoryDialog(true);
                    }}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleEditSubmit}
                className="flex-1 bg-gradient-to-r from-[#50BAA8] to-teal-600 hover:from-[#3da896] hover:to-teal-700 text-white font-semibold"
              >
                Update Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedItemForDelete && (
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="font-semibold text-gray-900 text-lg">{selectedItemForDelete.name}</p>
                {selectedItemForDelete.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedItemForDelete.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Current Stock:</span>
                  <span className="font-semibold text-gray-900">
                    {selectedItemForDelete.currentBalance} {selectedItemForDelete.unit}
                  </span>
                </div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  ⚠️ Warning: All transaction history for this item will be preserved, but the item will no longer be available for new transactions.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold"
                >
                  Delete Item
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transactions Dialog */}
      <Dialog open={showTransactionsDialog} onOpenChange={setShowTransactionsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Item Transactions</DialogTitle>
            <DialogDescription>
              All transactions for the selected item
            </DialogDescription>
          </DialogHeader>

          {transactionsLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader className="h-10 w-10 animate-spin text-[#50BAA8]" />
              <p className="mt-3 text-sm text-gray-600">Loading transactions...</p>
            </div>
          ) : selectedItemTransactions.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              No transactions found for this item
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-semibold border-b pb-2">
                <div>Date</div>
                <div>Type</div>
                <div>Quantity</div>
                <div>Status</div>
              </div>

              {selectedItemTransactions.map((transaction, index) => (
                <div
                  key={index}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 border-b pb-2 text-sm"
                >
                  <div className="text-gray-600">
                    {new Date(transaction.date).toLocaleDateString()}
                  </div>
                  <div>
                    <Badge variant="outline" className="capitalize">
                      {transaction.source} → {transaction.destination}
                    </Badge>
                  </div>
                  <div>
                    <span className={transaction.qtyIn > 0 ? "text-green-600" : "text-red-600"}>
                      {transaction.qtyIn > 0 ? `+${transaction.qtyIn}` : `-${transaction.qtyOut}`}
                      {transaction.unit && ` ${transaction.unit}`}
                    </span>
                  </div>
                  <div>
                    <Badge variant="outline">
                      {transaction.referenceType}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900">Add New Category</DialogTitle>
            <DialogDescription>
              Create a new category for store inventory items
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 font-semibold">Category Name *</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                autoFocus
                className="mt-1"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddCategoryDialog(false);
                  setNewCategoryName("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddCategory}
                className="flex-1 bg-gradient-to-r from-[#50BAA8] to-teal-600 hover:from-[#3da896] hover:to-teal-700 text-white font-semibold"
              >
                Add Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
