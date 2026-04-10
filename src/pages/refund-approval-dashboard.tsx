import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const LOSS_REASONS = [
  { id: 'staff_negligence', label: 'Loss due to staff negligence' },
  { id: 'system_issue', label: 'Loss due to system issue' },
  { id: 'external_factors', label: 'Loss due to external factors' }
];

export default function RefundApprovalDashboard() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [managementNote, setManagementNote] = useState('');
  const [lossReason, setLossReason] = useState('');
  const [rejectedReason, setRejectedReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const { data: requests, refetch } = useQuery({
    queryKey: ['/api/refunds/requests', statusFilter],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/refunds/requests?status=${statusFilter}`);
      if (!response.ok) throw new Error('Failed to fetch requests');
      const data = await response.json();
      return data.requests;
    }
  });

  const handleApprove = async () => {
    if (!lossReason) {
      toast({ title: 'Loss Reason Required', variant: 'destructive' });
      return;
    }

    try {
      setProcessing(true);
      const response = await apiRequest('PUT', `/api/refunds/requests/${selectedRequest.id}/approve`, {
        managementNote,
        lossReason
      });

      if (!response.ok) throw new Error('Failed to approve request');

      const data = await response.json();

      toast({ 
        title: 'Request Approved', 
        description: data.newOrderNumber 
          ? `New order #${data.newOrderNumber} created` 
          : 'Refund has been processed' 
      });
      setShowApprovalDialog(false);
      setSelectedRequest(null);
      setManagementNote('');
      setLossReason('');
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectedReason.trim()) {
      toast({ title: 'Rejection Reason Required', variant: 'destructive' });
      return;
    }

    try {
      setProcessing(true);
      const response = await apiRequest('PUT', `/api/refunds/requests/${selectedRequest.id}/reject`, {
        rejectedReason
      });

      if (!response.ok) throw new Error('Failed to reject request');

      toast({ title: 'Request Rejected' });
      setShowApprovalDialog(false);
      setSelectedRequest(null);
      setRejectedReason('');
      refetch();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: 'default',
      approved: 'success',
      rejected: 'destructive',
      completed: 'secondary'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getActionLabel = (action: string) => {
    const labels: any = {
      full_refund: 'Full Refund',
      partial_refund: 'Partial Refund',
      replacement: 'Replacement',
      apology: 'Apology',
      store_credit: 'Store Credit'
    };
    return labels[action] || action;
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="font-serif text-2xl md:text-3xl font-bold">Refund Approvals</h1>
        <p className="text-sm text-muted-foreground">Review and approve refund requests</p>
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
              <Clock className="w-4 h-4 mr-2" />
              Pending
            </Button>
            <Button
              variant={statusFilter === 'approved' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('approved')}
              size="sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approved
            </Button>
            <Button
              variant={statusFilter === 'rejected' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('rejected')}
              size="sm"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rejected
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('completed')}
              size="sm"
            >
              Completed
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {requests?.map((request: any) => (
          <Card key={request.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Order #{request.orderNumber}</h3>
                  <p className="text-sm text-muted-foreground">
                    Requested by {request.requester?.username} on {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {getStatusBadge(request.status)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Action</p>
                  <p className="font-semibold">{getActionLabel(request.actionRequested)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-semibold">
                    {request.refundAmount ? `₦${parseFloat(request.refundAmount).toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-semibold">{request.order?.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment Method</p>
                  <p className="font-semibold">{request.refundPaymentMethod || 'N/A'}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-1">Issue Types</p>
                <div className="flex flex-wrap gap-2">
                  {(typeof request.issueTypes === 'string' ? JSON.parse(request.issueTypes) : request.issueTypes)?.map((issue: string) => (
                    <Badge key={issue} variant="outline">{issue.replace('_', ' ')}</Badge>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{request.issueDescription}</p>
              </div>

              {request.status === 'pending' && (
                <Button
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowApprovalDialog(true);
                  }}
                  className="w-full"
                >
                  Review Request
                </Button>
              )}

              {request.status === 'approved' && request.lossReason && (
                <div className="p-3 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Loss Classification</p>
                  <p className="text-sm font-semibold">{request.lossReason.replace('_', ' ')}</p>
                  {request.managementNote && (
                    <p className="text-xs mt-2">{request.managementNote}</p>
                  )}
                </div>
              )}

              {request.status === 'rejected' && request.rejectedReason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-xs text-muted-foreground">Rejection Reason</p>
                  <p className="text-sm">{request.rejectedReason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {requests?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No {statusFilter} requests found
            </CardContent>
          </Card>
        )}
      </div>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Refund Request</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-semibold">Order:</span> #{selectedRequest.orderNumber}</div>
                  <div><span className="font-semibold">Customer:</span> {selectedRequest.order?.customerName}</div>
                  <div><span className="font-semibold">Action:</span> {getActionLabel(selectedRequest.actionRequested)}</div>
                  <div><span className="font-semibold">Amount:</span> {selectedRequest.refundAmount ? `₦${parseFloat(selectedRequest.refundAmount).toLocaleString()}` : 'N/A'}</div>
                </div>
              </div>

              <div>
                <Label>Loss Classification *</Label>
                <RadioGroup value={lossReason} onValueChange={setLossReason}>
                  {LOSS_REASONS.map(reason => (
                    <div key={reason.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={reason.id} id={reason.id} />
                      <label htmlFor={reason.id} className="text-sm cursor-pointer">
                        {reason.label}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
                {lossReason === 'staff_negligence' && selectedRequest?.order?.orderType === 'walk-in' && (
                  <p className="text-xs text-orange-600 mt-2">
                    ⚠️ An Employee Misconduct Card will be automatically generated for the staff member
                  </p>
                )}
                {lossReason === 'staff_negligence' && selectedRequest?.order?.orderType !== 'walk-in' && (
                  <p className="text-xs text-blue-600 mt-2">
                    ℹ️ This is a customer order ({selectedRequest?.order?.orderType}). No EM card will be created.
                  </p>
                )}
              </div>

              <div>
                <Label>Management Note (Internal)</Label>
                <Textarea
                  placeholder="Add internal notes..."
                  value={managementNote}
                  onChange={(e) => setManagementNote(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label>Rejection Reason (if rejecting)</Label>
                <Textarea
                  placeholder="Reason for rejection..."
                  value={rejectedReason}
                  onChange={(e) => setRejectedReason(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectedReason.trim()}>
              Reject
            </Button>
            <Button onClick={handleApprove} disabled={processing || !lossReason}>
              {processing ? 'Processing...' : 'Approve & Execute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
