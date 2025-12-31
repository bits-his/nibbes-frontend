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
    const printWindow = window.open('', '_blank', 'width=300,height=600')
    
    if (!printWindow) {
      // TODO: Show toast notification instead of alert
      // User will notice if print window doesn't open
      // alert('Please allow popups for printing')
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
      return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    // Prepare items with serial numbers
    const items = orderData.items || []
    
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${orderData.orderNumber}</title>
        <style>
          @media print {
            @page { 
              size: 80mm auto; 
              margin: 0; 
            }
            body { 
              width: 80mm; 
              margin: 0; 
              padding: 5mm;
              font-family: 'Courier New', monospace;
              font-size: 11px;
            }
          }
          body {
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.4;
          }
          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }
          .order-number {
            font-size: 20px;
            font-weight: bold;
            margin: 0;
          }
          .customer-name {
            font-size: 12px;
            margin: 4px 0 0 0;
          }
          .time-date {
            text-align: right;
            font-size: 11px;
          }
          .time-date p {
            margin: 2px 0;
          }
          .receipt-title {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin: 12px 0;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
          }
          .items-table th {
            text-align: left;
            font-weight: bold;
            padding: 4px 0;
            border-bottom: 1px solid #000;
          }
          .items-table td {
            padding: 4px 0;
            vertical-align: top;
          }
          .item-sno {
            width: 30px;
            text-align: left;
          }
          .item-name {
            padding-left: 8px;
          }
          .item-amount {
            text-align: right;
            width: 80px;
          }
          .summary-section {
            margin: 12px 0;
            padding-top: 8px;
            border-top: 1px solid #000;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
          }
          .summary-label {
            font-weight: bold;
          }
          .summary-value {
            text-align: right;
          }
          .payment-mode {
            margin-top: 8px;
          }
          .notes-section {
            margin-top: 16px;
          }
          .item-note-box {
            border: 1px solid #000;
            border-radius: 8px;
            padding: 8px;
            margin: 8px 0;
            position: relative;
            min-height: 60px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .item-note-header-wrapper {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
          }
          .item-note-header {
            font-weight: bold;
          }
          .item-note-time {
            font-size: 10px;
            color: #666;
          }
          .item-note-content {
            font-size: 10px;
            color: #666;
            margin-top: auto;
            padding-bottom: 20px;
          }
          .item-note-order-number {
            position: absolute;
            bottom: 4px;
            right: 8px;
            font-size: 10px;
            font-weight: bold;
          }
          .dashed-separator {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <!-- Header Section -->
        <div class="header-section">
          <div>
            <p class="order-number">#${orderData.orderNumber}</p>
            <p class="customer-name">${orderData.customerName}</p>
          </div>
          <div class="time-date">
            <p>Time</p>
            <p>${timeStr}</p>
            <p>Date</p>
            <p>${dateStr}</p>
          </div>
        </div>

        <!-- Receipt Title -->
        <div class="receipt-title">RECEIPT</div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th class="item-sno">SN</th>
              <th class="item-name">Item / Description</th>
              <th class="item-amount">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any, index: number) => {
              const itemName = item.name || item.menuItemName || 'Unknown Item'
              const quantity = item.quantity || 1
              const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price || 0
              const amount = price * quantity
              const displayName = `${itemName} x ${quantity}`
              
              return `
                <tr>
                  <td class="item-sno">${index + 1}</td>
                  <td class="item-name">${displayName}</td>
                  <td class="item-amount">${formatCurrency(amount)}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>

        <!-- Summary Section -->
        <div class="summary-section">
          <div class="summary-row">
            <span class="summary-label">Total Amount</span>
            <span class="summary-value">${formatCurrency(totalAmount)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Tendered</span>
            <span class="summary-value">${formatCurrency(tendered)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Balance</span>
            <span class="summary-value">${formatCurrency(balance)}</span>
          </div>
          <div class="payment-mode">
            <span class="summary-label">Payment mode:</span> ${orderData.paymentMethod || 'N/A'}
          </div>
        </div>
        <div class="dashed-separator"></div>  

        <!-- Individual Item Notes Sections -->
        <div class="notes-section">
          ${items.map((item: any, index: number) => {
            const itemName = item.name || item.menuItemName || 'Unknown Item'
            const quantity = item.quantity || 1
            const displayName = `${itemName} x ${quantity}`
            const specialInstructions = item.specialInstructions || 'notes...'
            const orderNumber = `#${orderData.orderNumber}`
            
            return `
              <div class="item-note-box">
                <div class="item-note-header-wrapper">
                  <div class="item-note-header">${displayName}</div>
                  <div class="item-note-time">${timeStr}</div>
                </div>
                <div class="item-note-content">${specialInstructions}</div>
                <div class="item-note-order-number">${orderNumber}</div>
              </div>
              ${index < items.length - 1 ? '<div class="dashed-separator"></div>' : ''}
            `
          }).join('')}
        </div>
        
        <script>
          window.onload = function() {
            window.print()
            setTimeout(() => window.close(), 500)
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
