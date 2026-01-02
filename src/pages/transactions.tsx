import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  Search,
  Download,
  TrendingUp,
  TrendingDown,
  Package,
  FileText,
  History,
  Loader2,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { apiRequest } from "@/lib/queryClient"

interface StoreEntry {
  id: string
  itemCode: string
  date: string
  description: string
  qtyIn: number
  qtyOut: number
  source: string
  destination: string
  referenceType?: string
  referenceId?: string
  performedBy?: string
  notes?: string
}

interface SummaryData {
  totalEntries: number
  totalIn: number
  totalOut: number
  balance: number
  byType: Record<string, { count: number; qtyIn: number; qtyOut: number }>
  bySource: Record<string, { count: number; qtyOut: number }>
  byDestination: Record<string, { count: number; qtyIn: number }>
  recentEntries: StoreEntry[]
}

interface ItemHistoryResponse {
  itemCode: string
  totalEntries: number
  totalIn: number
  totalOut: number
  balance: number
  entries: StoreEntry[]
}

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterLocation, setFilterLocation] = useState<string>("all")
  const [dateRange, setDateRange] = useState<string>("all")

  const [selectedItemCode, setSelectedItemCode] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const { data: summary, isLoading: summaryLoading } = useQuery<SummaryData>({
    queryKey: ["/api/store-entries/summary"],
  })

  const { data: entriesData, isLoading: entriesLoading } = useQuery<{ data: StoreEntry[] }>({
    queryKey: ["/api/store-entries"],
  })

  const entries = entriesData?.data || []

  const {
    data: itemHistory,
    isFetching: historyLoading,
    refetch: refetchHistory,
  } = useQuery<ItemHistoryResponse | null>({
    queryKey: ["/api/store-entries/item-code", selectedItemCode],
    enabled: historyOpen && !!selectedItemCode,
    queryFn: async () => {
      if (!selectedItemCode) throw new Error("Missing item code")
      const response = await apiRequest(
        "GET",
        `/api/store-entries/item-code/${encodeURIComponent(selectedItemCode)}`,
      )
      const result = await response.json()
      return result?.data || null
    },
  })

  useEffect(() => {
    if (historyOpen && selectedItemCode) {
      refetchHistory()
    }
  }, [historyOpen, selectedItemCode, refetchHistory])

  const filteredEntries = entries.filter((entry) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      entry.description.toLowerCase().includes(searchLower) ||
      entry.itemCode.toLowerCase().includes(searchLower) ||
      entry.source.toLowerCase().includes(searchLower) ||
      entry.destination.toLowerCase().includes(searchLower)

    if (!matchesSearch) return false

    if (filterType !== "all" && entry.referenceType !== filterType) return false

    if (filterLocation !== "all") {
      const matchLocation =
        entry.source.toLowerCase().includes(filterLocation.toLowerCase()) ||
        entry.destination.toLowerCase().includes(filterLocation.toLowerCase())
      if (!matchLocation) return false
    }

    if (dateRange !== "all") {
      const entryDate = new Date(entry.date)
      const now = new Date()
      const dayDiff = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      if (dateRange === "today" && dayDiff > 1) return false
      if (dateRange === "week" && dayDiff > 7) return false
      if (dateRange === "month" && dayDiff > 30) return false
    }

    return true
  })

  const transactionTypes = Array.from(new Set(entries.map((e) => e.referenceType).filter(Boolean)))
  const locations = Array.from(new Set([...entries.map((e) => e.source), ...entries.map((e) => e.destination)]))

  const formatDate = (value: string) => {
    const date = new Date(value)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case "purchase":
        return "Purchase"
      case "kitchen_request":
        return "Kitchen Request"
      case "prepared_food":
        return "Prepared Food"
      case "restock":
        return "Restock"
      case "sale":
        return "Sale"
      case "adjustment":
        return "Adjustment"
      default:
        return type || "Other"
    }
  }

  const getTypeColor = (type?: string) => {
    switch (type) {
      case "purchase":
        return "bg-green-100 text-green-800 border-green-200"
      case "kitchen_request":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "prepared_food":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "restock":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "sale":
        return "bg-pink-100 text-pink-800 border-pink-200"
      case "adjustment":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const openHistory = (itemCode: string) => {
    setSelectedItemCode(itemCode)
    setHistoryOpen(true)
  }

  const closeHistory = () => {
    setHistoryOpen(false)
  }

  const ItemHistoryModal = () => (
    <Dialog open={historyOpen} onOpenChange={(open) => (!open ? closeHistory() : null)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <History className="w-5 h-5 text-[#50BAA8]" />
            Item History — {selectedItemCode}
          </DialogTitle>
          <DialogDescription>
            Complete audit trail of <span className="font-semibold text-gray-900">{selectedItemCode}</span>
          </DialogDescription>
        </DialogHeader>

        {historyLoading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-[#50BAA8]" />
            <p className="mt-3 text-sm text-gray-600">Fetching transactions...</p>
          </div>
        ) : !itemHistory ? (
          <div className="py-10 text-center text-gray-500">No history found for this item.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-gray-500">Total Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{itemHistory?.totalEntries ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-gray-500">Total In</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-green-600">
                    {(itemHistory?.totalIn ?? 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-gray-500">Total Out</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-red-600">
                    {(itemHistory?.totalOut ?? 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-gray-500">Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-purple-600">
                    {(itemHistory?.balance ?? 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            <ScrollArea className="h-80 pr-2">
              <div className="space-y-3">
                {(itemHistory?.entries ?? []).map((entry) => (
                  <Card key={entry.id} className="border border-gray-100 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm text-gray-500">{formatDate(entry.date)}</p>
                          <p className="text-lg font-semibold text-gray-900">{entry.description}</p>
                        </div>
                        <Badge className={getTypeColor(entry.referenceType)}>
                          {getTypeLabel(entry.referenceType)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm">
                        <div className="flex items-center gap-2">
                          <ArrowUpCircle className="w-4 h-4 text-green-600" />
                          <span className="text-gray-500">Qty In:</span>
                          <span className="font-semibold text-gray-900">
                            {parseFloat(entry.qtyIn.toString()).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowDownCircle className="w-4 h-4 text-red-600" />
                          <span className="text-gray-500">Qty Out:</span>
                          <span className="font-semibold text-gray-900">
                            {parseFloat(entry.qtyOut.toString()).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Source:</span>
                          <p className="font-semibold">{entry.source}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Destination:</span>
                          <p className="font-semibold">{entry.destination}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Performed By:</span>
                          <p className="font-semibold">{entry.performedBy || "System"}</p>
                        </div>
                        {entry.notes && (
                          <div className="md:col-span-2">
                            <span className="text-gray-500">Notes:</span>
                            <p className="font-medium text-gray-800">{entry.notes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-[#50BAA8] to-teal-600 rounded-xl shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Transactions</h1>
              <p className="text-gray-600 mt-1">Complete inventory movement tracking</p>
            </div>
          </div>
        </div>

        {/* {!summaryLoading && summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-l-4 border-l-blue-500 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Total Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{summary?.totalEntries ?? 0}</div>
                <p className="text-xs text-gray-500 mt-1">All time entries</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Total Incoming
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {(summary?.totalIn ?? 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">Items received</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Total Outgoing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {(summary?.totalOut ?? 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">Items dispatched</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Net Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {(summary?.balance ?? 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">Current balance</p>
              </CardContent>
            </Card>
          </div>
        )} */}

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search items, codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {transactionTypes.map((type) => (
                    <SelectItem key={type} value={type || "other"}>
                      {getTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filteredEntries.length}</span> of {" "}
            <span className="font-semibold text-gray-900">{entries.length}</span> transactions
          </p>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {entriesLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#50BAA8] mx-auto" />
                <p className="mt-4 text-gray-600">Loading transactions...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No transactions found</p>
                <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Date & Time</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Item Code</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Qty In</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Qty Out</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Source</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Destination</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Performed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(entry.date).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(entry.date).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            className="font-mono text-sm text-[#50BAA8] hover:text-[#3b8d7d]"
                            onClick={() => openHistory(entry.itemCode)}
                          >
                            {entry.itemCode}
                          </Button>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{entry.description}</p>
                          {entry.notes && <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">{entry.notes}</p>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {entry.qtyIn > 0 ? (
                            <span className="text-sm font-semibold text-green-600">
                              {parseFloat(entry.qtyIn.toString()).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {entry.qtyOut > 0 ? (
                            <span className="text-sm font-semibold text-red-600">
                              {parseFloat(entry.qtyOut.toString()).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-xs">
                            {entry.source}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-xs">
                            {entry.destination}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getTypeColor(entry.referenceType)}>
                            {getTypeLabel(entry.referenceType)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900">{entry.performedBy || "System"}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedItemCode && <ItemHistoryModal />}
    </div>
  )
}
