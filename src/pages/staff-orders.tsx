import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Minus, X, ChefHat, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MenuItem, CartItem } from "@shared/schema";

// Service Charge interface
interface ServiceCharge {
  id: string
  description: string
  type: 'fixed' | 'percentage'
  amount: string | number  // API returns string
  status: 'active' | 'inactive'
}

const orderFormSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerPhone: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

export default function StaffOrders() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Service charges state
  const [serviceCharges, setServiceCharges] = useState<ServiceCharge[]>([])
  const [loadingCharges, setLoadingCharges] = useState(true)
  
  // Kitchen status state
  const [kitchenStatus, setKitchenStatus] = useState<{ isOpen: boolean }>({ isOpen: true })

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerName: "Nibbles Kitchen",
      customerPhone: "",
    },
  });

  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/all"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch categories from API with refetch on mount and focus
  const { data: categoriesData } = useQuery<string[]>({
    queryKey: ["/api/menu/categories"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale
  });

  // Add "All" to the beginning of categories
  const categories = ["All", ...(categoriesData || [])];

  const filteredItems = menuItems?.filter(
    (item) => {
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const matchesSearch = searchQuery === "" || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Show all items, including out of stock ones
      return matchesCategory && matchesSearch;
    }
  );

  const addToCart = (menuItem: MenuItem) => {
    // Check if kitchen is closed
    if (!kitchenStatus.isOpen) {
      toast({
        title: "Kitchen is Closed",
        description: "The kitchen is currently closed. Please try again later.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Check if item is out of stock
    if (menuItem.stockBalance !== null && menuItem.stockBalance !== undefined && menuItem.stockBalance <= 0) {
      toast({
        title: "Out of Stock",
        description: `${menuItem.name} is currently out of stock.`,
        variant: "destructive",
        duration: 2000,
      });
      return;
    }
    
    // Check if we can add more of this item
    if (menuItem.stockBalance !== null && menuItem.stockBalance !== undefined) {
      const currentCartQuantity = cart.find(item => item.menuItem.id === menuItem.id)?.quantity || 0;
      if (currentCartQuantity >= menuItem.stockBalance) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${menuItem.stockBalance} portion(s) of ${menuItem.name} available.`,
          variant: "destructive",
          duration: 2000,
        });
        return;
      }
    }
    
    setCart((prev) => {
      const existing = prev.find((item) => item.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map((item) =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
  };

  const updateQuantity = (menuItemId: number, delta: number) => {
    setCart((prev) => {
      const item = prev.find((cartItem) => cartItem.menuItem.id === menuItemId);
      if (!item) return prev;
      
      const newQuantity = item.quantity + delta;
      
      // If decreasing, allow it
      if (delta < 0) {
        return prev
          .map((cartItem) =>
            cartItem.menuItem.id === menuItemId
              ? { ...cartItem, quantity: newQuantity }
              : cartItem
          )
          .filter((cartItem) => cartItem.quantity > 0);
      }
      
      // If increasing, check stock limits
      if (delta > 0 && item.menuItem.stockBalance !== null && item.menuItem.stockBalance !== undefined) {
        if (newQuantity > item.menuItem.stockBalance) {
          toast({
            title: "Insufficient Stock",
            description: `Only ${item.menuItem.stockBalance} portion(s) of ${item.menuItem.name} available.`,
            variant: "destructive",
            duration: 2000,
          });
          return prev;
        }
      }
      
      return prev.map((cartItem) =>
        cartItem.menuItem.id === menuItemId
          ? { ...cartItem, quantity: newQuantity }
          : cartItem
      );
    });
  };

  const removeFromCart = (menuItemId: number) => {
    setCart((prev) => prev.filter((item) => item.menuItem.id !== menuItemId));
  };

  const updateInstructions = (menuItemId: number, instructions: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.menuItem.id === menuItemId
          ? { ...item, specialInstructions: instructions }
          : item
      )
    );
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + parseFloat(item.menuItem.price) * item.quantity,
    0
  );
  
  // Calculate total with service charges
  const calculateTotal = () => {
    // If no items in cart, return 0
    if (subtotal === 0) {
      return 0
    }
    
    let total = subtotal
    serviceCharges.forEach(charge => {
      const amount = typeof charge.amount === 'string' ? parseFloat(charge.amount) : charge.amount
      if (charge.type === 'percentage') {
        total += (subtotal * (amount / 100))
      } else {
        total += amount
      }
    })
    return total
  }
  
  // Helper function to calculate individual service charge amounts
  const calculateServiceChargeAmount = (charge: ServiceCharge) => {
    const amount = typeof charge.amount === 'string' ? parseFloat(charge.amount) : charge.amount
    if (charge.type === 'percentage') {
      return (subtotal * (amount / 100))
    }
    return amount
  }
  
  // Fetch active service charges
  useEffect(() => {
    const fetchServiceCharges = async () => {
      try {
        setLoadingCharges(true)
        const response = await apiRequest("GET", "/api/service-charges/active")
        if (response.ok) {
          const charges = await response.json()
          setServiceCharges(charges)
          console.log('✅ Service charges loaded:', charges)
        }
      } catch (error) {
        console.error('❌ Error fetching service charges:', error)
        setServiceCharges([])
      } finally {
        setLoadingCharges(false)
      }
    }
    
    fetchServiceCharges()
  }, [])

  // Fetch kitchen status
  useEffect(() => {
    const fetchKitchenStatus = async () => {
      try {
        const response = await apiRequest("GET", "/api/kitchen/status")
        if (response.ok) {
          const status = await response.json()
          setKitchenStatus(status)
        }
      } catch (error) {
        console.error('❌ Error fetching kitchen status:', error)
        // Default to open if check fails
        setKitchenStatus({ isOpen: true })
      }
    }
    
    fetchKitchenStatus()
    // Poll kitchen status every 30 seconds
    const interval = setInterval(fetchKitchenStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  // No longer creating order here - just preparing data for checkout
  const handleProceedToCheckout = () => {
    // Check if kitchen is closed
    if (!kitchenStatus.isOpen) {
      toast({
        title: "Kitchen is Closed",
        description: "The kitchen is currently closed. Please try again later.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Proceeding to Payment",
      description: "Please confirm payment method...",
    });
    
    // Store cart and customer data for checkout (NO order created yet)
    localStorage.setItem('pendingWalkInOrder', JSON.stringify({
      customerName: form.getValues('customerName'),
      customerPhone: form.getValues('customerPhone'),
      total: calculateTotal(), // Include all service charges
      items: cart.map((item) => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        price: item.menuItem.price,
        specialInstructions: item.specialInstructions,
        name: item.menuItem.name,
      })),
    }));
    
    setCart([]);
    form.reset({ customerName: "Nibbles Kitchen", customerPhone: "" });
    
    // Redirect to staff checkout page
    setLocation('/staff/checkout');
  };

  // F1 keyboard shortcut to proceed to checkout
  // Supports: F1, Cmd+F1 (Mac), Ctrl+F1 (Windows)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const isF1 = event.key === 'F1' || event.key === 'f1';
      const isMac = event.metaKey; // Cmd key on Mac
      const isWindows = event.ctrlKey; // Ctrl key on Windows
      
      // Check if F1 is pressed (with or without modifier) and cart has items
      if (isF1 && cart.length > 0 && (isMac || isWindows || !event.metaKey && !event.ctrlKey)) {
        event.preventDefault();
        // Check if kitchen is closed
        if (!kitchenStatus.isOpen) {
          toast({
            title: "Kitchen is Closed",
            description: "The kitchen is currently closed. Please try again later.",
            variant: "destructive",
          });
          return;
        }
        // Validate form before proceeding
        const values = form.getValues();
        if (values.customerName && values.customerName.length >= 2) {
          handleProceedToCheckout();
        } else {
          toast({
            title: "Customer Name Required",
            description: "Please enter customer name before proceeding to checkout.",
            variant: "destructive",
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [cart, form]);

  const onSubmit = (values: OrderFormValues) => {
    if (cart.length === 0) {
      toast({
        title: "Empty Order",
        description: "Please add items to the order.",
        variant: "destructive",
      });
      return;
    }

    // Proceed to checkout instead of creating order
    handleProceedToCheckout();
  };

  const handleClearOrder = () => {
    setCart([]);
    form.reset();
  };

  // WebSocket connection for real-time updates
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("Staff Orders WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (
        data.type === "order_update" || 
        data.type === "new_order" || 
        data.type === "order_status_change"
      ) {
        // Refresh active orders when there are changes
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      } else if (data.type === "menu_item_update") {
        // Refresh menu data and categories when items are updated
        queryClient.invalidateQueries({ queryKey: ["/api/menu/all"] });
        queryClient.invalidateQueries({ queryKey: ["/api/menu/categories"] });
      }
    };

    socket.onerror = (error) => {
      console.error("Staff Orders WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("Staff Orders WebSocket disconnected");
    };

    // Cleanup function to close the WebSocket connection
    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Kitchen Closed Banner - Very Prominent */}
      {!kitchenStatus.isOpen && (
        <div className="bg-primary text-primary-foreground py-4 px-4 shadow-lg border-b-4 border-primary/80">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            <AlertCircle className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0 animate-pulse" />
            <div className="text-center">
              <h2 className="text-lg md:text-2xl font-bold mb-1">⚠️ KITCHEN IS CLOSED</h2>
              <p className="text-sm md:text-base">We are currently not accepting orders. Please check back later.</p>
            </div>
            <ChefHat className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0 animate-pulse" />
          </div>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row h-auto md:h-screen overflow-hidden">
        {/* Menu Section - Full width on mobile, flex-1 on desktop */}
        <div className="flex-1 flex flex-col border-r md:border-r overflow-hidden">
          <div className="p-4 md:p-6 border-b">
            <h1 className="font-serif text-2xl md:text-3xl font-bold mb-3 md:mb-4">Walk-in Orders</h1>
            
            {/* Search Bar */}
            <div className="mb-4">
              <Input
                type="text"
                placeholder="Search menu items by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            {/* Category Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "secondary"}
                  className="cursor-pointer whitespace-nowrap px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm hover-elevate flex-shrink-0"
                  onClick={() => setSelectedCategory(category)}
                  data-testid={`filter-${category.toLowerCase().replace(" ", "-")}`}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="aspect-video bg-muted animate-pulse" />
                    <CardContent className="p-3 md:p-4">
                      <div className="h-4 md:h-5 bg-muted rounded animate-pulse mb-1 md:mb-2" />
                      <div className="h-3 md:h-4 bg-muted rounded animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {filteredItems?.map((item) => {
                  const isInCart = cart.some(cartItem => cartItem.menuItem.id === item.id);
                  const cartItem = cart.find(cartItem => cartItem.menuItem.id === item.id);
                  const isOutOfStock = !item.available || (item.stockBalance !== null && item.stockBalance !== undefined && item.stockBalance <= 0);
                  const isLowStock = item.stockBalance !== null && item.stockBalance !== undefined && item.stockBalance > 0 && item.stockBalance <= 3;
                  const canAddMore = !isOutOfStock && (item.stockBalance === null || item.stockBalance === undefined || !cartItem || cartItem.quantity < item.stockBalance);
                  
                  return (
                    <Card
                      key={item.id}
                      className={`overflow-hidden hover-elevate cursor-pointer transition-all ${isInCart ? 'ring-2 ring-primary' : ''} ${isOutOfStock ? 'opacity-75' : ''}`}
                      onClick={() => canAddMore && kitchenStatus.isOpen && addToCart(item)}
                      data-testid={`card-menu-item-${item.id}`}
                    >
                      <div className="aspect-video overflow-hidden relative">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        {isInCart && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5 md:p-1">
                            <Plus className="w-3 h-3 md:w-4 md:h-4" />
                          </div>
                        )}
                        {/* Out of Stock Overlay */}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-primary/90 flex items-center justify-center">
                            <span className="text-white font-bold text-sm md:text-lg px-2 py-1 md:px-4 md:py-2 rounded-lg bg-primary/70 shadow-lg border-2 border-white">
                              OUT OF STOCK
                            </span>
                          </div>
                        )}
                        {/* Low Stock Badge */}
                        {!isOutOfStock && isLowStock && (
                          <div className="absolute top-2 left-2">
                            <Badge variant="destructive" className="text-xs font-semibold shadow-md">
                              Only {item.stockBalance} left!
                            </Badge>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3 md:p-4">
                        <h3 className="font-semibold truncate mb-1 text-sm md:text-base">{item.name}</h3>
                        <p className="text-base md:text-lg font-bold">₦{parseFloat(item.price).toLocaleString()}</p>
                        {/* Stock Balance Indicator */}
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
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart Section - Full width on mobile, fixed width on desktop */}
        <div className="w-full md:w-[400px] md:pb-[0px] pb-[70px] md:pt-[70px] flex flex-col bg-card border-t md:border-t-0 md:border-l">
          <CardHeader className="border-b">
            <CardTitle className="text-lg md:text-xl">Current Order</CardTitle>
          </CardHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 md:p-6 border-b space-y-3 md:space-y-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Customer Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter customer name"
                          {...field}
                          className="font-bold"
                          data-testid="input-customer-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="08012345678"
                          {...field}
                          data-testid="input-customer-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-8 md:py-12 text-muted-foreground">
                    <p>No items added yet</p>
                    <p className="text-sm mt-2">Click on menu items to add them</p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const atMaxStock = item.menuItem.stockBalance !== null && 
                                      item.menuItem.stockBalance !== undefined && 
                                      item.quantity >= item.menuItem.stockBalance;
                    
                    return (
                    <Card key={item.menuItem.id} data-testid={`cart-item-${item.menuItem.id}`}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">{item.menuItem.name}</h4>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => item.menuItem.id && removeFromCart(item.menuItem.id)}
                            data-testid={`button-remove-${item.menuItem.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => item.menuItem.id && updateQuantity(item.menuItem.id, -1)}
                              data-testid={`button-decrease-${item.menuItem.id}`}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-medium" data-testid={`quantity-${item.menuItem.id}`}>
                              {item.quantity}
                            </span>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => item.menuItem.id && updateQuantity(item.menuItem.id, 1)}
                              disabled={atMaxStock}
                              title={atMaxStock ? `Maximum ${item.menuItem.stockBalance} portions available` : undefined}
                              data-testid={`button-increase-${item.menuItem.id}`}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <span className="font-semibold">
                            ₦{(parseFloat(item.menuItem.price) * item.quantity).toLocaleString()}
                          </span>
                        </div>
                        
                        {/* Stock warning */}
                        {atMaxStock && (
                          <div className="text-xs text-orange-600 font-medium">
                            ⚠️ Maximum stock reached ({item.menuItem.stockBalance} available)
                          </div>
                        )}

                        <Textarea
                          placeholder="Special instructions"
                          value={item.specialInstructions || ""}
                          onChange={(e) => item.menuItem.id && updateInstructions(item.menuItem.id, e.target.value)}
                          className="text-sm"
                          rows={1}
                          data-testid={`input-instructions-${item.menuItem.id}`}
                        />
                      </CardContent>
                    </Card>
                  )})
                )}
              </div>

              {/* Desktop submit section - hidden on mobile */}
              <div className="p-4 md:p-6 border-t space-y-3 md:space-y-4 hidden md:block">
                {/* Subtotal */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {/* Service Charges - Dynamic from API (only show if subtotal > 0) */}
                {subtotal > 0 && serviceCharges.map((charge) => (
                  <div key={charge.id} className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {charge.description}
                      {charge.type === 'percentage' ? ` (${charge.amount}%)` : ''}
                    </span>
                    <span>₦{calculateServiceChargeAmount(charge).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {/* Total */}
                <div className="flex items-center justify-between text-base md:text-xl border-t pt-3">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold" data-testid="text-total">
                    ₦{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearOrder}
                    disabled={cart.length === 0}
                    data-testid="button-clear"
                  >
                    Clear Order
                  </Button>
                  <Button
                    type="submit"
                    disabled={cart.length === 0}
                    data-testid="button-submit"
                  >
                    Proceed to Payment
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {/* Floating submit bar for mobile when cart has items - only visible on mobile */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 md:hidden z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">
                Subtotal: ₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                {subtotal > 0 && serviceCharges.length > 0 && (
                  <span> + Charges: ₦{serviceCharges.reduce((sum, charge) => sum + calculateServiceChargeAmount(charge), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                )}
              </div>
              <div className="font-semibold">Total: ₦{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-sm text-muted-foreground">{cart.length} item{cart.length !== 1 ? 's' : ''}</div>
            </div>
            <Button
              type="submit"
              data-testid="mobile-submit-button"
              onClick={(e) => {
                e.preventDefault();
                form.handleSubmit(onSubmit)();
              }}
            >
              Proceed to Payment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
