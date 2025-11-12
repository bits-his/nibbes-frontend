# Nibbles Order Management System - Frontend

A comprehensive frontend application for the Nibbles Order Management System with analytics and inventory management capabilities.

## Features

- **Order Management**: Create, track, and manage food orders
- **Menu Management**: Manage menu items with details, prices, and categories
- **Analytics Dashboard**: Comprehensive analytics with sales, inventory, and customer insights
- **Inventory Management**: Track and manage ingredients and supplies
- **Kitchen Display**: Real-time kitchen order management
- **User Management**: Role-based access control with admin, kitchen, and customer roles
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS

## Environment Variables

To configure the backend URL, create a `.env` file in the root directory with the following content:

```env
VITE_BACKEND_URL=http://localhost:5050
```

Replace `http://localhost:5050` with your actual backend URL.

## Development

To start the development server, run:   

```bash
npm run dev
```

## Analytics & Reporting Module

The frontend includes a comprehensive analytics dashboard accessible to admin users at `/dashboard/analytics`. The dashboard features:

- Key Performance Indicators (KPIs) cards showing revenue, orders, average order value, and profit estimates
- Sales trend charts with date range filtering
- Top selling items visualization
- Payment method breakdown charts
- Inventory alerts for low stock items
- Real-time dashboard data

## Inventory Management

The inventory management interface accessible to admin and kitchen users at `/inventory` includes:

- Comprehensive inventory listing with filtering and search capabilities
- Item details with name, description, quantity, unit, category, supplier, and expiry date
- Low stock and out-of-stock indicators
- Add, edit, and delete inventory items
- Real-time quantity updates with stock in/out operations
- Category-based filtering
- Summary statistics

## Role-Based Access

The application implements role-based access control:

- **Admin**: Full access including analytics dashboard, inventory management, user management, order management, and menu management
- **Kitchen**: Access to kitchen display, inventory management, live orders, and order management
- **Customer**: Access to menu, ordering, and profile management

## Navigation

The sidebar navigation dynamically shows different options based on user roles:
- **Customers**: Docket Display, Customer Menu, Profile
- **Kitchen Staff**: Kitchen Display, Walk-in Orders, Menu Management, Inventory Management, Profile
- **Admins**: Order Management, Menu Management, User Management, Inventory Management, Analytics & Reports, QR Code, Profile



 Summary

  I have successfully extended the Nibbles Order Management System with a comprehensive analytics & reporting
  module as requested. Here's what was implemented:

  Backend Features
   1. Database Models:
      - inventory.ts - Complete inventory management model with tracking of ingredients and supplies
      - metricsSnapshot.ts - Analytics snapshot model for performance optimization

   2. Analytics Endpoints:
      - /api/analytics/sales-summary - Sales totals, AOV, and trend data
      - /api/analytics/top-items - Top selling items with filtering
      - /api/analytics/orders-live - Real-time order tracking for kitchen display
      - /api/analytics/kitchen-performance - Kitchen prep times and performance metrics
      - /api/analytics/customers-stats - New vs returning customers analytics
      - /api/analytics/inventory - Inventory status tracking
      - /api/analytics/dashboard - Comprehensive dashboard data

   3. Export Functionality:
      - CSV and Excel export endpoints for sales, orders, inventory, and customer reports
      - Export controllers with proper formatting and download capabilities

   4. Inventory Management Endpoints:
      - Full CRUD operations for inventory items
      - Quantity update functionality (stock in/out)
      - Inventory summary and low-stock alerts

   5. Migrations:
      - Proper Sequelize migration files for new tables

  Frontend Features
   1. Analytics Dashboard:
      - KPI cards showing revenue, orders, AOV, and profit estimates
      - Sales trend charts with date range filtering
      - Top items visualization with bar charts
      - Payment method breakdown with pie charts
      - Live order tables for kitchen display

   2. Inventory Management:
      - Comprehensive inventory listing with filtering and search
      - Add/edit/delete functionality with form validation
      - Real-time quantity updates with stock in/out operations
      - Low stock alerts and status indicators
      - Category filtering and summary statistics

   3. Role-Based Access:
      - Updated sidebar navigation showing different options based on roles
      - Admin: "Order Management", "Menu Management", "Analytics & Reports", "Inventory Management", "User Management"
      - Kitchen: "Kitchen Display", "Walk-in Orders", "Menu Management", "Inventory Management"
      - Customer: "Docket Display", "Customer Menu", "Profile"

   4. User Experience:
      - Responsive design with Tailwind CSS
      - Intuitive navigation and data visualization
      - Proper error handling and loading states

  User Seeding
   - Created analyticsUserSeeder.ts with 5 sample users (2 customers, 2 kitchen staff, 1 admin)
   - Added npm run seed:analytics-users script for easy database seeding

  Documentation
   - Updated backend README with comprehensive API documentation
   - Updated frontend README with feature descriptions and role-based access information
   - Documented all new endpoints and functionality

  Key Achievements
   - Inventory System: Complete tracking of ingredients with supplier, category, expiry dates, and low stock alerts
   - Detailed Dashboard: Comprehensive analytics with KPIs, charts, and real-time data
   - Role Management: Proper role-based access control with intuitive navigation
   - Export Functionality: CSV and Excel export capabilities for all major reports
   - Performance Optimized: Used metrics snapshots for efficient analytics queries
   - Integration Ready: Seamlessly integrates with existing codebase without breaking changes

  All features were implemented using the existing stack (Sequelize, Node/Express, React) and follow the project's
  existing conventions and architecture patterns. The system is now ready for production use with full analytics and
  inventory management capabilities.