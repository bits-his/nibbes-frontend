import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Search, Eye, Printer, Download } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

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
  checklistResponses: Record<string, boolean> | string | null;
  comments: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const ManagerReportsList: React.FC = () => {
  const [reports, setReports] = useState<ManagerReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch manager reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const queryString = params.toString();
      const url = `/api/manager-reports${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiRequest("GET", url);
      const data = await response.json();

      // Map the API response to our interface structure
      const mappedReports = data.map((report: any) => {
        let parsedChecklistResponses = report.checklistResponses;
        if (typeof report.checklistResponses === 'string' && report.checklistResponses) {
          try {
            parsedChecklistResponses = JSON.parse(report.checklistResponses);
          } catch (e) {
            console.error("Error parsing checklistResponses:", e);
            // If JSON parsing fails, use the individual fields to create a consistent object
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
          // If checklistResponses is null, use individual fields to create a consistent object
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

      setReports(mappedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch manager reports",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [searchTerm, startDate, endDate]);

  // Handle viewing a report - this is no longer used since we navigate to detail page
  // Keeping for potential future use or fallback
  const handleViewReport = (report: ManagerReport) => {
    // Navigate to detail page instead
    navigate(`/manager-reports-list/${report.id}`);
  };

  // Handle printing a report
  const handlePrintReport = (report: ManagerReport) => {
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Manager Report - ${report.reportDate && report.reportDate.trim() !== '' ? format(new Date(report.reportDate), 'MMM d, yyyy') : ''}</title>
          <style>
            @media print {
              body { font-family: Arial, sans-serif; margin: 0.5in; }
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
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
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
          
          ${report.checklist1 || report.checklist2 || report.checklist3 ? `
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

  // Handle downloading the report as CSV
  const handleDownloadCSV = () => {
    if (reports.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No reports to download",
      });
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Staff Name,Staff Role,Checklist 1,Checklist 2,Checklist 3,Comments,Checklist Items\n";

    reports.forEach(report => {
      let checklistItems = '';

      if (report.checklistResponses) {
        if (typeof report.checklistResponses === 'string') {
          try {
            const parsed = JSON.parse(report.checklistResponses);
            checklistItems = Object.entries(parsed)
              .map(([key, value]) => `${key}: ${value ? 'Yes' : 'No'}`)
              .join('; ');
          } catch (e) {
            checklistItems = report.checklistResponses;
          }
        } else {
          checklistItems = Object.entries(report.checklistResponses)
            .map(([key, value]) => `${key}: ${value ? 'Yes' : 'No'}`)
            .join('; ');
        }
      } else {
        // Use individual fields when checklistResponses is null
        const individualItems = [];
        if (report.faceMask) individualItems.push('Face Mask: Yes');
        else individualItems.push('Face Mask: No');
        if (report.cap) individualItems.push('Cap: Yes');
        else individualItems.push('Cap: No');
        if (report.disorg) individualItems.push('Disorg.: Yes');
        else individualItems.push('Disorg.: No');
        if (report.shoes) individualItems.push('Shoes: Yes');
        else individualItems.push('Shoes: No');
        if (report.wrongOrder) individualItems.push('Wrong Order: Yes');
        else individualItems.push('Wrong Order: No');
        if (report.gloves) individualItems.push('Gloves: Yes');
        else individualItems.push('Gloves: No');
        if (report.trousers) individualItems.push('Trousers: Yes');
        else individualItems.push('Trousers: No');
        if (report.others) individualItems.push('Others: Yes');
        else individualItems.push('Others: No');
        if (report.bonus) individualItems.push('Bonus: Yes');
        else individualItems.push('Bonus: No');

        checklistItems = individualItems.join('; ');
      }

      csvContent += `"${report.reportDate}","${report.staffName}","${report.staffRole}","${report.checklist1}","${report.checklist2}","${report.checklist3}","${report.comments}","${checklistItems}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `manager_reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex items-center justify-between gap-2 sm:gap-3 mb-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-[#50BAA8] to-teal-600 rounded-lg">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Manager Reports List</h1>
          </div>
        </div>
        <p className="text-sm sm:text-base text-gray-600 mt-2">View and manage all daily manager reports</p>
      </div>

      <Card className="bg-white border-slate-200 max-w-6xl mx-auto">
        <CardHeader className="border-b border-slate-200 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg md:text-xl text-gray-900 flex items-center gap-2">
            <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-[#50BAA8]" />
            Filter Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label className="text-sm sm:text-base text-gray-700 font-semibold">Start Date</Label>
              <div className="relative mt-1">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border-slate-300 text-gray-900 text-sm sm:text-base pl-9"
                />
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>
            </div>
            <div>
              <Label className="text-sm sm:text-base text-gray-700 font-semibold">End Date</Label>
              <div className="relative mt-1">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border-slate-300 text-gray-900 text-sm sm:text-base pl-9"
                />
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>
            </div>
            <div>
              <Label className="text-sm sm:text-base text-gray-700 font-semibold">Search</Label>
              <div className="relative mt-1">
                <Input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white border-slate-300 text-gray-900 text-sm sm:text-base pl-9"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleDownloadCSV}
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-sm text-gray-600">Loading reports...</div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">No reports found</div>
              <div className="text-sm text-gray-400">Try adjusting your filters</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-slate-300 px-3 py-2 text-left text-xs sm:text-sm font-semibold text-gray-700">Staff</th>
                    <th className="border border-slate-300 px-3 py-2 text-left text-xs sm:text-sm font-semibold text-gray-700">Role</th>
                    <th className="border border-slate-300 px-3 py-2 text-left text-xs sm:text-sm font-semibold text-gray-700">Total Reports</th>
                    <th className="border border-slate-300 px-3 py-2 text-left text-xs sm:text-sm font-semibold text-gray-700">Total Violations</th>
                    <th className="border border-slate-300 px-3 py-2 text-left text-xs sm:text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Group reports by staff name and calculate totals
                    const groupedReports: { [key: string]: ManagerReport[] } = {};
                    reports.forEach(report => {
                      // Normalize the staff name for consistent grouping
                      const normalizedStaffName = (report.staffName || 'Unknown Staff').trim();
                      const normalizedRole = (report.staffRole || 'Unknown Role').trim();
                      const staffKey = `${normalizedStaffName}|${normalizedRole}`; // Combine name and role for unique grouping

                      if (!groupedReports[staffKey]) {
                        groupedReports[staffKey] = [];
                      }
                      groupedReports[staffKey].push(report);
                    });

                    // Convert to array and sort by number of reports (descending)
                    const sortedGroups = Object.entries(groupedReports).sort(([_, reportsA], [__, reportsB]) => {
                      return reportsB.length - reportsA.length;
                    });

                    return sortedGroups.map(([staffKey, staffReports]) => {
                      // Extract name and role from the key
                      const [staffName, staffRole] = staffKey.split('|');

                      // Calculate total violations for this staff
                      const totalViolations = staffReports.reduce((total, report) => {
                        return total + (report.checklistResponses ? Object.entries(report.checklistResponses).filter(([_, value]) => value).length : 0);
                      }, 0);

                      return (
                        <tr key={staffKey} className="hover:bg-gray-50">
                          <td className="border border-slate-300 px-3 py-2 text-xs sm:text-sm">{staffName}</td>
                          <td className="border border-slate-300 px-3 py-2 text-xs sm:text-sm">{staffRole}</td>
                          <td className="border border-slate-300 px-3 py-2 text-xs sm:text-sm">{staffReports.length}</td>
                          <td className="border border-slate-300 px-3 py-2 text-xs sm:text-sm">{totalViolations}</td>
                          <td className="border border-slate-300 px-3 py-2 text-xs sm:text-sm">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/manager-reports-by-staff/${encodeURIComponent(staffName)}`)}
                                title="View Reports"
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerReportsList;