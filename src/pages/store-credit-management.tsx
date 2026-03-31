import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, CreditCard, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function StoreCreditManagement() {
  const { toast } = useToast();
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCredit, setSelectedCredit] = useState<any>(null);
  const [showTransactions, setShowTransactions] = useState(false);

  const { data: creditsData, refetch } = useQuery({
    queryKey: ['/api/refunds/store-credits', customerPhone],
    queryFn: async () => {
      if (!customerPhone) return null;
      const response = await apiRequest('GET', `/api/refunds/store-credits/customer/${customerPhone}`);
      if (!response.ok) throw new Error('Failed to fetch credits');
      return response.json();
    },
    enabled: false
  });

  const { data: transactions } = useQuery({
    queryKey: ['/api/refunds/store-credits/transactions', selectedCredit?.id],
    queryFn: async () => {
      if (!selectedCredit) return null;
      const response = await apiRequest('GET', `/api/refunds/store-credits/transactions/${selectedCredit.id}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      return data.transactions;
    },
    enabled: !!selectedCredit && showTransactions
  });

  const searchCredits = () => {
    if (!customerPhone.trim()) {
      toast({ title: 'Phone Number Required', variant: 'destructive' });
      return;
    }
    refetch();
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      active: 'success',
      used: 'secondary',
      expired: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="font-serif text-2xl md:text-3xl font-bold">Store Credit Management</h1>
        <p className="text-sm text-muted-foreground">Search and manage customer store credits</p>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter customer phone number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchCredits()}
            />
            <Button onClick={searchCredits}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {creditsData && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Total Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">
                ₦{creditsData.totalBalance?.toLocaleString() || '0'}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {creditsData.credits?.length || 0} active credit(s)
              </p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {creditsData.credits?.map((credit: any) => (
              <Card key={credit.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{credit.customerName}</h3>
                      <p className="text-sm text-muted-foreground">{credit.customerPhone}</p>
                    </div>
                    {getStatusBadge(credit.status)}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Credit Amount</p>
                      <p className="font-semibold">₦{parseFloat(credit.creditAmount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Used</p>
                      <p className="font-semibold">₦{parseFloat(credit.usedAmount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="font-semibold text-green-600">₦{parseFloat(credit.remainingBalance).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mb-4">
                    Created: {new Date(credit.createdAt).toLocaleDateString()}
                    {credit.expiresAt && ` • Expires: ${new Date(credit.expiresAt).toLocaleDateString()}`}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCredit(credit);
                      setShowTransactions(true);
                    }}
                  >
                    <History className="w-4 h-4 mr-2" />
                    View Transactions
                  </Button>
                </CardContent>
              </Card>
            ))}

            {creditsData.credits?.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No store credits found for this customer
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Transactions Dialog */}
      <Dialog open={showTransactions} onOpenChange={setShowTransactions}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {transactions?.map((txn: any) => (
              <div key={txn.id} className="p-3 border rounded">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <Badge variant={txn.transactionType === 'credit' ? 'success' : 'secondary'}>
                      {txn.transactionType}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(txn.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${txn.transactionType === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.transactionType === 'credit' ? '+' : '-'}₦{parseFloat(txn.amount).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Before:</span> ₦{parseFloat(txn.balanceBefore).toLocaleString()}
                  </div>
                  <div>
                    <span className="text-muted-foreground">After:</span> ₦{parseFloat(txn.balanceAfter).toLocaleString()}
                  </div>
                </div>
                {txn.notes && (
                  <p className="text-xs text-muted-foreground mt-2">{txn.notes}</p>
                )}
              </div>
            ))}

            {transactions?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No transactions yet</p>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowTransactions(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
