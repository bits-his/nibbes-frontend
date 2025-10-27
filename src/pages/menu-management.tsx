import { useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import { insertMenuItemSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest, queryClient, BACKEND_URL } from "@/lib/queryClient";
import type { MenuItem } from "@shared/schema";

type MenuFormValues = z.infer<typeof insertMenuItemSchema>;

export default function MenuManagement() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false); // Track upload status
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<MenuFormValues>({
    resolver: zodResolver(insertMenuItemSchema),
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
    queryKey: ["/api/menu"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: MenuFormValues) => {
      return await apiRequest("POST", "/api/menu", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
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
        imageUrl: item.imageUrl,
        available: item.available,
      });
      // Reset image states when editing an existing item
      setImageFile(null);
      setImagePreviewUrl(item.imageUrl);
      setIsUploading(false); // Reset upload state
    } else {
      setEditingItem(null);
      form.reset({
        name: "",
        description: "",
        price: "",
        category: "Main Course",
        imageUrl: "",
        available: true,
      });
      // Reset image states for new item
      setImageFile(null);
      setImagePreviewUrl(null);
      setIsUploading(false); // Reset upload state
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setImageFile(null);
    setImagePreviewUrl(null);
    setIsUploading(false); // Reset upload state
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    form.reset();
  };

  // Function to compress image
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Set maximum dimensions for faster uploads
        let { width, height } = img;
        const maxWidth = 800;
        const maxHeight = 600;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw image on canvas with new dimensions
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with 80% quality for faster uploads
        canvas.toBlob(
          (blob) => {
            resolve(blob || file); // fallback to original file if compression fails
          },
          'image/jpeg',
          0.8
        );
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const onImageFileChange = async (file: File) => {
    setIsUploading(true);
    setImageFile(file);
    
    // Create a preview URL for the selected image
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    
    try {
      // Compress the image before uploading
      const compressedFile = await compressImage(file);
      
      // Create a new File object from the compressed blob
      const compressedFileObj = new File([compressedFile], file.name, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
      
      // Upload directly to Cloudinary using unsigned upload
      const formData = new FormData();
      formData.append('file', compressedFileObj);
      formData.append('upload_preset', 'nibbes_kitchen_unsigned'); // Using the provided unsigned preset
      
      const response = await fetch('https://api.cloudinary.com/v1_1/dv0gb0cy2/image/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Cloudinary upload failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const cloudinaryUrl = result.secure_url;
      
      // Update the form's imageUrl field with the Cloudinary URL
      form.setValue('imageUrl', cloudinaryUrl);
      
      // Show success message
      toast({
        title: "Success",
        description: "Image uploaded successfully!",
      });
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      // Show error to user
      toast({
        title: "Error",
        description: "Failed to upload image to Cloudinary. Please try again.",
        variant: "destructive",
      });
      // Reset form field if upload failed
      form.setValue('imageUrl', '');
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: MenuFormValues) => {
    // Validate that imageUrl is valid and that upload is not in progress
    if (!values.imageUrl) {
      toast({
        title: "Error",
        description: "Please select and upload an image first.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if upload is still in progress
    if (isUploading) {
      toast({
        title: "Please wait",
        description: "Image is still uploading. Please wait for upload to complete.",
      });
      return;
    }
    
    // Create or update menu item with the image URL that was already uploaded to Cloudinary
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const categories = ["Main Course", "Appetizer", "Dessert", "Drinks", "Snacks"];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-4xl font-bold">Menu Management</h1>
          <Button onClick={() => handleOpenDialog()} data-testid="button-add-item">
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
                      <h3 className="text-lg font-semibold flex-1">{item.name}</h3>
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
                          if (confirm("Are you sure you want to delete this item?")) {
                            deleteMutation.mutate(item.id);
                          }
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
        <DialogContent className="max-w-2xl" data-testid="dialog-menu-item">
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
<FormField
                control={form.control}
                name="imageUrl"
                render={({ field: { onChange, value, ...fieldProps } }) => (
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
                        {...fieldProps}
                        disabled={isUploading} // Disable input while uploading
                        data-testid="input-image-upload"
                      />
                    </FormControl>
                    <FormMessage />
                    {(imagePreviewUrl || value) && (
                      <div className="mt-2 aspect-video rounded-lg overflow-hidden border">
                        <img
                          src={imagePreviewUrl || value}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </FormItem>
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
                  disabled={createMutation.isPending || updateMutation.isPending || isUploading}
                  data-testid="button-save"
                >
                  {(createMutation.isPending || updateMutation.isPending) && !isUploading
                    ? "Saving..."
                    : isUploading
                    ? "Uploading Image..."
                    : editingItem
                    ? "Update Item"
                    : "Create Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
