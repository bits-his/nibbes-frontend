import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Download, 
  Search, 
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  dataType: 'top-items' | 'sales-trends' | 'payment-breakdown' | 'customer-analytics' | 'inventory';
  columns: { key: string; label: string; render?: (value: any) => React.ReactNode }[];
}

export default function DrillDownModal({ 
  isOpen, 
  onClose, 
  title, 
  dataType, 
  columns 
}: DrillDownModalProps) {
  const [data, setData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch data based on dataType
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let url = '';
        let response;
        
        // Get date range from local storage or default to last 30 days
        const now = new Date();
        const from = new Date();
        from.setDate(now.getDate() - 30);
        const dateRange = {
          from: from.toISOString().split('T')[0],
          to: now.toISOString().split('T')[0]
        };

        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050';
        
        switch (dataType) {
          case 'top-items':
            url = `${BACKEND_URL}/api/analytics/top-items/detailed?from=${dateRange.from}&to=${dateRange.to}&detailed=true`;
            response = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            });
            break;
          case 'sales-trends':
            url = `${BACKEND_URL}/api/analytics/sales-summary/detailed?from=${dateRange.from}&to=${dateRange.to}&detailed=true`;
            response = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            });
            break;
          case 'payment-breakdown':
            url = `${BACKEND_URL}/api/analytics/payment-breakdown?from=${dateRange.from}&to=${dateRange.to}`;
            response = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            });
            break;
          case 'inventory':
            url = `${BACKEND_URL}/api/inventory`;
            response = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            });
            break;
          case 'customer-analytics':
            url = `${BACKEND_URL}/api/analytics/customers/segments?from=${dateRange.from}&to=${dateRange.to}`;
            response = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            });
            break;
          default:
            throw new Error(`Unknown data type: ${dataType}`);
        }

        if (!response.ok) {
          throw new Error(`API call failed: ${response.status}`);
        }

        const result = await response.json();
        
        // Transform the data based on the type
        let transformedData = [];
        let chartDataTransformed = [];

        switch (dataType) {
          case 'top-items':
            transformedData = result.data?.topItems || [];
            chartDataTransformed = result.data?.topItems?.map((item: any) => ({
              name: item.name,
              Quantity: item.quantity,
              Revenue: item.revenue
            })) || [];
            break;
          case 'sales-trends':
            transformedData = result.data?.detailed?.dailyTrends || [];
            chartDataTransformed = result.data?.detailed?.dailyTrends?.map((item: any) => ({
              name: item.date.split('-')[2], // Just the day
              Revenue: item.dailyRevenue,
              Orders: item.orderCount
            })) || [];
            break;
          case 'payment-breakdown':
            transformedData = result.data || [];
            chartDataTransformed = result.data?.map((item: any) => ({
              name: item.method,
              Count: item.count,
              Amount: item.amount
            })) || [];
            break;
          case 'inventory':
            transformedData = result.data?.inventoryItems || [];
            chartDataTransformed = result.data?.inventoryItems?.map((item: any) => ({
              name: item.name,
              Quantity: item.quantity,
              'Min Threshold': item.minThreshold
            })) || [];
            break;
          case 'customer-analytics':
            transformedData = result.data?.highValue || [];
            chartDataTransformed = result.data?.highValue?.map((item: any) => ({
              name: item.customerName,
              'Total Orders': item.totalOrders,
              'Total Spent': item.totalSpent
            })) || [];
            break;
          default:
            transformedData = [];
            chartDataTransformed = [];
        }

        setData(transformedData);
        setChartData(chartDataTransformed);
      } catch (err) {
        console.error('Error fetching drill-down data:', err);
        setError('Failed to load data. Please try again later.');
        setData([]);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, dataType]);

  // Apply sorting
  const sortedData = React.useMemo(() => {
    if (!sortConfig || !data.length) return data;
    
    return [...data].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // Apply search and filter
  const filteredData = React.useMemo(() => {
    return sortedData.filter(item => {
      const matchesSearch = Object.values(item).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      let matchesCategory = true;
      if (filterCategory !== 'all' && item.category) {
        matchesCategory = item.category === filterCategory;
      }
      
      return matchesSearch && matchesCategory;
    });
  }, [sortedData, searchTerm, filterCategory]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleExport = (format: 'csv' | 'excel') => {
    // In a real application, this would generate and download the file
    console.log(`Exporting ${dataType} data as ${format}`);
    // For now, we'll just close the modal
    onClose();
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[70vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">{title}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <p>Loading data...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[70vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">{title}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64 text-red-500">
            <p>{error}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Chart Visualization */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {dataType === 'payment-breakdown' ? (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="Amount"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`₦${value}`, name]} />
                </PieChart>
              ) : (
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `₦${value}`} />
                  <Tooltip formatter={(value) => [`₦${value}`, '']} />
                  <Legend />
                  {dataType === 'sales-trends' ? (
                    <>
                      <Bar dataKey="Revenue" name="Revenue (₦)" fill="#8884d8" />
                      <Line type="monotone" dataKey="Orders" name="Orders" stroke="#82ca9d" strokeWidth={2} />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="Quantity" name="Quantity" fill="#8884d8" />
                      <Bar dataKey="Revenue" name="Revenue (₦)" fill="#82ca9d" />
                    </>
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Rice">Rice</SelectItem>
                <SelectItem value="Protein">Protein</SelectItem>
                <SelectItem value="Soup">Soup</SelectItem>
                <SelectItem value="Side">Side</SelectItem>
                <SelectItem value="Grains">Grains</SelectItem>
                <SelectItem value="Meat">Meat</SelectItem>
                <SelectItem value="Oil">Oil</SelectItem>
                <SelectItem value="Vegetables">Vegetables</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex space-x-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
                <Download className="h-4 w-4 mr-1" />
                Excel
              </Button>
            </div>
          </div>

          {/* Data Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead 
                      key={column.key} 
                      className="cursor-pointer"
                      onClick={() => handleSort(column.key)}
                    >
                      <div className="flex items-center">
                        {column.label}
                        {sortConfig?.key === column.key && (
                          sortConfig.direction === 'asc' ? 
                            <TrendingUp className="ml-1 h-4 w-4" /> : 
                            <TrendingDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item, index) => (
                  <TableRow key={index}>
                    {columns.map((column) => (
                      <TableCell key={column.key}>
                        {column.render ? column.render(item[column.key]) : item[column.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} results
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];