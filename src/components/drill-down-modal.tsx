import React, { useState } from 'react';
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
  data: any[];
  columns: { key: string; label: string; render?: (value: any) => React.ReactNode }[];
}

// Mock data for different drill-down types
const mockTopItemsData = [
  { name: 'Jollof Rice', quantity: 120, revenue: 240000, avgOrderValue: 2000, category: 'Rice' },
  { name: 'Fried Rice', quantity: 95, revenue: 190000, avgOrderValue: 2000, category: 'Rice' },
  { name: 'Grilled Chicken', quantity: 80, revenue: 120000, avgOrderValue: 1500, category: 'Protein' },
  { name: 'Beef Pepper Soup', quantity: 75, revenue: 150000, avgOrderValue: 2000, category: 'Soup' },
  { name: 'Plantain', quantity: 150, revenue: 30000, avgOrderValue: 200, category: 'Side' },
];

const mockSalesTrendsData = [
  { date: '2025-10-01', revenue: 45000, orders: 25 },
  { date: '2025-10-02', revenue: 52000, orders: 28 },
  { date: '2025-10-03', revenue: 48000, orders: 26 },
  { date: '2025-10-04', revenue: 61000, orders: 32 },
  { date: '2025-10-05', revenue: 70000, orders: 38 },
  { date: '2025-10-06', revenue: 58000, orders: 30 },
  { date: '2025-10-07', revenue: 65000, orders: 35 },
];

const mockPaymentBreakdownData = [
  { method: 'Cash', count: 45, amount: 90000 },
  { method: 'Interswitch', count: 67, amount: 134000 },
  { method: 'POS', count: 15, amount: 30000 },
  { method: 'Mobile Money', count: 8, amount: 16000 },
];

const mockCustomerAnalyticsData = [
  { name: 'John Doe', email: 'john@example.com', orders: 25, spent: 45000, frequency: 3.2 },
  { name: 'Jane Smith', email: 'jane@example.com', orders: 18, spent: 32000, frequency: 2.1 },
  { name: 'Mike Johnson', email: 'mike@example.com', orders: 12, spent: 15000, frequency: 1.5 },
  { name: 'Sarah Williams', email: 'sarah@example.com', orders: 10, spent: 12000, frequency: 1.2 },
  { name: 'David Brown', email: 'david@example.com', orders: 8, spent: 9800, frequency: 0.9 },
];

const mockInventoryData = [
  { name: 'Rice', quantity: 3, minThreshold: 5, unit: 'kg', category: 'Grains', supplier: 'Golden Farms', pricePerUnit: 1200 },
  { name: 'Chicken', quantity: 2, minThreshold: 4, unit: 'kg', category: 'Meat', supplier: 'Farm Fresh', pricePerUnit: 2500 },
  { name: 'Beef', quantity: 1, minThreshold: 3, unit: 'kg', category: 'Meat', supplier: 'Premium Meats', pricePerUnit: 3000 },
  { name: 'Palm Oil', quantity: 0, minThreshold: 2, unit: 'liters', category: 'Oil', supplier: 'Nigerian Oil', pricePerUnit: 1800 },
  { name: 'Onions', quantity: 15, minThreshold: 5, unit: 'kg', category: 'Vegetables', supplier: 'Green Valley', pricePerUnit: 400 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

export default function DrillDownModal({ 
  isOpen, 
  onClose, 
  title, 
  dataType, 
  data = [],
  columns 
}: DrillDownModalProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Apply sorting
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;
    
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

  // Prepare chart data based on data type
  const getChartData = () => {
    switch (dataType) {
      case 'top-items':
        return mockTopItemsData.map(item => ({
          name: item.name,
          Quantity: item.quantity,
          Revenue: item.revenue
        }));
      case 'sales-trends':
        return mockSalesTrendsData.map(item => ({
          name: item.date.split('-')[2], // Just the day
          Revenue: item.revenue,
          Orders: item.orders
        }));
      case 'payment-breakdown':
        return mockPaymentBreakdownData.map(item => ({
          name: item.method,
          Count: item.count,
          Amount: item.amount
        }));
      default:
        return data;
    }
  };

  const chartData = getChartData();

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