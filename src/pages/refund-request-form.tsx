import { useState } from 'react';
import { useLocation } from 'wouter';
import { Search, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const ISSUE_TYPES = [
  { id: 'not_delivered', label: 'Order not delivered' },
  { id: 'wrong_item', label: 'Wrong item delivered' },
  { id: 'missing_item', label: 'Missing item' },
  { id: 'poor_quality', label: 'Poor food quality' },
  { id: 'delay', label: 'Delay in delivery/service' },
  { id: 'repayment', label: 'Repayment issue' },
  { id: 'other', label: 'Other' }
];

const ACTION_TYPES = [
  { id: 'full_refund', label: 'Full Refund', description: 'Refund entire order amount' },
  { id: 'partial_refund', label: 'Partial Refund', description: 'Refund partial amount' },
  { id: 'replacement', label: 'Item Replacement', description: 'Replace items without refund' },
  { id: 'apology', label: 'Apology with Replacement', description: 'Replace items as apology (no refund)' },
  { id: 'store_credit', label: 'Store Credit', description: 'Issue store credit and create new order' }
];

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'pos_reversal', label: 'POS Reversal' },
  { id: 'store_credit', label: 'Store Credit' }
];

export default function RefundRequestForm() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [order, setOrder] = useState<any>(null);
  const [issueTypes, setIssueTypes] = useState<string[]>([]);
  const [issueDescription, setIssueDescription] = useState('');
  const [actionRequested, setActionRequested] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundPaymentMethod, setRefundPaymentMethod] = useState('');
  const [selectedOriginalItems, setSelectedOriginalItems] = useState<any[]>([]);
  const [replacementItems, setReplacementItems] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);

  const steps = [
    { number: 1, title: 'Find Order', description: 'Search for the order' },
    { number: 2, title: 'Issue Details', description: 'Describe the problem' },
    { number: 3, title: 'Select Action', description: 'Choose resolution' },
    { number: 4, title: 'Review', description: 'Confirm and submit' }
  ];

  const fetchOrder = async () => {
    if (!orderNumber.trim() || !orderDate) {
      toast({ title: 'Order number and date are required', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      const response = await apiRequest('GET', `/api/orders/search?orderNumber=${orderNumber}&date=${orderDate}`);
      if (!response.ok) throw new Error('Order not found');
      
      const data = await response.json();
      
      // Check if order has already been refunded
      if (data.status === 'refunded') {
        toast({
          title: 'Order Already Refunded',
          description: `Order #${data.orderNumber} has already been refunded. Cannot create another refund request.`,
          variant: 'destructive',
          duration: 7000,
        });
        setOrder(null);
        setLoading(false);
        return;
      }

      // Check if order is ready or completed (required for refunds)
      if (data.status !== 'ready' && data.status !== 'completed') {
        toast({
          title: 'Cannot Refund This Order',
          description: `You cannot refund order #${data.orderNumber} with status "${data.status}". Order must be ready or completed to request a refund.`,
          variant: 'destructive',
          duration: 7000,
        });
        setOrder(null);
        setLoading(false);
        return;
      }

      // Check if there's already a pending/approved refund request
      try {
        const refundCheckResponse = await apiRequest('GET', `/api/refunds/requests`);
        if (refundCheckResponse.ok) {
          const refundData = await refundCheckResponse.json();
          const existingRequest = refundData.requests?.find((r: any) => 
            r.orderId === data.id && 
            (r.status === 'pending' || r.status === 'approved')
          );
          
          if (existingRequest) {
            toast({
              title: 'Refund Request Already Exists',
              description: `A ${existingRequest.status} refund request already exists for order #${data.orderNumber}.`,
              variant: 'destructive',
              duration: 7000,
            });
            setOrder(null);
            setLoading(false);
            return;
          }
        }
      } catch (refundCheckError) {
        // If refund check fails, continue anyway (user might not have permission to view requests)
        console.log('Could not check for existing refund requests');
      }
      
      setOrder(data);
      if (actionRequested === 'full_refund') {
        setRefundAmount(data.totalAmount);
      }
      toast({ title: 'Order Found', description: `Order #${data.orderNumber}` });
      setCurrentStep(2);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueTypeToggle = (issueId: string) => {
    setIssueTypes(prev => 
      prev.includes(issueId) ? prev.filter(id => id !== issueId) : [...prev, issueId]
    );
  };

  const handleActionChange = (action: string) => {
    setActionRequested(action);
    if (action === 'full_refund' && order) {
      setRefundAmount(order.totalAmount);
    } else if (action !== 'full_refund' && action !== 'partial_refund') {
      setRefundAmount('');
      setRefundPaymentMethod('');
    }
    
    // Load menu for replacement, apology, and store_credit
    if (action === 'replacement' || action === 'apology' || action === 'store_credit') {
      fetchMenuItems();
    }
  };

  const fetchMenuItems = async () => {
    try {
      setLoadingMenu(true);
      const response = await apiRequest('GET', '/api/menu/all');
      if (!response.ok) throw new Error('Failed to fetch menu');
      const data = await response.json();
      setMenuItems(data);
    } catch (error: any) {
      toast({ title: 'Error loading menu', description: error.message, variant: 'destructive' });
    } finally {
      setLoadingMenu(false);
    }
  };

  const toggleOriginalItem = (orderItem: any) => {
    setSelectedOriginalItems(prev => {
      const exists = prev.find(i => i.id === orderItem.id);
      if (exists) {
        // Remove item and its replacement
        setReplacementItems(r => r.filter(ri => ri.originalItemId !== orderItem.id));
        return prev.filter(i => i.id !== orderItem.id);
      }
      return [...prev, orderItem];
    });
  };

  const selectReplacement = (originalItem: any, menuItem: any) => {
    const originalPrice = parseFloat(originalItem.price);
    const menuPrice = parseFloat(menuItem.price);
    
    if (menuPrice > originalPrice) {
      toast({ 
        title: 'Price Exceeds Original', 
        description: `Replacement cannot cost more than ₦${originalPrice.toLocaleString()}`,
        variant: 'destructive' 
      });
      return;
    }

    setReplacementItems(prev => {
      const filtered = prev.filter(r => r.originalItemId !== originalItem.id);
      return [...filtered, {
        originalItemId: originalItem.id,
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        quantity: originalItem.quantity,
        price: menuItem.price,
        originalPrice: originalItem.price
      }];
    });

    toast({ title: 'Replacement Selected', description: `${menuItem.name} selected` });
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return !!order;
      case 2:
        if (issueTypes.length === 0) {
          toast({ title: 'Select at least one issue type', variant: 'destructive' });
          return false;
        }
        if (!issueDescription.trim()) {
          toast({ title: 'Issue description required', variant: 'destructive' });
          return false;
        }
        if (issueTypes.includes('other') && issueDescription.length < 10) {
          toast({ title: 'Provide detailed description for "Other"', variant: 'destructive' });
          return false;
        }
        return true;
      case 3:
        if (!actionRequested) {
          toast({ title: 'Select an action type', variant: 'destructive' });
          return false;
        }
        if ((actionRequested === 'full_refund' || actionRequested === 'partial_refund') && !refundPaymentMethod) {
          toast({ title: 'Select payment method', variant: 'destructive' });
          return false;
        }
        if (actionRequested === 'partial_refund') {
          const amount = parseFloat(refundAmount);
          if (!amount || amount <= 0 || amount > parseFloat(order.totalAmount)) {
            toast({ title: 'Invalid refund amount', variant: 'destructive' });
            return false;
          }
        }
        if (actionRequested === 'replacement') {
          if (selectedOriginalItems.length === 0) {
            toast({ title: 'Select items to replace', variant: 'destructive' });
            return false;
          }
          if (replacementItems.length !== selectedOriginalItems.length) {
            toast({ title: 'Select replacement for all items', variant: 'destructive' });
            return false;
          }
        }
        if (actionRequested === 'apology') {
          if (selectedOriginalItems.length === 0) {
            toast({ title: 'Select items to replace as apology', variant: 'destructive' });
            return false;
          }
          if (replacementItems.length !== selectedOriginalItems.length) {
            toast({ title: 'Select replacement for all items', variant: 'destructive' });
            return false;
          }
        }
        if (actionRequested === 'store_credit') {
          if (replacementItems.length === 0) {
            toast({ title: 'Select items for store credit order', variant: 'destructive' });
            return false;
          }
          const total = replacementItems.reduce((sum, item) => sum + parseFloat(item.price), 0);
          if (total > parseFloat(order.totalAmount)) {
            toast({ title: 'Selected items exceed order amount', variant: 'destructive' });
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('POST', '/api/refunds/requests', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        issueTypes,
        issueDescription,
        actionRequested,
        refundAmount: refundAmount || null,
        refundPaymentMethod: refundPaymentMethod || null,
        replacementItems: actionRequested === 'replacement' ? replacementItems : null
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create request');
      }

      toast({ title: 'Refund Request Created', description: 'Awaiting approval' });
      setLocation('/refund-management');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-serif text-2xl md:text-3xl font-bold">Create Refund Request</h1>
        <p className="text-sm text-muted-foreground">Follow the steps to submit a refund request</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  currentStep >= step.number 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step.number}
                </div>
                <div className="text-center mt-2">
                  <p className="text-xs font-semibold">{step.title}</p>
                  <p className="text-xs text-muted-foreground hidden md:block">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-1 flex-1 mx-2 ${
                  currentStep > step.number ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].title}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step 1: Find Order */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Order Number</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Enter order number"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchOrder()}
                  />
                  <Input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-44"
                  />
                  <Button onClick={fetchOrder} disabled={loading}>
                    <Search className="w-4 h-4 mr-2" />
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>

              {order && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-3">Order Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="font-semibold">Order #:</span> {order.orderNumber}</div>
                    <div><span className="font-semibold">Total:</span> ₦{parseFloat(order.totalAmount).toLocaleString()}</div>
                    <div><span className="font-semibold">Customer:</span> {order.customerName}</div>
                    <div><span className="font-semibold">Phone:</span> {order.customerPhone}</div>
                    <div><span className="font-semibold">Payment:</span> {order.paymentMethod}</div>
                    <div><span className="font-semibold">Type:</span> {order.orderType}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Issue Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <Label className="mb-3 block">Issue Type (Select all that apply)</Label>
                <div className="space-y-2">
                  {ISSUE_TYPES.map(issue => (
                    <div key={issue.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={issue.id}
                        checked={issueTypes.includes(issue.id)}
                        onCheckedChange={() => handleIssueTypeToggle(issue.id)}
                      />
                      <label htmlFor={issue.id} className="text-sm cursor-pointer">
                        {issue.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Issue Description *</Label>
                <Textarea
                  placeholder="Describe the issue in detail..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  rows={5}
                  className="mt-2"
                />
                {issueTypes.includes('other') && (
                  <p className="text-xs text-muted-foreground mt-2">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Detailed description required for "Other"
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Select Action */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <Label className="mb-3 block">Action Requested</Label>
                <RadioGroup value={actionRequested} onValueChange={handleActionChange}>
                  {ACTION_TYPES.map(action => (
                    <div key={action.id} className="flex items-start space-x-2 p-3 border rounded hover:bg-muted cursor-pointer">
                      <RadioGroupItem value={action.id} id={action.id} />
                      <label htmlFor={action.id} className="flex-1 cursor-pointer">
                        <div className="font-semibold">{action.label}</div>
                        <div className="text-xs text-muted-foreground">{action.description}</div>
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {(actionRequested === 'full_refund' || actionRequested === 'partial_refund') && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label>Refund Amount</Label>
                    <Input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      disabled={actionRequested === 'full_refund'}
                      max={order?.totalAmount}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Max: ₦{parseFloat(order?.totalAmount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <RadioGroup value={refundPaymentMethod} onValueChange={setRefundPaymentMethod} className="mt-2">
                      {PAYMENT_METHODS.map(method => (
                        <div key={method.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={method.id} id={method.id} />
                          <label htmlFor={method.id} className="text-sm cursor-pointer">
                            {method.label}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              )}

              {(actionRequested === 'replacement' || actionRequested === 'apology') && (
                <div className="space-y-4">
                  {/* Select Original Items */}
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <Label className="mb-3 block">Select Items to Replace</Label>
                    <div className="space-y-2">
                      {order?.orderItems?.map((item: any) => (
                        <div key={item.id} className="flex items-center space-x-2 p-2 bg-white rounded">
                          <Checkbox
                            id={`original-${item.id}`}
                            checked={selectedOriginalItems.some(i => i.id === item.id)}
                            onCheckedChange={() => toggleOriginalItem(item)}
                          />
                          <label htmlFor={`original-${item.id}`} className="flex-1 cursor-pointer text-sm">
                            <span className="font-semibold">{item.menuItemName}</span>
                            <span className="text-muted-foreground"> × {item.quantity}</span>
                            <span className="ml-2">₦{parseFloat(item.price).toLocaleString()}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Select Replacements - Walk-in Order Style */}
                  {selectedOriginalItems.length > 0 && (
                    <div className="space-y-6">
                      {selectedOriginalItems.map(originalItem => {
                        const maxPrice = parseFloat(originalItem.price);
                        const selectedReplacement = replacementItems.find(r => r.originalItemId === originalItem.id);
                        const availableItems = menuItems.filter(m => 
                          parseFloat(m.price) <= maxPrice && 
                          m.available && 
                          (m.stockBalance === null || m.stockBalance === undefined || m.stockBalance > 0)
                        );

                        return (
                          <div key={originalItem.id} className="space-y-3">
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-sm font-semibold">Replace: {originalItem.menuItemName}</p>
                              <p className="text-xs text-muted-foreground">
                                Max price: ₦{maxPrice.toLocaleString()} • Quantity: {originalItem.quantity}
                              </p>
                              {selectedReplacement && (
                                <div className="mt-2 p-2 bg-white rounded border-2 border-green-500 flex justify-between items-center">
                                  <div>
                                    <p className="text-sm font-semibold text-green-600">✓ {selectedReplacement.menuItemName}</p>
                                    <p className="text-xs text-muted-foreground">₦{parseFloat(selectedReplacement.price).toLocaleString()}</p>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setReplacementItems(prev => prev.filter(r => r.originalItemId !== originalItem.id))}
                                  >
                                    Change
                                  </Button>
                                </div>
                              )}
                            </div>

                            {!selectedReplacement && (
                              <div>
                                {loadingMenu ? (
                                  <p className="text-sm text-muted-foreground text-center py-8">Loading menu...</p>
                                ) : availableItems.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-8">No items available within price range</p>
                                ) : (
                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {availableItems.map(menuItem => (
                                      <Card
                                        key={menuItem.id}
                                        className="overflow-hidden hover:shadow-lg cursor-pointer transition-all"
                                        onClick={() => selectReplacement(originalItem, menuItem)}
                                      >
                                        <div className="aspect-video overflow-hidden relative">
                                          {menuItem.imageUrl ? (
                                            <img
                                              src={menuItem.imageUrl}
                                              alt={menuItem.name}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                              <span className="text-muted-foreground text-xs">No image</span>
                                            </div>
                                          )}
                                        </div>
                                        <CardContent className="p-3">
                                          <h3 className="font-semibold truncate text-sm">{menuItem.name}</h3>
                                          <p className="text-xs text-muted-foreground truncate">{menuItem.category}</p>
                                          <p className="text-base font-bold mt-1">₦{parseFloat(menuItem.price).toLocaleString()}</p>
                                          {menuItem.stockBalance !== null && menuItem.stockBalance !== undefined && (
                                            <p className={`text-xs mt-1 ${
                                              menuItem.stockBalance <= 0 ? 'text-red-600' :
                                              menuItem.stockBalance <= 3 ? 'text-orange-500' :
                                              'text-green-600'
                                            }`}>
                                              Stock: {menuItem.stockBalance}
                                            </p>
                                          )}
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {actionRequested === 'store_credit' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold mb-2">Store Credit Budget</p>
                    <p className="text-2xl font-bold text-blue-600">₦{parseFloat(order?.totalAmount || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">Select items up to this amount</p>
                  </div>

                  {loadingMenu ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Loading menu...</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {menuItems.filter(m => m.available && (m.stockBalance === null || m.stockBalance === undefined || m.stockBalance > 0)).map(menuItem => {
                        const isSelected = replacementItems.some(r => r.menuItemId === menuItem.id);
                        const currentTotal = replacementItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
                        const canAdd = currentTotal + parseFloat(menuItem.price) <= parseFloat(order?.totalAmount || 0);

                        return (
                          <Card
                            key={menuItem.id}
                            className={`overflow-hidden hover:shadow-lg cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''} ${!canAdd && !isSelected ? 'opacity-50' : ''}`}
                            onClick={() => {
                              if (canAdd || isSelected) {
                                if (isSelected) {
                                  setReplacementItems(prev => prev.filter(r => r.menuItemId !== menuItem.id));
                                } else {
                                  setReplacementItems(prev => [...prev, {
                                    menuItemId: menuItem.id,
                                    menuItemName: menuItem.name,
                                    quantity: 1,
                                    price: menuItem.price,
                                    originalItemId: null
                                  }]);
                                }
                              }
                            }}
                          >
                            <div className="aspect-video overflow-hidden relative">
                              {menuItem.imageUrl ? (
                                <img src={menuItem.imageUrl} alt={menuItem.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                  <span className="text-muted-foreground text-xs">No image</span>
                                </div>
                              )}
                              {isSelected && (
                                <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                                  ✓
                                </div>
                              )}
                            </div>
                            <CardContent className="p-3">
                              <h3 className="font-semibold truncate text-sm">{menuItem.name}</h3>
                              <p className="text-xs text-muted-foreground truncate">{menuItem.category}</p>
                              <p className="text-base font-bold mt-1">₦{parseFloat(menuItem.price).toLocaleString()}</p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {replacementItems.length > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-semibold mb-2">Selected Items</p>
                      <div className="space-y-2">
                        {replacementItems.map(item => (
                          <div key={item.menuItemId} className="flex justify-between text-sm">
                            <span>{item.menuItemName}</span>
                            <span className="font-semibold">₦{parseFloat(item.price).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                        <span>Total:</span>
                        <span>₦{replacementItems.reduce((sum, item) => sum + parseFloat(item.price), 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-3">Order Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-semibold">Order #:</span> {order.orderNumber}</div>
                  <div><span className="font-semibold">Customer:</span> {order.customerName}</div>
                  <div><span className="font-semibold">Total:</span> ₦{parseFloat(order.totalAmount).toLocaleString()}</div>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-3">Issue Details</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Issue Types</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {issueTypes.map(type => (
                        <Badge key={type} variant="outline">{type.replace('_', ' ')}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm">{issueDescription}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-3">Resolution</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-semibold">Action:</span> {ACTION_TYPES.find(a => a.id === actionRequested)?.label}</div>
                  {refundAmount && (
                    <div><span className="font-semibold">Amount:</span> ₦{parseFloat(refundAmount).toLocaleString()}</div>
                  )}
                  {refundPaymentMethod && (
                    <div><span className="font-semibold">Payment Method:</span> {PAYMENT_METHODS.find(m => m.id === refundPaymentMethod)?.label}</div>
                  )}
                  {actionRequested === 'replacement' && replacementItems.length > 0 && (
                    <div>
                      <p className="font-semibold mb-2">Replacements:</p>
                      <div className="space-y-2">
                        {replacementItems.map((item, idx) => {
                          const original = selectedOriginalItems.find(o => o.id === item.originalItemId);
                          return (
                            <div key={idx} className="p-2 bg-white rounded text-xs">
                              <div className="flex justify-between">
                                <span className="text-red-600">{original?.menuItemName}</span>
                                <span>→</span>
                                <span className="text-green-600">{item.menuItemName}</span>
                              </div>
                              <div className="text-muted-foreground">
                                ₦{parseFloat(original?.price || 0).toLocaleString()} → ₦{parseFloat(item.price).toLocaleString()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentStep < 4 ? (
          <Button onClick={nextStep}>
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        )}
      </div>
    </div>
  );
}
