import React, { useEffect } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ThermalReceipt from './ThermalReceipt'

interface OrderItem {
  name: string
  quantity: number
  price: string | number
  specialInstructions?: string | null
}

interface ReceiptPreviewModalProps {
  open: boolean
  onClose: () => void
  orderData: {
    orderNumber: string
    createdAt: string
    customerName: string
    items: OrderItem[]
    total: number
    paymentMethod: string
    tendered?: number
  }
}

const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  open,
  onClose,
  orderData,
}) => {
  useEffect(() => {
    console.log('🔍 ReceiptPreviewModal state changed:', { 
      open, 
      orderNumber: orderData.orderNumber,
      hasItems: orderData.items.length > 0
    })
  }, [open, orderData])

  if (!open) {
    return null
  }

  console.log('🔍 ReceiptPreviewModal rendering with open=true')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Receipt Preview - Order #{orderData.orderNumber}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 w-full h-full min-h-[600px]">
           <PDFViewer height="700" width="1100">
            <ThermalReceipt
              orderNumber={orderData.orderNumber}
              createdAt={orderData.createdAt}
              customerName={orderData.customerName}
              items={orderData.items}
              total={orderData.total}
              paymentMethod={orderData.paymentMethod}
              tendered={orderData.tendered}
            />
          </PDFViewer>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ReceiptPreviewModal
