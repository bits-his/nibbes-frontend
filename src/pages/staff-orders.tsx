import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Minus, X, ChefHat, AlertCircle, Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MenuItem, CartItem } from "@shared/schema";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { getWebSocketUrl } from "@/lib/websocket";

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

// PERFORMANCE FIX: Custom debounce hook
const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

// PERFORMANCE FIX: Move priority map outside component (created only once)
const ITEM_PRIORITY_MAP = new Map<string, number>([
  ['beef philadelphia', 1],
  ['chicken philadelphia', 2],
  ['beef loaded fries', 3],
  ['chicken loaded fries', 4],
  ['beef shawarma', 5],
  ['chicken shawarma', 6],
  ['beef burger', 7],
  ['chicken burger', 8],
  ['oriental rice, charcoal grilled chicken and coleslaw', 9],
  ['signature rice, charcoal grilled chicken and coleslaw', 10],
  ['smokey jollof rice, charcoal grilled chicken and coleslaw', 11],
  ['creamy wings', 12],
  ['beef kofta wrap', 13],
  ['chicken kofta wrap', 14],
  ['meat pie', 15],
  ['french fries and ketchup', 16],
]);

// PERFORMANCE FIX: Optimized sorting function (O(n log n) instead of O(n²))
const sortByItemPriority = (items: MenuItem[]): MenuItem[] => {
  return [...items].sort((a, b) => {
    const aName = a.name.toLowerCase().trim();
    const bName = b.name.toLowerCase().trim();
    const aPriority = ITEM_PRIORITY_MAP.get(aName) ?? 999;
    const bPriority = ITEM_PRIORITY_MAP.get(bName) ?? 999;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    return 0;
  });
};

// PERFORMANCE FIX: Memoized Menu Item Card Component
interface MenuItemCardProps {
  item: MenuItem;
  isInCart: boolean;
  cartQuantity: number;
  onAddToCart: (item: MenuItem) => void;
  onUpdateQuantity: (id: number, delta: number) => void;
  kitchenOpen: boolean;
}

const MenuItemCard = memo<MenuItemCardProps>(({ 
  item, 
  isInCart, 
  cartQuantity,
  onAddToCart,
  onUpdateQuantity,
  kitchenOpen 
}) => {
  // Determine if item is SOLD OUT or UNAVAILABLE
  const isOutOfStock = (item.stockBalance !== null && item.stockBalance !== undefined)
    ? item.stockBalance <= 0
    : !item.available;
  
  // Check if item is manually disabled
  const isUnavailable = !item.available;
  
  const isLowStock = item.stockBalance !== null && item.stockBalance !== undefined && item.stockBalance > 0 && item.stockBalance <= 3;
  const canAddMore = !isOutOfStock && !isUnavailable && (item.stockBalance === null || item.stockBalance === undefined || cartQuantity < item.stockBalance);
  
  const handleClick = useCallback(() => {
    if (canAddMore && kitchenOpen) {
      onAddToCart(item);
    }
  }, [canAddMore, kitchenOpen, onAddToCart, item]);
  
  const handleIncrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.id !== undefined) {
      onUpdateQuantity(item.id, 1);
    }
  }, [item.id, onUpdateQuantity]);
  
  const handleDecrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.id !== undefined) {
      onUpdateQuantity(item.id, -1);
    }
  }, [item.id, onUpdateQuantity]);
  
  return (
    <Card
      className={`overflow-hidden hover-elevate cursor-pointer transition-all ${isInCart ? 'ring-2 ring-primary' : ''} ${(isOutOfStock || isUnavailable) ? 'opacity-75' : ''}`}
      onClick={handleClick}
      data-testid={`card-menu-item-${item.id}`}
    >
      <div className="aspect-video overflow-hidden relative">
        <ImageWithSkeleton
          src={item.imageUrl || ''}
          alt={item.name}
          containerClassName="w-full h-full"
        />
        {isInCart && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5 md:p-1 z-10">
            <Plus className="w-3 h-3 md:w-4 md:h-4" />
          </div>
        )}
        {/* Show UNAVAILABLE if manually disabled */}
        {isUnavailable && (
          <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center z-10">
            <span className="text-white font-bold text-sm md:text-lg px-2 py-1 md:px-4 md:py-2 rounded-lg bg-gray-800/70 shadow-lg border-2 border-white">
              UNAVAILABLE
            </span>
          </div>
        )}
        {/* Show SOLD OUT if no stock */}
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
              onClick={handleDecrement}
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
              onClick={handleIncrement}
              disabled={!canAddMore}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if these specific props change
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.stockBalance === nextProps.item.stockBalance &&
    prevProps.item.available === nextProps.item.available &&
    prevProps.isInCart === nextProps.isInCart &&
    prevProps.cartQuantity === nextProps.cartQuantity &&
    prevProps.kitchenOpen === nextProps.kitchenOpen
  );
});

MenuItemCard.displayName = 'MenuItemCard';

export default function StaffOrders() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedCartItem, setExpandedCartItem] = useState<number | null>(null);
  
  // PERFORMANCE FIX: Debounce search query (300ms delay)
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  
  // Network status for adaptive loading
  const networkStatus = useNetworkStatus();
  
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

  // PERFORMANCE FIX: Fetch menu items with better caching and no unnecessary refetches
  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/all"],
    staleTime: 0, // Always consider data stale for real-time updates
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true,        // Refetch on component mount
  });

  // Fetch categories from API
  const { data: categoriesData } = useQuery<string[]>({
    queryKey: ["/api/menu/categories"],
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Add "All" to the beginning of categories (memoized)
  const categories = useMemo(() => {
    return ["All", ...(categoriesData || [])];
  }, [categoriesData]);

  // PERFORMANCE FIX: Filter items with debounced search (memoized)
  const filteredItems = useMemo(() => {
    if (!menuItems) return [];
    
    const filtered = menuItems.filter(
      (item) => {
        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
        const matchesSearch = debouncedSearchQuery === "" || 
          item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
        
        return matchesCategory && matchesSearch;
      }
    );

    // Sort: Priority items first (only when viewing "All" categories)
    return selectedCategory === "All" ? sortByItemPriority(filtered) : filtered;
  }, [menuItems, selectedCategory, debouncedSearchQuery]);

  // PERFORMANCE FIX: Infinite scroll with increased items per load for desktop
  const {
    displayedItems: visibleItems,
    hasMore,
    isLoading: isLoadingMore,
    loadMore,
    reset: resetPagination,
    sentinelRef,
  } = useInfiniteScroll(filteredItems, {
    itemsPerLoad: networkStatus.isSlow ? 8 : 24, // ✅ INCREASED from 16 to 24 for desktop
    threshold: 300,
    enabled: true,
  });

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [selectedCategory, debouncedSearchQuery, resetPagination]);

  const addToCart = useCallback((menuItem: MenuItem) => {
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
    
    // Check if item is SOLD OUT
    if (menuItem.stockBalance !== null && menuItem.stockBalance !== undefined && menuItem.stockBalance <= 0) {
      toast({
        title: "SOLD OUT",
        description: `${menuItem.name} is currently SOLD OUT.`,
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
  }, [kitchenStatus.isOpen, cart, toast]);

  const updateQuantity = useCallback((menuItemId: number, delta: number) => {
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
  }, [toast]);

  const removeFromCart = useCallback((menuItemId: number) => {
    setCart((prev) => prev.filter((item) => item.menuItem.id !== menuItemId));
  }, []);

  const updateInstructions = useCallback((menuItemId: number, instructions: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.menuItem.id === menuItemId
          ? { ...item, specialInstructions: instructions }
          : item
      )
    );
  }, []);

  const subtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + parseFloat(item.menuItem.price) * item.quantity,
      0
    );
  }, [cart]);
  
  // Calculate total with service charges
  const calculateTotal = useCallback(() => {
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
  }, [subtotal, serviceCharges]);
  
  // Helper function to calculate individual service charge amounts
  const calculateServiceChargeAmount = useCallback((charge: ServiceCharge) => {
    const amount = typeof charge.amount === 'string' ? parseFloat(charge.amount) : charge.amount
    if (charge.type === 'percentage') {
      return (subtotal * (amount / 100))
    }
    return amount
  }, [subtotal]);
  
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
        setKitchenStatus({ isOpen: true })
      }
    }
    
    fetchKitchenStatus()
    // Poll kitchen status every 30 seconds
    const interval = setInterval(fetchKitchenStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleProceedToCheckout = useCallback(() => {
    if (!kitchenStatus.isOpen) {
      toast({
        title: "Kitchen is Closed",
        description: "The kitchen is currently closed. Please try again later.",
        variant: "destructive",
      })
      return
    }
    
    localStorage.setItem('pendingWalkInOrder', JSON.stringify({
      customerName: form.getValues('customerName'),
      customerPhone: form.getValues('customerPhone'),
      total: calculateTotal(),
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
    setLocation('/staff/checkout');
  }, [kitchenStatus.isOpen, form, calculateTotal, cart, setLocation]);

  // F1 keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const isF1 = event.key === 'F1' || event.key === 'f1';
      const isMac = event.metaKey;
      const isWindows = event.ctrlKey;
      
      if (isF1 && cart.length > 0 && (isMac || isWindows || !event.metaKey && !event.ctrlKey)) {
        event.preventDefault();
        if (!kitchenStatus.isOpen) {
          toast({
            title: "Kitchen is Closed",
            description: "The kitchen is currently closed. Please try again later.",
            variant: "destructive",
          });
          return;
        }
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
  }, [cart, form, handleProceedToCheckout, kitchenStatus.isOpen, toast]);

  const onSubmit = useCallback((values: OrderFormValues) => {
    if (cart.length === 0) {
      toast({
        title: "Empty Order",
        description: "Please add items to the order.",
        variant: "destructive",
      });
      return;
    }

    handleProceedToCheckout();
  }, [cart.length, handleProceedToCheckout, toast]);

  const handleClearOrder = useCallback(() => {
    setCart([]);
    form.reset();
  }, [form]);

  // PERFORMANCE FIX: Optimized WebSocket connection - only invalidate when necessary
  useEffect(() => {
    const wsUrl = getWebSocketUrl();
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("✅ Staff Orders WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 [Staff Orders] WebSocket message received:', data.type, data);
      
      // PERFORMANCE FIX: Only invalidate menu when menu items actually change
      if (data.type === "menu_item_update" || data.type === "inventory_update" || data.type === "stock_movement") {
        console.log("🔄 Menu/Stock updated - refreshing menu items");
        // Force refetch by invalidating and refetching immediately
        queryClient.invalidateQueries({ queryKey: ["/api/menu/all"] });
        queryClient.refetchQueries({ queryKey: ["/api/menu/all"] });
        queryClient.invalidateQueries({ queryKey: ["/api/menu/categories"] });
      } 
      // ✅ FIXED: Don't invalidate menu on order updates (orders don't affect menu)
      else if (
        data.type === "order_update" || 
        data.type === "new_order" || 
        data.type === "order_status_change"
      ) {
        console.log("📦 Order updated - refreshing orders only (not menu)");
        // Only refresh orders, not menu items
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      } 
      else if (data.type === "service-charges-updated") {
        window.dispatchEvent(new CustomEvent('service-charges-updated', { detail: data.charges }));
      } 
      else if (data.type === "order_cancelled_notification") {
        console.log('📢 [Staff Orders] Received order_cancelled_notification:', data);
        
        const userRole = user?.role || '';
        const targetRoles = data.targetRoles || ['admin', 'staff', 'cashier', 'kitchen'];
        
        if (userRole && targetRoles.includes(userRole)) {
          console.log('✅ [Staff Orders] Showing cancellation notification');
          toast({
            title: "🚫 Order Cancelled",
            description: data.message || `Order #${data.orderNumber} has been cancelled`,
            duration: 5000,
          });
          
          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
          queryClient.invalidateQueries({ queryKey: ["/api/menu/all"] });
        }
      }
    };

    socket.onerror = (error) => {
      console.error("❌ Staff Orders WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("🔌 Staff Orders WebSocket disconnected");
    };

    return () => {
      socket.close();
    };
  }, [user, toast]);

  return (
    <div className="min-h-screen bg-background">
      {/* Kitchen Closed Banner */}
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

      {/* Network Status Indicator */}
      {networkStatus.isSlow && (
        <div className="bg-orange-50 dark:bg-orange-950 border-b border-orange-200 dark:border-orange-800 py-1 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs text-orange-700 dark:text-orange-300">
            <Wifi className="w-3 h-3" />
            <span>Slow network detected - Optimizing for faster loading</span>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row h-auto md:h-screen overflow-hidden">
        {/* Menu Section */}
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
              {searchQuery !== debouncedSearchQuery && (
                <p className="text-xs text-muted-foreground mt-1">Searching...</p>
              )}
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
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {(visibleItems || []).map((item) => {
                    const cartItem = cart.find(c => c.menuItem.id === item.id);
                    return (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        isInCart={!!cartItem}
                        cartQuantity={cartItem?.quantity || 0}
                        onAddToCart={addToCart}
                        onUpdateQuantity={updateQuantity}
                        kitchenOpen={kitchenStatus.isOpen}
                      />
                    );
                  })}
                </div>
                
                {/* Infinite Scroll Sentinel */}
                {hasMore && (
                  <>
                    <div ref={sentinelRef} className="h-4" aria-hidden="true" />
                    {isLoadingMore && (
                      <div className="flex justify-center py-4">
                        <div className="text-sm text-muted-foreground">Loading more items...</div>
                      </div>
                    )}
                    {!isLoadingMore && (
                      <div className="flex justify-center py-4">
                        <Button
                          variant="outline"
                          onClick={loadMore}
                          className="w-full max-w-xs"
                        >
                          Load More Items
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Cart Section */}
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
                          id="customer-phone"
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

              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {cart.length === 0 ? (
                  <div className="text-center py-8 md:py-12 text-muted-foreground">
                    <p>No items added yet</p>
                    <p className="text-sm mt-2">Click on menu items to add them</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    {cart.map((item) => (
                      <Card
                        key={item.menuItem.id}
                        data-testid={`cart-item-${item.menuItem.id}`}
                        className="border-border/50 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer relative"
                        onClick={() => item.menuItem.id !== undefined && setExpandedCartItem(item.menuItem.id)}
                      >
                        <CardContent className="p-0 relative">
                          <div className="absolute top-1.5 left-1.5 right-1.5 z-10 flex justify-between items-start">
                            <div className="bg-[#4EB5A4] text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-bold shadow-md">
                              {item.quantity}
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                item.menuItem.id && removeFromCart(item.menuItem.id);
                              }}
                              className="h-5 w-5 sm:h-6 sm:w-6 bg-destructive/90 hover:bg-destructive text-white rounded-full p-0"
                              aria-label={`Remove ${item.menuItem.name} from cart`}
                            >
                              <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </Button>
                          </div>
                          <ImageWithSkeleton
                            src={item.menuItem.imageUrl || ''}
                            alt={item.menuItem.name || 'Menu item'}
                            className="w-full aspect-square object-cover"
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop submit section */}
              <div className="p-4 md:p-6 border-t space-y-3 md:space-y-4 hidden md:block">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {subtotal > 0 && serviceCharges.map((charge) => (
                  <div key={charge.id} className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {charge.description}
                      {charge.type === 'percentage' ? ` (${charge.amount}%)` : ''}
                    </span>
                    <span>₦{calculateServiceChargeAmount(charge).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
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

      {/* Floating submit bar for mobile */}
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

      {/* Cart Item Detail Modal */}
      <Dialog open={!!expandedCartItem} onOpenChange={(open) => !open && setExpandedCartItem(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md p-0 gap-0 overflow-hidden">
          {expandedCartItem && (() => {
            const item = cart.find(i => i.menuItem.id !== undefined && i.menuItem.id === expandedCartItem);
            if (!item) return null;
            
            const atMaxStock = item.menuItem.stockBalance !== null && 
                              item.menuItem.stockBalance !== undefined && 
                              item.quantity >= item.menuItem.stockBalance;
            
            return (
              <div className="flex flex-col">
                <div className="relative w-full bg-gradient-to-br from-muted to-muted/50 flex-shrink-0 overflow-hidden">
                  <div className="aspect-[5/2]">
                    <ImageWithSkeleton
                      src={item.menuItem.imageUrl || ''}
                      alt={item.menuItem.name || 'Menu item'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setExpandedCartItem(null)}
                    className="absolute top-2 right-2 h-7 w-7 bg-white/90 hover:bg-white text-foreground rounded-full shadow-lg"
                    aria-label="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="flex flex-col p-4">
                  <div className="mb-3">
                    <h2 className="text-base sm:text-lg font-bold text-foreground mb-1.5 leading-tight line-clamp-2">
                      {item.menuItem.name}
                    </h2>
                    <span className="text-xl sm:text-2xl font-bold text-[#4EB5A4]">
                      ₦{parseFloat(item.menuItem.price).toLocaleString()}
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between p-3 bg-gradient-to-br from-[#4EB5A4]/10 to-[#4EB5A4]/5 border border-[#4EB5A4]/20 rounded-lg">
                      <span className="text-sm font-semibold text-foreground">Quantity</span>
                      <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => item.menuItem.id && updateQuantity(item.menuItem.id, -1)}
                          className="h-8 w-8 hover:bg-red-50 hover:text-destructive rounded-md"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <span className="w-8 text-center font-bold text-lg">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => item.menuItem.id && updateQuantity(item.menuItem.id, 1)}
                          disabled={atMaxStock}
                          title={atMaxStock ? `Maximum ${item.menuItem.stockBalance} portions available` : undefined}
                          className="h-8 w-8 hover:bg-[#4EB5A4]/10 hover:text-[#4EB5A4] rounded-md disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    {atMaxStock && (
                      <div className="mt-2 text-xs text-orange-600 font-medium bg-orange-50 p-2 rounded-lg">
                        ⚠️ Max stock: {item.menuItem.stockBalance}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-3 pb-3 border-b">
                    <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
                    <span className="text-lg font-bold text-[#4EB5A4]">
                      ₦{(parseFloat(item.menuItem.price) * item.quantity).toLocaleString()}
                    </span>
                  </div>

                  <div className="mb-3">
                    <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                      <ChefHat className="w-3.5 h-3.5 text-[#4EB5A4]" />
                      <span>Special Instructions</span>
                      <Badge variant="secondary" className="text-xs">Optional</Badge>
                    </label>
                    <Textarea
                      placeholder="Any special requests?"
                      value={item.specialInstructions || ""}
                      onChange={(e) =>
                        item.menuItem.id && updateInstructions(item.menuItem.id, e.target.value)
                      }
                      className="text-sm resize-none h-16 focus:ring-1 focus:ring-[#4EB5A4]/30 rounded-lg"
                      rows={2}
                    />
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      item.menuItem.id && removeFromCart(item.menuItem.id);
                      setExpandedCartItem(null);
                    }}
                    className="w-full h-9 text-sm font-medium border border-destructive/30 text-destructive hover:bg-destructive hover:text-white rounded-lg"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Remove from Cart
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
