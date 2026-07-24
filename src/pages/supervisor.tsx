"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Package, Warehouse, Loader, RefreshCw, ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

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
}

interface WebSocketMessage {
  type: string;
  data: any;
}

export default function Supervisor() {
  const { user } = useAuth()
  const [items, setItems] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showTransactionsDialog, setShowTransactionsDialog] = useState(false)
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null)
  const [selectedItemTransactions, setSelectedItemTransactions] = useState<any[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const { toast } = useToast()
  const wsRef = useRef<WebSocket | null>(null);

  // Check if user is kitchen staff (not admin)
  const isKitchenStaff = user?.role !== 'admin'

  // Set up WebSocket to receive real-time updates for store items
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("Supervisor WebSocket connected");
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
          console.log('Supervisor WebSocket received unknown event:', message.type);
      }
    };

    socket.onerror = (error) => {
      console.error("Supervisor WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("Supervisor WebSocket disconnected");
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

  const today = new Date().toISOString().split('T')[0];

  const filteredTransactions = selectedItemTransactions.filter((t: any) => {
    const tDate = new Date(t.date).toISOString().split('T')[0];
    if (dateRange.start && dateRange.end) return tDate >= dateRange.start && tDate <= dateRange.end;
    if (dateRange.start) return tDate >= dateRange.start;
    if (dateRange.end) return tDate <= dateRange.end;
    return true;
  });

  const handleViewItemTransactions = async (item: StoreItem) => {
    try {
      setTransactionsLoading(true);
      setSelectedItem(item);
      setDateRange({ start: today, end: today });
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

  const transactionSummary = {
    totalIn: filteredTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.qtyIn || 0), 0),
    totalOut: filteredTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.qtyOut || 0), 0),
    get balance() { return this.totalIn - this.totalOut; }
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
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Supervisor</h1>
            </div>
            <p className="text-gray-600 mt-2">View inventory and stock movements (Read-only)</p>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchItems()}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {/* Add Item button commented out for read-only mode */}
          {/* <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open)
            if (!open) {
              resetFormFields()
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#50BAA8] to-teal-600 hover:from-[#3da896] hover:to-teal-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all">
                <Plus className="w-5 h-5 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
          </Dialog> */}
        </div>
      </div>

      {/* Statistics cards commented out for read-only mode */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
      </div> */}

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
                    {/* Total Value column commented out as requested */}
                    {/* {!isKitchenStaff && <TableHead className="text-gray-700 text-right">Total Value</TableHead>} */}
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
                        // onClick handler commented out - read-only mode, no clicking to add/reduce quantity
                        // onClick={() => handleRestockClick(item)}
                        className="border-slate-200 hover:bg-slate-50 transition-colors"
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
                        {/* Total Value cell commented out as requested */}
                        {/* {!isKitchenStaff && (
                          <TableCell className="text-right font-semibold text-gray-900">
                            ₦{totalItemValue.toLocaleString()}
                          </TableCell>
                        )} */}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {/* Edit, Delete, and Restock buttons commented out for read-only mode */}
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

      {/* Restock Dialog commented out for read-only mode */}
      {/* <Dialog open={showRestockDialog} onOpenChange={setShowRestockDialog}>
        ...
      </Dialog> */}

      {/* Edit Dialog commented out for read-only mode */}
      {/* <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        ...
      </Dialog> */}

      {/* Delete Confirmation Dialog commented out for read-only mode */}
      {/* <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        ...
      </Dialog> */}

      <Dialog open={showTransactionsDialog} onOpenChange={(open) => { setShowTransactionsDialog(open); if (!open) setDateRange({ start: '', end: '' }); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Item History — {selectedItem?.itemCode}</DialogTitle>
            <DialogDescription>
              Complete audit trail of {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>

          {transactionsLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader className="h-12 w-12 animate-spin text-[#50BAA8]" />
              <p className="mt-4 text-gray-600">Loading transaction history...</p>
            </div>
          ) : (
            <>
              {/* Date Range Filter */}
              <div className="flex gap-4 items-end bg-slate-50 p-4 rounded-lg">
                <div className="flex-1">
                  <Label>From</Label>
                  <Input type="date" value={dateRange.start} onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))} />
                </div>
                <div className="flex-1">
                  <Label>To</Label>
                  <Input type="date" value={dateRange.end} onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))} />
                </div>
                <Button variant="outline" onClick={() => { const today = new Date().toISOString().split('T')[0]; setDateRange({ start: today, end: today }); }}>Today</Button>
                <Button variant="outline" onClick={() => setDateRange({ start: '', end: '' })}>Clear</Button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Total In</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-semibold text-green-600">{transactionSummary.totalIn.toLocaleString()}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Total Out</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-semibold text-red-600">{transactionSummary.totalOut.toLocaleString()}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">Balance</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-semibold text-purple-600">{transactionSummary.balance.toLocaleString()}</p></CardContent>
                </Card>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No transactions found</p>
                </div>
              ) : (
                <ScrollArea className="h-96 pr-2">
                  <div className="space-y-3">
                    {filteredTransactions.map((transaction: any, index: number) => (
                      <Card key={transaction.id ?? index} className="border border-gray-100 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div>
                              <p className="text-sm text-gray-500">
                                {new Date(transaction.date).toLocaleDateString()} {new Date(transaction.date).toLocaleTimeString()}
                              </p>
                              <p className="text-lg font-semibold text-gray-900">{transaction.description}</p>
                            </div>
                            <Badge variant={transaction.qtyIn > 0 ? "default" : "destructive"}>
                              {transaction.qtyIn > 0 ? 'IN' : 'OUT'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <ArrowUpCircle className="w-4 h-4 text-green-600" />
                              <span className="text-gray-500">Qty In:</span>
                              <span className="font-semibold text-gray-900">{parseFloat(transaction.qtyIn || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ArrowDownCircle className="w-4 h-4 text-red-600" />
                              <span className="text-gray-500">Qty Out:</span>
                              <span className="font-semibold text-gray-900">{parseFloat(transaction.qtyOut || 0).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Source:</span>
                              <p className="font-semibold">{transaction.source || '-'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Destination:</span>
                              <p className="font-semibold">{transaction.destination || '-'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Performed By:</span>
                              <p className="font-semibold">{transaction.performedBy || 'System'}</p>
                            </div>
                            {transaction.notes && (
                              <div className="md:col-span-2">
                                <span className="text-gray-500">Notes:</span>
                                <p className="font-medium text-gray-800">{transaction.notes}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog commented out for read-only mode */}
      {/* <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        ...
      </Dialog> */}
    </div>
  )
}
