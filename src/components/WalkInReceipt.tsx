import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

interface OrderItem {
  name: string
  quantity: number
  price: string | number
  specialInstructions?: string | null
}

interface WalkInReceiptProps {
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

const WalkInReceipt: React.FC<WalkInReceiptProps> = ({ orderData }) => {
  // Safety check for undefined orderData
  if (!orderData) {
    console.error('❌ WalkInReceipt: orderData is undefined!')
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

  // Calculate change
  const change = tendered - total

  // Styles for thermal receipt (80mm width = 226.77 points)
  const styles = StyleSheet.create({
    page: {
      padding: 10,
      fontSize: 10,
      fontFamily: 'Courier',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    orderNumber: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    customerName: {
      fontSize: 10,
      marginTop: 2,
    },
    timeDate: {
      flexDirection: 'column',
      alignItems: 'flex-end',
    },
    timeDateText: {
      fontSize: 9,
      marginBottom: 2,
    },
    title: {
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
    colSno: {
      width: '15%',
    },
    colName: {
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
    footer: {
      marginTop: 15,
      textAlign: 'center',
      fontSize: 9,
    },
  })

  return (
    <Document>
      <Page size={{ width: 226.77 }} style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.orderNumber}>#{orderNumber}</Text>
            <Text style={styles.customerName}>{customerName}</Text>
          </View>
          <View style={styles.timeDate}>
            <Text style={styles.timeDateText}>Time</Text>
            <Text style={styles.timeDateText}>{timeStr}</Text>
            <Text style={styles.timeDateText}>Date</Text>
            <Text style={styles.timeDateText}>{dateStr}</Text>
          </View>
        </View>

        {/* Receipt Title */}
        <Text style={styles.title}>WALK-IN RECEIPT</Text>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.colSno}>SN</Text>
            <Text style={styles.colName}>Item / Description</Text>
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
                <Text style={styles.colSno}>{index + 1}</Text>
                <Text style={styles.colName}>{displayName}</Text>
                <Text style={styles.colAmt}>
                  ₦{amount.toLocaleString('en-NG', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text>
              ₦{total.toLocaleString('en-NG', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount Tendered</Text>
            <Text>
              ₦{tendered.toLocaleString('en-NG', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Change</Text>
            <Text>
              ₦{change.toLocaleString('en-NG', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </Text>
          </View>

          <View style={[styles.summaryRow, { marginTop: 8 }]}>
            <Text style={styles.summaryLabel}>Payment Mode</Text>
            <Text>{paymentMethod}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Thank you for your order!</Text>
        <Text style={styles.footer}>Powered by Brainstorm</Text>
        <Text style={styles.footer}>nibblesfastfood.com/</Text>
      </Page>
    </Document>
  )
}

export default WalkInReceipt
