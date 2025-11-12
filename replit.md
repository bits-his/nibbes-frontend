# Nibbles Order Management System

## Overview

Nibbles Order Management System is a complete, production-ready full-stack web application for managing restaurant orders, menu items, and kitchen operations. The system serves multiple user roles including customers placing online orders, staff taking walk-in orders, kitchen staff viewing active orders, and managers overseeing operations and menu management.

The application features real-time order updates via WebSocket connections, a comprehensive menu management system, Interswitch payment processing integration, and distinct interfaces optimized for different user workflows (customer ordering vs. operational staff views).

## Recent Changes

**2025-10-26: Critical Bug Fixes**
- Fixed order submission bug where checkout and staff-orders pages were stuck in "Processing..." state
- Issue: API mutations were returning Response objects instead of parsed JSON data
- Solution: Updated all mutations that use response data to call `.json()` on the Response object
- Verified: End-to-end testing confirms all order flows work correctly (customer checkout, staff orders, kitchen display, order management)
- Status: All core functionality operational and tested

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing

**UI Component System**
- shadcn/ui component library with Radix UI primitives for accessible, customizable components
- Tailwind CSS for utility-first styling with custom design tokens
- Class Variance Authority (CVA) for type-safe component variants
- Custom theming system supporting light/dark modes via CSS variables

**State Management**
- TanStack Query (React Query) for server state management, caching, and data synchronization
- React Hook Form with Zod validation for type-safe form handling
- Local state management with React hooks (useState, useEffect)
- LocalStorage for cart persistence in customer ordering flow

**Real-time Updates**
- WebSocket client connections for live order updates
- Automatic query invalidation when receiving WebSocket messages
- Fallback polling mechanism (5-second intervals) for reliability

**Page Structure**
- Customer Menu (`/`) - Browse menu items and build cart
- Checkout (`/checkout`) - Complete order with customer details
- Order Status (`/order-status`) - Track order progress in real-time
- Staff Orders (`/staff`) - Walk-in order entry interface
- Kitchen Display (`/kitchen`) - Active orders for kitchen staff
- Order Management (`/orders`) - Administrative order overview and stats
- Menu Management (`/menu`) - CRUD operations for menu items

### Backend Architecture

**Server Framework**
- Express.js running on Node.js
- TypeScript for type safety across server code
- ES Modules (type: "module") for modern JavaScript syntax

**API Design**
- RESTful endpoints under `/api` prefix
- JSON request/response format
- Structured error handling with HTTP status codes
- Request logging middleware tracking method, path, status, duration, and response preview

**WebSocket Server**
- WebSocket server (`ws` library) mounted on `/ws` path
- Broadcasts order updates to all connected clients
- Event types: `new_order`, `order_update`
- Automatic reconnection handling on client side

**Data Layer Architecture**
- Storage abstraction pattern with `IStorage` interface
- `DatabaseStorage` class implementing all database operations
- Transaction support for multi-table operations (orders + order items)
- Atomic order number generation using database sequences

**Database Operations**
- Menu Items: Full CRUD operations with availability toggling
- Orders: Creation with order items, status updates, filtering by status
- Order Stats: Aggregated metrics (today's orders, revenue, status counts)
- Payments: Payment record creation and status updates

### Data Storage

**Database**
- PostgreSQL (configured via Neon serverless driver)
- Drizzle ORM for type-safe database queries and schema management
- WebSocket support via `ws` polyfill for Neon serverless connections

**Schema Design**

*Menu Items Table*
- UUID primary keys with auto-generation
- Fields: name, description, price (decimal), category, imageUrl, available flag
- Categories: Main Course, Appetizer, Dessert, Drinks, Snacks
- Timestamps for creation tracking

*Orders Table*
- UUID primary keys
- Auto-incrementing order numbers for customer-facing references
- Customer information (name, phone)
- Order type distinction (online vs walk-in)
- Status workflow: pending → preparing → ready → completed/cancelled
- Payment tracking (status, method)
- Timestamps for created/updated times

*Order Items Table*
- Junction table linking orders to menu items
- Quantity and price snapshot at time of order
- Cascade deletion when parent order deleted

*Payments Table*
- Links to orders (one-to-one)
- Payment provider tracking (Interswitch)
- Transaction reference storage
- Amount and status tracking

**Relationships**
- One-to-many: Order → Order Items
- Many-to-one: Order Items → Menu Items
- One-to-one: Order → Payment

### External Dependencies

**Third-Party Libraries**

*UI Components*
- @radix-ui/* (20+ packages) - Accessible primitive components
- cmdk - Command palette functionality
- embla-carousel-react - Carousel/slider components
- lucide-react - Icon system
- vaul - Drawer component
- react-day-picker - Date selection

*Data & Forms*
- @tanstack/react-query - Server state management
- react-hook-form - Form state and validation
- zod - Runtime type validation
- drizzle-zod - Schema-to-Zod converters

*Styling*
- tailwindcss - Utility CSS framework
- tailwind-merge - Conditional class merging
- class-variance-authority - Component variant management
- autoprefixer - CSS vendor prefixing

*Date/Time*
- date-fns - Date formatting and manipulation

**Database & Infrastructure**
- @neondatabase/serverless - PostgreSQL connection driver
- drizzle-orm - Type-safe ORM
- drizzle-kit - Schema migrations and database management
- connect-pg-simple - PostgreSQL session store (configured but sessions not actively used)

**Development Tools**
- @replit/vite-plugin-* - Replit-specific development plugins
- tsx - TypeScript execution for development
- esbuild - Production bundler for server code
- vite - Frontend build tool and dev server
- ws - WebSocket server/client library

**Design System**
- Google Fonts: Inter (primary UI/body), Poppins (headings)
- Custom Tailwind configuration with design tokens
- shadcn/ui "new-york" style variant
- Neutral color palette as base theme

**Payment Processing**
- Configured for Interswitch integration (payment provider stored in database)
- Payment status tracking: pending → paid/failed
- Transaction reference storage for reconciliation

**Asset Management**
- Menu item images stored at `/attached_assets/generated_images/`
- Image URL references in database
- Static file serving via Express/Vite middleware