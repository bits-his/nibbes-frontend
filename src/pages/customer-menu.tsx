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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import type { MenuItem, CartItem } from "@shared/schema";
import heroImage from "@assets/generated_images/Nigerian_cuisine_hero_image_337661c0.png";
import { queryClient } from "@/lib/queryClient";

export default function CustomerMenu() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>(() => {
    // Load cart from localStorage on initial render
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("cart");
      return savedCart ? JSON.parse(savedCart) : [];
    }
    return [];
  });
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
      item.available && // Only show available items to customers
      (selectedCategory === "All" || item.category === selectedCategory) &&
      (searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify(cart));
    }
  }, [cart]);

  const addToCart = (menuItem: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.menuItem.id === menuItem.id);
      if (existing) {
        toast({
          title: "Quantity Increased",
          description: `${menuItem.name} quantity increased in cart.`,
          duration: 1000, // 3 seconds
        });
        return prev.map((item) =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      toast({
        title: "Added to Cart",
        description: `${menuItem.name} has been added to your cart.`,
        duration: 1000, // 3 seconds
      });
      return [...prev, { menuItem, quantity: 1 }];
    });
  };

  const updateQuantity = (menuItemId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.menuItem.id === menuItemId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
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
          alert(`Location detected: ${address}`);
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
          alert(
            `Location detected: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          );
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
    <div className="min-h-screen bg-background">
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
          <h1 className="font-serif text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2 sm:mb-3 leading-tight">
            Order Fresh from Nibbles
          </h1>
          <p className="text-xs xs:text-sm sm:text-base md:text-lg text-white/90 mb-3 sm:mb-4">
            Authentic Nigerian cuisine delivered to your table
          </p>

          {/* Location Section */}
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 rounded-lg bg-white/10 backdrop-blur-sm max-w-xs xs:max-w-sm mx-auto w-full">
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              {locationData ? (
                <div className="text-center w-full">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <MapPin className="w-3 h-3 xs:w-4 xs:h-4 text-green-400" />
                    <span className="text-white font-medium text-xs xs:text-sm">Location Set</span>
                  </div>
                  <p className="text-white/80 text-xs xs:text-sm line-clamp-2">
                    {locationData.address}
                  </p>
                </div>
              ) : (
                <p className="text-white/80 text-xs xs:text-sm w-full text-center">
                  Help us locate you for delivery
                </p>
              )}

              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs py-1 sm:py-1.5"
                onClick={checkLocation}
                disabled={locationLoading}
                data-testid="button-check-location"
              >
                {locationLoading ? (
                  <>
                    <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Detecting...
                  </>
                ) : (
                  <>
                    <MapPin className="w-3 h-3 mr-1" />
                    {locationData ? "Update Location" : "Check My Location"}
                  </>
                )}
              </Button>

              {locationError && (
                <p className="text-red-300 text-xs text-center mt-1">
                  {locationError}
                </p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="default"
            className="text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-3 backdrop-blur-md bg-white/20 border-2 border-white/30 hover:bg-white/30 w-full max-w-[160px] xs:max-w-[180px] sm:max-w-[200px]"
            onClick={() =>
              document
                .getElementById("menu")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            data-testid="button-browse-menu"
          >
            Browse Menu
          </Button>
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
                (cartItem) => cartItem.menuItem.id === item.id
              );
              const cartItem = cart.find((cartItem) => cartItem.menuItem.id === item.id);
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
                      className="w-full h-full object-cover"
                    />
                    {isInCart && (
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">
                        ₦{parseFloat(item.price).toLocaleString()}
                      </span>
                      {isInCart ? (
                        <div className="flex items-center gap-1 border rounded-lg">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => item.id && updateQuantity(item.id, -1)}
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
                            onClick={() => item.id && updateQuantity(item.id, 1)}
                            data-testid={`button-plus-${item.id}`}
                            className="h-5 sm:h-6 w-5 sm:w-6 p-0 text-xs"
                          >
                            <Plus className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => addToCart(item)}
                          disabled={!item.available}
                          data-testid={`button-add-${item.id}`}
                          className="text-xs px-2 py-1.5"
                        >
                          <Plus className="w-2.5 h-2.5 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                    {!item.available && (
                      <Badge
                        variant="secondary"
                        className="w-full justify-center text-xs"
                      >
                        Currently Unavailable
                      </Badge>
                    )}
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
  );
}
