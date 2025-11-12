# Nibbles Order Management System - Design Guidelines

## Design Approach

**Hybrid Approach**: Drawing from modern food ordering platforms (Uber Eats, DoorDash) for customer interfaces and enterprise dashboard systems (Toast POS, Square) for staff interfaces. This ensures intuitive customer experience while maintaining operational efficiency for kitchen and management workflows.

**Core Design Principles**:
- Clear visual hierarchy separating customer and operational interfaces
- Quick-scan layouts for kitchen staff to process orders efficiently
- Trust-building elements for customer ordering (menu images, clear pricing)
- Minimal friction in checkout and payment flows

## Typography System

**Font Families**: 
- Primary: Inter (Google Fonts) - clean, modern sans-serif for UI elements and body text
- Secondary: Poppins (Google Fonts) - slightly rounded for headings and emphasis

**Type Scale**:
- Hero/Display: text-5xl to text-6xl, font-bold (Poppins)
- Page Headings: text-3xl to text-4xl, font-semibold (Poppins)
- Section Headings: text-2xl, font-semibold (Inter)
- Subheadings: text-xl, font-medium (Inter)
- Body Text: text-base, font-normal (Inter)
- Small Text: text-sm, font-normal (Inter)
- Captions/Labels: text-xs, font-medium (Inter)

## Layout System

**Spacing Primitives**: Consistently use Tailwind units of **2, 4, 6, 8, 12, 16** (e.g., p-4, m-8, gap-6, space-y-12)

**Grid System**:
- Menu items: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Order cards (kitchen): grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4
- Dashboard stats: grid-cols-2 md:grid-cols-4 gap-6

**Container Widths**:
- Customer pages: max-w-7xl for main content
- Menu sections: max-w-6xl
- Order forms: max-w-2xl
- Kitchen display: full-width with max-w-screen-2xl
- Management dashboard: max-w-screen-xl

## Customer Ordering Interface

**Homepage/Menu Browsing**:
- Hero section (60vh-80vh): Full-width appetizing food image with blurred overlay, centered headline "Order Fresh from Nibbles" (text-5xl), subheading about quick delivery/pickup, primary CTA button with backdrop-blur-md bg-white/20
- Category navigation: Horizontal scroll on mobile, fixed navigation bar on desktop (sticky top-0) with category pills
- Menu grid: 3-column layout (desktop), image-first cards with rounded-2xl, each card showing food image (aspect-square), dish name (text-lg font-semibold), brief description (text-sm), price (text-xl font-bold)
- Quick filters: Badge-style buttons for dietary preferences (Vegetarian, Spicy, Popular)

**Shopping Cart & Checkout**:
- Persistent cart indicator: Fixed bottom bar on mobile, sidebar drawer on desktop
- Cart items: List layout with thumbnail (w-16 h-16 rounded-lg), item details, quantity controls (-, number, +), remove option
- Order summary: Sticky card showing subtotal, delivery fee (if applicable), total with clear visual separation (border-t-2)
- Checkout form: Single column (max-w-2xl), grouped sections (Contact Info, Delivery Details, Payment), each section with p-6 rounded-xl border
- Payment section: Interswitch logo, secure payment badges, clear "Complete Order" CTA button (w-full py-4 text-lg)

## Walk-in Order Entry (Staff Interface)

**Layout**: Split-screen design - Menu selection (60% width) + Current order builder (40% width)
- Menu panel: Category tabs at top, scrollable item grid below (grid-cols-2 gap-4)
- Item cards: Compact design with small image (w-20 h-20), name (text-base), price, quick-add button
- Order builder panel: Sticky header with customer name input, scrollable order items list, total calculator at bottom
- Action buttons: Large touch targets (min-h-12), "Submit to Kitchen" primary button, "Clear Order" secondary button

## Kitchen Display System

**Real-time Order Board**:
- Full-width dashboard with order cards in masonry/grid layout (grid-cols-1 lg:grid-cols-2 xl:grid-cols-3)
- Order cards: Prominent order number (text-4xl font-bold), timestamp, customer name/type, item list with quantities, preparation status indicator
- Status badges: Large pill badges (px-6 py-3 rounded-full text-base font-semibold) showing Pending/Preparing/Ready
- Priority indicators: Visual markers for rush orders or waiting time exceeding thresholds
- Quick actions: Large tap targets (min-h-14) for "Start Preparing", "Mark Ready", "Complete"
- Order details: Each line item with text-lg, quantities in bold, special instructions highlighted

## Order Management Dashboard

**Dashboard Layout**:
- Top stats bar: 4-column grid showing Today's Orders, Revenue, Pending Orders, Completed Orders (each card with p-6 rounded-xl)
- Navigation tabs: Orders, Menu Management, Settings (text-base font-medium, border-b-2 active state)
- Orders table: Full-width responsive table with columns: Order #, Customer, Items, Total, Status, Time, Actions
- Row interactions: Clickable rows expanding to show full order details, inline status updates via dropdown
- Filter bar: Date range picker, status filters (chip-style buttons), search by order number/customer

**Menu Management**:
- Two-panel layout: Item list (sidebar, w-80) + Item editor (main content area)
- Item list: Searchable, categorized list with small thumbnails, edit/delete icons
- Item editor form: Large image upload area (aspect-video rounded-xl border-dashed), form fields with proper spacing (space-y-6), category selector, pricing inputs, description textarea
- Action buttons: Save changes (primary), Cancel (secondary), Delete item (destructive, text-red-600)

## Component Library

**Buttons**:
- Primary: py-3 px-6 rounded-lg text-base font-semibold, full-width on mobile
- Secondary: py-3 px-6 rounded-lg border-2 text-base font-semibold
- Icon buttons: p-3 rounded-lg (kitchen actions, cart updates)
- CTA buttons over images: backdrop-blur-md with semi-transparent background

**Cards**:
- Menu items: rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition
- Order cards: rounded-xl border p-6 space-y-4
- Dashboard stats: rounded-xl p-6 border

**Forms**:
- Input fields: py-3 px-4 rounded-lg border text-base
- Labels: text-sm font-medium mb-2
- Field groups: space-y-2
- Form sections: space-y-6

**Navigation**:
- Top navbar: h-16 px-6 flex items-center justify-between, sticky top-0
- Mobile menu: Slide-in drawer from left, full-height
- Category tabs: Horizontal scroll, px-4 py-2 rounded-full for each tab

**Status Indicators**:
- Order status badges: px-4 py-2 rounded-full text-sm font-semibold
- Notification dots: Absolute positioned, w-3 h-3 rounded-full (new orders)

## Images

**Hero Section**: Large, high-quality food photography showing Nibbles's signature dishes, appetizing presentation with warm lighting. Image should convey freshness and quality (full-width, 60vh-80vh).

**Menu Items**: Square aspect ratio (aspect-square) food photography for each dish, consistent lighting and styling across all images, close-up shots highlighting texture and ingredients.

**Kitchen Display**: No decorative images - functional interface only.

**Dashboard**: Small icon/illustration for empty states (e.g., "No orders yet" with friendly kitchen illustration).

## Accessibility & Interaction

- Touch targets minimum 44px (min-h-11 min-w-11) for kitchen and staff interfaces
- Keyboard navigation for all interactive elements
- Clear focus states with visible outlines
- ARIA labels for icon-only buttons
- Loading states for payment processing and order submissions
- Success confirmations with clear messaging after order placement
- Error states with helpful recovery instructions