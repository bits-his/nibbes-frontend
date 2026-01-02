import { z } from 'zod';

// MenuItem schema
export const menuItemSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.string().min(1, 'Price is required'),
  category: z.string().min(1, 'Category is required'),
  imageUrl: z.string().optional(),
  available: z.boolean().default(true),
  quantity: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const insertMenuItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.string().min(1, 'Price is required'),
  category: z.string().min(1, 'Category is required'),
  imageUrl: z.string().optional(),
  available: z.boolean().default(true),
  quantity: z.number().optional(),
});

// Create an alias for the form schema
export const menuItemFormSchema = insertMenuItemSchema;

export type MenuItem = z.infer<typeof menuItemSchema>;

// Order schemas
export const orderItemSchema = z.object({
  id: z.number(),
  orderId: z.number(),
  menuItemId: z.number(),
  quantity: z.number(),
  price: z.string(),
  specialInstructions: z.string().optional(),
});

export const orderSchema = z.object({
  id: z.number(),
  orderNumber: z.string(), // Added order number field
  tableNumber: z.number(),
  customerName: z.string(), // Added customer name field
  customerPhone: z.string().optional(), // Added customer phone field
  orderType: z.enum(['online', 'walk-in', 'dine-in']), // Added order type field
  status: z.enum(['pending', 'preparing', 'ready', 'completed', 'cancelled']), // Updated status enum to match frontend usage
  totalAmount: z.string(),
  paymentStatus: z.enum(['pending', 'paid', 'failed']).default('pending'), // Added payment status
  paymentMethod: z.string().optional(), // Added payment method
  notes: z.string().optional(), // Added notes field
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const orderWithItemsSchema = orderSchema.extend({
  orderItems: z.array(orderItemSchema.extend({
    menuItem: menuItemSchema,
  })),
});

export const insertOrderSchema = z.object({
  tableNumber: z.number(),
  customerName: z.string(),
  customerPhone: z.string().optional(),
  orderType: z.enum(['online', 'walk-in', 'dine-in']).default('online'),
  status: z.enum(['pending', 'preparing', 'ready', 'completed', 'cancelled']).default('pending'),
  totalAmount: z.string(),
  paymentStatus: z.enum(['pending', 'paid', 'failed']).default('pending'),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

export const insertOrderItemSchema = z.object({
  menuItemId: z.number(),
  quantity: z.number(),
  price: z.string(),
  specialInstructions: z.string().optional(),
});

export type OrderWithItems = z.infer<typeof orderWithItemsSchema>;

// Payment schema
export const paymentSchema = z.object({
  id: z.number(),
  orderId: z.number(),
  amount: z.string(),
  method: z.string(),
  status: z.enum(['pending', 'completed', 'failed']),
  createdAt: z.string(),
});

export const insertPaymentSchema = z.object({
  orderId: z.number(),
  amount: z.string(),
  method: z.string(),
  status: z.enum(['pending', 'completed', 'failed']).default('pending'),
});

// Cart item schema
export const cartItemSchema = z.object({
  menuItem: menuItemSchema,
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  specialInstructions: z.string().optional(),
});

export type CartItem = z.infer<typeof cartItemSchema>;

// Password reset schemas
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// User schema
export const userSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'kitchen', 'customer']),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
  theme: z.string().optional(),
  passwordResetToken: z.string().nullable().optional(),
  passwordResetExpires: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type User = z.infer<typeof userSchema>;

// Staff order schema
export const staffOrderSchema = z.object({
  id: z.number(),
  tableNumber: z.number(),
  items: z.array(z.object({
    id: z.number(),
    name: z.string(),
    quantity: z.number(),
    specialInstructions: z.string().optional(),
  })),
  status: z.enum(['ready', 'inProgress', 'completed']),
  timestamp: z.string(),
});