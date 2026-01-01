<<<<<<< HEAD
import { useState, useCallback } from 'react'
=======
import { useCallback } from 'react'
import type { ThermalPrinterPreviewProps } from '@/components/ThermalPrinterPreview'
>>>>>>> 43e38346f22db1bd1960dd79546e753a0c33cc33

interface OrderData {
  orderNumber: string
  createdAt: string
  customerName: string
  orderType?: string
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
  paymentStatus?: string
  tendered?: number
}

<<<<<<< HEAD
// Hook version for use in React components
=======
const convertToThermalPreview = (orderData: OrderData): ThermalPrinterPreviewProps => {
  const items = orderData.items || []
  const tendered = orderData.tendered || orderData.total || 0
  const balance = tendered - (orderData.total || 0)

  return {
    data: items.map(item => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price || 0
      const quantity = item.quantity || 1
      const amount = price * quantity
      
      return {
        name: item.name,
        amount: amount,
        quantity: quantity,
      }
    }),
    total: orderData.total || 0,
    name: orderData.customerName,
    receiptNo: orderData.orderNumber,
    modeOfPayment: orderData.paymentMethod || 'N/A',
    balance: balance,
    amountPaid: tendered,
    paymentStatus: orderData.paymentStatus,
    info: {
      createdAt: orderData.createdAt,
    },
    title: 'RECEIPT',
  }
}

>>>>>>> 43e38346f22db1bd1960dd79546e753a0c33cc33
export const usePrint = () => {
  const [pdfData, setPdfData] = useState<any>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)

  const printInvoice = useCallback((orderData: OrderData) => {
    console.log('📄 Opening PDF modal for order:', orderData.orderNumber)
    
    const data = {
      orderNumber: orderData.orderNumber,
      createdAt: orderData.createdAt,
      customerName: orderData.customerName,
      items: orderData.items,
      total: orderData.total,
      paymentMethod: orderData.paymentMethod,
      tendered: orderData.tendered || orderData.total,
    }
    
    console.log('📄 Setting PDF data:', data)
    setPdfData(data)
    setShowPdfModal(true)
    console.log('📄 Modal should be open now')
  }, [])

  const closePdfModal = useCallback(() => {
    console.log('📄 Closing PDF modal')
    setShowPdfModal(false)
    setPdfData(null)
  }, [])

  return { 
    printInvoice, 
    pdfData, 
    showPdfModal, 
    closePdfModal 
  }
}

// Standalone print function for non-React contexts
export const printReceipt = (orderData: OrderData) => {
  console.log('📄 Direct print function called for order:', orderData.orderNumber)
  
  // Create a hidden div to hold the receipt
  const printDiv = document.createElement('div')
  printDiv.style.display = 'none'
  document.body.appendChild(printDiv)

  // Format date and time
  const orderDate = new Date(orderData.createdAt)
  const dateStr = orderDate.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  })
  const timeStr = orderDate.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  // Calculate totals
  const totalAmount = orderData.total || 0
  const tendered = orderData.tendered || totalAmount
  const balance = tendered - totalAmount

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  // Prepare items
  const items = orderData.items || []
  
  // Build receipt HTML
  printDiv.innerHTML = `
    <div id="receipt-to-print">
      <style>
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
        #receipt-to-print {
          width: 80mm;
          padding: 5mm;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.5;
          color: #000;
          background: #fff;
        }
        .header-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .order-number {
          font-size: 24px;
          font-weight: bold;
        }
        .customer-name {
          font-size: 12px;
          margin-top: 4px;
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
          border-bottom: 2px solid #000;
        }
        .items-table td {
          padding: 4px 0;
        }
        .item-sno {
          width: 30px;
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
          border-top: 2px solid #000;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin: 4px 0;
        }
        .summary-label {
          font-weight: bold;
        }
        .payment-mode {
          margin-top: 8px;
        }
        .item-note-box {
          border: 2px solid #000;
          border-radius: 8px;
          padding: 8px;
          margin: 8px 0;
          position: relative;
          min-height: 60px;
        }
        .item-note-header {
          font-weight: bold;
          margin-bottom: 4px;
        }
        .item-note-content {
          font-size: 10px;
          color: #666;
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
          border-top: 2px dashed #000;
          margin: 8px 0;
        }
      </style>

      <!-- Header -->
      <div class="header-section">
        <div>
          <div class="order-number">#${orderData.orderNumber}</div>
          <div class="customer-name">${orderData.customerName}</div>
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

      <!-- Summary -->
      <div class="summary-section">
        <div class="summary-row">
          <span class="summary-label">Total Amount</span>
          <span>${formatCurrency(totalAmount)}</span>
        </div>
<<<<<<< HEAD
        <div class="summary-row">
          <span class="summary-label">Tendered</span>
          <span>${formatCurrency(tendered)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Balance</span>
          <span>${formatCurrency(balance)}</span>
        </div>
        <div class="payment-mode">
          <span class="summary-label">Payment mode:</span> ${orderData.paymentMethod || 'N/A'}
        </div>
      </div>
      <div class="dashed-separator"></div>

      <!-- Item Notes -->
      <div>
        ${items.map((item: any, index: number) => {
          const itemName = item.name || item.menuItemName || 'Unknown Item'
          const quantity = item.quantity || 1
          const displayName = `${itemName} x ${quantity}`
          const specialInstructions = item.specialInstructions || 'notes...'
          
          return `
            <div class="item-note-box">
              <div class="item-note-header">${displayName} - ${timeStr}</div>
              <div class="item-note-content">${specialInstructions}</div>
              <div class="item-note-order-number">#${orderData.orderNumber}</div>
            </div>
            ${index < items.length - 1 ? '<div class="dashed-separator"></div>' : ''}
          `
        }).join('')}
      </div>
    </div>
  `

  // Trigger print
  const printContent = printDiv.querySelector('#receipt-to-print') as HTMLElement
  if (printContent) {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write('<html><head><title>Receipt</title></head><body>')
      printWindow.document.write(printContent.outerHTML)
      printWindow.document.write('</body></html>')
      printWindow.document.close()
      
      setTimeout(() => {
        printWindow.print()
        setTimeout(() => {
          printWindow.close()
          document.body.removeChild(printDiv)
        }, 500)
      }, 250)
    }
  }
=======
        
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
  
  return { printInvoice, convertToThermalPreview }
>>>>>>> 43e38346f22db1bd1960dd79546e753a0c33cc33
}
