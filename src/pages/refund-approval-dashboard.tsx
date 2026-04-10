import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, RotateCcw, AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const LOSS_REASONS = [
  { id: 'staff_negligence', label: 'Staff Negligence' },
  { id: 'system_issue', label: 'System Issue' },
  { id: 'external_factors', label: 'External Factors' }
];

const STATUS_TABS = [
  { key: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-500' },
  { key: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-emerald-500' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-500' },
  { key: 'completed', label: 'Completed', icon: RotateCcw, color: 'text-blue-500' },
];

const ACTION_LABELS: any = {
  full_refund: 'Full Refund',
  partial_refund: 'Partial Refund',
  replacement: 'Replacement',
  apology: 'Apology',
  store_credit: 'Store Credit'
};

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
      const response = await apiRequest('PUT', `/api/refunds/requests/${selectedRequest.id}/approve`, { managementNote, lossReason });
      if (!response.ok) throw new Error('Failed to approve request');
      const data = await response.json();
      toast({ title: 'Request Approved', description: data.newOrderNumber ? `New order #${data.newOrderNumber} created` : 'Refund has been processed' });
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
      const response = await apiRequest('PUT', `/api/refunds/requests/${selectedRequest.id}/reject`, { rejectedReason });
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

  const getAmount = (request: any) => {
    if (request.actionRequested === 'replacement') {
      const items = request.replacementItems ? JSON.parse(request.replacementItems) : [];
      const total = items.reduce((sum: number, item: any) => sum + (parseFloat(item.price) * item.quantity), 0);
      return total > 0 ? `₦${total.toLocaleString()}` : '—';
    }
    return request.refundAmount && request.refundAmount !== 'N/A'
      ? `₦${parseFloat(request.refundAmount).toLocaleString()}`
      : '—';
  };

  const getIssueTypes = (request: any): string[] => {
    try {
      return typeof request.issueTypes === 'string' ? JSON.parse(request.issueTypes) : (request.issueTypes || []);
    } catch { return []; }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900">Refund Approvals</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and process refund requests</p>
      </div>

      {/* Status Tabs */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-0">
          {STATUS_TABS.map(tab => {
            const Icon = tab.icon;
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? 'border-[#50BAA8] text-[#50BAA8]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#50BAA8]' : tab.color}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {requests?.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <RotateCcw className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No {statusFilter} requests</p>
          </div>
        )}

        {requests?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <div>Order</div>
              <div>Action</div>
              <div>Amount</div>
              <div>Customer</div>
              <div>Issue Types</div>
              <div>Status</div>
              <div></div>
            </div>

            {/* Rows */}
            {requests.map((request: any, i: number) => (
              <div
                key={request.id}
                className={`grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_1fr_auto] gap-4 px-5 py-4 items-center text-sm ${i !== requests.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/60 transition-colors`}
              >
                {/* Order */}
                <div>
                  <p className="font-semibold text-gray-900">#{request.orderNumber}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {request.requester?.username} · {new Date(request.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>

                {/* Action */}
                <div className="text-gray-700">{ACTION_LABELS[request.actionRequested] || request.actionRequested}</div>

                {/* Amount */}
                <div className="font-semibold text-[#50BAA8]">{getAmount(request)}</div>

                {/* Customer */}
                <div className="text-gray-700 truncate">{request.order?.customerName || '—'}</div>

                {/* Issue Types */}
                <div className="flex flex-wrap gap-1">
                  {getIssueTypes(request).slice(0, 2).map((issue: string) => (
                    <span key={issue} className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-xs border border-orange-100">
                      {issue.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {getIssueTypes(request).length > 2 && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">+{getIssueTypes(request).length - 2}</span>
                  )}
                </div>

                {/* Status */}
                <div><StatusPill status={request.status} /></div>

                {/* Action */}
                <div>
                  {request.status === 'pending' && (
                    <button
                      onClick={() => { setSelectedRequest(request); setShowApprovalDialog(true); }}
                      className="flex items-center gap-1 bg-[#50BAA8] hover:bg-[#3da898] text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Review <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Review Refund Request</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-1">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-4 text-sm">
                <div><span className="text-gray-400 text-xs">Order</span><p className="font-semibold">#{selectedRequest.orderNumber}</p></div>
                <div><span className="text-gray-400 text-xs">Customer</span><p className="font-semibold">{selectedRequest.order?.customerName || '—'}</p></div>
                <div><span className="text-gray-400 text-xs">Action</span><p className="font-semibold">{ACTION_LABELS[selectedRequest.actionRequested] || selectedRequest.actionRequested}</p></div>
                <div><span className="text-gray-400 text-xs">Amount</span><p className="font-semibold text-[#50BAA8]">{getAmount(selectedRequest)}</p></div>
              </div>

              {/* Loss Classification */}
              <div>
                <Label className="text-sm font-semibold">Loss Classification <span className="text-red-500">*</span></Label>
                <RadioGroup value={lossReason} onValueChange={setLossReason} className="mt-2 space-y-2">
                  {LOSS_REASONS.map(reason => (
                    <label
                      key={reason.id}
                      htmlFor={reason.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        lossReason === reason.id ? 'border-[#50BAA8] bg-[#50BAA8]/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <RadioGroupItem value={reason.id} id={reason.id} />
                      <span className="text-sm">{reason.label}</span>
                    </label>
                  ))}
                </RadioGroup>
                {lossReason === 'staff_negligence' && selectedRequest?.order?.orderType === 'walk-in' && (
                  <div className="flex items-start gap-2 mt-2 p-2.5 bg-orange-50 rounded-lg border border-orange-100">
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-600">An Employee Misconduct Card will be automatically generated for the staff member.</p>
                  </div>
                )}
                {lossReason === 'staff_negligence' && selectedRequest?.order?.orderType !== 'walk-in' && (
                  <p className="text-xs text-blue-500 mt-2 pl-1">ℹ️ Customer order ({selectedRequest?.order?.orderType}) — no EM card will be created.</p>
                )}
              </div>

              {/* Management Note */}
              <div>
                <Label className="text-sm font-semibold">Internal Note <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Textarea
                  placeholder="Add internal notes..."
                  value={managementNote}
                  onChange={(e) => setManagementNote(e.target.value)}
                  rows={2}
                  className="mt-1.5 resize-none"
                />
              </div>

              {/* Rejection Reason */}
              <div>
                <Label className="text-sm font-semibold">Rejection Reason <span className="text-gray-400 font-normal">(if rejecting)</span></Label>
                <Textarea
                  placeholder="Reason for rejection..."
                  value={rejectedReason}
                  onChange={(e) => setRejectedReason(e.target.value)}
                  rows={2}
                  className="mt-1.5 resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)} disabled={processing} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectedReason.trim()}
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing || !lossReason}
              className="flex-1 bg-[#50BAA8] hover:bg-[#3da898]"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              {processing ? 'Processing...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: any = {
    pending: 'bg-amber-50 text-amber-600 border-amber-100',
    approved: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rejected: 'bg-red-50 text-red-500 border-red-100',
    completed: 'bg-blue-50 text-blue-600 border-blue-100',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

