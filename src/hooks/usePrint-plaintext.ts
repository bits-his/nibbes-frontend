import { useCallback } from 'react'

interface OrderData {
  orderNumber: string
  createdAt: string
  customerName: string
  orderType: string
  items: Array<{  
    name: string
    quantity: number
    price: string | number
    specialInstructions?: string | null
  }>
  subtotal?: number
  deliveryFee?: number
  vat?: number
  total: number
  paymentMethod: string
  paymentStatus: string
  tendered?: number
}

export const usePrint = () => {
  const printInvoice = useCallback((orderData: OrderData) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    
    if (!printWindow) {
      console.error('Print window blocked. Please allow popups for printing.')
      return
    }

    // Format date and time
    const orderDate = new Date(orderData.createdAt)
    const dateStr = orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const timeStr = orderDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

    // Calculate totals
    const totalAmount = orderData.total || 0
    const tendered = orderData.tendered || totalAmount
    const balance = tendered - totalAmount

    // Format currency
    const formatCurrency = (amount: number) => {
      return `N${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    // Prepare items
    const items = orderData.items || []
    
    // Build plain text receipt
    let receiptText = `
================================
    NIBBLES KITCHEN
================================

Order: #${orderData.orderNumber}
Customer: ${orderData.customerName}
Date: ${dateStr}
Time: ${timeStr}

================================
        RECEIPT
================================

Items:
--------------------------------
`

    // Add items
    items.forEach((item: any, index: number) => {
      const itemName = item.name || item.menuItemName || 'Unknown Item'
      const quantity = item.quantity || 1
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price || 0
      const amount = price * quantity
      
      receiptText += `${index + 1}. ${itemName}\n`
      receiptText += `   ${quantity} x ${formatCurrency(price)} = ${formatCurrency(amount)}\n\n`
    })

    receiptText += `================================\n\n`
    receiptText += `TOTAL:     ${formatCurrency(totalAmount)}\n`
    receiptText += `Tendered:  ${formatCurrency(tendered)}\n`
    receiptText += `Balance:   ${formatCurrency(balance)}\n\n`
    receiptText += `Payment: ${orderData.paymentMethod || 'N/A'}\n\n`
    receiptText += `================================\n\n`

    // Add item notes if any
    items.forEach((item: any) => {
      if (item.specialInstructions) {
        const itemName = item.name || item.menuItemName || 'Unknown Item'
        const quantity = item.quantity || 1
        receiptText += `${itemName} x ${quantity}\n`
        receiptText += `Note: ${item.specialInstructions}\n`
        receiptText += `Order: #${orderData.orderNumber}\n\n`
      }
    })

    receiptText += `================================\n`
    receiptText += `Thank you for your order!\n`
    receiptText += `nibblesfastfood.com\n`
    receiptText += `================================\n`

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${orderData.orderNumber}</title>
        <meta charset="UTF-8">
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          body {
            width: 80mm;
            margin: 0;
            padding: 5mm;
            font-family: 'Courier New', 'Courier', monospace;
            font-size: 14px;
            line-height: 1.5;
            color: #000;
            background: #fff;
          }
          
          pre {
            margin: 0;
            padding: 0;
            font-family: 'Courier New', 'Courier', monospace;
            font-size: 14px;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          
          @media print {
            body {
              width: 80mm;
              margin: 0;
              padding: 5mm;
            }
          }
        </style>
      </head>
      <body>
        <pre>${receiptText}</pre>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print()
              setTimeout(function() {
                window.close()
              }, 500)
            }, 250)
          }
        </script>
      </body>
      </html>
    `
    
    printWindow.document.write(invoiceHTML)
    printWindow.document.close()
  }, [])
  
  return { printInvoice }
}
