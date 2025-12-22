"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ShoppingCart, Plus, CheckCircle, XCircle, Clock, Package, Trash2, ThumbsUp } from "lucide-react"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

interface RawMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  requestedQuantity?: number;
  givenQuantity?: number;
}

interface KitchenRequest {
  id: number;
  rawMaterials: RawMaterial[];
  status: 'pending' | 'completed' | 'cancelled';
  isApproved: boolean;
  requestedBy: string;
  requestedByName: string;
  approvedBy?: string | null;
  completedBy?: string | null;
  notes?: string | null;
  requestedAt: string;
  approvedAt?: string | null;
  completedAt?: string | null;
  finishedProductName?: string | null;
  finishedProductQuantity?: number | null;
}

const KitchenRequests: React.FC = () => {
  const [requests, setRequests] = useState<KitchenRequest[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin';

  // Create request form state
  const [materials, setMaterials] = useState<RawMaterial[]>([
    { id: '', name: '', quantity: 0, unit: 'kg' }
  ]);
  const [notes, setNotes] = useState('');

  const [completionNotes, setCompletionNotes] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<KitchenRequest | null>(null);
  const [givenQuantities, setGivenQuantities] = useState<number[]>([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<KitchenRequest | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchKitchenRequests(),
        fetchInventoryItems(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKitchenRequests = async () => {
    try {
      const response = await apiRequest("GET", "/api/kitchen-requests");
      const data = await response.json();
      
      // Parse rawMaterials if it's a string
      const parsedData = data.map((request: any) => ({
        ...request,
        rawMaterials: typeof request.rawMaterials === 'string' 
          ? JSON.parse(request.rawMaterials) 
          : request.rawMaterials || []
      }));
      
      setRequests(parsedData);
    } catch (error) {
      console.error('Error fetching kitchen requests:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch kitchen requests",
      });
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const response = await apiRequest("GET", "/api/inventory");
      const result = await response.json();
      const items = result.data && Array.isArray(result.data) ? result.data : [];
      setInventoryItems(items);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch inventory items",
      });
    }
  };

  const addMaterial = () => {
    setMaterials([...materials, { id: '', name: '', quantity: 0, unit: 'kg' }]);
  };

  const removeMaterial = (index: number) => {
    if (materials.length > 1) {
      setMaterials(materials.filter((_, i) => i !== index));
    }
  };

  const updateMaterial = (index: number, field: keyof RawMaterial, value: any) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    
    // If changing the item, update name and unit
    if (field === 'id') {
      const item = inventoryItems.find(i => i.id === value);
      if (item) {
        updated[index].name = item.name;
        updated[index].unit = item.unit;
      }
    }
    
    setMaterials(updated);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate materials
    const validMaterials = materials.filter(m => m.id && m.quantity > 0);
    if (validMaterials.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please add at least one material with quantity",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/kitchen-requests", {
        rawMaterials: validMaterials,
        notes: notes || null,
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Kitchen request created successfully",
        });
        setShowCreateDialog(false);
        setMaterials([{ id: '', name: '', quantity: 0, unit: 'kg' }]);
        setNotes('');
        fetchData();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to create request",
        });
      }
    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create request",
      });
    }
  };

  const openApproveDialog = (request: KitchenRequest) => {
    setSelectedRequest(request);
    // Initialize given quantities with requested quantities
    const materials = Array.isArray(request.rawMaterials) ? request.rawMaterials : [];
    setGivenQuantities(materials.map(m => m.quantity));
    setShowApproveDialog(true);
  };

  const handleApproveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRequest) return;

    try {
      const response = await apiRequest("PATCH", `/api/kitchen-requests/${selectedRequest.id}/approve`, {
        givenQuantities
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Request approved successfully. Materials deducted from inventory.",
        });
        setShowApproveDialog(false);
        setSelectedRequest(null);
        fetchData();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to approve request",
        });
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve request",
      });
    }
  };

  const handleCompleteRequest = async (id: number) => {
    const notes = prompt("Add completion notes (optional):");
    
    if (notes === null) return; // User cancelled

    try {
      const response = await apiRequest("PATCH", `/api/kitchen-requests/${id}/complete`, {
        notes: notes || null
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: result.message || "Request marked as completed!",
        });
        toast({
          title: "Next Step",
          description: "Go to Menu Management to add your prepared meal",
          variant: "default",
        });
        fetchData();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to complete request",
        });
      }
    } catch (error) {
      console.error('Error completing request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete request",
      });
    }
  };

  const handleCancelRequestClick = (request: KitchenRequest) => {
    setRequestToCancel(request);
    setShowCancelDialog(true);
  };

  const handleCancelRequestConfirm = async () => {
    if (!requestToCancel) return;

    try {
      const response = await apiRequest("PATCH", `/api/kitchen-requests/${requestToCancel.id}/cancel`);

      if (response.ok) {
        toast({
          title: "Success",
          description: "Request cancelled successfully",
        });
        setShowCancelDialog(false);
        setRequestToCancel(null);
        fetchData();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to cancel request",
        });
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel request",
      });
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const completedRequests = requests.filter(r => r.status === 'completed');

  const getStatusBadge = (request: KitchenRequest) => {
    if (request.status === 'completed') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Completed</span>;
    }
    if (request.status === 'cancelled') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Cancelled</span>;
    }
    if (request.isApproved) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Approved - Ready to Prepare</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending Approval</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#50BAA8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading kitchen requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#50BAA8] to-teal-600 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kitchen Requests</h1>
              <p className="text-sm text-gray-600 mt-1">Request materials and create menu items</p>
            </div>
          </div>

          {/* Create Request Button */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#50BAA8] to-teal-600 hover:from-[#3da896] hover:to-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Kitchen Request</DialogTitle>
                <DialogDescription>
                  Request raw materials from inventory to prepare meals
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateRequest}>
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Raw Materials Needed</Label>
                    <p className="text-sm text-gray-500 mb-3">Add all materials you need for preparation</p>
                    
                    {materials.map((material, index) => (
                      <div key={index} className="flex gap-2 mb-3 items-end">
                        <div className="flex-1">
                          <Label className="text-xs">Material</Label>
                          <select
                            value={material.id}
                            onChange={(e) => updateMaterial(index, 'id', e.target.value)}
                            required
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="">Select material...</option>
                            {inventoryItems.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.quantity} {item.unit} available)
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="w-32">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={material.quantity || ''}
                            onChange={(e) => updateMaterial(index, 'quantity', parseFloat(e.target.value) || 0)}
                            required
                          />
                        </div>
                        
                        <div className="w-24">
                          <Label className="text-xs">Unit</Label>
                          <Input
                            value={material.unit}
                            disabled
                            className="bg-gray-100"
                          />
                        </div>
                        
                        {materials.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeMaterial(index)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addMaterial}
                      className="w-full mt-2"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another Material
                    </Button>
                  </div>

                  <div>
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="What are you planning to make? Any special notes..."
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#50BAA8]">
                    Submit Request
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedRequests.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-[#50BAA8]">{requests.length}</p>
              </div>
              <Package className="w-8 h-8 text-[#50BAA8]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            Pending Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No pending requests</p>
              <p className="text-sm">Create a new request to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Materials</th>
                    <th className="text-left p-3 font-semibold">Requested By</th>
                    <th className="text-left p-3 font-semibold">Date</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map(request => (
                    <tr key={request.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="space-y-1">
                          {Array.isArray(request.rawMaterials) && request.rawMaterials.length > 0 ? (
                            request.rawMaterials.map((material, idx) => (
                              <div key={idx} className="text-sm">
                                • {material.name}: 
                                {material.requestedQuantity && material.givenQuantity ? (
                                  <span>
                                    <span className="text-gray-500">Requested: {material.requestedQuantity}{material.unit}</span>
                                    {" | "}
                                    <span className="font-medium text-green-600">Given: {material.givenQuantity}{material.unit}</span>
                                  </span>
                                ) : (
                                  <span className="font-medium">{material.quantity}{material.unit}</span>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-gray-500">No materials listed</div>
                          )}
                        </div>
                        {request.notes && (
                          <div className="text-xs text-gray-500 mt-2">
                            Note: {request.notes}
                          </div>
                        )}
                      </td>
                      <td className="p-3">{request.requestedByName}</td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(request.requestedAt).toLocaleString()}
                      </td>
                      <td className="p-3">{getStatusBadge(request)}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {isAdmin && !request.isApproved && (
                            <Button
                              size="sm"
                              onClick={() => openApproveDialog(request)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <ThumbsUp className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          {request.isApproved && (
                            <Button
                              size="sm"
                              onClick={() => handleCompleteRequest(request.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark Completed
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelRequestClick(request)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                          {!isAdmin && !request.isApproved && (
                            <span className="text-sm text-yellow-600 font-medium">Awaiting Admin Approval</span>
                          )}
                          {!isAdmin && request.isApproved && (
                            <span className="text-sm text-blue-600 font-medium">Approved - Click Complete when ready</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Completed Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No completed requests yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Materials Used</th>
                    <th className="text-left p-3 font-semibold">Meal Created</th>
                    <th className="text-left p-3 font-semibold">Requested By</th>
                    <th className="text-left p-3 font-semibold">Completed At</th>
                  </tr>
                </thead>
                <tbody>
                  {completedRequests.map(request => (
                    <tr key={request.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="space-y-1">
                          {Array.isArray(request.rawMaterials) && request.rawMaterials.length > 0 ? (
                            request.rawMaterials.map((material, idx) => (
                              <div key={idx} className="text-sm">
                                • {material.name}: {material.quantity}{material.unit}
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-gray-500">No materials listed</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {request.finishedProductName ? (
                          <div>
                            <div className="font-medium">{request.finishedProductName}</div>
                            <div className="text-sm text-gray-500">Qty: {request.finishedProductQuantity}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="p-3">{request.requestedByName}</td>
                      <td className="p-3 text-sm text-gray-600">
                        {request.completedAt ? new Date(request.completedAt).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Request Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approve Kitchen Request</DialogTitle>
            <DialogDescription>
              Review and adjust quantities to give to kitchen
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <form onSubmit={handleApproveRequest}>
              <div className="space-y-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">Materials Requested:</h4>
                  <div className="space-y-3">
                    {Array.isArray(selectedRequest.rawMaterials) && selectedRequest.rawMaterials.map((material, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-4 items-center">
                        <div className="col-span-1">
                          <Label className="text-sm font-medium">{material.name}</Label>
                        </div>
                        <div className="col-span-1">
                          <Label className="text-xs text-gray-500">Requested</Label>
                          <div className="text-sm font-medium">{material.quantity} {material.unit}</div>
                        </div>
                        <div className="col-span-1">
                          <Label className="text-xs">Quantity to Give *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max={material.quantity}
                            value={givenQuantities[idx] || ''}
                            onChange={(e) => {
                              const updated = [...givenQuantities];
                              updated[idx] = parseFloat(e.target.value) || 0;
                              setGivenQuantities(updated);
                            }}
                            required
                            className="h-9"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> You can give less than requested if inventory is low. 
                    The given quantities will be deducted from inventory.
                  </p>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setShowApproveDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Approve & Deduct from Inventory
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Request Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Request</AlertDialogTitle>
            <AlertDialogDescription>
              Cancel this request? If approved, materials will be returned to inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelRequestConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default KitchenRequests;
