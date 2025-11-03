import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  AlertTriangle,
  CheckCircle,
  MinusCircle,
  PlusCircle
} from "lucide-react";

// Mock data types
interface InventoryItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  pricePerUnit: string;
  category: string;
  supplier: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface InventorySummary {
  totalItems: number;
  totalValue: string;
  lowStockItems: number;
  outOfStockItems: number;
  categories: string[];
}

// Mock data
const mockInventoryItems: InventoryItem[] = [
  {
    id: '1',
    name: 'Rice',
    description: 'Long grain parboiled rice',
    quantity: 3,
    unit: 'kg',
    minThreshold: 5,
    pricePerUnit: '1200.00',
    category: 'Grains',
    supplier: 'Golden Farms',
    expiryDate: '2025-12-31',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20'
  },
  {
    id: '2',
    name: 'Chicken',
    description: 'Fresh chicken breast',
    quantity: 2,
    unit: 'kg',
    minThreshold: 4,
    pricePerUnit: '2500.00',
    category: 'Meat',
    supplier: 'Farm Fresh Poultry',
    expiryDate: '2024-11-05',
    createdAt: '2024-01-16',
    updatedAt: '2024-01-20'
  },
  {
    id: '3',
    name: 'Beef',
    description: 'Fresh beef',
    quantity: 1,
    unit: 'kg',
    minThreshold: 3,
    pricePerUnit: '3000.00',
    category: 'Meat',
    supplier: 'Premium Meat Co',
    expiryDate: '2024-11-08',
    createdAt: '2024-01-17',
    updatedAt: '2024-01-19'
  },
  {
    id: '4',
    name: 'Palm Oil',
    description: 'Red palm oil',
    quantity: 0,
    unit: 'liters',
    minThreshold: 2,
    pricePerUnit: '1800.00',
    category: 'Oil',
    supplier: 'Nigerian Oil Ltd',
    expiryDate: '2025-08-15',
    createdAt: '2024-01-18',
    updatedAt: '2024-01-18'
  },
  {
    id: '5',
    name: 'Onions',
    description: 'Fresh red onions',
    quantity: 15,
    unit: 'kg',
    minThreshold: 5,
    pricePerUnit: '400.00',
    category: 'Vegetables',
    supplier: 'Green Valley Farms',
    expiryDate: '2024-12-01',
    createdAt: '2024-01-19',
    updatedAt: '2024-01-19'
  }
];

const mockInventorySummary: InventorySummary = {
  totalItems: 24,
  totalValue: '45678.50',
  lowStockItems: 3,
  outOfStockItems: 1,
  categories: ['Grains', 'Meat', 'Oil', 'Vegetables', 'Spices']
};

