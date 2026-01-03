import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Edit2, DollarSign, Percent } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { apiRequest } from "@/lib/queryClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ServiceCharge {
  id: string
  description: string
  type: 'fixed' | 'percentage'
  amount: number
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

interface ServiceChargesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ServiceChargesModal({ open, onOpenChange }: ServiceChargesModalProps) {
  const [serviceCharges, setServiceCharges] = useState<ServiceCharge[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingCharge, setEditingCharge] = useState<ServiceCharge | null>(null)
  const [chargeToDelete, setChargeToDelete] = useState<ServiceCharge | null>(null)

  // Form state
  const [description, setDescription] = useState("")
  const [type, setType] = useState<'fixed' | 'percentage'>('percentage')
  const [amount, setAmount] = useState("")
  const [status, setStatus] = useState<'active' | 'inactive'>('active')

  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchServiceCharges()
    }
  }, [open])

  const fetchServiceCharges = async () => {
    try {
      setLoading(true)
      const response = await apiRequest("GET", "/api/service-charges")
      const data = await response.json()
      setServiceCharges(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch service charges",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setDescription("")
    setType('percentage')
    setAmount("")
    setStatus('active')
  }

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await apiRequest("POST", "/api/service-charges", {
        description,
        type,
        amount: parseFloat(amount),
        status,
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Service charge added successfully",
        })
        resetForm()
        setShowAddDialog(false)
        fetchServiceCharges()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add service charge",
        variant: "destructive",
      })
    }
  }

  const handleEditCharge = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingCharge) return

    try {
      const response = await apiRequest("PATCH", `/api/service-charges/${editingCharge.id}`, {
        description,
        type,
        amount: parseFloat(amount),
        status,
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Service charge updated successfully",
        })
        resetForm()
        setShowEditDialog(false)
        setEditingCharge(null)
        fetchServiceCharges()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update service charge",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCharge = async () => {
    if (!chargeToDelete) return

    try {
      const response = await apiRequest("DELETE", `/api/service-charges/${chargeToDelete.id}`)

      if (response.ok) {
        toast({
          title: "Success",
          description: "Service charge deleted successfully",
        })
        setShowDeleteDialog(false)
        setChargeToDelete(null)
        fetchServiceCharges()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete service charge",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (charge: ServiceCharge) => {
    setEditingCharge(charge)
    setDescription(charge.description)
    setType(charge.type)
    setAmount(charge.amount.toString())
    setStatus(charge.status)
    setShowEditDialog(true)
  }

  const openDeleteDialog = (charge: ServiceCharge) => {
    setChargeToDelete(charge)
    setShowDeleteDialog(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Service Charges Management</DialogTitle>
            <DialogDescription>
              Manage service charges like VAT, delivery fees, and other charges
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  resetForm()
                  setShowAddDialog(true)
                }}
                className="bg-[#50BAA8] hover:bg-[#3d9a8f] text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Charge
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-[#50BAA8] rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-slate-600 text-sm">Loading charges...</p>
                </div>
              </div>
            ) : serviceCharges.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-600 font-medium">No service charges found</p>
                  <p className="text-slate-500 text-sm">Add your first service charge</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {serviceCharges.map((charge) => (
                  <Card key={charge.id} className="border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{charge.description}</h3>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                charge.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {charge.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-slate-600">
                            {charge.type === 'percentage' ? (
                              <>
                                <Percent className="w-4 h-4" />
                                <span>{charge.amount}%</span>
                              </>
                            ) : (
                              <>
                                <DollarSign className="w-4 h-4" />
                                <span>₦{charge.amount.toFixed(2)}</span>
                              </>
                            )}
                            <span className="text-sm text-slate-400 ml-2">
                              ({charge.type})
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(charge)}
                            className="border-slate-200 hover:bg-slate-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(charge)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Charge Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Service Charge</DialogTitle>
            <DialogDescription>Create a new service charge</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCharge} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., VAT, Delivery Fee"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(value: 'fixed' | 'percentage') => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount {type === 'percentage' ? '(%)' : '(₦)'}
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={type === 'percentage' ? 'e.g., 7.5' : 'e.g., 500'}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: 'active' | 'inactive') => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#50BAA8] hover:bg-[#3d9a8f] text-white">
                Add Charge
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Charge Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Service Charge</DialogTitle>
            <DialogDescription>Update service charge details</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditCharge} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., VAT, Delivery Fee"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select value={type} onValueChange={(value: 'fixed' | 'percentage') => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-amount">
                Amount {type === 'percentage' ? '(%)' : '(₦)'}
              </Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={type === 'percentage' ? 'e.g., 7.5' : 'e.g., 500'}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={status} onValueChange={(value: 'active' | 'inactive') => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#50BAA8] hover:bg-[#3d9a8f] text-white">
                Update Charge
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Charge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{chargeToDelete?.description}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCharge}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
