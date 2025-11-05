import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Minus, X } from "lucide-react";
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

const orderFormSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerPhone: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

export default function StaffOrders() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
    },
  });

  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/all"],
  });

  const categories = ["All", "Main Course", "Appetizer", "Dessert", "Drinks", "Snacks"];

  const filteredItems = menuItems?.filter(
    (item) =>
      item.available && // Only show available items for walk-in orders
      (selectedCategory === "All" || item.category === selectedCategory)
  );

  const addToCart = (menuItem: MenuItem) => {
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

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/orders", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Order Created!",
        description: `Walk-in order #${data.orderNumber} submitted to kitchen.`,
      });
      setCart([]);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: OrderFormValues) => {
    if (cart.length === 0) {
      toast({
        title: "Empty Order",
        description: "Please add items to the order.",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      customerName: values.customerName,
      customerPhone: values.customerPhone || "N/A",
      orderType: "walk-in",
      paymentMethod: "cash",
      items: cart.map((item) => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        price: item.menuItem.price,
        specialInstructions: item.specialInstructions,
      })),
    };

    createOrderMutation.mutate(orderData);
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
        // Refresh menu data when items are updated
        queryClient.invalidateQueries({ queryKey: ["/api/menu/all"] });
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
      <div className="flex flex-col md:flex-row h-auto md:h-screen overflow-hidden">
        {/* Menu Section - Full width on mobile, flex-1 on desktop */}
        <div className="flex-1 flex flex-col border-r md:border-r overflow-hidden">
          <div className="p-4 md:p-6 border-b">
            <h1 className="font-serif text-2xl md:text-3xl font-bold mb-3 md:mb-4">Walk-in Orders</h1>
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
                  return (
                    <Card
                      key={item.id}
                      className={`overflow-hidden hover-elevate cursor-pointer transition-all ${isInCart ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => item.available && addToCart(item)}
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
                      </div>
                      <CardContent className="p-3 md:p-4">
                        <h3 className="font-semibold truncate mb-1 text-sm md:text-base">{item.name}</h3>
                        <p className="text-base md:text-lg font-bold">₦{parseFloat(item.price).toLocaleString()}</p>
                        {!item.available && (
                          <Badge variant="secondary" className="mt-2 text-xs">Unavailable</Badge>
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
                  cart.map((item) => (
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
                              data-testid={`button-increase-${item.menuItem.id}`}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <span className="font-semibold">
                            ₦{(parseFloat(item.menuItem.price) * item.quantity).toLocaleString()}
                          </span>
                        </div>

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
                  ))
                )}
              </div>

              {/* Desktop submit section - hidden on mobile */}
              <div className="p-4 md:p-6 border-t space-y-3 md:space-y-4 hidden md:block">
                <div className="flex items-center justify-between text-base md:text-xl">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold" data-testid="text-total">
                    ₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    disabled={createOrderMutation.isPending || cart.length === 0}
                    data-testid="button-submit"
                  >
                    {createOrderMutation.isPending ? "Submitting..." : "Submit to Kitchen"}
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
              <div className="font-semibold">Total: ₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-sm text-muted-foreground">{cart.length} item{cart.length !== 1 ? 's' : ''}</div>
            </div>
            <Button
              type="submit"
              disabled={createOrderMutation.isPending}
              data-testid="mobile-submit-button"
              onClick={(e) => {
                e.preventDefault();
                form.handleSubmit(onSubmit)();
              }}
            >
              {createOrderMutation.isPending ? "Submitting..." : "Submit to Kitchen"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
