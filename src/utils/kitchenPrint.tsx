import { pdf } from '@react-pdf/renderer'
import KitchenTicket from '@/components/KitchenTicket'

interface OrderItem {
  name: string
  quantity: number
  price: string | number
  specialInstructions?: string | null
}

interface OrderData {
  orderNumber: string
  createdAt: string
  customerName: string
  items: OrderItem[]
}

/**
 * Automatically print kitchen ticket when order arrives
 * This function generates a PDF and triggers the browser print dialog
 */
export const autoPrintKitchenTicket = async (orderData: OrderData) => {
  try {
    console.log('🖨️ Auto-printing kitchen ticket for order #' + orderData.orderNumber)

    // Generate PDF blob
    const blob = await pdf(<KitchenTicket orderData={orderData} />).toBlob()
    
    // Create object URL
    const url = URL.createObjectURL(blob)
    
    // Open in hidden iframe and print
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = url
    
    document.body.appendChild(iframe)
    
    // Wait for iframe to load, then print
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print()
        
        // Clean up after printing
        setTimeout(() => {
          document.body.removeChild(iframe)
          URL.revokeObjectURL(url)
          console.log('✅ Kitchen ticket printed successfully')
        }, 1000)
      }, 500)
    }
  } catch (error) {
    console.error('❌ Error printing kitchen ticket:', error)
  }
}

/**
 * Show kitchen ticket preview in a new window (for testing)
 */
export const previewKitchenTicket = (orderData: OrderData) => {
  const receiptUrl = `/kitchen-ticket?order_id=${orderData.orderNumber}&type=kitchen`
  window.open(receiptUrl, '_blank', 'width=400,height=600')
}
