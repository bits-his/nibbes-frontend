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
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
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

  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/all"],
  });

  const categories = [
    "All",
    "Main Course",
    "Appetizer",
    "Dessert",
    "Drinks",
    "Snacks",
  ];

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
          duration: 1000, 
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
        duration: 1000, 
      });
      return [...prev, { menuItem, quantity: 1 }];
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
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

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((item) => item.menuItem.id !== menuItemId));
  };

  const updateInstructions = (menuItemId: string, instructions: string) => {
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
      <section className="relative sm:h-[70vh] h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Nibbles Kitchen"
            className="w-full h-full object-cover object-center"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight">
            Order Fresh from Nibbles Kitchen
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-8">
            Authentic Nigerian cuisine delivered to your table
          </p>

          {/* Location Section */}
          <div className="mb-6 p-4 rounded-lg bg-white/10 backdrop-blur-sm max-w-md mx-auto">
            <div className="flex flex-col items-center gap-3">
              {locationData ? (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-green-400" />
                    <span className="text-white font-medium">Location Set</span>
                  </div>
                  <p className="text-white/80 text-sm line-clamp-2">
                    {locationData.address}
                  </p>
                </div>
              ) : (
                <p className="text-white/80 text-sm">
                  Help us locate you for delivery
                </p>
              )}

              <Button
                size="sm"
                variant="secondary"
                className="w-full max-w-xs"
                onClick={checkLocation}
                disabled={locationLoading}
                data-testid="button-check-location"
              >
                {locationLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Detecting...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-2" />
                    {locationData ? "Update Location" : "Check My Location"}
                  </>
                )}
              </Button>

              {locationError && (
                <p className="text-red-300 text-sm text-center mt-2">
                  {locationError}
                </p>
              )}
            </div>
          </div>
          <Button
            size="lg"
            variant="default"
            className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 backdrop-blur-md bg-white/20 border-2 border-white/30 hover:bg-white/30"
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
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto min-w-0">
              <div className="flex gap-2">
                {categories.map((category) => (
                  <Badge
                    key={category}
                    variant={
                      selectedCategory === category ? "default" : "secondary"
                    }
                    className="cursor-pointer whitespace-nowrap px-4 py-2 hover-elevate"
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

            <div className="flex gap-2">
              <Button
                size="icon"
                variant="default"
                className="relative shrink-0"
                onClick={() => setCartOpen(true)}
                data-testid="button-cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-3">
            {/* Search Bar - Full width on mobile */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9"
                data-testid="input-search-mobile"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              {/* Scrollable Category Buttons */}
              <div className="flex-1 overflow-x-auto -mx-4 px-4 mr-[1px]">
                <div className="flex gap-2 w-max">
                  {categories.map((category) => (
                    <Badge
                      key={category}
                      variant={
                        selectedCategory === category ? "default" : "secondary"
                      }
                      className="cursor-pointer whitespace-nowrap px-4 py-2 hover-elevate flex-shrink-0"
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
                className="relative shrink-0 ml-2"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <section id="menu" className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="font-serif text-3xl font-semibold mb-8">Our Menu</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-square bg-muted animate-pulse" />
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-4 bg-muted rounded animate-pulse mb-4" />
                  <div className="h-8 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems?.map((item) => {
              const isInCart = cart.some(
                (cartItem) => cartItem.menuItem.id === item.id
              );
              return (
                <Card
                  key={item.id}
                  className={`overflow-hidden hover-elevate transition-all cursor-pointer ${
                    isInCart ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => {
                    if (item.available) {
                      addToCart(item);
                    }
                  }}
                  data-testid={`card-menu-item-${item.id}`}
                >
                  <div className="aspect-square overflow-hidden relative">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {isInCart && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Plus className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        {item.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xl font-bold">
                        ₦{parseFloat(item.price).toLocaleString()}
                      </span>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent the card click event from firing when button is clicked
                          addToCart(item);
                        }}
                        disabled={!item.available}
                        data-testid={`button-add-${item.id}`}
                        variant={isInCart ? "secondary" : "default"}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {isInCart
                          ? `Added (${
                              cart.find(
                                (cartItem) => cartItem.menuItem.id === item.id
                              )?.quantity
                            })`
                          : "Add to Cart"}
                      </Button>
                    </div>
                    {!item.available && (
                      <Badge
                        variant="secondary"
                        className="w-full justify-center"
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
          <div className="w-full max-w-md bg-background border-l flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your Cart</h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCartOpen(false)}
                data-testid="button-close-cart"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Your cart is empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <Card
                    key={item.menuItem.id}
                    data-testid={`cart-item-${item.menuItem.id}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex gap-3">
                        <img
                          src={item.menuItem.imageUrl}
                          alt={item.menuItem.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">
                            {item.menuItem.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            ₦{parseFloat(item.menuItem.price).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeFromCart(item.menuItem.id)}
                          data-testid={`button-remove-${item.menuItem.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQuantity(item.menuItem.id, -1)}
                          data-testid={`button-decrease-${item.menuItem.id}`}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span
                          className="w-12 text-center font-medium"
                          data-testid={`quantity-${item.menuItem.id}`}
                        >
                          {item.quantity}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => updateQuantity(item.menuItem.id, 1)}
                          data-testid={`button-increase-${item.menuItem.id}`}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      <Textarea
                        placeholder="Special instructions (optional)"
                        value={item.specialInstructions || ""}
                        onChange={(e) =>
                          updateInstructions(item.menuItem.id, e.target.value)
                        }
                        className="text-sm"
                        rows={2}
                        data-testid={`input-instructions-${item.menuItem.id}`}
                      />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t space-y-4">
                <div className="flex items-center justify-between text-lg">
                  <span className="font-semibold">Subtotal</span>
                  <span className="font-bold" data-testid="text-subtotal">
                    ₦
                    {subtotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <Button
                  size="lg"
                  className="w-full"
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
