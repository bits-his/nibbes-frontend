import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMenuItemSchema, menuItemFormSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient, BACKEND_URL } from "@/lib/queryClient";
import type { MenuItem } from "@shared/schema";
import { log } from "console";

type MenuFormValues = z.infer<typeof menuItemFormSchema>;

export default function MenuManagement() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("Menu Management WebSocket connected");
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
        // Refresh orders data when there are changes (for menu analytics/usage)
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      }
    };

    socket.onerror = (error) => {
      console.error("Menu Management WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("Menu Management WebSocket disconnected");
    };

    // Cleanup function to close the WebSocket connection
    return () => {
      socket.close();
    };
  }, []);

  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      category: "Main Course",
      imageUrl: "",
      available: true,
    },
  });

  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/all"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: MenuFormValues) => {
      return await apiRequest("POST", "/api/menu", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/all"] });
      toast({
        title: "Success",
        description: "Menu item created successfully.",
      });
      handleCloseDialog();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create menu item.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MenuFormValues }) => {
      return await apiRequest("PATCH", `/api/menu/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/all"] });
      toast({
        title: "Success",
        description: "Menu item updated successfully.",
      });
      handleCloseDialog();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update menu item.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/menu/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/all"] });
      toast({
        title: "Success",
        description: "Menu item deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete menu item.",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      form.reset({
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        imageUrl: item.imageUrl, // For existing items, we have an image URL
        available: item.available,
      });
      // Reset image states when editing an existing item
      setImageFile(null);
      setImagePreviewUrl(item.imageUrl);
    } else {
      setEditingItem(null);
      form.reset({
        name: "",
        description: "",
        price: "",
        category: "Main Course",
        imageUrl: "", // Empty string for new items
        available: true,
      });
      // Reset image states for new item
      setImageFile(null);
      setImagePreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    form.reset();
  };

  const onImageFileChange = async (file: File) => {
    setImageFile(file);
    setIsUploading(true);
    
    // Upload image directly to Cloudinary immediately on selection
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "nibbes_kitchen_unsigned"); // Using unsigned preset

      // Upload to Cloudinary
      const response = await fetch("https://api.cloudinary.com/v1_1/dv0gb0cy2/image/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to upload image to Cloudinary");
      }

      const result = await response.json();
      const cloudinaryUrl = result.secure_url; // Get the secure URL from Cloudinary response
      
      // alert(JSON.stringify(cloudinaryUrl));
      // Update the form's imageUrl field
      form.setValue("imageUrl", cloudinaryUrl);
      
      // Create a preview URL for the selected image
      setImagePreviewUrl(cloudinaryUrl);
      
      toast({
        title: "Success",
        description: "Image uploaded to Cloudinary successfully.",
      });
    } catch (error) {
      console.error("Error uploading image to Cloudinary:", error);
      toast({
        title: "Error",
        description: "Failed to upload image to Cloudinary. Please try again.",
        variant: "destructive",
      });
      // Clear the form's imageUrl if upload failed
      form.setValue("imageUrl", "");
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: MenuFormValues) => {
    // Get the current imageUrl value directly from the form to ensure we have the latest value
    const currentImageUrl = form.getValues('imageUrl');
    
    // Debug log to see what values are being sent
    console.log('Form values:', JSON.stringify(values));
    console.log('Current imageUrl from form:', currentImageUrl);
    
    // Check if we have an image URL to submit
    if (!currentImageUrl) {
      toast({
        title: "Error",
        description: "Please select and upload an image.",
        variant: "destructive",
      });
      return;
    }

    // Don't submit if still uploading
    if (isUploading) {
      toast({
        title: "Please wait",
        description: "Image is still uploading to Cloudinary...",
        variant: "destructive",
      });
      return;
    }

    // Create or update menu item with the image URL from Cloudinary
    const finalValues = {
      ...values,
      imageUrl: currentImageUrl, // Use the current value from the form
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: finalValues });
    } else {
      createMutation.mutate(finalValues);
    }
  };

  const categories = [
    "Main Course",
    "Appetizer",
    "Dessert",
    "Drinks",
    "Snacks",
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-4xl font-bold">Menu Management</h1>
          <Button
            onClick={() => handleOpenDialog()}
            data-testid="button-add-item"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Menu Item
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-square bg-muted animate-pulse" />
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems?.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden"
                data-testid={`card-menu-item-${item.id}`}
              >
                <div className="aspect-square overflow-hidden relative">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {!item.available && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge variant="secondary" className="text-base">
                        Unavailable
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg font-semibold flex-1">
                        {item.name}
                      </h3>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold">
                      ₦{parseFloat(item.price).toLocaleString()}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleOpenDialog(item)}
                        data-testid={`button-edit-${item.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => {
                          setItemToDelete(item);
                          setDeleteDialogOpen(true);
                        }}
                        data-testid={`button-delete-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-testid="dialog-menu-item"
        >
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Jollof Rice"
                        {...field}
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the dish..."
                        rows={3}
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₦)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          data-testid="input-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormItem>
                <FormLabel>Upload Image</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onImageFileChange(file);
                      }
                    }}
                    disabled={isUploading}
                  />
                </FormControl>
                <FormMessage />
                {(imagePreviewUrl || form.watch('imageUrl')) && (
                  <div className="mt-2 aspect-video rounded-lg overflow-hidden border">
                    <img
                      src={imagePreviewUrl || form.watch('imageUrl')}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </FormItem>

              {/* Hidden field to track the uploaded image URL */}
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <input
                    type="hidden"
                    value={field.value || ""}
                    onChange={field.onChange}
                  />
                )}
              />

              <FormField
                control={form.control}
                name="available"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <FormLabel className="text-base font-semibold">
                        Available for Order
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Customers can order this item
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-available"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || 
                    updateMutation.isPending || 
                    isUploading
                  }
                  data-testid="button-save"
                >
                  {isUploading 
                    ? "Uploading..." 
                    : createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingItem
                    ? "Update Item"
                    : "Create Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete-confirmation">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete{" "}
              <span className="font-semibold">"{itemToDelete?.name}"</span>?
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-delete-cancel"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (itemToDelete) {
                  deleteMutation.mutate(itemToDelete.id);
                  setDeleteDialogOpen(false);
                  setItemToDelete(null);
                }
              }}
              data-testid="button-delete-confirm"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
