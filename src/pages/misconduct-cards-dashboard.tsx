import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function MisconductCardsDashboard() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const { data: cards, refetch } = useQuery({
    queryKey: ['/api/refunds/misconduct-cards', statusFilter],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/refunds/misconduct-cards?status=${statusFilter}`);
      if (!response.ok) throw new Error('Failed to fetch cards');
      const data = await response.json();
      return data.cards;
    }
  });

  const handleResolve = async () => {
    if (!resolutionNotes.trim()) {
      toast({ title: 'Resolution Notes Required', variant: 'destructive' });
      return;
    }

    try {
      setProcessing(true);
      const response = await apiRequest('PUT', `/api/refunds/misconduct-cards/${selectedCard.id}/resolve`, {
        resolutionNotes
      });

      if (!response.ok) throw new Error('Failed to resolve card');

      toast({ title: 'Card Resolved Successfully' });
      setShowResolveDialog(false);
      setSelectedCard(null);
      setResolutionNotes('');
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: 'destructive',
      under_review: 'default',
      resolved: 'secondary'
    };
    const icons: any = {
      pending: AlertTriangle,
      under_review: Clock,
      resolved: CheckCircle
    };
    const Icon = icons[status];
    return (
      <Badge variant={variants[status] || 'default'}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const totalLoss = cards?.reduce((sum: number, card: any) => sum + parseFloat(card.financialLoss), 0) || 0;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="font-serif text-2xl md:text-3xl font-bold">Employee Misconduct Cards</h1>
        <p className="text-sm text-muted-foreground">Track and resolve staff-related losses</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Cards</p>
            <p className="text-3xl font-bold">{cards?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Financial Loss</p>
            <p className="text-3xl font-bold text-red-600">₦{totalLoss.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending Resolution</p>
            <p className="text-3xl font-bold text-orange-600">
              {cards?.filter((c: any) => c.status === 'pending').length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('pending')}
              size="sm"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Pending
            </Button>
            <Button
              variant={statusFilter === 'under_review' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('under_review')}
              size="sm"
            >
              <Clock className="w-4 h-4 mr-2" />
              Under Review
            </Button>
            <Button
              variant={statusFilter === 'resolved' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('resolved')}
              size="sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Resolved
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cards List */}
      <div className="space-y-4">
        {cards?.map((card: any) => (
          <Card key={card.id} className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{card.staff?.username}</h3>
                  <p className="text-sm text-muted-foreground">{card.staff?.email}</p>
                </div>
                {getStatusBadge(card.status)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Order</p>
                  <p className="font-semibold">#{card.order?.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Financial Loss</p>
                  <p className="font-semibold text-red-600">₦{parseFloat(card.financialLoss).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-semibold">{new Date(card.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created By</p>
                  <p className="font-semibold">{card.creator?.username}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-1">Issue Summary</p>
                <p className="text-sm">{card.issueSummary}</p>
              </div>

              {card.status === 'resolved' && card.resolutionNotes && (
                <div className="p-3 bg-green-50 border border-green-200 rounded mb-4">
                  <p className="text-xs text-muted-foreground mb-1">Resolution</p>
                  <p className="text-sm">{card.resolutionNotes}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Resolved: {new Date(card.resolvedAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              {card.status !== 'resolved' && (
                <Button
                  onClick={() => {
                    setSelectedCard(card);
                    setShowResolveDialog(true);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Resolve Card
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {cards?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No {statusFilter} misconduct cards found
            </CardContent>
          </Card>
        )}
      </div>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Misconduct Card</DialogTitle>
          </DialogHeader>

          {selectedCard && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-semibold">Staff:</span> {selectedCard.staff?.username}</div>
                  <div><span className="font-semibold">Order:</span> #{selectedCard.order?.orderNumber}</div>
                  <div><span className="font-semibold">Loss:</span> ₦{parseFloat(selectedCard.financialLoss).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <Label>Resolution Notes *</Label>
                <Textarea
                  placeholder="Describe how this was resolved..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={processing || !resolutionNotes.trim()}>
              {processing ? 'Resolving...' : 'Mark as Resolved'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
