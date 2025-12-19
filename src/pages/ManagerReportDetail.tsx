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

const ManagerReportDetail: React.FC = () => {
  const [location, navigate] = useLocation();
  const [report, setReport] = useState<ManagerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Extract report ID from URL
  const reportId = location.split('/').pop();

  useEffect(() => {
    const fetchReport = async () => {
      if (!reportId) return;
      
      try {
        setLoading(true);
        const response = await apiRequest("GET", `/api/manager-reports/${reportId}`);
        const data = await response.json();
        
        // Normalize the checklistResponses like we do in the list page
        let parsedChecklistResponses = data.checklistResponses;
        if (typeof data.checklistResponses === 'string' && data.checklistResponses) {
          try {
            parsedChecklistResponses = JSON.parse(data.checklistResponses);
          } catch (e) {
            console.error("Error parsing checklistResponses:", e);
            // If JSON parsing fails, use the individual fields to create a consistent object
            parsedChecklistResponses = {
              'Face Mask': data.faceMask,
              'Cap': data.cap,
              'Disorg.': data.disorg,
              'Shoes': data.shoes,
              'Wrong Order': data.wrongOrder,
              'Gloves': data.gloves,
              'Trousers': data.trousers,
              'Others': data.others,
              'Bonus': data.bonus
            };
          }
        } else if (data.checklistResponses === null || data.checklistResponses === undefined) {
          // If checklistResponses is null, use individual fields to create a consistent object
          parsedChecklistResponses = {
            'Face Mask': data.faceMask,
            'Cap': data.cap,
            'Disorg.': data.disorg,
            'Shoes': data.shoes,
            'Wrong Order': data.wrongOrder,
            'Gloves': data.gloves,
            'Trousers': data.trousers,
            'Others': data.others,
            'Bonus': data.bonus
          };
        }
        
        setReport({ ...data, checklistResponses: parsedChecklistResponses });
      } catch (error) {
        console.error("Error fetching report:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch report details",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  const handleBack = () => {
    navigate('/manager-reports-list');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 md:p-8 flex items-center justify-center">
        <div className="text-gray-600">Loading report...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 md:p-8 flex items-center justify-center">
        <div className="text-gray-600">Report not found</div>
      </div>
    );
  }

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
          Back to List
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
              Date: {report.reportDate && report.reportDate.trim() !== '' ? format(new Date(report.reportDate), 'MMM d, yyyy') : '_____________'}
            </div>
          </div>

          {/* Manager's Checklist */}
          {(report.checklist1 || report.checklist2 || report.checklist3) && (
            <div className="mb-4 sm:mb-6">
              <div className="font-bold mb-2 text-sm sm:text-base">Manager's Checklist</div>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                {report.checklist1 && (
                  <div className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>{report.checklist1}</span>
                  </div>
                )}
                {report.checklist2 && (
                  <div className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>{report.checklist2}</span>
                  </div>
                )}
                {report.checklist3 && (
                  <div className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>{report.checklist3}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <hr className="my-3 sm:my-4 border-gray-400" />

          {/* Report Violations */}
          <div className="mb-4 sm:mb-6">
            <div className="font-bold mb-2 sm:mb-3 text-sm sm:text-base text-red-600">
              Report Violations & Issues
            </div>

            {/* Violations Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3 sm:mb-4">
              {report.checklistResponses && Object.entries(report.checklistResponses)
                .filter(([_, value]) => value) // Only show items that are checked (violations)
                .map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center p-2 bg-red-50 border border-red-200 rounded"
                  >
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center mr-2">
                      <span className="text-white text-xs">!</span>
                    </div>
                    <span className="text-xs sm:text-sm">{key}</span>
                  </div>
                ))}
            </div>

            {/* If no violations, show a success message */}
            {report.checklistResponses &&
             Object.values(report.checklistResponses).filter(value => value).length === 0 && (
              <div className="text-center py-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-1">
                  <span className="text-green-600 text-lg">✓</span>
                </div>
                <p className="text-xs sm:text-sm text-green-700 font-medium">No violations reported</p>
              </div>
            )}
          </div>

          {/* Manager's Checklist Items */}
          {(report.checklist1 || report.checklist2 || report.checklist3) && (
            <div className="mb-4 sm:mb-6">
              <div className="font-bold mb-2 text-sm sm:text-base">
                Manager's Observations
              </div>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm bg-blue-50 p-2 sm:p-3 rounded">
                {report.checklist1 && (
                  <div className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>{report.checklist1}</span>
                  </div>
                )}
                {report.checklist2 && (
                  <div className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>{report.checklist2}</span>
                  </div>
                )}
                {report.checklist3 && (
                  <div className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>{report.checklist3}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <hr className="my-3 sm:my-4 border-gray-400" />

          {/* Comments Section */}
          {report.comments && (
            <div className="mb-4 sm:mb-6">
              <div className="font-bold mb-2 text-sm sm:text-base">
                Manager's Comments:
              </div>
              <div className="border border-black p-2 sm:p-3 min-h-[60px] whitespace-pre-wrap text-xs sm:text-sm bg-gray-50 italic">
                "{report.comments}"
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

export default ManagerReportDetail;