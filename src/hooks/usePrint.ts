import { useCallback } from 'react'

interface OrderData {
  orderNumber: string
  createdAt: string
  customerName: string
  orderType: string
  items: Array<{
    name: string
    quantity: number
    price: string
  }>
  subtotal?: number
  deliveryFee?: number
  vat?: number
  total: number
  paymentMethod: string
  paymentStatus: string
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
              font-size: 12px;
            }
          }
          body {
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
            font-family: 'Courier New', monospace;
            font-size: 12px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 18px;
          }
          .info {
            margin-bottom: 10px;
          }
          .items {
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 10px 0;
            margin: 10px 0;
          }
          .item {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .total {
            font-weight: bold;
            font-size: 14px;
            text-align: right;
            margin-top: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            border-top: 2px dashed #000;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class=\"header\">
          <h1>NIBBLES KITCHEN</h1>
          <p>Thank you for your order!</p>
        </div>
        
        <div class=\"info\">
          <p><strong>Order #:</strong> ${orderData.orderNumber}</p>
          <p><strong>Date:</strong> ${new Date(orderData.createdAt).toLocaleString()}</p>
          <p><strong>Customer:</strong> ${orderData.customerName}</p>
          <p><strong>Type:</strong> ${orderData.orderType}</p>
        </div>
        
        <div class=\"items\">
          <h3>Items:</h3>
          ${orderData.items.map((item: any) => `
            <div class=\"item\">
              <span>${item.quantity}x ${item.name}</span>
              <span>₦${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        
        <div class=\"total\">
          <p>Subtotal: ₦${orderData.subtotal?.toFixed(2) || '0.00'}</p>
          ${orderData.deliveryFee ? `<p>Delivery: ₦${orderData.deliveryFee.toFixed(2)}</p>` : ''}
          ${orderData.vat ? `<p>VAT (7.5%): ₦${orderData.vat.toFixed(2)}</p>` : ''}
          <p style=\"font-size: 16px; margin-top: 10px;\">TOTAL: ₦${orderData.total.toFixed(2)}</p>
        </div>
        
        <div class=\"info\">
          <p><strong>Payment:</strong> ${orderData.paymentMethod}</p>
          <p><strong>Status:</strong> ${orderData.paymentStatus}</p>
        </div>
        
        <div class=\"footer\">
          <p>Powered by Nibbles Kitchen</p>
          <p>www.nibbleskitchen.com</p>
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
