import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ShoppingCart, Trash2, Plus, Minus, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface MenuItem {
  id: string;
  name: string;
  price: string;
  imageUrl?: string;
  category: string;
  available: boolean;
  stockBalance?: number;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  orderType: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  orderItems: OrderItem[];
}

interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: string;
  menuItemName: string;
  menuItem?: {
    id: string;
    name: string;
    price: string;
    imageUrl?: string;
  };
}

export default function RefundManagement() {
  const { toast } = useToast();
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [originalItems, setOriginalItems] = useState<CartItem[]>([]);
  const [replacementCart, setReplacementCart] = useState<CartItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successData, setSuccessData] = useState<{ orderNumber: number; refundAmount: number } | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  // Fetch menu items using useQuery (same as staff-orders)
  const { data: menuItemsData, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu/all'],
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Update menuItems when data is fetched
  useEffect(() => {
    if (menuItemsData) {
      setMenuItems(menuItemsData);
    }
  }, [menuItemsData]);

  // Fetch order by order number and date
  const fetchOrder = async () => {
    if (!orderNumber.trim()) {
      toast({
        title: 'Order Number Required',
        description: 'Please enter an order number',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await apiRequest('GET', `/api/orders/search?orderNumber=${orderNumber}&date=${orderDate}`);
      
      if (!response.ok) {
        throw new Error('Order not found');
      }

      const data = await response.json();
      
      // Check if order has already been refunded
      if (data.status === 'refunded') {
        toast({
          title: 'Order Already Refunded',
          description: `Order #${data.orderNumber} has already been refunded. Cannot refund the same order twice.`,
          variant: 'destructive',
          duration: 7000,
        });
        setOrder(null);
        setOriginalItems([]);
        setReplacementCart([]);
        setLoading(false);
        return;
      }
      
      setOrder(data);

      // Initialize originalItems with original order items (read-only display)
      const initialOriginalItems: CartItem[] = data.orderItems.map((item: OrderItem) => ({
        menuItem: {
          id: item.menuItemId,
          name: item.menuItemName || item.menuItem?.name || 'Unknown Item',
          price: item.price,
          imageUrl: item.menuItem?.imageUrl,
          category: '',
          available: true,
        },
        quantity: item.quantity,
      }));
      setOriginalItems(initialOriginalItems);
      
      // Start with empty replacement cart
      setReplacementCart([]);

      toast({
        title: 'Order Found',
        description: `Order #${data.orderNumber} loaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch order',
        variant: 'destructive',
      });
      setOrder(null);
      setOriginalItems([]);
      setReplacementCart([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const originalTotal = order ? parseFloat(order.totalAmount) : 0;
  const originalCartTotal = originalItems.reduce((sum, item) => sum + parseFloat(item.menuItem.price) * item.quantity, 0);
  const replacementTotal = replacementCart.reduce((sum, item) => sum + parseFloat(item.menuItem.price) * item.quantity, 0);
  const refundAmount = originalTotal - replacementTotal;
  
  // Helper function to check if an item can be added
  const canAddItem = (itemPrice: number) => {
    return (replacementTotal + itemPrice) <= originalTotal;
  };

  // Add item to cart
  const addToCart = (menuItem: MenuItem) => {
    if (!order) {
      toast({
        title: 'No Order Loaded',
        description: 'Please fetch an order first',
        variant: 'destructive',
      });
      return;
    }

    const itemPrice = parseFloat(menuItem.price);
    const newTotal = replacementTotal + itemPrice;

    if (newTotal > originalTotal) {
      toast({
        title: 'Budget Exceeded',
        description: `Adding this item would exceed the original order amount of ₦${originalTotal.toLocaleString()}`,
        variant: 'destructive',
      });
      return;
    }

    const existingItem = replacementCart.find(item => item.menuItem.id === menuItem.id);
    
    if (existingItem) {
      updateQuantity(menuItem.id, existingItem.quantity + 1);
    } else {
      setReplacementCart([...replacementCart, { menuItem, quantity: 1 }]);
    }
  };

  // Update quantity
  const updateQuantity = (menuItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }

    const updatedCart = replacementCart.map(item => {
      if (item.menuItem.id === menuItemId) {
        const newItemTotal = parseFloat(item.menuItem.price) * newQuantity;
        const otherItemsTotal = replacementCart
          .filter(i => i.menuItem.id !== menuItemId)
          .reduce((sum, i) => sum + parseFloat(i.menuItem.price) * i.quantity, 0);
        
        if (newItemTotal + otherItemsTotal > originalTotal) {
          toast({
            title: 'Budget Exceeded',
            description: `Cannot increase quantity. Would exceed original order amount.`,
            variant: 'destructive',
          });
          return item;
        }
        
        return { ...item, quantity: newQuantity };
      }
      return item;
    });

    setReplacementCart(updatedCart);
  };

  // Remove from cart
  const removeFromCart = (menuItemId: string) => {
    setReplacementCart(replacementCart.filter(item => item.menuItem.id !== menuItemId));
  };

  // Clear cart
  const clearCart = () => {
    setReplacementCart([]);
    toast({
      title: 'Cart Cleared',
      description: 'Replacement cart has been cleared',
    });
  };

  // Process refund
  const processRefund = async () => {
    if (!order) return;

    if (!refundReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for the refund',
        variant: 'destructive',
      });
      return;
    }

    try {
      setProcessingRefund(true);

      const refundAmountValue = originalTotal - replacementTotal;
      const replacementItems = replacementCart.map(item => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        price: item.menuItem.price,
      }));

      const response = await apiRequest('POST', '/api/refunds/create', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        refundAmount: refundAmountValue.toFixed(2),
        reason: refundReason,
        replacementItems: replacementItems,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to process refund');
      }

      const data = await response.json();
      const newOrderNumber = data.refundOrder?.orderNumber;

      // Show success dialog with new order number
      setSuccessData({
        orderNumber: newOrderNumber,
        refundAmount: refundAmountValue
      });
      setShowSuccessDialog(true);

      // Also show toast
      toast({
        title: 'Refund Processed Successfully',
        description: `New order #${newOrderNumber} created for replacement items.`,
        duration: 5000,
      });

      // Reset form
      setShowRefundDialog(false);
      setRefundReason('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process refund',
        variant: 'destructive',
      });
    } finally {
      setProcessingRefund(false);
    }
  };

  // Filter menu items
  const categories = ['All', ...Array.from(new Set(menuItems.map(item => item.category)))];
  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.available;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="font-serif text-2xl md:text-3xl font-bold">Refund Management</h1>
          <p className="text-sm text-muted-foreground">Process refunds and item replacements</p>
        </div>

        {/* Order Search Section */}
        {!order && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Find Order</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="orderNumber">Order Number</Label>
                  <Input
                    id="orderNumber"
                    type="text"
                    placeholder="Enter order number"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchOrder()}
                  />
                </div>
                <div>
                  <Label htmlFor="orderDate">Order Date</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={fetchOrder}
                    disabled={loading}
                    className="w-full"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {loading ? 'Searching...' : 'Find Order'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Details and Cart */}
        {order && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Menu Items Section */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Select Replacement Items</CardTitle>
                  <div className="mt-4">
                    <Input
                      type="text"
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="mb-4"
                    />
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {categories.map((category) => (
                        <Badge
                          key={category}
                          variant={selectedCategory === category ? 'default' : 'secondary'}
                          className="cursor-pointer whitespace-nowrap"
                          onClick={() => setSelectedCategory(category)}
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto">
                    {filteredMenuItems.map((item) => {
                      const isInCart = replacementCart.some(cartItem => cartItem.menuItem.id === item.id);
                      const cartItem = replacementCart.find(cartItem => cartItem.menuItem.id === item.id);
                      const cartQuantity = cartItem ? cartItem.quantity : 0;
                      const isOutOfStock = item.stockBalance !== null && item.stockBalance !== undefined && item.stockBalance <= 0;
                      const isUnavailable = !item.available;
                      const isLowStock = item.stockBalance !== null && item.stockBalance !== undefined && item.stockBalance > 0 && item.stockBalance <= 3;
                      const canAddMore = canAddItem(parseFloat(item.price));
                      
                      return (
                        <Card
                          key={item.id}
                          className={`overflow-hidden hover-elevate cursor-pointer transition-all ${
                            isInCart ? 'ring-2 ring-primary' : ''
                          } ${(isOutOfStock || isUnavailable) ? 'opacity-75' : ''}`}
                          onClick={() => canAddMore && !isOutOfStock && !isUnavailable && addToCart(item)}
                        >
                          <div className="aspect-video overflow-hidden relative">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <span className="text-muted-foreground">No image</span>
                              </div>
                            )}
                            {isInCart && (
                              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5 md:p-1 z-10">
                                <Plus className="w-3 h-3 md:w-4 md:h-4" />
                              </div>
                            )}
                            {isUnavailable && (
                              <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center z-10">
                                <span className="text-white font-bold text-sm md:text-lg px-2 py-1 md:px-4 md:py-2 rounded-lg bg-gray-800/70 shadow-lg border-2 border-white">
                                  UNAVAILABLE
                                </span>
                              </div>
                            )}
                            {!isUnavailable && isOutOfStock && (
                              <div className="absolute inset-0 bg-primary/90 flex items-center justify-center z-10">
                                <span className="text-white font-bold text-sm md:text-lg px-2 py-1 md:px-4 md:py-2 rounded-lg bg-primary/70 shadow-lg border-2 border-white">
                                  SOLD OUT
                                </span>
                              </div>
                            )}
                            {!isOutOfStock && !isUnavailable && isLowStock && (
                              <div className="absolute top-2 left-2 z-10">
                                <Badge variant="destructive" className="text-xs font-semibold shadow-md">
                                  Only {item.stockBalance} left!
                                </Badge>
                              </div>
                            )}
                          </div>
                          <CardContent className="p-3 md:p-4">
                            <h3 className="font-semibold truncate mb-1 text-sm md:text-base">{item.name}</h3>
                            <p className="text-base md:text-lg font-bold">₦{parseFloat(item.price).toLocaleString()}</p>
                            {item.stockBalance !== null && item.stockBalance !== undefined ? (
                              <div className="flex items-center gap-1 mt-2">
                                <span className="text-xs text-muted-foreground">Stock:</span>
                                <span className={`text-xs font-semibold ${
                                  item.stockBalance <= 0 ? 'text-red-600' :
                                  item.stockBalance <= 3 ? 'text-orange-500' :
                                  'text-green-600'
                                }`}>
                                  {item.stockBalance} portions
                                </span>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="mt-2 text-xs">Stock not tracked</Badge>
                            )}
                            
                            {isInCart && cartQuantity > 0 && (
                              <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(item.id, cartQuantity - 1);
                                  }}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="font-semibold text-base min-w-[2rem] text-center">
                                  {cartQuantity}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(item.id, cartQuantity + 1);
                                  }}
                                  disabled={!canAddItem(parseFloat(item.price))}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cart Section */}
            <div>
              <Card className="sticky top-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Replacement Cart
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCart}
                    >
                      Clear
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Order Info */}
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-semibold">Order #{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                  </div>

                  {/* Original Order Items */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Original Order Items
                    </h3>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto p-2 bg-red-50 border border-red-200 rounded">
                      {originalItems.map((item) => (
                        <div key={item.menuItem.id} className="flex items-center justify-between p-2 bg-white rounded">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.menuItem.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ₦{parseFloat(item.menuItem.price).toLocaleString()} × {item.quantity}
                            </p>
                          </div>
                          <p className="font-semibold text-sm">
                            ₦{(parseFloat(item.menuItem.price) * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Replacement Cart Items */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      Replacement Items
                    </h3>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto p-2 bg-green-50 border border-green-200 rounded">
                      {replacementCart.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                          <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No replacement items</p>
                          <p className="text-xs">Full refund will be processed</p>
                        </div>
                      ) : (
                        replacementCart.map((item) => (
                          <div key={item.menuItem.id} className="flex items-center gap-2 p-2 bg-white rounded">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.menuItem.name}</p>
                              <p className="text-xs text-muted-foreground">
                                ₦{parseFloat(item.menuItem.price).toLocaleString()} each
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center font-semibold">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFromCart(item.menuItem.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Budget Summary */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-sm font-semibold mb-2">Refund Summary</h3>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Original Amount:</span>
                      <span className="font-semibold">₦{originalTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Replacement Total:</span>
                      <span className="font-semibold">₦{replacementTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
                      <span>Refund Amount:</span>
                      <span className={refundAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ₦{Math.abs(refundAmount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    {refundAmount < 0 && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span>Cart exceeds original order amount</span>
                      </div>
                    )}
                    <Button
                      className="w-full"
                      onClick={() => setShowRefundDialog(true)}
                      disabled={refundAmount < 0}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Process Refund
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setOrder(null);
                        setOriginalItems([]);
                        setReplacementCart([]);
                        setOrderNumber('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Refund Confirmation Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Refund</DialogTitle>
            <DialogDescription>
              Please provide a reason for this refund and replacement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="refundReason">Refund Reason</Label>
              <Textarea
                id="refundReason"
                placeholder="Enter reason for refund..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={4}
              />
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-semibold mb-2">Summary:</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Original Amount:</span>
                  <span>₦{originalTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Replacement Items:</span>
                  <span>₦{replacementTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-1 mt-1">
                  <span>Refund Amount:</span>
                  <span className="text-green-600">₦{refundAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRefundDialog(false)}
              disabled={processingRefund}
            >
              Cancel
            </Button>
            <Button
              onClick={processRefund}
              disabled={processingRefund || !refundReason.trim()}
            >
              {processingRefund ? 'Processing...' : 'Confirm Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Refund Processed Successfully!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="mb-4 p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">New Refund Order Created</p>
                <p className="text-4xl font-bold text-green-600">#{successData?.orderNumber}</p>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Refund Amount</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₦{successData?.refundAmount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="text-sm text-muted-foreground text-center">
              <p>The replacement order has been sent to the kitchen.</p>
              <p>Stock has been deducted for replacement items.</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => {
                setShowSuccessDialog(false);
                setSuccessData(null);
                setOrder(null);
                setOriginalItems([]);
                setReplacementCart([]);
                setOrderNumber('');
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
