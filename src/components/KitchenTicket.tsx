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

  interface KitchenTicketProps {
    orderData: {
      orderNumber: string
      createdAt: string
      customerName: string
      items: OrderItem[]
    }
  }

  const KitchenTicket: React.FC<KitchenTicketProps> = ({ orderData }) => {
    // Safety check for undefined orderData
    if (!orderData) {
      console.error('❌ KitchenTicket: orderData is undefined!')
      return null
    }
    
    const {
      orderNumber,
      createdAt,
      items = [],
    } = orderData

    // Format time
    const orderDate = new Date(createdAt)
    const timeStr = orderDate.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })

    // Styles for thermal receipt (80mm width = 226.77 points)
    const styles = StyleSheet.create({
      page: {
        padding: 6,
        fontSize: 8,
        fontFamily: 'Courier',
      },
      noteBox: {
        border: '1px solid #000',
        borderRadius: 4,
        padding: 6,
        marginBottom: 6,
        position: 'relative',
        minHeight: 40,
      },
      noteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
      },
      noteTitle: {
        fontSize: 9,
        fontWeight: 'bold',
      },
      noteTime: {
        fontSize: 8,
      },
      noteContent: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 15,
        minHeight: 20,
        lineHeight: 1.5,
      },
      noteOrderNumber: {
        position: 'absolute',
        bottom: 2,
        right: 4,
        fontSize: 8,
        fontWeight: 'bold',
      },
      dashedLine: {
        borderTopWidth: 1,
        borderTopColor: '#000',
        borderStyle: 'dashed',
        marginVertical: 6,
      },
    })

    // For thermal printer - 58mm width = 164.41 points (more compact)
    return (
      <Document>
        <Page size={{ width: 164.41, height: 'auto' }} style={styles.page}>
          {/* Individual Item Notes Sections */}
          {items.map((item, index) => {
            const quantity = item.quantity || 1
            const displayName = `${item.name} x ${quantity}`
            const specialInstructions = item.specialInstructions || 'notes...'

            return (
              <View key={index} wrap={false}>
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
        </Page>
      </Document>
    )
  }

  export default KitchenTicket
