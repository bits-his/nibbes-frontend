import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

interface OrderItem {
  name: string
  quantity: number
  price: string | number
  specialInstructions?: string | null
}

interface ThermalReceiptProps {
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

const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ orderData }) => {
  // Safety check for undefined orderData
  if (!orderData) {
    console.error('❌ ThermalReceipt: orderData is undefined!')
    return null
  }
  
  const {
    orderNumber,
    createdAt,
    customerName,
    items = [], // Default to empty array to prevent undefined error
    total,
    paymentMethod,
    tendered = 0,
  } = orderData
  // Format date and time
  const orderDate = new Date(createdAt)
  const dateStr = orderDate.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  })
  const timeStr = orderDate.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  // Calculate balance
  const balance = tendered - total

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  return (
    <Document>
      <Page size={{ width: 226.77 }} style={styles.page}>
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.headerLeft}>
            <Text style={styles.orderNumber}>#{orderNumber}</Text>
            <Text style={styles.customerName}>{customerName}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.timeLabel}>Time</Text>
            <Text style={styles.timeValue}>{timeStr}</Text>
            <Text style={styles.dateLabel}>Date</Text>
            <Text style={styles.dateValue}>{dateStr}</Text>
          </View>
        </View>

        {/* Receipt Title */}
        <Text style={styles.receiptTitle}>RECEIPT</Text>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colSN}>SN</Text>
            <Text style={styles.colItem}>Item / Description</Text>
            <Text style={styles.colAmt}>Amt</Text>
          </View>

          {items.map((item, index) => {
            const quantity = item.quantity || 1
            const price = typeof item.price === 'string' 
              ? parseFloat(item.price) 
              : item.price || 0
            const amount = price * quantity
            const displayName = `${item.name} x ${quantity}`

            return (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.colSN}>{index + 1}</Text>
                <Text style={styles.colItem}>{displayName}</Text>
                <Text style={styles.colAmt}>{formatCurrency(amount)}</Text>
              </View>
            )
          })}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text style={styles.summaryValue}>{formatCurrency(total)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tendered</Text>
            <Text style={styles.summaryValue}>{formatCurrency(tendered)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text style={styles.summaryValue}>{formatCurrency(balance)}</Text>
          </View>
          <View style={styles.paymentMode}>
            <Text style={styles.summaryLabel}>Payment mode: </Text>
            <Text>{paymentMethod}</Text>
          </View>
        </View>

        <View style={styles.dashedLine} />

        {/* Item Notes */}
        {items.map((item, index) => {
          const quantity = item.quantity || 1
          const displayName = `${item.name} x ${quantity}`
          const specialInstructions = item.specialInstructions || 'notes...'

          return (
            <View key={index}>
              <View style={styles.noteBox}>
                <View style={styles.noteHeader}>
                  <Text style={styles.noteTitle}>{displayName}</Text>
                  <Text style={styles.noteTime}>{timeStr}</Text>
                </View>
                <Text style={styles.noteContent}>{specialInstructions}</Text>
                <Text style={styles.noteOrderNumber}>#{orderNumber}</Text>
              </View>
              {index < items.length - 1 && <View style={styles.dashedLine} />}
            </View>
          )
        })}

        {/* Footer */}
        <Text style={styles.footer}>Thank you for your order!</Text>
        <Text style={styles.footer}>nibblesfastfood.com</Text>
      </Page>
    </Document>
  )
}

const styles = StyleSheet.create({
  page: {
    padding: 10,
    fontSize: 10,
    fontFamily: 'Courier',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  customerName: {
    fontSize: 10,
    marginTop: 2,
  },
  timeLabel: {
    fontSize: 9,
  },
  timeValue: {
    fontSize: 9,
  },
  dateLabel: {
    fontSize: 9,
    marginTop: 2,
  },
  dateValue: {
    fontSize: 9,
  },
  receiptTitle: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  table: {
    marginVertical: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  colSN: {
    width: '15%',
  },
  colItem: {
    width: '55%',
    paddingLeft: 4,
  },
  colAmt: {
    width: '30%',
    textAlign: 'right',
  },
  summary: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#000',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  summaryLabel: {
    fontWeight: 'bold',
  },
  summaryValue: {
    textAlign: 'right',
  },
  paymentMode: {
    flexDirection: 'row',
    marginTop: 4,
  },
  dashedLine: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  noteBox: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    padding: 8,
    marginVertical: 4,
    position: 'relative',
    minHeight: 60,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  noteTitle: {
    fontWeight: 'bold',
    fontSize: 10,
  },
  noteTime: {
    fontSize: 8,
    color: '#666',
  },
  noteContent: {
    fontSize: 8,
    color: '#666',
    marginBottom: 20,
  },
  noteOrderNumber: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    fontSize: 8,
    fontWeight: 'bold',
  },
  footer: {
    textAlign: 'center',
    fontSize: 8,
    marginTop: 4,
  },
})

export default ThermalReceipt
