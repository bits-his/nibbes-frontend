import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ManagerReport {
  id: string;
  reportDate: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  checklist1: string | null;
  checklist2: string | null;
  checklist3: string | null;
  faceMask: boolean;
  cap: boolean;
  disorg: boolean;
  shoes: boolean;
  wrongOrder: boolean;
  gloves: boolean;
  trousers: boolean;
  others: boolean;
  bonus: boolean;
  checklistResponses: Record<string, boolean> | null;
  comments: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const ManagerReportsByStaff: React.FC = () => {
  const [location, navigate] = useLocation();
  const [reports, setReports] = useState<ManagerReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const { toast } = useToast();
  
  // Extract staff name from URL (it will be encoded)
  const encodedStaffName = location.split('/').pop() || '';
  const decodedStaffName = decodeURIComponent(encodedStaffName);

  useEffect(() => {
    const fetchReports = async () => {
      if (!decodedStaffName) return;
      
      try {
        setLoading(true);
        const response = await apiRequest("GET", `/api/manager-reports`);
        const allReports = await response.json();
        
        // Filter reports by staff name
        const filteredReports = allReports.filter((report: ManagerReport) => 
          report.staffName && report.staffName.trim().toLowerCase() === decodedStaffName.toLowerCase()
        );
        
        if (filteredReports.length > 0) {
          setStaffName(filteredReports[0].staffName);
          setStaffRole(filteredReports[0].staffRole);
          
          // Normalize checklistResponses like in other components
          const normalizedReports = filteredReports.map((report: any) => {
            let parsedChecklistResponses = report.checklistResponses;
            if (typeof report.checklistResponses === 'string' && report.checklistResponses) {
              try {
                parsedChecklistResponses = JSON.parse(report.checklistResponses);
              } catch (e) {
                console.error("Error parsing checklistResponses:", e);
                parsedChecklistResponses = {
                  'Face Mask': report.faceMask,
                  'Cap': report.cap,
                  'Disorg.': report.disorg,
                  'Shoes': report.shoes,
                  'Wrong Order': report.wrongOrder,
                  'Gloves': report.gloves,
                  'Trousers': report.trousers,
                  'Others': report.others,
                  'Bonus': report.bonus
                };
              }
            } else if (report.checklistResponses === null || report.checklistResponses === undefined) {
              parsedChecklistResponses = {
                'Face Mask': report.faceMask,
                'Cap': report.cap,
                'Disorg.': report.disorg,
                'Shoes': report.shoes,
                'Wrong Order': report.wrongOrder,
                'Gloves': report.gloves,
                'Trousers': report.trousers,
                'Others': report.others,
                'Bonus': report.bonus
              };
            }
            
            return {
              ...report,
              checklistResponses: parsedChecklistResponses
            };
          });
          
          setReports(normalizedReports);
        }
      } catch (error) {
        console.error("Error fetching reports:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch reports for this staff member",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [decodedStaffName]);

  const handleBack = () => {
    navigate('/manager-reports-list');
  };

  const handlePrint = (report: ManagerReport) => {
    // Create a new window with the report details
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Manager Report - ${report.reportDate && report.reportDate.trim() !== '' ? format(new Date(report.reportDate), 'MMM d, yyyy') : ''}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .logo { height: 60px; }
            .title { text-align: center; font-size: 18px; font-weight: bold; text-decoration: underline; margin: 10px 0; }
            .date { font-weight: bold; margin: 10px 0; }
            .checklist { margin: 15px 0; }
            .checklist h3 { font-weight: bold; margin-bottom: 8px; }
            .items { margin-left: 20px; }
            .items div { margin: 5px 0; }
            .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .table th, .table td { border: 1px solid #000; padding: 8px; text-align: center; }
            .table th { background-color: #f0f0f0; }
            .comments { border: 1px solid #000; padding: 10px; margin: 15px 0; min-height: 80px; }
            .signature { display: flex; justify-content: space-between; margin-top: 30px; }
            .signature div { width: 45%; }
            .footer { text-align: center; font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/nibbles.jpg" alt="Nibbles Logo" class="logo">
            <div>
              <div style="font-weight: bold; font-size: 16px;">NIBBLES FAST FOOD</div>
              <div>No. 124 Lamido Crescent, Kano, Nigeria</div>
              <div>Phone: 08035058099, 08060001228, 08023456789</div>
              <div>Email: teamirang001@gmail.com | Open 24/7</div>
            </div>
          </div>
          
          <div class="title">DAILY MANAGER REPORT CARD</div>
          <div class="date">Date: ${report.reportDate && report.reportDate.trim() !== '' ? format(new Date(report.reportDate), 'MMM d, yyyy') : ''}</div>
          
          ${(report.checklist1 || report.checklist2 || report.checklist3) ? `
          <div class="checklist">
            <h3>Manager's Checklist</h3>
            <div class="items">
              ${report.checklist1 ? `<div>• ${report.checklist1}</div>` : ''}
              ${report.checklist2 ? `<div>• ${report.checklist2}</div>` : ''}
              ${report.checklist3 ? `<div>• ${report.checklist3}</div>` : ''}
            </div>
          </div>
          ` : ''}
          
          <hr style="margin: 15px 0;">
          
          <div>
            <h3>Employee Penalties & Bonuses</h3>
            <table class="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  ${(report.checklistResponses ? Object.keys(report.checklistResponses) : []).map(key => `<th>${key}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${report.staffName}</td>
                  <td>${report.staffRole}</td>
                  ${(report.checklistResponses ? Object.values(report.checklistResponses) : []).map(value => `<td>${value ? '✓' : ''}</td>`).join('')}
                </tr>
              </tbody>
            </table>
          </div>
          
          <hr style="margin: 15px 0;">
          
          ${report.comments ? `
          <div>
            <h3>Comments / Issues / Observations:</h3>
            <div class="comments">${report.comments}</div>
          </div>
          ` : ''}
          
          <div class="signature">
            <div>
              <div>Manager's Name:</div>
              <div style="border-bottom: 2px solid #000; height: 30px;"></div>
            </div>
            <div>
              <div>Signature:</div>
              <div style="border-bottom: 2px solid #000; height: 30px;"></div>
            </div>
          </div>
          
          <div class="footer">
            Submit completed form to COO's Office at the end of the day.
          </div>
        </body>
        </html>
      `);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 md:p-8 flex items-center justify-center">
        <div className="text-gray-600">Loading staff reports...</div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 md:p-8 flex items-center justify-center">
        <div className="text-gray-600">No reports found for this staff member</div>
      </div>
    );
  }

  // Calculate total violations across all reports
  const totalViolations = reports.reduce((total, report) => {
    return total + (report.checklistResponses ? Object.entries(report.checklistResponses).filter(([_, value]) => value).length : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Action Buttons and Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Button
            onClick={handleBack}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </Button>
          <div className="text-center sm:text-right">
            <h1 className="text-2xl font-bold">{staffName} ({staffRole})</h1>
            <p className="text-gray-600">
              {reports.length} report{reports.length !== 1 ? 's' : ''} • {totalViolations} violation{totalViolations !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-center md:text-left mb-4 md:mb-0">
                <h2 className="text-xl font-bold text-gray-900">Report Summary</h2>
                <p className="text-gray-600">Showing all reports for {staffName}</p>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{reports.length}</div>
                  <div className="text-sm text-gray-600">Total Reports</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{totalViolations}</div>
                  <div className="text-sm text-gray-600">Total Violations</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        {reports.map((report) => (
          <Card key={report.id} className="bg-white border-slate-200">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{report.staffName} ({report.staffRole})</h2>
                  <p className="text-gray-600">
                    {report.reportDate && report.reportDate.trim() !== '' 
                      ? format(new Date(report.reportDate), 'MMM d, yyyy') 
                      : 'No date'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/manager-reports-list/${report.id}`)}
                    title="View Detailed Report"
                  >
                    <span className="hidden sm:inline">View Detail</span>
                    <span className="sm:hidden">Detail</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handlePrint(report)}
                    title="Print Report"
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Report Violations */}
              <div className="mb-4">
                <div className="font-bold mb-2 text-lg text-red-600">Report Violations & Issues</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {report.checklistResponses && Object.entries(report.checklistResponses)
                    .filter(([_, value]) => value) // Only show items that are checked (violations)
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center mr-3">
                          <span className="text-white text-xs">!</span>
                        </div>
                        <span className="font-medium text-red-700">{key}</span>
                      </div>
                    ))}
                </div>

                {/* If no violations, show a success message */}
                {report.checklistResponses &&
                 Object.values(report.checklistResponses).filter(value => value).length === 0 && (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                      <span className="text-green-600 text-xl">✓</span>
                    </div>
                    <p className="text-green-700 font-medium">No violations reported</p>
                  </div>
                )}
              </div>

              {/* Manager's Checklist Items */}
              {(report.checklist1 || report.checklist2 || report.checklist3) && (
                <div className="mb-4">
                  <div className="font-bold mb-2">Manager's Observations</div>
                  <div className="space-y-2 bg-blue-50 p-3 rounded-lg">
                    {report.checklist1 && <div className="flex"><span className="font-medium mr-2">•</span> {report.checklist1}</div>}
                    {report.checklist2 && <div className="flex"><span className="font-medium mr-2">•</span> {report.checklist2}</div>}
                    {report.checklist3 && <div className="flex"><span className="font-medium mr-2">•</span> {report.checklist3}</div>}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              {report.comments && (
                <div className="mb-4">
                  <div className="font-bold mb-2">Manager's Comments:</div>
                  <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 italic">
                    "{report.comments}"
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ManagerReportsByStaff;