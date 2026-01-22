"use client"

import { useState, useEffect, useRef } from "react"
import { apiRequest } from "@/lib/queryClient"
import { Wifi, WifiOff } from "lucide-react"

interface Order {
  id: string
  orderNumber: number | string
  status: string
  customerName: string
  orderItems?: Array<{
    id: string
    quantity: number
    menuItem?: {
      name: string
    }
  }>
  items?: Array<{
    id: number
    menuItemName: string
    quantity: number
  }>
  createdAt: string
  updatedAt: string
}

interface WebSocketMessage {
  type: string
  data: any
  order?: any  // Some messages have order property instead of data
}

// Time Display Component
function TimeDisplay() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timerId = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timerId)
  }, [])

  const timeString = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })

  return (
    <p className="text-xs md:text-lg text-gray-500">
      <span>{timeString}</span>
    </p>
  )
}

export default function TVDisplay() {
  const [readyOrders, setReadyOrders] = useState<Order[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  
  // Pagination: 20 orders per page (5 columns x 4 rows)
  const ordersPerPage = 20
  const totalPages = Math.ceil(readyOrders.length / ordersPerPage)
  const displayedOrders = readyOrders.slice(
    currentPage * ordersPerPage,
    (currentPage + 1) * ordersPerPage
  )
  
  // Auto-scroll every 5 seconds if there are more than 20 orders
  useEffect(() => {
    if (readyOrders.length <= ordersPerPage) {
      setCurrentPage(0)
      return
    }
    
    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages)
    }, 5000) // 5 seconds
    
    return () => clearInterval(interval)
  }, [readyOrders.length, totalPages, ordersPerPage])

  // Fetch initial ready orders
  const fetchReadyOrders = async () => {
    console.log('🔵 TV Display: Initializing...')
    console.log('🔵 TV Display: Fetching existing ready orders...')
    
    try {
      setLoading(true)
      
      // Fetch orders without authentication from public TV Display endpoint
      const backendUrl = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5050' : 'https://server.brainstorm.ng/nibbleskitchen')
      const response = await fetch(`${backendUrl}/api/orders/tv-display/ready`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('⚠️ Endpoint requires authentication - using WebSocket-only mode')
          console.log('💡 Tip: Orders will appear as they become "ready" via WebSocket')
        } else {
          console.log('⚠️ Could not fetch orders (status: ' + response.status + '), will rely on WebSocket only')
        }
        setLoading(false)
        return
      }
      
      const data = await response.json()
      console.log('📦 Received orders:', data.length)
      
      // Filter only ready orders
      const ready = Array.isArray(data) 
        ? data.filter((order: Order) => order.status === "ready")
        : []
      
      console.log('✅ Found ready orders:', ready.length)
      
      // Sort by createdAt (newest first)
      ready.sort((a: Order, b: Order) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      setReadyOrders(ready)
      console.log('🎯 TV Display: Ready orders loaded successfully!')
    } catch (error) {
      console.error('❌ Error fetching ready orders:', error)
      console.log('⚠️ Will rely on WebSocket for updates')
    } finally {
      setLoading(false)
    }
  }

  // WebSocket connection and real-time updates
  useEffect(() => {
    fetchReadyOrders()

    const connectWebSocket = () => {
      const wsUrl = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws'
      
      console.log('🔌 TV Display: Connecting to WebSocket:', wsUrl)
      
      try {
        const socket = new WebSocket(wsUrl)
        
        socket.onopen = () => {
          console.log("✅ TV Display: WebSocket connected successfully!")
          console.log('🟢 Connection Status: LIVE')
          setIsConnected(true)
        }
        
        socket.onmessage = (event) => {
          const message: WebSocketMessage = JSON.parse(event.data)
          
          console.log("TV Display received message:", message)
          
          // Handle different WebSocket events
          switch(message.type) {
            case 'order_status_change':  // Backend sends this event
            case 'order_status_updated':
            case 'order_ready':
            case 'order_update':
            case 'new_order':
              // Use message.order if available, otherwise message.data
              handleOrderUpdate(message.order || message.data)
              break
            
            case 'order_completed':
              handleOrderCompleted(message.order || message.data)
              break
            
            default:
              // For any order-related event, check the status
              const orderData = message.order || message.data
              if (orderData && orderData.status) {
                handleOrderUpdate(orderData)
              }
          }
        }
        
        socket.onerror = (error) => {
          console.error("TV Display WebSocket error:", error)
          setIsConnected(false)
        }
        
        socket.onclose = () => {
          console.log("TV Display WebSocket disconnected")
          setIsConnected(false)
          
          // Attempt to reconnect after 3 seconds
          setTimeout(() => {
            console.log("Attempting to reconnect...")
            connectWebSocket()
          }, 3000)
        }
        
        wsRef.current = socket
      } catch (error) {
        console.error("Error connecting to WebSocket:", error)
        setIsConnected(false)
        
        // Retry connection after 3 seconds
        setTimeout(connectWebSocket, 3000)
      }
    }

    connectWebSocket()

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // Handle order updates from WebSocket
  const handleOrderUpdate = (orderData: any) => {
    if (!orderData) {
      console.log('⚠️ TV Display: Received empty order data')
      return
    }

    console.log('📦 TV Display: Processing order update:', {
      id: orderData.id,
      orderNumber: orderData.orderNumber,
      status: orderData.status
    })

    // If order status is "ready", add or update it
    if (orderData.status === "ready") {
      console.log('✅ TV Display: Adding/updating READY order #' + orderData.orderNumber)
      setReadyOrders(prev => {
        // Check if order already exists
        const existingIndex = prev.findIndex(o => o.id === orderData.id)
        
        if (existingIndex >= 0) {
          // Update existing order
          console.log('🔄 TV Display: Updating existing order')
          const updated = [...prev]
          updated[existingIndex] = orderData
          return updated
        } else {
          // Add new order and sort
          console.log('➕ TV Display: Adding new order')
          const newOrders = [...prev, orderData]
          newOrders.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          return newOrders
        }
      })
    } 
    // If order status is "completed", remove it
    else if (orderData.status === "completed") {
      console.log('🗑️ TV Display: Removing COMPLETED order #' + orderData.orderNumber)
      setReadyOrders(prev => prev.filter(o => o.id !== orderData.id))
    }
    // If order status is "pending" or "preparing", remove it if it exists
    else if (orderData.status === "pending" || orderData.status === "preparing") {
      console.log('🔙 TV Display: Removing order #' + orderData.orderNumber + ' (status: ' + orderData.status + ')')
      setReadyOrders(prev => prev.filter(o => o.id !== orderData.id))
    }
    else {
      console.log('ℹ️ TV Display: Ignoring order with status:', orderData.status)
    }
  }

  // Handle order completed event
  const handleOrderCompleted = (orderData: any) => {
    if (!orderData) {
      console.log('⚠️ TV Display: Received empty order data for completion')
      return
    }
    
    console.log('🎉 TV Display: Order COMPLETED event received for #' + orderData.orderNumber)
    
    // Remove completed order from display
    setReadyOrders(prev => {
      const filtered = prev.filter(o => o.id !== orderData.id)
      console.log('📊 TV Display: Orders after removal:', filtered.length)
      return filtered
    })
  }

  return (
    <div className="h-screen w-screen bg-white text-gray-900 overflow-hidden flex flex-col">
      {/* Connection Status Indicator */}
      <div className="absolute top-2 right-2 md:top-4 md:right-4 z-50">
        {isConnected ? (
          <div className="flex items-center gap-1 md:gap-2 bg-green-100 border border-green-500 rounded-full px-2 md:px-4 py-1 md:py-2">
            <Wifi className="w-4 md:w-6 h-4 md:h-6 text-green-600" />
            <span className="text-green-600 font-semibold text-xs md:text-lg">LIVE</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 md:gap-2 bg-red-100 border border-red-500 rounded-full px-2 md:px-4 py-1 md:py-2 animate-pulse">
            <WifiOff className="w-4 md:w-6 h-4 md:h-6 text-red-600" />
            <span className="text-red-600 font-semibold text-xs md:text-lg">RECONNECTING...</span>
          </div>
        )}
      </div>

      {/* Header - Compact for TV */}
      <div className="bg-gradient-to-r from-[#50BAA8] to-teal-600 py-3 md:py-4 px-4 md:px-6 border-b-4 border-[#50BAA8] flex-shrink-0">
        <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-center text-white tracking-wide">
          🍽️ READY ORDERS
        </h1>
        <p className="text-center text-base md:text-lg lg:text-xl xl:text-2xl text-white/90 mt-1">
          Orders ready for pickup
        </p>
      </div>

      {/* Orders Display - Fills remaining space */}
      <div className="flex-1 p-3 md:p-4 lg:p-6 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-20 w-20 md:h-24 md:w-24 border-b-4 border-[#50BAA8]"></div>
            <p className="text-xl md:text-3xl text-gray-400 mt-6">Loading orders...</p>
          </div>
        ) : readyOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-6xl md:text-8xl lg:text-9xl mb-6">✅</div>
            <p className="text-2xl md:text-4xl lg:text-5xl text-gray-400 font-semibold">No orders ready</p>
            <p className="text-xl md:text-2xl lg:text-3xl text-gray-500 mt-3">Orders will appear here when ready</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Grid container - 4 rows x 5 columns, fills available space */}
            <div className="grid grid-cols-5 grid-rows-4 gap-2 md:gap-3 lg:gap-4 h-full">
              {displayedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border-4 border-[#50BAA8] rounded-xl md:rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-105 animate-fadeIn flex flex-col items-center justify-center"
                >
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-black text-gray-900 mb-2 md:mb-4">
                      #{order.orderNumber}
                    </div>
                    <div className="inline-block bg-[#50BAA8] text-white px-4 py-2 md:px-6 md:py-3 lg:px-8 lg:py-4 rounded-lg md:rounded-xl text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold">
                      READY ✓
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination Indicator */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-3 md:mt-4 flex-shrink-0">
                {Array.from({ length: totalPages }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 md:h-3 w-2 md:w-3 rounded-full transition-all ${
                      index === currentPage ? 'bg-[#50BAA8] w-6 md:w-8' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer - Order Count */}
      <div className="bg-white border-t-2 border-[#50BAA8] py-2 md:py-3 px-4 md:px-6 shadow-lg flex-shrink-0">
        <div className="flex justify-between items-center">
          <p className="text-sm md:text-lg lg:text-xl xl:text-2xl text-gray-600">
            Total Ready Orders: <span className="text-[#50BAA8] font-bold">{readyOrders.length}</span>
          </p>
          <TimeDisplay />
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }

        /* Ensure full screen on TV */
        body {
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
