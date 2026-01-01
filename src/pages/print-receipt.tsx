import { useEffect, useState } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import ThermalReceipt from '@/components/ThermalReceipt';
import { apiRequest } from '@/lib/queryClient';

export default function PrintReceipt() {
  const [receiptData, setReceiptData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        // Get URL parameters (like your former app)
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('order_id');
        const orderNumber = urlParams.get('order_number');
        const type = urlParams.get('type');

        console.log('📄 Print receipt page loaded');
        console.log('📄 URL Parameters:', { orderId, orderNumber, type });

        if (!orderId) {
          throw new Error('Order ID is required');
        }

        // Fetch order data from API
        console.log('📄 Fetching order data from API...');
        const response = await apiRequest('GET', `/api/orders/${orderId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch order data');
        }

        const orderData = await response.json();
        console.log('📄 Order data fetched:', orderData);

        // Transform order data to receipt format
        const receiptData = {
          orderNumber: orderData.orderNumber,
          createdAt: orderData.createdAt,
          customerName: orderData.customerName || 'Walk-in Customer',
          items: orderData.items || [],
          total: parseFloat(orderData.totalAmount || 0),
          paymentMethod: orderData.paymentMethod || 'N/A',
          paymentStatus: orderData.paymentStatus || 'paid',
          tendered: parseFloat(orderData.totalAmount || 0)
        };

        console.log('📄 Receipt data prepared:', receiptData);
        setReceiptData(receiptData);
        setLoading(false);
      } catch (err: any) {
        console.error('❌ Error loading receipt:', err);
        setError(err.message || 'Failed to load receipt');
        setLoading(false);
      }
    };

    fetchReceiptData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="mb-4">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#4EB5A4] border-r-transparent"></div>
          </div>
          <p className="text-lg font-semibold mb-2">Loading receipt...</p>
          <p className="text-sm text-muted-foreground">Please wait while we prepare your receipt</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md p-6">
          <div className="mb-4 text-red-500">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-semibold mb-2 text-red-600">Error Loading Receipt</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  if (!receiptData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">No receipt data found</p>
          <p className="text-sm text-muted-foreground mb-4">Please close this window and try again</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      <PDFViewer width="100%" height="100%" showToolbar={true}>
        <ThermalReceipt orderData={receiptData} />
      </PDFViewer>
    </div>
  );
}
