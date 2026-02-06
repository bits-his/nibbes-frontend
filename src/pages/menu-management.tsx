import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";
import { getWebSocketUrl } from "@/lib/websocket";

type MenuFormValues = z.infer<typeof menuItemFormSchema>;

export default function MenuManagement() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedFormCategory, setSelectedFormCategory] = useState<string>("");
  const [previewItemCode, setPreviewItemCode] = useState<string>("");
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Network status for adaptive loading
  const networkStatus = useNetworkStatus();

  // WebSocket connection for real-time updates
  useEffect(() => {
    const wsUrl = getWebSocketUrl();
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

  // Fetch categories when component mounts
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await apiRequest("GET", "/api/menu/categories");
      const data = await response.json();
      console.log('Fetched categories:', data);
      
      // API returns array of strings directly
      if (Array.isArray(data)) {
        setCategories(data);
      } else if (data.data && Array.isArray(data.data)) {
        // Handle if wrapped in data property
        setCategories(data.data);
      } else {
        console.error('Unexpected categories format:', data);
        // Fallback to defaults
        setCategories([
          "Main Course",
          "Appetizer",
          "Dessert",
          "Drinks",
          "Snacks",
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      // Default to existing categories if API fails
      setCategories([
        "Main Course",
        "Appetizer",
        "Dessert",
        "Drinks",
        "Snacks",
      ]);
    }
  };

  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      category: "",
      imageUrl: "",
      available: true,
    },
  });

  // PERFORMANCE: Fetch menu items with caching (reduces network payload)
  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/all"],
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  // Filter items (memoized to prevent unnecessary recalculations)
  const filteredItems = useMemo(() => {
    if (!menuItems) return [];
    return menuItems.filter(
      (item) => {
        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
        const matchesSearch = searchQuery === "" || 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      }
    );
  }, [menuItems, selectedCategory, searchQuery]);

  // PERFORMANCE: Infinite scroll for pagination (reduces initial payload)
  const {
    displayedItems: visibleItems,
    hasMore,
    isLoading: isLoadingMore,
    loadMore,
    reset: resetPagination,
    sentinelRef,
  } = useInfiniteScroll(filteredItems, {
    itemsPerLoad: networkStatus.isSlow ? 6 : 12, // Load fewer items on slow networks
    threshold: 300,
    enabled: true,
  });

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [selectedCategory, searchQuery, resetPagination]);

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

  // Generate preview of item code (without incrementing counter)
  const generatePreviewItemCode = async (category: string) => {
    if (!category || editingItem) return;
    
    try {
      setIsGeneratingPreview(true);
      // Call backend to get preview of next code (without incrementing)
      const response = await apiRequest("POST", "/api/menu/preview-code", { category });
      const data = await response.json();
      const previewCode = data.code;
      
      setPreviewItemCode(previewCode);
      console.log(`Preview item code: ${previewCode} for category: ${category}`);
    } catch (error) {
      console.error("Error generating preview code:", error);
      // Fallback to simple format if API fails
      const categoryUpper = category.toUpperCase().replace(/\s+/g, '_');
      const prefix = categoryUpper.substring(0, 10);
      const fallbackCode = `${prefix}-????`;
      setPreviewItemCode(fallbackCode);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Generate actual item code (increments counter)
  const generateItemCodeForCategory = async (category: string): Promise<string> => {
    try {
      // Call backend to generate code based on category (this WILL increment)
      const response = await apiRequest("POST", "/api/menu/generate-code", { category });
      const data = await response.json();
      const code = data.code;
      
      console.log(`Generated actual item code: ${code} for category: ${category}`);
      return code;
    } catch (error) {
      console.error("Error generating item code:", error);
      // Fallback to simple format if API fails
      const categoryUpper = category.toUpperCase().replace(/\s+/g, '_');
      const prefix = categoryUpper.substring(0, 10);
      const fallbackCode = `${prefix}-0001`;
      toast({
        title: "Warning",
        description: "Using fallback item code generation",
        variant: "default",
      });
      return fallbackCode;
    }
  };

  const handleOpenDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setSelectedFormCategory(item.category);
      setPreviewItemCode(item.itemCode || "");
      form.reset({
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        imageUrl: item.imageUrl || "",
        available: item.available,
      });
      // Reset image states when editing an existing item
      setImageFile(null);
      setImagePreviewUrl(item.imageUrl || null);
    } else {
      setEditingItem(null);
      setSelectedFormCategory("");
      setPreviewItemCode("");
      form.reset({
        name: "",
        description: "",
        price: "",
        category: "",
        imageUrl: "",
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
    setSelectedFormCategory("");
    setPreviewItemCode("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    form.reset();
  };

  const onImageFileChange = async (file: File) => {
    setImageFile(file);
    setIsUploading(true);
    
    // Upload image to CDN via backend
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Upload to CDN via backend endpoint
      const BACKEND_URL =  'https://server.brainstorm.ng/nibbleskitchen';
      const response = await fetch(`${BACKEND_URL}/api/cdn/upload`, {
        method: "POST",
        headers: {
          // Authorization header will be added by axios interceptor if using axios
          // For fetch, you may need to add it manually
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to upload image to CDN");
      }

      const result = await response.json();
      const cdnUrl = result.url; // Get the CDN URL from response
      
      // Update the form's imageUrl field
      form.setValue("imageUrl", cdnUrl);
      
      // Create a preview URL for the selected image
      setImagePreviewUrl(cdnUrl);
      
      toast({
        title: "Success",
        description: "Image uploaded to CDN successfully.",
      });
    } catch (error: any) {
      console.error("Error uploading image to CDN:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload image to CDN. Please try again.",
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

    // Don't submit if still uploading
    if (isUploading) {
      toast({
        title: "Please wait",
        description: "Image is still uploading to Cloudinary...",
        variant: "destructive",
      });
      return;
    }

    // Validate image URL is present when creating new items
    if (!editingItem && !currentImageUrl) {
      toast({
        title: "Image Required",
        description: "Please upload an image for the menu item.",
        variant: "destructive",
      });
      return;
    }

    // Validate category is selected for new items
    if (!editingItem && !values.category) {
      toast({
        title: "Category Required",
        description: "Please select a category for the menu item.",
        variant: "destructive",
      });
      return;
    }

    // Create or update menu item with the image URL from CDN
    let finalValues: any = {
      ...values,
      imageUrl: currentImageUrl, // Use the uploaded image URL
    };
    
    if (editingItem && editingItem.id !== undefined) {
      console.log('Update values being sent:', JSON.stringify(finalValues));
      updateMutation.mutate({ id: String(editingItem.id), data: finalValues });
    } else {
      // Generate item code NOW (only when actually creating the item)
      try {
        const itemCode = await generateItemCodeForCategory(values.category);
        finalValues.itemCode = itemCode;
        console.log('Create values being sent:', JSON.stringify(finalValues));
        console.log('Generated item code:', itemCode);
        createMutation.mutate(finalValues);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to generate item code. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Category management functions
  const [newCategory, setNewCategory] = useState("");

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/menu/categories", { 
        name: newCategory.trim() 
      });
      
      toast({
        title: "Success",
        description: "Category added successfully.",
      });
      
      setNewCategory("");
      fetchCategories(); // Refresh the categories list
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add category.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    try {
      await apiRequest("DELETE", `/api/menu/categories`, { 
        name: categoryName 
      });
      
      toast({
        title: "Success",
        description: "Category deleted successfully.",
      });
      
      fetchCategories(); // Refresh the categories list
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete category.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-2xl font-bold sm:text-4xl">Menu Management</h1>
            <p className="text-muted-foreground">Add, edit, and manage menu items and categories</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setCategoryDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
            <Button
              onClick={() => handleOpenDialog()}
              data-testid="button-add-item"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Menu Item
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <Card className="bg-white border-slate-200">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-[80px]">Image</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Available</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(visibleItems || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                            No menu items found
                          </TableCell>
                        </TableRow>
                      ) : (
                        (visibleItems || []).map((item) => (
                          <TableRow
                            key={item.id}
                            className="hover:bg-slate-50 transition-colors"
                            data-testid={`row-menu-item-${item.id}`}
                          >
                            {/* Image */}
                            <TableCell>
                              <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                                <ImageWithSkeleton
                                  src={item.imageUrl || ''}
                                  alt={item.name}
                                  containerClassName="w-full h-full"
                                />
                              </div>
                            </TableCell>
                            
                            {/* Item Name & Description */}
                            <TableCell>
                              <div>
                                <div className="font-semibold text-gray-900">{item.name}</div>
                                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                  {item.description}
                                </p>
                              </div>
                            </TableCell>
                            
                            {/* Item Code */}
                            <TableCell>
                              <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                                {item.itemCode || 'N/A'}
                              </code>
                            </TableCell>
                            
                            {/* Category */}
                            <TableCell>
                              <Badge variant="outline">{item.category}</Badge>
                            </TableCell>
                            
                            {/* Price - Display Only */}
                            <TableCell className="text-right">
                              {editingPriceId === item.id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editingPriceValue}
                                    onChange={(e) => setEditingPriceValue(e.target.value)}
                                    className="w-28 h-9 text-right font-semibold"
                                    autoFocus
                                    onKeyDown={async (e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        try {
                                          const newPrice = parseFloat(editingPriceValue);
                                          if (isNaN(newPrice) || newPrice < 0) {
                                            toast({
                                              variant: "destructive",
                                              title: "Invalid Price",
                                              description: "Please enter a valid positive number",
                                            });
                                            return;
                                          }
                                          await apiRequest("PUT", `/api/menu/${item.id}`, {
                                            ...item,
                                            costPrice: newPrice
                                          });
                                          toast({
                                            title: "Success",
                                            description: `Price updated to ₦${newPrice.toLocaleString()}`,
                                          });
                                          queryClient.invalidateQueries({ queryKey: ["/api/menu/all"] });
                                          setEditingPriceId(null);
                                        } catch (error) {
                                          console.error("Error updating price:", error);
                                          toast({
                                            variant: "destructive",
                                            title: "Error",
                                            description: "Failed to update price",
                                          });
                                        }
                                      } else if (e.key === 'Escape') {
                                        setEditingPriceId(null);
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-9 w-9 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={async () => {
                                      try {
                                        const newPrice = parseFloat(editingPriceValue);
                                        if (isNaN(newPrice) || newPrice < 0) {
                                          toast({
                                            variant: "destructive",
                                            title: "Invalid Price",
                                            description: "Please enter a valid positive number",
                                          });
                                          return;
                                        }
                                        await apiRequest("PUT", `/api/menu/${item.id}`, {
                                          ...item,
                                          costPrice: newPrice
                                        });
                                        toast({
                                          title: "Success",
                                          description: `Price updated to ₦${newPrice.toLocaleString()}`,
                                        });
                                        queryClient.invalidateQueries({ queryKey: ["/api/menu/all"] });
                                        setEditingPriceId(null);
                                      } catch (error) {
                                        console.error("Error updating price:", error);
                                        toast({
                                          variant: "destructive",
                                          title: "Error",
                                          description: "Failed to update price",
                                        });
                                      }
                                    }}
                                    title="Save"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => setEditingPriceId(null)}
                                    title="Cancel"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                  </Button>
                                </div>
                              ) : (
                                <div className="font-semibold text-gray-900">
                                  ₦{parseFloat(item.price).toLocaleString()}
                                </div>
                              )}
                            </TableCell>
                            
                            {/* Stock Balance */}
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end">
                                <span className={`text-sm font-semibold ${
                                  (item.stockBalance !== null && item.stockBalance !== undefined && item.stockBalance < 0)
                                    ? 'text-red-700 font-bold'
                                    : (item.stockBalance !== null && item.stockBalance !== undefined && item.stockBalance === 0) 
                                    ? 'text-red-600' 
                                    : (item.stockBalance !== null && item.stockBalance !== undefined && item.stockBalance < 5) 
                                    ? 'text-orange-600' 
                                    : (item.stockBalance !== null && item.stockBalance !== undefined)
                                    ? 'text-green-600'
                                    : 'text-gray-500'
                                }`}>
                                  {item.stockBalance !== null && item.stockBalance !== undefined
                                    ? item.stockBalance < 0
                                      ? `${item.stockBalance} ⚠️`
                                      : item.stockBalance === 0
                                      ? 'SOLD OUT'
                                      : `${item.stockBalance} portions`
                                    : 'Not tracked'}
                                </span>
                              </div>
                            </TableCell>
                            
                            {/* Status Badge */}
                            <TableCell className="text-center">
                              {item.stockBalance !== null && item.stockBalance !== undefined && item.stockBalance <= 0 ? (
                                <Badge variant="destructive" className="font-semibold">
                                  SOLD OUT
                                </Badge>
                              ) : !item.available ? (
                                <Badge variant="secondary">
                                  Unavailable
                                </Badge>
                              ) : (
                                <Badge variant="default" className="bg-green-600">
                                  Available
                                </Badge>
                              )}
                            </TableCell>
                            
                            {/* Availability Toggle */}
                            <TableCell className="text-center">
                              <Switch
                                checked={item.available}
                                onCheckedChange={async (checked) => {
                                  try {
                                    await apiRequest("PUT", `/api/menu/${item.id}`, {
                                      ...item,
                                      available: checked
                                    });
                                    toast({
                                      title: "Success",
                                      description: `${item.name} is now ${checked ? 'available' : 'unavailable'}`,
                                    });
                                    queryClient.invalidateQueries({ queryKey: ["/api/menu/all"] });
                                  } catch (error) {
                                    console.error("Error updating availability:", error);
                                    toast({
                                      variant: "destructive",
                                      title: "Error",
                                      description: "Failed to update availability",
                                    });
                                  }
                                }}
                                className="data-[state=checked]:bg-green-600"
                              />
                            </TableCell>
                            
                            {/* Actions */}
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => {
                                  if (item.id !== undefined) {
                                    setEditingPriceId(item.id);
                                    setEditingPriceValue(item.price);
                                  }
                                }}
                                title="Edit Price"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit Price
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            
            {/* Infinite Scroll Sentinel and Load More */}
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
              {/* Category Field - Now First */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedFormCategory(value);
                        // Generate preview code (doesn't increment counter)
                        if (!editingItem) {
                          generatePreviewItemCode(value);
                        }
                      }}
                      value={field.value}
                      disabled={!!editingItem}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select a category" />
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
                    {!editingItem && isGeneratingPreview && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Loading preview...
                      </p>
                    )}
                    {!editingItem && previewItemCode && (
                      <p className="text-xs text-blue-600 mt-1">
                        Preview Code: <span className="font-semibold">{previewItemCode}</span>
                        <span className="text-muted-foreground ml-2">(will be finalized on save)</span>
                      </p>
                    )}
                    {editingItem && previewItemCode && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Item Code: <span className="font-semibold">{previewItemCode}</span>
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              {/* Price Field - Now Full Width */}
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
                <p className="text-xs text-muted-foreground mt-1">
                  Upload a high-quality image for the menu item. Recommended size: 800x800px or larger.
                </p>
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
                if (itemToDelete && itemToDelete.id !== undefined) {
                  deleteMutation.mutate(String(itemToDelete.id));
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

      {/* Category Management Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Menu Categories</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <Button onClick={handleAddCategory} disabled={!newCategory.trim()}>
                Add
              </Button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map((category, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <span className="font-medium">{category}</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteCategory(category)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
