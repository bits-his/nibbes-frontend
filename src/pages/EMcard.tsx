"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CreditCard, ArrowLeft, Printer, Settings, Plus, Trash2, Eye, EyeOff, TrendingUp } from "lucide-react"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useLocation } from "wouter";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface ChecklistItem {
  id: number;
  name: string;
  enabled: boolean;
  displayOrder: number;
}

interface FormData {
  date: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  checklistResponses: Record<string, boolean>;
  comments: string;
  checklist1: string;
  checklist2: string;
  checklist3: string;
}

const EMcard: React.FC = () => {
  const [location, setLocation] = useLocation();
  const [showReport, setShowReport] = useState(false);
  const [staff, setStaff] = useState<User[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loadingChecklist, setLoadingChecklist] = useState(true);
  const [showChecklistManager, setShowChecklistManager] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    date: '',
    staffId: '',
    staffName: '',
    staffRole: '',
    checklistResponses: {},
    comments: '',
    checklist1: '',
    checklist2: '',
    checklist3: ''
  });

  // Fetch staff members
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoadingStaff(true);
        const response = await apiRequest("GET", "/api/users");
        const data = await response.json();
        const staffMembers = data.filter((user: User) => user.role !== 'customer');
        setStaff(staffMembers);
      } catch (error) {
        console.error("Error fetching staff:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch staff members",
        });
      } finally {
        setLoadingStaff(false);
      }
    };

    fetchStaff();
  }, []);

  // Fetch checklist items
  const fetchChecklistItems = async () => {
    try {
      setLoadingChecklist(true);
      const response = await apiRequest("GET", "/api/checklist-items");
      const data = await response.json();
      setChecklistItems(data);
      
      // Initialize checklist responses
      const initialResponses: Record<string, boolean> = {};
      data.forEach((item: ChecklistItem) => {
        if (item.enabled) {
          initialResponses[item.name] = false;
        }
      });
      setFormData(prev => ({ ...prev, checklistResponses: initialResponses }));
    } catch (error) {
      console.error("Error fetching checklist items:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch checklist items",
      });
    } finally {
      setLoadingChecklist(false);
    }
  };

  useEffect(() => {
    fetchChecklistItems();
  }, []);

  const handleStaffChange = (staffId: string) => {
    const selectedStaff = staff.find(s => s.id === staffId);
    if (selectedStaff) {
      setFormData({
        ...formData,
        staffId: selectedStaff.id,
        staffName: selectedStaff.username,
        staffRole: selectedStaff.role
      });
    }
  };

  const handleChecklistChange = (itemName: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      checklistResponses: {
        ...prev.checklistResponses,
        [itemName]: checked
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await apiRequest("POST", "/api/manager-reports", {
        date: formData.date,
        staffId: formData.staffId,
        staffName: formData.staffName,
        staffRole: formData.staffRole,
        checklist1: formData.checklist1,
        checklist2: formData.checklist2,
        checklist3: formData.checklist3,
        checklistResponses: formData.checklistResponses,
        comments: formData.comments,
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Manager report saved successfully",
        });
        setShowReport(true);
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to save report",
        });
      }
    } catch (error) {
      console.error("Error saving report:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save report. Please try again.",
      });
    }
  };

  const handleBack = () => {
    setShowReport(false);
  };

  const handlePrint = () => {
    window.print();
  };

  // Checklist management functions
  const handleAddChecklistItem = async () => {
    if (!newItemName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a checklist item name",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/checklist-items", {
        name: newItemName.trim()
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Checklist item added successfully",
        });
        setNewItemName('');
        fetchChecklistItems();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to add checklist item",
        });
      }
    } catch (error) {
      console.error("Error adding checklist item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add checklist item",
      });
    }
  };

  const handleToggleChecklistItem = async (id: number, currentEnabled: boolean) => {
    try {
      const response = await apiRequest("PATCH", `/api/checklist-items/${id}`, {
        enabled: !currentEnabled
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Checklist item ${!currentEnabled ? 'enabled' : 'disabled'} successfully`,
        });
        fetchChecklistItems();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to update checklist item",
        });
      }
    } catch (error) {
      console.error("Error updating checklist item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update checklist item",
      });
    }
  };

  const handleDeleteChecklistItem = async (id: number) => {
    if (!confirm("Are you sure you want to delete this checklist item?")) {
      return;
    }

    try {
      const response = await apiRequest("DELETE", `/api/checklist-items/${id}`);

      if (response.ok) {
        toast({
          title: "Success",
          description: "Checklist item deleted successfully",
        });
        fetchChecklistItems();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to delete checklist item",
        });
      }
    } catch (error) {
      console.error("Error deleting checklist item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete checklist item",
      });
    }
  };

  // Get enabled checklist items for display
  const enabledChecklistItems = checklistItems.filter(item => item.enabled);

  // Form Page
  if (!showReport) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 p-2 sm:p-4 md:p-6 lg:p-8">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center justify-between gap-2 sm:gap-3 mb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-[#50BAA8] to-teal-600 rounded-lg">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Daily Manager Report</h1>
            </div>
            
            {/* Add Checklist Button */}
            <div className="flex gap-2">
              <Dialog open={showChecklistManager} onOpenChange={setShowChecklistManager}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Manage Checklist</span>
                    <span className="sm:hidden">Manage</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Manage Checklist Items</DialogTitle>
                    <DialogDescription>
                      Add, enable/disable, or delete checklist items for employee penalties & bonuses
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Add New Item */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="New checklist item name"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                      />
                      <Button onClick={handleAddChecklistItem} className="bg-[#50BAA8]">
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>

                    {/* Checklist Items List */}
                    <div className="border rounded-lg divide-y">
                      {checklistItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                          <div className="flex items-center gap-3 flex-1">
                            <span className={`font-medium ${!item.enabled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                              {item.name}
                            </span>
                            {!item.enabled && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                                Disabled
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleChecklistItem(item.id, item.enabled)}
                              title={item.enabled ? "Disable" : "Enable"}
                            >
                              {item.enabled ? (
                                <Eye className="w-4 h-4 text-green-600" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-gray-400" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteChecklistItem(item.id)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowChecklistManager(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* View List Button */}
              <Button
                variant="outline"
                className="flex items-center gap-2 text-xs sm:text-sm"
                onClick={() => setLocation('/manager-reports-list')}
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">View List</span>
                <span className="sm:hidden">List</span>
              </Button>

              {/* Dashboard Button */}
              <Button
                variant="outline"
                className="flex items-center gap-2 text-xs sm:text-sm"
                onClick={() => setLocation('/manager-reports-dashboard')}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Dash</span>
              </Button>
            </div>
          </div>
          <p className="text-sm sm:text-base text-gray-600 mt-2">Fill in the employee report details</p>
        </div>

        <Card className="bg-white border-slate-200 max-w-4xl mx-auto">
          <CardHeader className="border-b border-slate-200 pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg md:text-xl text-gray-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-[#50BAA8]" />
              Employee Report Form
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Date and Staff Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-sm sm:text-base text-gray-700 font-semibold">Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="bg-white border-slate-300 text-gray-900 mt-1 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <Label className="text-sm sm:text-base text-gray-700 font-semibold">Staff Name *</Label>
                  {loadingStaff ? (
                    <Input
                      value="Loading staff..."
                      disabled
                      className="bg-gray-100 border-slate-300 text-gray-500 mt-1 text-sm sm:text-base"
                    />
                  ) : (
                    <select
                      value={formData.staffId}
                      onChange={(e) => handleStaffChange(e.target.value)}
                      required
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#50BAA8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                    >
                      <option value="">Select a staff member</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.username} ({member.role})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Manager's Checklist */}
              <div>
                <Label className="text-sm sm:text-base text-gray-700 font-semibold mb-2 sm:mb-3 block">Manager's Checklist</Label>
                <div className="space-y-2 sm:space-y-3">
                  <Input
                    type="text"
                    value={formData.checklist1}
                    onChange={(e) => setFormData({ ...formData, checklist1: e.target.value })}
                    placeholder="Checklist item 1"
                    className="bg-white border-slate-300 text-gray-900 text-sm sm:text-base"
                  />
                  <Input
                    type="text"
                    value={formData.checklist2}
                    onChange={(e) => setFormData({ ...formData, checklist2: e.target.value })}
                    placeholder="Checklist item 2"
                    className="bg-white border-slate-300 text-gray-900 text-sm sm:text-base"
                  />
                  <Input
                    type="text"
                    value={formData.checklist3}
                    onChange={(e) => setFormData({ ...formData, checklist3: e.target.value })}
                    placeholder="Checklist item 3"
                    className="bg-white border-slate-300 text-gray-900 text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Dynamic Checkboxes */}
              <div>
                <Label className="text-sm sm:text-base text-gray-700 font-semibold mb-2 sm:mb-3 block">Employee Penalties & Bonuses</Label>
                {loadingChecklist ? (
                  <div className="text-sm text-gray-500">Loading checklist items...</div>
                ) : enabledChecklistItems.length === 0 ? (
                  <div className="text-sm text-gray-500">No checklist items available. Click "Manage Checklist" to add items.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    {enabledChecklistItems.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`checklist-${item.id}`}
                          checked={formData.checklistResponses[item.name] || false}
                          onCheckedChange={(checked) => handleChecklistChange(item.name, checked as boolean)}
                        />
                        <label
                          htmlFor={`checklist-${item.id}`}
                          className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {item.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments */}
              <div>
                <Label className="text-sm sm:text-base text-gray-700 font-semibold">Comments / Observations</Label>
                <Textarea
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  placeholder="Enter any comments, issues, or observations..."
                  rows={4}
                  className="bg-white border-slate-300 text-gray-900 mt-1 text-sm sm:text-base"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#50BAA8] to-teal-600 hover:from-[#3da896] hover:to-teal-700 text-white font-semibold text-sm sm:text-base py-2 sm:py-3"
              >
                Generate Report Card
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Report Card Page
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 p-2 sm:p-4 md:p-6 lg:p-8 print:p-0 print:bg-white">
      {/* Action Buttons */}
      <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-[8.5in] mx-auto print:hidden">
        <Button
          onClick={handleBack}
          variant="outline"
          className="flex items-center justify-center gap-2 text-sm sm:text-base py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Form
        </Button>
        <Button
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#50BAA8] to-teal-600 text-sm sm:text-base py-2"
        >
          <Printer className="w-4 h-4" />
          Print Report
        </Button>
      </div>

      {/* PDF Viewer Container */}
      <div className="bg-white shadow-2xl rounded-lg overflow-hidden max-w-[8.5in] mx-auto print:shadow-none print:rounded-none print:max-w-full">
        {/* Report Card */}
        <div className="p-4 sm:p-6 md:p-8 lg:p-12 print:p-8" style={{
          fontFamily: 'Arial, sans-serif',
          fontSize: 'clamp(8pt, 2vw, 10pt)',
        }}>
          <style>{`
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              @page {
                size: A4;
                margin: 0.5in;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}</style>
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-gray-300">
            <img
              src="/nibbles.jpg"
              alt="Nibbles Logo"
              className="h-12 w-16 sm:h-16 sm:w-20 md:h-20 md:w-24 rounded-lg object-cover shadow-md"
            />
            <div className="text-left sm:text-right text-xs sm:text-sm">
              <div className="font-bold text-sm sm:text-base mb-1">NIBBLES FAST FOOD</div>
              <div>No. 124 Lamido Crescent, Kano, Nigeria</div>
              <div>Phone: 08035058099, 08060001228, 08023456789</div>
              <div>Email: teamirang001@gmail.com | Open 24/7</div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold underline mb-2">
              DAILY MANAGER REPORT CARD
            </h1>
            <div className="text-sm sm:text-base font-semibold">
              Date: {formData.date || '_____________'}
            </div>
          </div>

          {/* Manager's Checklist */}
          {(formData.checklist1 || formData.checklist2 || formData.checklist3) && (
            <div className="mb-4 sm:mb-6">
              <div className="font-bold mb-2 text-sm sm:text-base">Manager's Checklist</div>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                {formData.checklist1 && (
                  <div className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>{formData.checklist1}</span>
                  </div>
                )}
                {formData.checklist2 && (
                  <div className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>{formData.checklist2}</span>
                  </div>
                )}
                {formData.checklist3 && (
                  <div className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>{formData.checklist3}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <hr className="my-3 sm:my-4 border-gray-400" />

          {/* Employee Penalties & Bonuses Table */}
          <div className="mb-4 sm:mb-6">
            <div className="font-bold mb-2 sm:mb-3 text-sm sm:text-base">
              Employee Penalties & Bonuses
            </div>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full border-collapse border border-black min-w-[700px]" style={{ fontSize: 'clamp(7pt, 1.5vw, 9pt)' }}>
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-1 sm:p-2 text-center font-semibold">Employee</th>
                    <th className="border border-black p-1 sm:p-2 text-center font-semibold">Department</th>
                    {enabledChecklistItems.map((item) => (
                      <th key={item.id} className="border border-black p-1 sm:p-2 text-center font-semibold">
                        {item.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-1 sm:p-2 text-center font-bold">{formData.staffName}</td>
                    <td className="border border-black p-1 sm:p-2 text-center capitalize">{formData.staffRole}</td>
                    {enabledChecklistItems.map((item) => (
                      <td key={item.id} className="border border-black p-1 sm:p-2 text-center text-lg sm:text-xl">
                        {formData.checklistResponses[item.name] ? '✓' : ''}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <hr className="my-3 sm:my-4 border-gray-400" />

          {/* Comments Section */}
          {formData.comments && (
            <div className="mb-4 sm:mb-6">
              <div className="font-bold mb-2 text-sm sm:text-base">
                Comments / Issues / Observations:
              </div>
              <div className="border border-black p-2 sm:p-3 min-h-[60px] whitespace-pre-wrap text-xs sm:text-sm">
                {formData.comments}
              </div>
            </div>
          )}

          <hr className="my-3 sm:my-4 border-gray-400" />

          {/* Signature Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-6 pt-3 sm:pt-4">
            <div className="w-full sm:w-auto">
              <div className="font-bold mb-1 sm:mb-2 text-xs sm:text-sm">Manager's Name:</div>
              <div className="border-b-2 border-black w-full sm:w-48 h-8"></div>
            </div>
            <div className="w-full sm:w-auto">
              <div className="font-bold mb-1 sm:mb-2 text-xs sm:text-sm">Signature:</div>
              <div className="border-b-2 border-black w-full sm:w-48 h-8"></div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 sm:mt-6 text-xs sm:text-sm font-bold text-center sm:text-left">
            Submit completed form to COO's Office at the end of the day.
          </div>
        </div>
      </div>
    </div>
  );
};

export default EMcard;
