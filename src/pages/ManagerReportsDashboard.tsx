import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CreditCard, TrendingUp, AlertTriangle, User, Calendar, Eye, FileText } from "lucide-react";
import { useLocation as useWouterLocation } from "wouter";

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

interface StaffViolationCount {
  staffName: string;
  role: string;
  violationCount: number;
  reportCount: number;
}

interface ViolationTypeCount {
  name: string;
  count: number;
}

const ManagerReportsDashboard: React.FC = () => {
  const [location, setLocation] = useWouterLocation();
  const [, navigate] = useWouterLocation();
  const [reports, setReports] = useState<ManagerReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Analytics data
  const [staffViolations, setStaffViolations] = useState<StaffViolationCount[]>([]);
  const [violationTypes, setViolationTypes] = useState<ViolationTypeCount[]>([]);
  const [topViolations, setTopViolations] = useState<ViolationTypeCount[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [totalViolations, setTotalViolations] = useState(0);
  const [mostReportedStaff, setMostReportedStaff] = useState<StaffViolationCount | null>(null);

  // Fetch all reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      
      const response = await apiRequest("GET", "/api/manager-reports");
      const data = await response.json();
      
      // Normalize checklistResponses like in other components
      const normalizedReports = data.map((report: any) => {
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
      calculateAnalytics(normalizedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch reports",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics from reports
  const calculateAnalytics = (reports: ManagerReport[]) => {
    // Total reports
    setTotalReports(reports.length);

    // Calculate staff violations
    const staffMap: { [key: string]: StaffViolationCount } = {};
    reports.forEach(report => {
      const staffKey = report.staffName || 'Unknown Staff';
      if (!staffMap[staffKey]) {
        staffMap[staffKey] = {
          staffName: staffKey,
          role: report.staffRole,
          violationCount: 0,
          reportCount: 0
        };
      }
      
      staffMap[staffKey].reportCount += 1;
      
      // Count violations in checklistResponses
      if (report.checklistResponses) {
        const violations = Object.entries(report.checklistResponses).filter(([_, value]) => value).length;
        staffMap[staffKey].violationCount += violations;
      }
    });

    const staffArray = Object.values(staffMap);
    setStaffViolations(staffArray);
    
    // Find most reported staff
    if (staffArray.length > 0) {
      const topStaff = staffArray.reduce((prev, current) => 
        (prev.reportCount > current.reportCount) ? prev : current
      );
      setMostReportedStaff(topStaff);
    }

    // Calculate violation types
    const violationTypeMap: { [key: string]: number } = {};
    reports.forEach(report => {
      if (report.checklistResponses) {
        Object.entries(report.checklistResponses).forEach(([key, value]) => {
          if (value) { // Only count if violation occurred
            violationTypeMap[key] = (violationTypeMap[key] || 0) + 1;
          }
        });
      }
    });

    const violationTypeArray = Object.entries(violationTypeMap)
      .map(([name, count]) => ({ name, count }));
    
    setViolationTypes(violationTypeArray);
    
    // Get top 5 violations
    const sortedViolations = [...violationTypeArray].sort((a, b) => b.count - a.count).slice(0, 5);
    setTopViolations(sortedViolations);

    // Calculate total violations
    const totalVio = violationTypeArray.reduce((sum, item) => sum + item.count, 0);
    setTotalViolations(totalVio);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Colors for charts
  const COLORS = ['#50BAA8', '#FF8042', '#FFBB28', '#0088FE', '#00C49F', '#FF6B6B', '#9C27B0', '#3F51B5', '#2196F3'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 p-4 md:p-8 flex items-center justify-center">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex items-center justify-between gap-2 sm:gap-3 mb-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-[#50BAA8] to-teal-600 rounded-lg">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">Manager Reports Dashboard</h1>
          </div>
        </div>
        <p className="text-sm sm:text-base text-gray-600 mt-2">Analytics and insights from daily manager reports</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Reports</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{totalReports}</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-full">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Total Violations</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{totalViolations}</p>
              </div>
              <div className="p-3 bg-red-500 rounded-full">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Most Reported Staff</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{mostReportedStaff?.staffName || 'N/A'}</p>
                <p className="text-xs text-gray-500">{mostReportedStaff?.reportCount || 0} reports</p>
              </div>
              <div className="p-3 bg-yellow-500 rounded-full">
                <User className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Top Violation</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{topViolations[0]?.name || 'N/A'}</p>
                <p className="text-xs text-gray-500">{topViolations[0]?.count || 0} occurrences</p>
              </div>
              <div className="p-3 bg-green-500 rounded-full">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
        {/* Staff Violations Chart */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-[#50BAA8]" />
              Reports by Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staffViolations.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={staffViolations.slice(0, 10)}> {/* Top 10 staff */}
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="staffName" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="reportCount" name="Report Count" fill="#50BAA8" />
                  <Bar dataKey="violationCount" name="Violation Count" fill="#FF8042" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Top Violations Chart */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#50BAA8]" />
              Top Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topViolations.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topViolations}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Count" fill="#FF6B6B" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Violation Types Distribution */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-gray-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#50BAA8]" />
              Violation Types Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {violationTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={violationTypes.slice(0, 10)} // Top 10 violations
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {violationTypes.slice(0, 10).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-500">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#50BAA8]" />
              Recent Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-slate-300 px-2 py-1 text-left text-xs font-semibold text-gray-700">Date</th>
                      <th className="border border-slate-300 px-2 py-1 text-left text-xs font-semibold text-gray-700">Staff</th>
                      <th className="border border-slate-300 px-2 py-1 text-left text-xs font-semibold text-gray-700">Role</th>
                      <th className="border border-slate-300 px-2 py-1 text-left text-xs font-semibold text-gray-700">Violations</th>
                      <th className="border border-slate-300 px-2 py-1 text-left text-xs font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.slice(0, 5).map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="border border-slate-300 px-2 py-1 text-xs">
                          {report.reportDate ? new Date(report.reportDate).toLocaleDateString() : ''}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-xs">
                          {report.staffName}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-xs">
                          {report.staffRole}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-xs">
                          {report.checklistResponses ? Object.entries(report.checklistResponses).filter(([_, value]) => value).length : 0}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-xs">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/manager-reports-list/${report.id}`)}
                            title="View Report"
                          >
                            <Eye className="w-3 h-3 text-blue-600" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No recent reports</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerReportsDashboard;