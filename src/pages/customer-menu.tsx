import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  MapPin,
  QrCode,
  Search,
  ChevronDown,
  ChefHat,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import type { MenuItem } from "@shared/schema";
import heroImage from "@assets/generated_images/Nigerian_cuisine_hero_image_337661c0.png";
import { queryClient } from "@/lib/queryClient";
import { SEO } from "@/components/SEO";
import { useCart } from "@/context/CartContext";
import { apiRequest } from "@/lib/queryClient";

export default function CustomerMenu() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { cart, addToCart: addToCartContext, updateQuantity: updateQuantityContext, removeFromCart, clearCart, updateSpecialInstructions } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cartOpen, setCartOpen] = useState(false);
  const [locationData, setLocationData] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Kitchen status state
  const [kitchenStatus, setKitchenStatus] = useState<{ isOpen: boolean }>({ isOpen: true });

  // Initialize and refresh menu data on component mount
  useEffect(() => {
    // Force refresh the menu data when component mounts to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ["/api/menu/all"] });
  }, []);

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
  }, []);

  // WebSocket connection for real-time menu updates
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("Customer Menu WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "menu_item_update") {
        // Refresh menu data when items are updated
        queryClient.invalidateQueries({ queryKey: ["/api/menu/all"] });
      } else if (
        data.type === "order_update" ||
        data.type === "new_order" ||
        data.type === "order_status_change"
      ) {
        // Refresh active orders when there are changes
        queryClient.invalidateQueries({
          queryKey: ["/api/orders/active/customer"],
        });
      }
    };

    socket.onerror = (error) => {
      console.error("Customer Menu WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("Customer Menu WebSocket disconnected");
    };

    // Cleanup function to close the WebSocket connection
    return () => {
      socket.close();
    };
  }, []);
  const [showQRCode, setShowQRCode] = useState(false);

  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/all"],
  });

  // Extract unique categories from menu items
  const categories = menuItems
    ? ["All", ...Array.from(new Set(menuItems.map(item => item.category)))]
    : ["All"];

  console.log("Available categories:", categories); // Debug log

  // Use loading state from menu only
  const isLoading = menuLoading;

  const filteredItems = menuItems?.filter(
    (item) =>
      // Show all items (including unavailable) - they will show as "sold out"
      (selectedCategory === "All" || item.category === selectedCategory) &&
      (searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()))
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
    
    // Prevent adding unavailable items to cart
    if (!menuItem.available) {
      toast({
        title: "Item Unavailable",
        description: `${menuItem.name} is currently sold out.`,
        variant: "destructive",
        duration: 2000,
      });
      return;
    }
    
    // Check stock balance
    if (menuItem.stockBalance !== null && menuItem.stockBalance !== undefined && menuItem.stockBalance <= 0) {
      toast({
        title: "Out of Stock",
        description: `${menuItem.name} is currently out of stock.`,
        variant: "destructive",
        duration: 2000,
      });
      return;
    }
    
    // Check if adding would exceed available stock
    const currentInCart = cart.find(item => String(item.menuItem.id) === String(menuItem.id))?.quantity || 0;
    if (menuItem.stockBalance !== null && menuItem.stockBalance !== undefined) {
      if (currentInCart >= menuItem.stockBalance) {
        toast({
          title: "Maximum Quantity Reached",
          description: `Only ${menuItem.stockBalance} portion${menuItem.stockBalance !== 1 ? 's' : ''} available. You already have ${currentInCart} in your cart.`,
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
    }
    
    addToCartContext({ menuItem: menuItem as any });
    toast({
      title: "Added to Cart",
      description: `${menuItem.name} has been added to your cart.`,
      duration: 1000,
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    const item = cart.find(item => item.menuItem.id === menuItemId);
    if (item) {
      const newQuantity = item.quantity + delta;
      
      // If decreasing, allow it
      if (delta < 0) {
        if (newQuantity <= 0) {
          removeFromCart(menuItemId);
        } else {
          updateQuantityContext(menuItemId, newQuantity);
        }
        return;
      }
      
      // If increasing, check stock availability
      const menuItem = menuItems?.find(m => String(m.id) === String(menuItemId));
      if (menuItem && menuItem.stockBalance !== null && menuItem.stockBalance !== undefined) {
        if (newQuantity > menuItem.stockBalance) {
          toast({
            title: "Maximum Quantity Reached",
            description: `Only ${menuItem.stockBalance} portion${menuItem.stockBalance !== 1 ? 's' : ''} available for ${menuItem.name}.`,
            variant: "destructive",
            duration: 3000,
          });
          return;
        }
      }
      
      updateQuantityContext(menuItemId, newQuantity);
    }
  };

  const updateInstructions = (menuItemId: string, instructions: string) => {
    updateSpecialInstructions(menuItemId, instructions);
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + parseFloat(item.menuItem.price) * item.quantity,
    0
  );

  const checkLocation = () => {
    setLocationLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Reverse geocode to get address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();

          const address =
            data.display_name ||
            `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

          const locationInfo = { latitude, longitude, address };
          setLocationData(locationInfo);

          // Store location in localStorage
          localStorage.setItem("location", JSON.stringify(locationInfo));

          // Show success message
          toast({
            title: "Location Detected",
            description: address,
          });
        } catch (error) {
          console.error("Error getting address:", error);
          // If reverse geocoding fails, still store coordinates
          const locationInfo = {
            latitude,
            longitude,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          };
          setLocationData(locationInfo);
          localStorage.setItem("location", JSON.stringify(locationInfo));
          toast({
            title: "Location Detected",
            description: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          });
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        let errorMessage = "";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location access denied. Please allow location access in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "The request to get location timed out.";
            break;
          default:
            errorMessage = "An unknown error occurred.";
            break;
        }
        setLocationError(errorMessage);
        setLocationLoading(false);
      }
    );
  };

  const handleCheckout = () => {
    // Store location info in localStorage if available
    if (locationData) {
      localStorage.setItem("location", JSON.stringify(locationData));
    }

    setLocation("/checkout");
  };

  return (
    <>
      <SEO
        title="Home - Order Authentic Nigerian Cuisine Online"
        description="Browse our menu of delicious Nigerian dishes. Order jollof rice, suya, pounded yam, egusi soup, pepper soup, fried rice and more. Fast online ordering with pickup service. Fresh meals prepared daily."
        keywords="Nigerian food menu, order jollof rice online, suya delivery, Nigerian restaurant menu, African food online, pounded yam, egusi soup, order Nigerian food, online food ordering"
        ogUrl="https://nibbleskitchen.netlify.app/"
        canonicalUrl="https://nibbleskitchen.netlify.app/"
      />
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
        
        {/* Hero Section */}
      <section className="relative h-[40vh] xs:h-[45vh] sm:h-[50vh] md:h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Nibbles"
            className="w-full h-full object-cover object-center"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto w-full">
          {/* Brand Taglines */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6 mb-6 sm:mb-8">
            {/* Main Tagline */}
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight drop-shadow-2xl">
              <span className="block mb-2">Fast. Premium. Affordable.</span>
            </h1>
            
            {/* Secondary Tagline */}
            <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white/95 font-semibold drop-shadow-lg">
              Quality food that moves fast.
            </p>
            
            {/* Call to Action Tagline */}
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/90 font-medium drop-shadow-md">
              Eat more. Pay less. Move on.
            </p>
          </div>
        </div>
      </section>

      {/* Category Navigation and Search */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 py-2 sm:py-3">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 text-sm py-2 sm:py-3"
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto min-w-0">
              <div className="flex gap-1 sm:gap-2">
                {(categories || ["All"]).map((category: string) => (
                  <Badge
                    key={category}
                    variant={
                      selectedCategory === category ? "default" : "secondary"
                    }
                    className="cursor-pointer whitespace-nowrap px-2 sm:px-3 py-1 text-xs sm:py-1.5 hover-elevate"
                    onClick={() => setSelectedCategory(category)}
                    data-testid={`filter-${category
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-1 sm:gap-2">
              <Button
                size="icon"
                variant="default"
                className="relative shrink-0"
                onClick={() => setCartOpen(true)}
                data-testid="button-cart"
              >
                <ShoppingCart className="w-4 h-4" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[0.5rem] flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-1.5 sm:space-y-2">
            {/* Search Bar - Full width on mobile */}
            <div className="relative w-full">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 sm:pl-8 text-xs py-1.5"
                data-testid="input-search-mobile"
              />
            </div>

            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              {/* Scrollable Category Buttons */}
              <div className="flex-1 overflow-x-auto -mx-3 px-3 mr-[1px]">
                <div className="flex gap-1.5 sm:gap-2 w-max">
                  {(categories || ["All"]).map((category: string) => (
                    <Badge
                      key={category}
                      variant={
                        selectedCategory === category ? "default" : "secondary"
                      }
                      className="cursor-pointer whitespace-nowrap px-2 py-1 text-xs hover-elevate flex-shrink-0 min-w-[50px]"
                      onClick={() => setSelectedCategory(category)}
                      data-testid={`filter-mobile-${category
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Cart Button */}
              <Button
                size="icon"
                variant="default"
                className="relative shrink-0 ml-1"
                onClick={() => setCartOpen(true)}
                aria-label="Open cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center font-bold">
                    {cart.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <section id="menu" className="max-w-7xl mx-auto px-3 xs:px-4 py-4 sm:py-6">
        <h2 className="font-serif text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold mb-3 sm:mb-4">Our Menu</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-square bg-muted animate-pulse" />
                <CardContent className="p-2.5 sm:p-3.5">
                  <div className="h-3.5 sm:h-4 bg-muted rounded animate-pulse mb-1.5 sm:mb-2" />
                  <div className="h-2.5 sm:h-3 bg-muted rounded animate-pulse mb-2.5 sm:mb-3" />
                  <div className="h-5 sm:h-6 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {filteredItems?.map((item) => {
              const isInCart = cart.some(
                (cartItem) => String(cartItem.menuItem.id) === String(item.id)
              );
              const cartItem = cart.find((cartItem) => String(cartItem.menuItem.id) === String(item.id));
              const canAddMore = item.stockBalance === null || item.stockBalance === undefined || 
                                 (cartItem ? cartItem.quantity < item.stockBalance : true);
              return (
                <Card
                  key={item.id}
                  className={`overflow-hidden hover-elevate transition-all ${
                    isInCart ? "ring-2 ring-primary" : ""
                  }`}
                  data-testid={`card-menu-item-${item.id}`}
                >
                  <div className="aspect-square overflow-hidden relative">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className={`w-full h-full object-cover ${!item.available ? 'opacity-60' : ''}`}
                    />
                    {/* Out of Stock Overlay - Using stockBalance */}
                    {(!item.available || (item.stockBalance !== null && item.stockBalance !== undefined && item.stockBalance <= 0)) && (
                      <div className="absolute inset-0 bg-primary/90 flex items-center justify-center">
                        <Badge variant="default" className="text-sm sm:text-base font-bold bg-primary text-white px-4 py-2 shadow-lg">
                          Out of Stock
                        </Badge>
                      </div>
                    )}
                    {/* Low Stock Badge */}
                    {item.available && item.stockBalance !== null && item.stockBalance !== undefined && item.stockBalance > 0 && item.stockBalance <= 3 && (
                      <div className="absolute top-2 left-2 bg-orange-500 text-white rounded-md px-2 py-1 text-xs font-semibold shadow-md">
                        Only {item.stockBalance} left!
                      </div>
                    )}
                    {isInCart && item.available && (item.stockBalance === null || item.stockBalance === undefined || item.stockBalance > 0) && (
                      <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs font-semibold">
                        {cartItem?.quantity}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2.5 sm:p-3 space-y-1.5 sm:space-y-2">
                    <div>
                      <h3 className="text-sm font-semibold mb-0.5 sm:mb-1">
                        {item.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    
                    {/* Stock Balance Info for Customer */}
                    {item.stockBalance !== null && item.stockBalance !== undefined && item.stockBalance > 0 && item.stockBalance <= 5 && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className={`font-medium ${
                          item.stockBalance <= 2 ? 'text-red-600' : 'text-orange-600'
                        }`}>
                          ⚡ Only {item.stockBalance} portion{item.stockBalance !== 1 ? 's' : ''} left
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">
                        ₦{parseFloat(item.price).toLocaleString()}
                      </span>
                      {isInCart ? (
                        <div className="flex items-center gap-1 border rounded-lg">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => item.id && updateQuantity(String(item.id), -1)}
                            data-testid={`button-minus-${item.id}`}
                            className="h-5 sm:h-6 w-5 sm:w-6 p-0 text-xs"
                          >
                            <Minus className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                          </Button>
                          <span className="font-semibold min-w-[14px] sm:min-w-[16px] text-center text-xs">
                            {cartItem?.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => item.id && updateQuantity(String(item.id), 1)}
                            disabled={!item.available || (item.stockBalance !== null && item.stockBalance !== undefined && item.stockBalance <= 0) || !canAddMore}
                            data-testid={`button-plus-${item.id}`}
                            className="h-5 sm:h-6 w-5 sm:w-6 p-0 text-xs"
                            title={!canAddMore ? `Maximum ${item.stockBalance} portions available` : ''}
                          >
                            <Plus className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => addToCart(item)}
                          disabled={!item.available || (item.stockBalance !== null && item.stockBalance !== undefined && item.stockBalance <= 0)}
                          data-testid={`button-add-${item.id}`}
                          className="text-xs px-2 py-1.5"
                        >
                          <Plus className="w-2.5 h-2.5 mr-1" />
                          {(item.available && (item.stockBalance === null || item.stockBalance === undefined || item.stockBalance > 0)) ? 'Add' : 'Out of Stock'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Cart Sidebar */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          <div className="w-full max-w-[95vw] md:max-w-md bg-background border-l flex flex-col">
            <div className="p-3 sm:p-4 border-b flex items-center justify-between">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">Your Cart</h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCartOpen(false)}
                data-testid="button-close-cart"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Your cart is empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <Card
                    key={item.menuItem.id}
                    data-testid={`cart-item-${item.menuItem.id}`}
                  >
                    <CardContent className="p-2.5 sm:p-3 space-y-2">
                      <div className="flex gap-2">
                        <img
                          src={item.menuItem.imageUrl}
                          alt={item.menuItem.name}
                          className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">
                            {item.menuItem.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            ₦{parseFloat(item.menuItem.price).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => item.menuItem.id && removeFromCart(item.menuItem.id)}
                          data-testid={`button-remove-${item.menuItem.id}`}
                          className="h-7 sm:h-8 w-7 sm:w-8"
                        >
                          <X className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => item.menuItem.id && updateQuantity(item.menuItem.id, -1)}
                          data-testid={`button-decrease-${item.menuItem.id}`}
                          className="h-7 sm:h-8 w-7 sm:w-8 p-1"
                        >
                          <Minus className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                        </Button>
                        <span
                          className="w-7 sm:w-8 text-center font-medium text-sm"
                          data-testid={`quantity-${item.menuItem.id}`}
                        >
                          {item.quantity}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => item.menuItem.id && updateQuantity(item.menuItem.id, 1)}
                          data-testid={`button-increase-${item.menuItem.id}`}
                          className="h-7 sm:h-8 w-7 sm:w-8 p-1"
                        >
                          <Plus className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                        </Button>
                      </div>

                      <Textarea
                        placeholder="Special instructions (optional)"
                        value={item.specialInstructions || ""}
                        onChange={(e) =>
                          item.menuItem.id && updateInstructions(item.menuItem.id, e.target.value)
                        }
                        className="text-xs py-1.5"
                        rows={2}
                        data-testid={`input-instructions-${item.menuItem.id}`}
                      />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-3 sm:p-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm sm:text-base">Subtotal</span>
                  <span className="font-bold text-sm sm:text-base" data-testid="text-subtotal">
                    ₦
                    {subtotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <Button
                  size="sm"
                  className="w-full text-xs sm:text-sm py-2"
                  onClick={handleCheckout}
                  data-testid="button-checkout"
                >
                  Proceed to Checkout
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {/* {showQRCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-full mx-auto border">
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-3 right-3"
              onClick={() => setShowQRCode(false)}
              data-testid="button-close-qr-modal"
            >
              <X className="w-5 h-5" />
            </Button>
            
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-3">Scan to Share Menu</h3>
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-white border rounded-lg">
                  <QRCodeSVG 
                    value={window.location.origin} 
                    size={180}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2 text-center">
                Scan this QR code with your phone's camera or access from other devices:
              </p>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md mb-4">
                <p className="mb-1"><strong>Note:</strong> To access from other devices:</p>
                <p className="mb-1">1. Ensure devices are on the same network</p>
                <p className="mb-1">2. Run dev server with: <code className="font-mono bg-gray-200 p-0.5 rounded">npm run dev</code></p>
                <p className="mt-1">The QR code contains the correct IP address for your network.</p>
              </div>
              <Button 
                onClick={() => navigator.clipboard && navigator.clipboard.writeText(window.location.origin)}
                variant="outline"
                className="w-full"
              >
                Copy Link
              </Button>
            </div>
          </div>
        </div>
      )} */}
      </div>
    </>
  );
}
