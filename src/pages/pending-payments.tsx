import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search, RefreshCw, CheckCircle, AlertCircle, Phone, Calendar } from 'lucide-react';

interface PendingPayment {
  id: string;
  transactionRef: string;
  amount: string;
  paymentMethod: string;
  createdAt: string;
  isArchived?: boolean;
  status?: string;
  order: {
    id: string;
    orderNumber: number;
    customerName: string;
    customerPhone: string;
    orderType: string;
    totalAmount: string;
    createdAt: string;
  };
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PendingPayments: React.FC = () => {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingPayments, setVerifyingPayments] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    // Default to today
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    // Default to today
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://server.brainstorm.ng/nibbleskitchen';

  const fetchPendingPayments = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        dateFrom,
        dateTo
      });
      
      const response = await fetch(`${backendUrl}/api/payments/pending?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending payments');
      }

      const data = await response.json();
      
      if (data.success) {
        setPayments(data.data.payments);
        setPagination(data.data.pagination);
      } else {
        throw new Error(data.message || 'Failed to fetch payments');
      }
    } catch (error: any) {
      console.error('Error fetching pending payments:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch pending payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (transactionRef: string, forceSuccess = false) => {
    try {
      setVerifyingPayments(prev => new Set(prev).add(transactionRef));
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${backendUrl}/api/payments/verify/${transactionRef}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ forceSuccess })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Payment Verified! ✅",
          description: data.message || "Payment has been successfully verified and marked as paid.",
        });
        
        // Remove the payment from the list since it's now paid
        setPayments(prev => prev.filter(p => p.transactionRef !== transactionRef));
      } else {
        // Show error with suggestion for force verification
        const description = data.suggestion 
          ? `${data.message}. ${data.suggestion}`
          : data.message || "Payment could not be verified as successful.";
          
        toast({
          title: "Verification Failed",
          description,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast({
        title: "Error",
        description: "Failed to verify payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifyingPayments(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionRef);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatCurrency = (amount: string) => {
    return `₦${parseFloat(amount).toLocaleString()}`;
  };

  const calculateTotalCharged = (payment: PendingPayment) => {
    // Calculate actual charged amount: base amount * 1.10 (includes 2.5% service + 7.5% VAT)
    const baseAmount = payment.order?.totalAmount || payment.amount;
    return (parseFloat(baseAmount) * 1.10).toFixed(2);
  };

  useEffect(() => {
    fetchPendingPayments();
  }, [dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading pending payments...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pending Payments</h1>
          <p className="text-gray-600 mt-2">
            Review and verify payments that may have been debited but not confirmed
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowArchived(!showArchived)}
            variant={showArchived ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            {showArchived ? "Hide Archived" : "Show Archived"}
          </Button>
          <Button 
            onClick={() => fetchPendingPayments(pagination.page)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setDateFrom(today);
                setDateTo(today);
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              Today Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Payments</h3>
            <p className="text-gray-600 text-center">
              All payments are properly processed. Great job! 🎉
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Card */}
          <Card className="mb-4 bg-blue-50 border-blue-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Pending</p>
                    <p className="text-2xl font-bold text-blue-600">{payments.length}</p>
                  </div>
                  <div className="h-12 w-px bg-gray-300"></div>
                  <div>
                    <p className="text-sm text-gray-600">Active (&lt; 24hrs)</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {payments.filter(p => !p.isArchived).length}
                    </p>
                  </div>
                  <div className="h-12 w-px bg-gray-300"></div>
                  <div>
                    <p className="text-sm text-gray-600">Archived (&gt; 24hrs)</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {payments.filter(p => p.isArchived).length}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {payments
              .filter(payment => showArchived || !payment.isArchived)
              .map((payment) => (
              <Card key={payment.id} className={`border-l-4 ${payment.isArchived ? 'border-l-gray-400 bg-gray-50' : 'border-l-yellow-500'}`}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {payment.order ? (
                          <>Order #{payment.order.orderNumber} - {payment.order.customerName}</>
                        ) : (
                          <>Payment {payment.transactionRef}</>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        {payment.order && (
                          <>
                            <span>📞 {payment.order.customerPhone}</span>
                            <Badge variant="outline">{payment.order.orderType}</Badge>
                          </>
                        )}
                        <span>{formatDate(payment.createdAt)}</span>
                        {payment.isArchived && (
                          <Badge variant="secondary" className="bg-gray-500 text-white">
                            ARCHIVED
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(calculateTotalCharged(payment))}
                      </div>
                      <Badge variant="secondary" className="mt-1">
                        {payment.paymentMethod}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <div className="text-sm">
                      <strong>Transaction Reference:</strong>
                      <code className="ml-2 bg-white px-2 py-1 rounded text-xs">
                        {payment.transactionRef}
                      </code>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => verifyPayment(payment.transactionRef)}
                      disabled={verifyingPayments.has(payment.transactionRef)}
                      className="flex items-center gap-2"
                    >
                      {verifyingPayments.has(payment.transactionRef) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      {verifyingPayments.has(payment.transactionRef) ? 'Verifying...' : 'Verify Payment'}
                    </Button>
                    
                    {/* <Button
                      onClick={() => verifyPayment(payment.transactionRef, true)}
                      disabled={verifyingPayments.has(payment.transactionRef)}
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Force Verify
                    </Button> */}
                    
                    <Button
                      variant="outline"
                      onClick={() => payment.order?.customerPhone && window.open(`tel:${payment.order.customerPhone}`, '_self')}
                      disabled={!payment.order?.customerPhone}
                      className="flex items-center gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      Call Customer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button
                variant="outline"
                onClick={() => fetchPendingPayments(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages} 
                ({pagination.total} total payments)
              </span>
              
              <Button
                variant="outline"
                onClick={() => fetchPendingPayments(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PendingPayments;
