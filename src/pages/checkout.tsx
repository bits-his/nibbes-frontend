import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { CartItem } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

const checkoutFormSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerPhone: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [locationData, setLocationData] = useState<{ latitude: number; longitude: number; address: string } | null>(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("Checkout WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "menu_item_update") {
        // Refresh cart items if menu items are updated (prices, availability, etc.)
        // This will help keep cart items in sync with menu updates
        queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      } else if (
        data.type === "order_update" || 
        data.type === "new_order" || 
        data.type === "order_status_change"
      ) {
        // Refresh active orders when there are changes
        queryClient.invalidateQueries({ queryKey: ["/api/orders/active/customer"] });
      }
    };

    socket.onerror = (error) => {
      console.error("Checkout WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("Checkout WebSocket disconnected");
    };

    // Cleanup function to close the WebSocket connection
    return () => {
      socket.close();
    };
  }, []);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      customerName: user?.username || "",
      customerPhone: "",
    },
  });

  useEffect(() => {
    // Wait for auth loading to complete
    if (loading) return; // Don't run this effect until loading is complete
    
    // Check if user is authenticated
    if (!user) {
      // Save current cart to localStorage before redirecting
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        localStorage.setItem("pendingCheckoutCart", savedCart);
      }
      
      // Redirect to login with a return URL to checkout
      setLocation("/login?redirect=/checkout");
      return;
    }
    
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    } else {
      setLocation("/");
    }
    
    // Get location data from localStorage
    const savedLocation = localStorage.getItem("location");
    if (savedLocation) {
      try {
        const parsedLocation = JSON.parse(savedLocation);
        setLocationData(parsedLocation);
      } catch (error) {
        console.error("Error parsing location data:", error);
      }
    }
    
    // Prefill form with user data if available
    if (user) {
      form.setValue("customerName", user.username || user.email); // Use username or email as name
      // Phone number is not available in user profile, so leave it empty for user to input
    }
  }, [user, loading, setLocation, form]);

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
      // Show success toast and then redirect to ducket page
      toast({
        title: "Order Placed!",
        description: `Your order #${data.orderNumber} has been received and placed.`,
      });
      localStorage.removeItem("cart");
      // Reset form after successful order
      form.reset();
      // Redirect to ducket page after a short delay to allow toast to show
      setTimeout(() => {
        setLocation("/docket");
      }, 1500);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: CheckoutFormValues) => {
    const orderData = {
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      orderType: "online",
      // Include location data if available
      ...(locationData && {
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          address: locationData.address,
        }
      }),
      items: cart.map((item) => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        price: item.menuItem.price,
        specialInstructions: item.specialInstructions,
      })),
    };

    createOrderMutation.mutate(orderData);
  };

  if (cart.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Menu
        </Button>

        <h1 className="font-serif text-4xl font-bold mb-8">Checkout</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your full name"
                              {...field}
                              readOnly={!!user} // Read-only when user is authenticated
                              data-testid="input-name"
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
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="08012345678"
                              {...field}
                              readOnly={!!(user && field.value)} // Only read-only if user is authenticated AND field has a value
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Location Information Card */}
                {locationData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Delivery Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                        <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{locationData.address}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3">
                        Your order will be delivered to this location.
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold">Interswitch WebPAY</p>
                        <p className="text-sm text-muted-foreground">
                          Secure payment gateway
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Debit/Credit Card
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="sticky top-4">
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.menuItem.id} className="flex justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.menuItem.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <p className="font-semibold whitespace-nowrap">
                            ₦{(parseFloat(item.menuItem.price) * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-lg">
                        <span className="font-semibold">Total</span>
                        <span className="font-bold" data-testid="text-total">
                          ₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={createOrderMutation.isPending}
                      data-testid="button-place-order"
                    >
                      {createOrderMutation.isPending ? "Processing..." : "Complete Order"}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      By placing your order, you agree to our terms and conditions
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
