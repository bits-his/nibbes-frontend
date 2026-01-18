import { useCallback, useState, useEffect } from 'react'
import { BACKEND_URL } from '@/lib/queryClient'

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

interface ServiceCharge {
  id: string
  description: string  // API uses 'description' not 'name'
  type: string
  amount: string       // API uses 'amount' for percentage value
  status: string       // API uses 'status' not 'is_active'
}

export const usePrint = () => {
  const [serviceCharges, setServiceCharges] = useState<ServiceCharge[]>([]);

  // Fetch service charges on mount
  useEffect(() => {
    const fetchServiceCharges = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/service-charges/active`);
        if (!response.ok) throw new Error('Failed to fetch service charges');
        const data = await response.json();
        // The /active endpoint already returns only active charges
        setServiceCharges(data);
        console.log('✅ Service charges loaded for receipt:', data);
      } catch (error) {
        console.error('❌ Error fetching service charges for receipt:', error);
        setServiceCharges([]);
      }
    };
    fetchServiceCharges();
  }, []);
  const printInvoice = useCallback((orderData: OrderData, receiptType: 'receipt' | 'walk-in' = 'receipt') => {
    const printWindow = window.open('', '_blank', 'width=300,height=600')
    
    if (!printWindow) {
      console.error('Print window blocked. Please allow popups for printing.')
      return false
    }

    // Format date and time
    const orderDate = new Date(orderData.createdAt)
    const dateStr = orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const timeStr = orderDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

    // Calculate totals with dynamic service charges
    // Calculate subtotal from items (item prices without charges)
    const calculatedSubtotal = orderData.items?.reduce((sum: number, item: any) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price || 0
      return sum + (price * (item.quantity || 1))
    }, 0) || 0
    
    // Calculate all service charges dynamically from API
    const subtotal = Math.abs(calculatedSubtotal)
    
    // Debug: Log service charges
    console.log('🔍 Service charges at print time:', serviceCharges);
    console.log('🔍 Subtotal:', subtotal);
    
    // Calculate each service charge - handle both percentage and fixed types
    const chargeBreakdown = serviceCharges.map(charge => {
      const chargeAmount = parseFloat(charge.amount) || 0; // Convert string to number
      const isPercentage = charge.type === 'percentage';
      
      return {
        name: charge.description,
        type: charge.type,
        percentage: isPercentage ? chargeAmount : null, // Only set percentage if type is percentage
        amount: isPercentage 
          ? Math.abs(subtotal * (chargeAmount / 100))  // Calculate percentage of subtotal
          : Math.abs(chargeAmount)  // Use fixed amount directly
      };
    });
    
    console.log('🔍 Charge breakdown:', chargeBreakdown);
    
    // Sum all charges
    const totalCharges = chargeBreakdown.reduce((sum, charge) => sum + charge.amount, 0);
    const totalAmount = subtotal + totalCharges;
    
    console.log('🔍 Total charges:', totalCharges);
    console.log('🔍 Total amount:', totalAmount);

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
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
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
              font-family: 'Roboto', sans-serif;
              font-size: 14px;
              font-weight: bold;
            }
          }
          body {
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
            font-family: 'Roboto', sans-serif;
            font-size: 14px;
            font-weight: normal;
            line-height: 1.4;
          }
          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }
          .order-number {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
          }
          .customer-name {
            font-size: 16px;
            font-weight: bold;
            margin: 4px 0 0 0;
          }
          .time-date {
            text-align: right;
            font-size: 14px;
            font-weight: bold;
          }
          .time-date p {
            margin: 2px 0;
            font-weight: bold;
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
            font-size: 14px;
          }
          .items-table td {
            padding: 4px 0;
            vertical-align: top;
            font-size: 14px;
          }
          .item-sno {
            width: 30px;
            text-align: left;
          }
          .item-name {
            padding-left: 8px;
            font-weight: normal;
          }
          .item-amount {
            text-align: right;
            width: 80px;
            font-weight: normal;
          }
          .summary-section {
            margin: 12px 0;
            padding-top: 8px;
            border-top: 1px solid #000;
            font-size: 14px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-size: 14px;
          }
          .summary-label {
            font-weight: normal;
            font-size: 14px;
          }
          .summary-value {
            text-align: right;
            font-weight: bold;
            font-size: 14px;
          }
          .summary-vat-label {
            font-weight: normal;
            font-size: 14px;
          }
          .summary-vat-value {
            text-align: right;
            font-weight: bold;
            font-size: 14px;
          }
          .payment-mode {
            margin-top: 8px;
            font-weight: normal;
            font-size: 14px;
            display: flex;
            justify-content: space-between;
          }
          .payment-mode-value {
            text-align: right;
            font-weight: normal;
          }
          .notes-section {
            margin-top: 16px;
          }
          .item-note-box {
            border: 1px solid #000;
            border-radius: 8px;
            padding: 12px;
            margin-top: 20px;
            margin-bottom: 8px;
            position: relative;
            min-height: 80px;
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
            font-weight: normal;
          }
          .item-note-time {
            font-size: 12px;
            color: #000;
            font-weight: normal;
          }
          .item-note-content {
            font-size: 12px;
            color: #000;
            margin-top: auto;
            padding-bottom: 20px;
            font-weight: normal;
          }
          .item-note-order-number {
            position: absolute;
            bottom: 4px;
            right: 8px;
            font-size: 12px;
            font-weight: bold;
          }
          .dashed-separator {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .footer {
            margin-top: 16px;
            text-align: center;
            font-size: 14px;
            padding-top: 8px;
            border-top: 1px solid #000;
          }
          .footer-thanks {
            font-weight: bold;
            margin-bottom: 4px;
          }
          .footer-name {
            font-weight: normal;
          }
          .print-actions {
            margin-top: 16px;
            text-align: center;
            padding: 12px;
            border-top: 1px dashed #000;
            display: flex;
            gap: 8px;
            justify-content: center;
          }
          .print-actions button {
            padding: 8px 16px;
            font-size: 14px;
            font-weight: bold;
            border: 1px solid #000;
            background: #fff;
            cursor: pointer;
            border-radius: 4px;
            font-family: 'Roboto', sans-serif;
          }
          .print-actions button:hover {
            background: #f0f0f0;
          }
          @media print {
            .print-actions {
              display: none;
            }
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
            <p>${timeStr}</p>
            <p>${dateStr}</p>
          </div>
        </div>

        <!-- Receipt Title -->
        <div class="receipt-title">${receiptType === 'walk-in' ? 'WALK-IN RECEIPT' : 'RECEIPT'}</div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <!-- <th class="item-sno">SN</th> -->
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
              const displayName = ` <span style="margin-right: 4px;">${quantity}</span> ${itemName}`
              
              return `
                <tr>
                <!--  <td class="item-sno">${index + 1}</td> -->
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
            <span class="summary-label">Subtotal</span>
            <span class="summary-value">${formatCurrency(subtotal)}</span>
          </div>
          ${chargeBreakdown.map(charge => `
          <div class="summary-row">
            <span class="summary-vat-label">${charge.name}${charge.type === 'percentage' && charge.percentage !== null ? ` (${charge.percentage.toFixed(2)}%)` : ''}</span>
            <span class="summary-vat-value">${formatCurrency(charge.amount)}</span>
          </div>`).join('')}
          <div class="summary-row">
            <span class="summary-label">Total Amount</span>
            <span class="summary-value">${formatCurrency(totalAmount)}</span>
          </div>
          <div class="payment-mode">
            <span class="summary-label">Payment mode:</span>
            <span class="payment-mode-value">${orderData.paymentMethod || 'N/A'}</span>
          </div>
        </div>
        ${receiptType === 'receipt' ? `
        <div class="dashed-separator"></div>  

        <!-- Individual Item Notes Sections -->
        <div class="notes-section">
          ${items.map((item: any, index: number) => {
            const itemName = item.name || item.menuItemName || 'Unknown Item'
            const quantity = item.quantity || 1
            const displayName = ` <span style="margin-right: 4px;">${quantity}</span> ${itemName}`
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
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <div class="footer-thanks">Thank you for your order!</div>
          <div class="footer-name">nibblesfastfood.com</div>
          <div class="footer-powered-by"><strong>Powered By: Brainstorm IT Solution</strong></div>
        </div>

        <!-- Print Actions (hidden when printing) -->
        <div class="print-actions">
         <!-- <button onclick="window.print()">Print Again</button> -->
          <button onclick="window.close()">Close Window</button>
        </div>
        <script>
          // Escape key to close window
          document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' || event.key === 'Esc') {
              window.close();
            }
          });
        </script>
      </body>
      </html>
    `
    
    // Write HTML to the print window
    printWindow.document.open()
    printWindow.document.write(invoiceHTML)
    printWindow.document.close()
    
    // Wait for the document to be fully ready before printing
    // This ensures all styles are loaded and applied
    const printAfterLoad = () => {
      // Small delay to ensure all CSS is applied
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
        // Auto-close disabled - users can print multiple times and close manually when done
        // setTimeout(() => {
        //   printWindow.close()
        // }, 1000)
      }, 300)
    }
    
    // Check if already loaded, otherwise wait for load event
    if (printWindow.document.readyState === 'complete') {
      printAfterLoad()
    } else {
      printWindow.addEventListener('load', printAfterLoad, { once: true })
    }
    
    return true
  }, [serviceCharges])
  
  return { printInvoice }
}