export default function InventoryManagement() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(mockInventoryItems);
  const [inventorySummary, setInventorySummary] = useState<InventorySummary>(mockInventorySummary);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>(mockInventoryItems);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState<boolean>(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Filter items based on selected filters
  useEffect(() => {
    let result = mockInventoryItems;
    
    if (selectedCategory !== 'all') {
      result = result.filter(item => item.category === selectedCategory);
    }
    
    if (showLowStockOnly) {
      result = result.filter(item => item.quantity <= item.minThreshold);
    }
    
    setFilteredItems(result);
  }, [selectedCategory, showLowStockOnly]);

  const handleAddItem = (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: InventoryItem = {
      ...itemData,
      id: `item_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setInventoryItems([...inventoryItems, newItem]);
    setFilteredItems([...filteredItems, newItem]);
    setIsAddDialogOpen(false);
  };

  const handleEditItem = (itemData: InventoryItem) => {
    const updatedItems = inventoryItems.map(item => 
      item.id === itemData.id ? itemData : item
    );
    
    setInventoryItems(updatedItems);
    setFilteredItems(updatedItems.filter(item => {
      let match = true;
      if (selectedCategory !== 'all') {
        match = match && item.category === selectedCategory;
      }
      if (showLowStockOnly) {
        match = match && item.quantity <= item.minThreshold;
      }
      return match;
    }));
    
    setCurrentItem(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    const updatedItems = inventoryItems.filter(item => item.id !== id);
    setInventoryItems(updatedItems);
    setFilteredItems(updatedItems.filter(item => {
      let match = true;
      if (selectedCategory !== 'all') {
        match = match && item.category === selectedCategory;
      }
      if (showLowStockOnly) {
        match = match && item.quantity <= item.minThreshold;
      }
      return match;
    }));
  };

  const handleQuantityUpdate = (id: string, quantity: number, operation: 'add' | 'remove') => {
    const updatedItems = inventoryItems.map(item => {
      if (item.id === id) {
        const newQuantity = operation === 'add' 
          ? item.quantity + quantity 
          : Math.max(0, item.quantity - quantity);
        
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    
    setInventoryItems(updatedItems);
    setFilteredItems(updatedItems.filter(item => {
      let match = true;
      if (selectedCategory !== 'all') {
        match = match && item.category === selectedCategory;
      }
      if (showLowStockOnly) {
        match = match && item.quantity <= item.minThreshold;
      }
      return match;
    }));
  };

  const getStatusColor = (quantity: number, minThreshold: number) => {
    if (quantity === 0) return 'bg-red-100 text-red-800';
    if (quantity <= minThreshold) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (quantity: number, minThreshold: number) => {
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= minThreshold) return 'Low Stock';
    return 'In Stock';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Track and manage your ingredients and supplies</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventorySummary.totalItems}</div>
            <p className="text-xs text-muted-foreground">All inventory items</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{inventorySummary.totalValue}</div>
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventorySummary.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items below threshold</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventorySummary.outOfStockItems}</div>
            <p className="text-xs text-muted-foreground">Items with 0 quantity</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {inventorySummary.categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="lowStockOnly"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
              className="h-4 w-4 text-[#50BAA8] focus:ring-[#50BAA8] border-gray-300 rounded"
            />
            <Label htmlFor="lowStockOnly" className="text-sm font-medium text-gray-700">
              Show Low Stock Only
            </Label>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Min Threshold</TableHead>
                <TableHead>Price/Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.category}</Badge>
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.minThreshold}</TableCell>
                  <TableCell>₦{item.pricePerUnit}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(item.quantity, item.minThreshold)}>
                      {getStatusText(item.quantity, item.minThreshold)}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityUpdate(item.id, 1, 'add')}
                        className="h-8 w-8 p-0"
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityUpdate(item.id, 1, 'remove')}
                        className="h-8 w-8 p-0"
                      >
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentItem(item);
                          setIsEditDialogOpen(true);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Inventory Item</DialogTitle>
            <DialogDescription>
              Add a new item to your inventory
            </DialogDescription>
          </DialogHeader>
          <AddEditInventoryForm 
            onSubmit={handleAddItem} 
            onCancel={() => setIsAddDialogOpen(false)} 
            isEdit={false}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      {currentItem && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Inventory Item</DialogTitle>
              <DialogDescription>
                Update the details of this inventory item
              </DialogDescription>
            </DialogHeader>
            <AddEditInventoryForm 
              onSubmit={(data) => handleEditItem({ ...currentItem, ...data })}
              onCancel={() => setIsEditDialogOpen(false)} 
              isEdit={true}
              initialData={currentItem}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Form component for adding/editing inventory items
interface AddEditInventoryFormProps {
  onSubmit: (data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isEdit: boolean;
  initialData?: InventoryItem;
}

const AddEditInventoryForm: React.FC<AddEditInventoryFormProps> = ({ 
  onSubmit, 
  onCancel, 
  isEdit,
  initialData 
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || '0');
  const [unit, setUnit] = useState(initialData?.unit || 'kg');
  const [minThreshold, setMinThreshold] = useState(initialData?.minThreshold?.toString() || '5');
  const [pricePerUnit, setPricePerUnit] = useState(initialData?.pricePerUnit || '0.00');
  const [category, setCategory] = useState(initialData?.category || '');
  const [supplier, setSupplier] = useState(initialData?.supplier || '');
  const [expiryDate, setExpiryDate] = useState(initialData?.expiryDate || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemData = {
      name,
      description,
      quantity: parseInt(quantity, 10),
      unit,
      minThreshold: parseInt(minThreshold, 10),
      pricePerUnit,
      category,
      supplier,
      expiryDate: expiryDate || undefined
    };
    
    onSubmit(itemData);
    
    // Reset form
    setName('');
    setDescription('');
    setQuantity('0');
    setUnit('kg');
    setMinThreshold('5');
    setPricePerUnit('0.00');
    setCategory('');
    setSupplier('');
    setExpiryDate('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Item Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">kg</SelectItem>
              <SelectItem value="pieces">pieces</SelectItem>
              <SelectItem value="liters">liters</SelectItem>
              <SelectItem value="grams">grams</SelectItem>
              <SelectItem value="bunch">bunch</SelectItem>
              <SelectItem value="pack">pack</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minThreshold">Min Threshold</Label>
          <Input
            id="minThreshold"
            type="number"
            min="0"
            value={minThreshold}
            onChange={(e) => setMinThreshold(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="pricePerUnit">Price Per Unit (₦)</Label>
          <Input
            id="pricePerUnit"
            type="number"
            step="0.01"
            min="0"
            value={pricePerUnit}
            onChange={(e) => setPricePerUnit(e.target.value)}
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="supplier">Supplier</Label>
          <Input
            id="supplier"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="expiryDate">Expiry Date (optional)</Label>
        <Input
          id="expiryDate"
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
        />
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {isEdit ? 'Update Item' : 'Add Item'}
        </Button>
      </div>
    </form>
  );
};