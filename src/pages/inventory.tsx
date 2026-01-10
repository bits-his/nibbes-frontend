import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, Package, AlertTriangle, CheckCircle, MinusCircle, PlusCircle, Loader, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface InventoryItem {
  id: string
  itemCode?: string
  name: string
  description: string
  quantity: number
  unit: string
  minThreshold: number
  pricePerUnit: string
  category: string
  supplier: string
  expiryDate?: string
  createdAt: string
  updatedAt: string
}

interface WebSocketMessage {
  event: string;
  data: any;
}

interface InventorySummary {
  totalItems: number
  totalValue: string
  lowStockItems: number
  outOfStockItems: number
  categories: string[]
}

export default function InventoryManagement() {
  const { toast } = useToast()
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null)
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showLowStockOnly, setShowLowStockOnly] = useState<boolean>(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false)
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState<boolean>(false)
  const [inventoryCategories, setInventoryCategories] = useState<string[]>([])
  const [newCategoryName, setNewCategoryName] = useState<string>("")
  const [newCategoryDescription, setNewCategoryDescription] = useState<string>("")
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [showTransactionsDialog, setShowTransactionsDialog] = useState<boolean>(false)
  const [selectedItemTransactions, setSelectedItemTransactions] = useState<any[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState<boolean>(false)
  const [showDeleteItemDialog, setShowDeleteItemDialog] = useState<boolean>(false)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null)
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState<boolean>(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const fetchInventoryData = async () => {
      setLoading(true)
      setError(null)

      try {
        const itemsResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://server.brainstorm.ng/nibbleskitchen'}/api/inventory`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        })

        if (!itemsResponse.ok) {
          throw new Error(`Failed to fetch inventory items: ${itemsResponse.status}`)
        }

        const itemsData = await itemsResponse.json()
        const inventoryItems = itemsData.data || []

        setInventoryItems(inventoryItems)
        setFilteredItems(inventoryItems)

        const totalItems = inventoryItems.length
        const totalValue = inventoryItems.reduce((sum: number, item: InventoryItem) => {
          return sum + Number.parseFloat(item.pricePerUnit) * item.quantity
        }, 0)

        const lowStockItems = inventoryItems.filter(
          (item: InventoryItem) => item.quantity > 0 && item.quantity <= item.minThreshold,
        ).length

        const outOfStockItems = inventoryItems.filter((item: InventoryItem) => item.quantity === 0).length

        const categories = Array.from(new Set(inventoryItems.map((item: InventoryItem) => item.category))) as string[]

        setInventorySummary({
          totalItems,
          totalValue: totalValue.toFixed(2),
          lowStockItems,
          outOfStockItems,
          categories,
        })
      } catch (err) {
        console.error("Error fetching inventory data:", err)
        setError(err instanceof Error ? err.message : "Failed to load inventory data")
      } finally {
        setLoading(false)
      }
    }

    // Connect to WebSocket for real-time inventory updates
    const connectWebSocket = () => {
      try {
        const wsUrl = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log('Inventory WebSocket connected');
        };

        wsRef.current.onmessage = (event) => {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch(message.event) {
            case 'inventory-update':
              // Reload inventory data when items are updated
              fetchInventoryData();
              break;
            case 'inventory-change':
              // Specifically for inventory level changes
              fetchInventoryData();
              break;
            case 'item-added':
            case 'item-removed':
              // Reload when items are added or removed
              fetchInventoryData();
              break;
            case 'quantity-updated':
              // Reload when quantities change
              fetchInventoryData();
              break;
            default:
              console.log('Received unknown event:', message.event);
          }
        };

        wsRef.current.onclose = () => {
          console.log('Inventory WebSocket disconnected');
          // Attempt to reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };

        wsRef.current.onerror = (error) => {
          console.error('Inventory WebSocket error:', error);
        };
      } catch (error) {
        console.error('Error connecting to Inventory WebSocket:', error);
      }
    };

    fetchInventoryData();
    fetchInventoryCategories();
    connectWebSocket();

    // Cleanup function
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [])

  useEffect(() => {
    let result = inventoryItems

    if (selectedCategory !== "all") {
      result = result.filter((item) => item.category === selectedCategory)
    } 

    if (showLowStockOnly) {
      result = result.filter((item) => item.quantity <= item.minThreshold)
    }

    setFilteredItems(result)
  }, [selectedCategory, showLowStockOnly, inventoryItems])

  const handleAddItem = async (itemData: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://server.brainstorm.ng/nibbleskitchen'}/api/inventory`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(itemData)
      });

      if (!response.ok) {
        throw new Error(`Failed to add inventory item: ${response.status}`);
      }

      const result = await response.json();
      const newItem = result.data; // Assuming backend returns the created item

      setInventoryItems([...inventoryItems, newItem]);
      setFilteredItems([...filteredItems, newItem]);
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error adding inventory item:', error);
      // Still add to UI for immediate feedback, but show error
      const newItem: InventoryItem = {
        ...itemData,
        id: `item_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setInventoryItems([...inventoryItems, newItem]);
      setFilteredItems([...filteredItems, newItem]);
      setIsAddDialogOpen(false);
    }
  }

  const handleEditItem = async (itemData: InventoryItem) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://server.brainstorm.ng/nibbleskitchen'}/api/inventory/${itemData.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: itemData.name,
          description: itemData.description,
          quantity: itemData.quantity,
          unit: itemData.unit,
          minThreshold: itemData.minThreshold,
          pricePerUnit: itemData.pricePerUnit,
          category: itemData.category,
          supplier: itemData.supplier,
          expiryDate: itemData.expiryDate
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update inventory item: ${response.status}`);
      }

      const result = await response.json();
      const updatedItem = result.data; // Assuming backend returns the updated item

      const updatedItems = inventoryItems.map(item =>
        item.id === itemData.id ? updatedItem : item
      );

      setInventoryItems(updatedItems);
      setFilteredItems(updatedItems.filter(item => {
        let match = true;
        if (selectedCategory !== 'all') {
          match = match && item.category === selectedCategory;
        }
        if (showLowStockOnly) {
          match = match && item.quantity <= item.minThreshold;
        }
        return match;
      }));
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating inventory item:', error);
      // Still update UI for immediate feedback, but show error
      const updatedItems = inventoryItems.map(item =>
        item.id === itemData.id ? itemData : item
      );

      setInventoryItems(updatedItems);
      setFilteredItems(updatedItems.filter(item => {
        let match = true;
        if (selectedCategory !== 'all') {
          match = match && item.category === selectedCategory;
        }
        if (showLowStockOnly) {
          match = match && item.quantity <= item.minThreshold;
        }
        return match;
      }));
      setIsEditDialogOpen(false);
    }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://server.brainstorm.ng/nibbleskitchen'}/api/inventory/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to delete item: ${response.status}`)
      }

      // Update UI after successful deletion
      const updatedItems = inventoryItems.filter((item) => item.id !== id)
      setInventoryItems(updatedItems)
      setFilteredItems(
        updatedItems.filter((item) => {
          let match = true
          if (selectedCategory !== "all") {
            match = match && item.category === selectedCategory
          }
          if (showLowStockOnly) {
            match = match && item.quantity <= item.minThreshold
          }
          return match
        }),
      )
      
      // Close dialog and show success toast
      setShowDeleteItemDialog(false)
      setItemToDelete(null)
      toast({
        title: "Success",
        description: "Item deleted successfully.",
      })
    } catch (error) {
      console.error('Error deleting item:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete item. Please try again.",
      })
    }
  }

  const handleQuantityUpdate = (id: string, quantity: number, operation: "add" | "remove") => {
    const updatedItems = inventoryItems.map((item) => {
      if (item.id === id) {
        const newQuantity = operation === "add" ? item.quantity + quantity : Math.max(0, item.quantity - quantity)

        return { ...item, quantity: newQuantity }
      }
      return item
    })

    setInventoryItems(updatedItems)
    setFilteredItems(
      updatedItems.filter((item) => {
        let match = true
        if (selectedCategory !== "all") {
          match = match && item.category === selectedCategory
        }
        if (showLowStockOnly) {
          match = match && item.quantity <= item.minThreshold
        }
        return match
      }),
    )
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a category name",
      })
      return
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://server.brainstorm.ng/nibbleskitchen'}/api/inventory-categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName,
          description: newCategoryDescription,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create category')
      }

      // Refresh categories
      await fetchInventoryCategories()

      setNewCategoryName('')
      setNewCategoryDescription('')
      toast({
        title: "Success",
        description: "Category added successfully!",
      })
    } catch (error) {
      console.error('Error adding category:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to add category',
      })
    }
  }

  const handleDeleteCategory = async (categoryName: string) => {
    try {
      // First, get the category ID by name
      const categoriesResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://server.brainstorm.ng/nibbleskitchen'}/api/inventory-categories`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      })

      if (!categoriesResponse.ok) {
        throw new Error('Failed to fetch categories')
      }

      const data = await categoriesResponse.json()
      const categories = data.data || []
      const category = categories.find((cat: any) => cat.name === categoryName)

      if (!category) {
        throw new Error('Category not found')
      }

      // Delete the category
      const deleteResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://server.brainstorm.ng/nibbleskitchen'}/api/inventory-categories/${category.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      })

      if (!deleteResponse.ok) {
        const error = await deleteResponse.json()
        throw new Error(error.error || 'Failed to delete category')
      }

      // Refresh categories
      await fetchInventoryCategories()

      // Close dialog and show success toast
      setShowDeleteCategoryDialog(false)
      setCategoryToDelete(null)
      toast({
        title: "Success",
        description: "Category deleted successfully!",
      })
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete category',
      })
    }
  }

  const fetchInventoryCategories = async () => {
    try {
      setLoadingCategories(true)
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://server.brainstorm.ng/nibbleskitchen'}/api/inventory-categories`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        const categories = (data.data || []).map((cat: any) => cat.name)
        setInventoryCategories(categories)
      }
    } catch (error) {
      console.error("Error fetching inventory categories:", error)
    } finally {
      setLoadingCategories(false)
    }
  }

  // Function to handle viewing item transactions
  const handleViewItemTransactions = async (item: InventoryItem) => {
    try {
      setTransactionsLoading(true);
      setShowTransactionsDialog(true);

      // Fetch transaction data for the specific item
      // Try using itemCode first, fall back to item ID
      const identifier = item.itemCode || item.id;
      const endpoint = item.itemCode 
        ? `/api/store-entries/item-code/${item.itemCode}`
        : `/api/store-entries/inventory/${item.id}`;

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://server.brainstorm.ng/nibbleskitchen'}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`);
      }

      const data = await response.json();

      // Handle different response formats and transform to expected format
      let rawEntries = data.entries || data.data?.entries || data.data || data || [];
      
      // Transform entries to match expected format
      const transactions = rawEntries.map((entry: any) => ({
        transactionType: entry.qtyIn > 0 ? 'IN' : 'OUT',
        quantity: entry.qtyIn > 0 ? entry.qtyIn : entry.qtyOut,
        unit: item.unit || '',
        transactionDate: entry.date || entry.createdAt,
        location: entry.qtyIn > 0 ? entry.source : entry.destination,
        remarks: entry.description || entry.notes || '',
        costPrice: entry.costPrice || 0,
        balanceAfter: entry.balanceAfter || 'N/A',
      }));
      
      setSelectedItemTransactions(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      // Show empty state instead of error
      setSelectedItemTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  }

  const getStatusColor = (quantity: number, minThreshold: number) => {
    if (quantity === 0) return "bg-red-100 text-red-800"
    if (quantity <= minThreshold) return "bg-yellow-100 text-yellow-800"
    return "bg-green-100 text-green-800"
  }

  const getStatusText = (quantity: number, minThreshold: number) => {
    if (quantity === 0) return "SOLD OUT"
    if (quantity <= minThreshold) return "Low Stock"
    return "In Stock"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 space-y-6">
      {loading && (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader className="h-8 w-8 animate-spin text-[#50BAA8]" />
          <p className="text-slate-600">Loading inventory data...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center text-red-800 gap-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span>Error: {error}</span>
          </div>
          <Button variant="outline" className="mt-3 bg-transparent" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && inventorySummary && (
        <>
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Store Inventory</h1>
              <p className="text-slate-600 mt-2">Track and manage your ingredients and supplies</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setIsAddCategoryDialogOpen(true)}
                variant="outline"
                className="border-[#50BAA8] text-[#50BAA8] hover:bg-[#50baa80d] gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-[#50BAA8] hover:bg-[#3fa391] text-white gap-2 shadow-md"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Items</CardTitle>
                <Package className="h-5 w-5 text-[#50BAA8]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{inventorySummary?.totalItems || 0}</div>
                <p className="text-xs text-slate-500 mt-1">All inventory items</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Value</CardTitle>
                <Package className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">₦{new Intl.NumberFormat('en-NZ', { minimumFractionDigits: 2 }).format(Number.parseFloat(inventorySummary?.totalValue || '0'))}</div>
                <p className="text-xs text-slate-500 mt-1">Current inventory value</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Low Stock</CardTitle>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{inventorySummary?.lowStockItems || 0}</div>
                <p className="text-xs text-slate-500 mt-1">Items below threshold</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">SOLD OUT</CardTitle>
                <CheckCircle className="h-5 w-5 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{inventorySummary?.outOfStockItems || 0}</div>
                <p className="text-xs text-slate-500 mt-1">Items with 0 quantity</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {(inventoryCategories.length > 0 ? inventoryCategories : inventorySummary?.categories || []).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="lowStockOnly"
                  checked={showLowStockOnly}
                  onChange={(e) => setShowLowStockOnly(e.target.checked)}
                  className="h-4 w-4 text-[#50BAA8] focus:ring-[#50BAA8] border-gray-300 rounded cursor-pointer"
                />
                <Label htmlFor="lowStockOnly" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Show Low Stock Only
                </Label>
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <Card className="border-0 shadow-md">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-slate-900">Inventory Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-b border-slate-200 hover:bg-slate-50">
                      <TableHead className="text-slate-700 font-semibold">Item Name</TableHead>
                      <TableHead className="text-slate-700 font-semibold">Category</TableHead>
                      <TableHead className="text-slate-700 font-semibold">Quantity</TableHead>
                      <TableHead className="text-slate-700 font-semibold">Unit</TableHead>
                      <TableHead className="text-slate-700 font-semibold">Min Threshold</TableHead>
                      <TableHead className="text-slate-700 font-semibold">Price/Unit</TableHead>
                      <TableHead className="text-slate-700 font-semibold">Expiry Date</TableHead>
                      <TableHead className="text-slate-700 font-semibold">Status</TableHead>
                      <TableHead className="text-slate-700 font-semibold">Supplier</TableHead>
                      <TableHead className="text-right text-slate-700 font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                          <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-800">
                              {item.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-700">{item.quantity}</TableCell>
                          <TableCell className="text-slate-700">{item.unit}</TableCell>
                          <TableCell className="text-slate-700">{item.minThreshold}</TableCell>
                          <TableCell className="text-slate-700">₦{Number(item.pricePerUnit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-slate-700">
                            {item.expiryDate ? 
                              new Date(item.expiryDate).toLocaleDateString() : 
                              "No expiry date"
                            }
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(item.quantity, item.minThreshold)}>
                              {getStatusText(item.quantity, item.minThreshold)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-700">{item.supplier}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCurrentItem(item)
                                  setIsEditDialogOpen(true)
                                }}
                                className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                                title="Edit item"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setItemToDelete(item)
                                  setShowDeleteItemDialog(true)
                                }}
                                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                                title="Delete item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewItemTransactions(item)}
                                className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                                title="View Transactions"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-8 w-8 text-slate-300" />
                            <p className="text-slate-500">No inventory items found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Add Category Dialog */}
          <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Inventory Categories</DialogTitle>
                <DialogDescription>Add new categories or delete existing ones</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Add New Category Section */}
                <div className="space-y-4 pb-4 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">Add New Category</h3>
                  <div className="flex gap-2">
                    <Input
                      id="categoryName"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Daily Fresh"
                      className="border-slate-200 flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                    <Button 
                      className="bg-[#50BAA8] text-white" 
                      onClick={handleAddCategory}
                      disabled={!newCategoryName.trim()}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  {/* <div className="space-y-2">
                    <Label htmlFor="categoryDescription">Description (optional)</Label>
                    <Input
                      id="categoryDescription"
                      value={newCategoryDescription}
                      onChange={(e) => setNewCategoryDescription(e.target.value)}
                      placeholder="Describe what items go into this category"
                      className="border-slate-200"
                    />
                  </div> */}
                </div>

                {/* Existing Categories Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Existing Categories</h3>
                  {loadingCategories ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader className="h-6 w-6 animate-spin text-[#50BAA8]" />
                      <span className="ml-2 text-slate-600">Loading categories...</span>
                    </div>
                  ) : inventoryCategories.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {inventoryCategories.map((category, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                          <span className="font-medium text-slate-900">{category}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCategoryToDelete(category)
                              setShowDeleteCategoryDialog(true)
                            }}
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                            title="Delete category"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Package className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                      <p>No categories yet. Add one above!</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-200">
                  <Button variant="outline" onClick={() => setIsAddCategoryDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Item Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Inventory Item</DialogTitle>
                <DialogDescription>Add a new item to your inventory</DialogDescription>
              </DialogHeader>
              <AddEditInventoryForm
                onSubmit={handleAddItem}
                onCancel={() => setIsAddDialogOpen(false)}
                isEdit={false}
                inventoryCategories={inventoryCategories}
              />
            </DialogContent>
          </Dialog>

          {/* Edit Item Dialog */}
          {currentItem && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Inventory Item</DialogTitle>
                  <DialogDescription>Update the details of this inventory item</DialogDescription>
                </DialogHeader>
                <AddEditInventoryForm
                  onSubmit={(data) => handleEditItem({ ...currentItem, ...data })}
                  onCancel={() => {
                    setIsEditDialogOpen(false)
                    setCurrentItem(null)
                  }}
                  isEdit={true}
                  initialData={currentItem}
                  inventoryCategories={inventoryCategories}
                />
              </DialogContent>
            </Dialog>
          )}

          {/* Transactions Dialog */}
          <Dialog open={showTransactionsDialog} onOpenChange={setShowTransactionsDialog}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Item Transaction History</DialogTitle>
                <DialogDescription>
                  View all stock movements and transactions for this item
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="h-6 w-6 animate-spin text-[#50BAA8]" />
                    <span className="ml-2 text-slate-600">Loading transactions...</span>
                  </div>
                ) : selectedItemTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {selectedItemTransactions.map((transaction: any, index: number) => (
                      <Card key={index} className="border-slate-200">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={
                                    transaction.transactionType === 'IN'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }
                                >
                                  {transaction.transactionType === 'IN' ? 'Stock In' : 'Stock Out'}
                                </Badge>
                                <span className="text-sm text-slate-600">
                                  {new Date(transaction.transactionDate).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-slate-900">
                                Quantity: {transaction.quantity} {transaction.unit || ''}
                              </p>
                              {transaction.location && (
                                <p className="text-sm text-slate-600">
                                  Location: {transaction.location}
                                </p>
                              )}
                              {transaction.remarks && (
                                <p className="text-sm text-slate-600">
                                  Remarks: {transaction.remarks}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-900">
                                ₦{Number(transaction.costPrice || 0).toLocaleString()}
                              </p>
                              <p className="text-xs text-slate-500">
                                Balance: {transaction.balanceAfter || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No transactions found for this item</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Item Confirmation Dialog */}
          <AlertDialog open={showDeleteItemDialog} onOpenChange={setShowDeleteItemDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>{itemToDelete?.name}</strong>? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => itemToDelete && handleDeleteItem(itemToDelete.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete Category Confirmation Dialog */}
          <AlertDialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the category <strong>"{categoryToDelete}"</strong>? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => categoryToDelete && handleDeleteCategory(categoryToDelete)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}

interface AddEditInventoryFormProps {
  onSubmit: (data: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => void
  onCancel: () => void
  isEdit: boolean
  initialData?: InventoryItem
  inventoryCategories?: string[]
}

const AddEditInventoryForm: React.FC<AddEditInventoryFormProps> = ({ onSubmit, onCancel, isEdit, initialData, inventoryCategories = [] }) => {
  const [name, setName] = useState(initialData?.name || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || "0")
  const [unit, setUnit] = useState(initialData?.unit || "kg")
  const [minThreshold, setMinThreshold] = useState(initialData?.minThreshold?.toString() || "5")
  const [pricePerUnit, setPricePerUnit] = useState(initialData?.pricePerUnit || "0.00")
  const [category, setCategory] = useState(initialData?.category || "Meat")
  const [supplier, setSupplier] = useState(initialData?.supplier || "")
  const [expiryDate, setExpiryDate] = useState(initialData?.expiryDate || "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const itemData = {
      name,
      description,
      quantity: Number.parseInt(quantity, 10),
      unit,
      minThreshold: Number.parseInt(minThreshold, 10),
      pricePerUnit,
      category,
      supplier,
      expiryDate: expiryDate || undefined,
    }

    onSubmit(itemData)

    setName("")
    setDescription("")
    setQuantity("0")
    setUnit("kg")
    setMinThreshold("5")
    setPricePerUnit("0.00")
    setCategory("Meat")
    setSupplier("")
    setExpiryDate("")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Item Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="border-slate-200" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border-slate-200"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className="border-slate-200"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger className="border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">kg</SelectItem>
              <SelectItem value="pieces">pieces</SelectItem>
              <SelectItem value="liters">liters</SelectItem>
              <SelectItem value="grams">grams</SelectItem>
              <SelectItem value="bunch">bunch</SelectItem>
              <SelectItem value="pack">pack</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minThreshold">Min Threshold</Label>
          <Input
            id="minThreshold"
            type="number"
            min="0"
            value={minThreshold}
            onChange={(e) => setMinThreshold(e.target.value)}
            required
            className="border-slate-200"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pricePerUnit">Price Per Unit (₦)</Label>
          <Input
            id="pricePerUnit"
            type="number"
            step="0.01"
            min="0"
            value={pricePerUnit}
            onChange={(e) => setPricePerUnit(e.target.value)}
            required
            className="border-slate-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {inventoryCategories.length > 0 ? (
                inventoryCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))
              ) : (
                <>
                  <SelectItem value="Meat">Meat</SelectItem>
                  <SelectItem value="Vegetables">Vegetables</SelectItem>
                  <SelectItem value="Grains">Grains</SelectItem>
                  <SelectItem value="Oil">Oil</SelectItem>
                  <SelectItem value="Perishable">Perishable</SelectItem>
                  <SelectItem value="Daily Fresh">Daily Fresh</SelectItem>
                  <SelectItem value="Dairy">Dairy</SelectItem>
                  <SelectItem value="Bakery">Bakery</SelectItem>
                  <SelectItem value="Frozen">Frozen</SelectItem>
                  <SelectItem value="Beverages">Beverages</SelectItem>
                  <SelectItem value="Spices">Spices</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="supplier">Supplier</Label>
          <Input
            id="supplier"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            required
            className="border-slate-200"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiryDate">Expiry Date (optional)</Label>
        <Input
          id="expiryDate"
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className="border-slate-200"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-[#50BAA8] hover:bg-[#3fa391] text-white">
          {isEdit ? "Update Item" : "Add Item"}
        </Button>
      </div>
    </form>
  )
}