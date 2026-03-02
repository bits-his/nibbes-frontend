import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { Clock, Package, ShoppingCart, Loader } from "lucide-react"

interface Reservation {
  id: string
  orderId: string
  menuItemId: string
  itemCode: string
  quantity: number
  reservedAt: string
  expiresAt: string
  status: string
  timeRemaining: number
}

export default function ReservedItems() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchReservations = async () => {
    try {
      const response = await apiRequest("GET", "/api/stock-reservations/active")
      const data = await response.json()
      setReservations(data.data || [])
    } catch (error) {
      console.error("Error fetching reservations:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch reserved items",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReservations()
    const interval = setInterval(fetchReservations, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimeColor = (seconds: number) => {
    if (seconds > 600) return "text-green-600" // > 10 mins
    if (seconds > 300) return "text-yellow-600" // > 5 mins
    return "text-red-600" // < 5 mins
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader className="h-12 w-12 animate-spin text-[#50BAA8]" />
          <p className="mt-4 text-gray-600">Loading reserved items...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-[#50BAA8] to-teal-600 rounded-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Reserved Items</h1>
        </div>
        <p className="text-gray-600 mt-2">Active stock reservations with time remaining</p>
      </div>

      {reservations.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No active reservations</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reservations.map((reservation) => (
            <Card key={reservation.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">{reservation.itemCode}</CardTitle>
                    {/* <p className="text-sm text-gray-500 mt-1">Order #{reservation.orderId.slice(0, 8)}</p> */}
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Quantity:</span>
                  <span className="font-semibold">{reservation.quantity}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${getTimeColor(reservation.timeRemaining)}`} />
                  <span className="text-sm text-gray-600">Time Left:</span>
                  <span className={`font-semibold ${getTimeColor(reservation.timeRemaining)}`}>
                    {formatTime(reservation.timeRemaining)}
                  </span>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500">
                    Reserved: {new Date(reservation.reservedAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Expires: {new Date(reservation.expiresAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
