import { Switch, Route, useLocation } from "wouter";
import React, { useEffect, useState, useRef, createElement, lazy, Suspense } from "react";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "./hooks/useAuth";
import { useAutoLogout } from "./hooks/useAutoLogout";
import { useVersionCheck } from "./hooks/useVersionCheck";
import { CartProvider } from "@/context/CartContext";
import { ServiceChargesProvider } from "@/context/ServiceChargesContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { getGuestSession } from "@/lib/guestSession";
import { InstallPWA } from "@/components/InstallPWA";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { UpdateDialog } from "@/components/UpdateDialog";
import { SplashScreen } from "@/components/SplashScreen";
import { Footer } from "@/components/Footer";

// PERFORMANCE: Lazy load all routes for code-splitting
// Critical routes loaded immediately (home page)
import CustomerMenu from "@/pages/customer-menu";

// Lazy load all other routes
// Checkout loaded with Suspense boundary - CartProvider wraps Router so context is available
const Checkout = lazy(() => import("@/pages/checkout"));
const CheckoutAlt = lazy(() => import("@/pages/checkout-alt"));
const OrderStatus = lazy(() => import("@/pages/order-status"));
const StaffOrders = lazy(() => import("@/pages/staff-orders"));
const KitchenDisplay = lazy(() => import("@/pages/kitchen-display"));
const OrderManagement = lazy(() => import("@/pages/order-management"));
const MenuManagement = lazy(() => import("@/pages/menu-management"));
const UserManagement = lazy(() => import("@/pages/user-management"));
const DucketDisplay = lazy(() => import("@/pages/docket"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Login = lazy(() => import("@/pages/login"));
const Signup = lazy(() => import("@/pages/signup"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const GuestCheckout = lazy(() => import("@/pages/guest-checkout"));
const QRCodePage = lazy(() => import("@/pages/qr-code"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const CustomerAnalyticsPage = lazy(() => import("@/pages/customer-analytics"));
const CashierAnalyticsPage = lazy(() => import("@/pages/cashier-analytics"));
const AnalyticsPage = lazy(() => import("@/pages/analytics"));
const DocketPage = lazy(() => import("@/pages/docket"));
const InventoryPage = lazy(() => import("@/pages/inventory"));
const CustomerAnalyticsDashboard = lazy(() => import("@/pages/customer-analytics-enhanced"));
const StoreManagement = lazy(() => import("@/pages/store-management"));
const EMcard = lazy(() => import("@/pages/EMcard"));
const ManagerReportsList = lazy(() => import("@/pages/ManagerReportsList"));
const ManagerReportDetail = lazy(() => import("@/pages/ManagerReportDetail"));
const ManagerReportsDashboard = lazy(() => import("@/pages/ManagerReportsDashboard"));
const ManagerReportsByStaff = lazy(() => import("@/pages/ManagerReportsByStaff"));
const KitchenRequests = lazy(() => import("@/pages/KitchenRequests"));
const PendingPayments = lazy(() => import("@/pages/pending-payments"));
const AboutPage = lazy(() => import("@/pages/about"));
const ContactPage = lazy(() => import("@/pages/contact"));
const TVDisplay = lazy(() => import("@/pages/tv-display"));
const CompletedOrders = lazy(() => import("@/pages/completed-orders"));
const Transactions = lazy(() => import("@/pages/transactions"));
const PrintReceipt = lazy(() => import("@/pages/print-receipt"));
const Settings = lazy(() => import("@/pages/settings"));

// Loading fallback component
const RouteLoader = () => (
  <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    <span className="sr-only">Loading...</span>
  </div>
);

// Define user type
interface User {
  id: string;
  username: string;
  email: string;
  role: string; // Allow any role string
  permissions?: string[]; // Add permissions array
  phone?: string;
  avatar?: string;
  notificationsEnabled?: boolean;
  theme?: 'light' | 'dark' | 'system';
  createdAt?: string;
  updatedAt?: string;
}

// Create auth context
export const AuthContext = React.createContext<{
  user: User | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  loading: boolean;
}>({
  user: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

// Auth provider component
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // PERFORMANCE: Defer auth initialization to avoid blocking initial render
    const initializeUser = async () => {
      // Check if user is already logged in (from localStorage)
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");
      const sessionStartTime = localStorage.getItem("sessionStartTime");
      // Check if session has expired (past midnight)
      if (sessionStartTime) {
        const sessionStart = new Date(parseInt(sessionStartTime));
        const now = new Date();
        const sessionStartDay = sessionStart.getDate();
        const currentDay = now.getDate();

        // If the day has changed, session expired
        if (currentDay !== sessionStartDay) {
          console.log('Session expired - clearing data and redirecting to login');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('sessionStartTime');
          localStorage.removeItem('cart');
          localStorage.removeItem('pendingCheckoutCart');
          setUser(null);
          setLoading(false);
          window.location.href = '/login';
          return;
        }
      }

      if (token && userData) {
        try {
          let parsedUser = JSON.parse(userData);
          
          // If the user doesn't have permissions loaded, fetch them
          if (!parsedUser.permissions || parsedUser.permissions.length === 0) {
            // Fetch user permissions and update the user object
            try {
              const response = await apiRequest('GET', '/api/permissions/me');
              const data = await response.json();
              if (data) {
                const permissionNames = data.permissions?.map((p: any) => p.name) || [];
                
                // Update user with permissions
                parsedUser = { ...parsedUser, permissions: permissionNames };
                localStorage.setItem("user", JSON.stringify(parsedUser));
              }
            } catch (error) {
              console.error("Error fetching permissions:", error);
            }
          }
          
          setUser(parsedUser);
        } catch (e) {
          // If there's an error parsing, clear the stored data
          console.error("Error parsing user data:", e);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        }
      }
      
      setLoading(false);
    };

    // PERFORMANCE: Defer auth initialization to avoid blocking render
    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(initializeUser, { timeout: 1000 });
    } else {
      setTimeout(initializeUser, 100);
    }
  }, []);

  const login = async (userData: User, token: string) => {
    try {
      // Update token first
      localStorage.setItem("token", token);
      
      // Fetch user permissions and update the user data before storing
      const response = await apiRequest('GET', '/api/permissions/me');
      const data = await response.json();
      
      if (data) {
        const permissionNames = data.permissions?.map((p: any) => p.name) || [];
        
        // Update user with permissions
        const userWithPermissions = { ...userData, permissions: permissionNames };
        setUser(userWithPermissions);
        localStorage.setItem("user", JSON.stringify(userWithPermissions));
      } else {
        // If permission fetch fails, still store the user without permissions
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      }
    } catch (error) {
      console.error("Error fetching permissions on login:", error);
      // If there's an error, still store the user without permissions
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart'); // Clear cart when user logs out
    localStorage.removeItem('pendingCheckoutCart'); // Also clear any pending checkout cart
    localStorage.removeItem('location'); // Clear location data as well
  };

  // Use auto logout hook
  useAutoLogout(!!user);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected route component
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermissions?: string[]; // New: Check for required permissions
}> = ({ children, allowedRoles, requiredPermissions }) => {
  const [location, setLocation] = useLocation();
  const { user, loading } = React.useContext(AuthContext);

  // Predefined roles that use the old role-based system
  const predefinedRoles = ["admin", "kitchen", "customer"];
  const isPredefinedRole = user && predefinedRoles.includes(user.role);

  // Check if user has required permissions
  const hasRequiredPermissions = () => {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    // Check permissions from user object (could be loaded on login or separately)
    if (user && user.permissions) {
      return requiredPermissions.some(perm => 
        user.permissions && user.permissions.includes(perm)
      );
    }
    
    return false; // No permissions available
  };

  // Check if user has required roles (for backward compatibility)
  const hasRequiredRoles = () => {
    if (!allowedRoles || allowedRoles.length === 0) {
      return true; // No roles required
    }
    
    return user ? allowedRoles.includes(user.role) : false;
  };

  useEffect(() => {
    if (!loading && user) {
      let hasAccess = false;

      if (requiredPermissions && requiredPermissions.length > 0) {
        // For permission-based access (new approach)
        hasAccess = hasRequiredPermissions();
      } else if (isPredefinedRole) {
        // For predefined roles, check both role and permissions if needed
        hasAccess = hasRequiredRoles();
      } else {
        // For custom roles, if no specific permissions required, allow access
        hasAccess = true;
      }

      if (!hasAccess) {
        setLocation("/unauthorized");
      }
    } else if (!loading && !user) {
      setLocation("/login");
    }
  }, [user, loading, requiredPermissions, allowedRoles, isPredefinedRole, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" role="status" aria-label="Loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return null; // Redirect happens in useEffect
  }

  // Check permissions if required
  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!hasRequiredPermissions()) {
      return null; // Redirect happens in useEffect
    }
  } 
  // For predefined roles, check roles as fallback
  else if (isPredefinedRole && allowedRoles && !hasRequiredRoles()) {
    return null; // Redirect happens in useEffect
  }

  return <>{children}</>;
};

// Unprotected route component (for login page)
const PublicRoute: React.FC<{
  children: React.ReactNode;
  restricted?: boolean;
}> = ({ children, restricted }) => {
  const [location, setLocation] = useLocation();
  const { user, loading } = React.useContext(AuthContext);

  useEffect(() => {
    if (restricted && user) {
      // Redirect to dashboard if user is already logged in
      setLocation("/");
    }
  }, [user, restricted, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" role="status" aria-label="Loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (restricted && user) {
    return null; // Redirect happens in useEffect
  }

  return <>{children}</>;
};

// Wrapper component for Checkout to ensure CartProvider context is available
const CheckoutWrapper = () => (
  <PublicRoute>
    <Checkout />
  </PublicRoute>
);

function Router() {
  const { user } = React.useContext(AuthContext);

  return (
    <Suspense fallback={<RouteLoader />}>
      <Switch>
      <Route
        path="/login"
        component={() => (
          <PublicRoute restricted={true}>
            <Login />
          </PublicRoute>
        )}
      />
      <Route
        path="/signup"
        component={() => (
          <PublicRoute restricted={true}>
            <Signup />
          </PublicRoute>
        )}
      />
      <Route
        path="/forgot-password"
        component={() => (
          <PublicRoute restricted={true}>
            <ForgotPassword />
          </PublicRoute>
        )}
      />
      <Route
        path="/reset-password"
        component={() => (
          <PublicRoute restricted={true}>
            <ResetPassword />
          </PublicRoute>
        )}
      />
      <Route
        path="/guest-checkout"
        component={() => (
          <PublicRoute>
            <GuestCheckout />
          </PublicRoute>
        )}
      />
      <Route
        path="/unauthorized"
        component={() => (
          <div className="p-6" role="alert" aria-live="polite">
            <h1>Unauthorized Access</h1>
            <p>You do not have permission to access this page.</p>
          </div>
        )}
      />

      {/* Public routes */}
      <Route path="/" component={CustomerMenu} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/checkout" component={CheckoutWrapper} />
      <Route path="/checkout-alt" component={CheckoutAlt} />
      <Route path="/staff/checkout" component={CheckoutWrapper} />
      <Route path="/payment-instructions" component={lazy(() => import("./pages/payment-instructions"))} />
      <Route path="/tv-display" component={TVDisplay} />
      <Route path="/print-receipt" component={PrintReceipt} />
      <Route
        path="/order-status"
        component={() => (
          <PublicRoute>
            <OrderStatus />
          </PublicRoute>
        )}
      />

      {/* Protected routes with permission checks */}
      <Route
        path="/kitchen"
        component={() => (
          <ProtectedRoute requiredPermissions={["kitchen_display"]}>
            <KitchenDisplay />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/staff"
        component={() => (
          <ProtectedRoute requiredPermissions={["walk_in_orders"]}>
            <StaffOrders />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/orders"
        component={() => (
          <ProtectedRoute requiredPermissions={["order_management"]}>
            <OrderManagement />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/completed-orders"
        component={() => (
          <ProtectedRoute requiredPermissions={["order_management"]}>
            <CompletedOrders />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/menu"
        component={() => (
          <ProtectedRoute requiredPermissions={["menu_management"]}>
            <MenuManagement />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/users"
        component={() => (
          <ProtectedRoute requiredPermissions={["user_management"]}>
            <UserManagement />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/settings"
        component={() => (
          <ProtectedRoute allowedRoles={["admin"]}>
            <Settings />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/docket"
        component={() => (
          <PublicRoute>
            <DucketDisplay />
          </PublicRoute>
        )}
      />
      <Route
        path="/qr-code"
        component={() => (
          <ProtectedRoute requiredPermissions={["qr_code"]}>
            <QRCodePage />
          </ProtectedRoute>
        )}
      />
      
      <Route
        path="/profile"
        component={() => (
          <ProtectedRoute requiredPermissions={["profile"]}>
            <ProfilePage />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/emcard"
        component={() => (
          <ProtectedRoute requiredPermissions={["menu_management"]}>
            <EMcard />
          </ProtectedRoute>
        )}
      />
      
      <Route
        path="/pending-payments"
        component={() => (
          <ProtectedRoute requiredPermissions={["order_management"]}>
            <PendingPayments />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/manager-reports-list"
        component={() => (
          <ProtectedRoute requiredPermissions={["menu_management"]}>
            <ManagerReportsList />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/manager-reports-list/:reportId"
        component={() => (
          <ProtectedRoute requiredPermissions={["menu_management"]}>
            <ManagerReportDetail />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/manager-reports-dashboard"
        component={() => (
          <ProtectedRoute requiredPermissions={["menu_management"]}>
            <ManagerReportsDashboard />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/manager-reports-by-staff/:staffName"
        component={() => (
          <ProtectedRoute requiredPermissions={["menu_management"]}>
            <ManagerReportsByStaff />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/customer-analytics"
        component={() => (
          <ProtectedRoute requiredPermissions={["customer_analytics"]}>
            <CustomerAnalyticsPage />
          </ProtectedRoute>
        )}
      />
      
      <Route
        path="/cashier-analytics"
        component={() => (
          <ProtectedRoute requiredPermissions={["cashier_analytics"]}>
            <CashierAnalyticsPage />
          </ProtectedRoute>
        )}
      />
      
      <Route
        path="/dashboard/analytics"
        component={() => (
          <ProtectedRoute requiredPermissions={["analytics_reports"]}>
            <AnalyticsPage />
          </ProtectedRoute>
        )}
      />
      
      <Route
        path="/inventory"
        component={() => (
          <ProtectedRoute requiredPermissions={["sales_inventory"]}>
            <InventoryPage />
          </ProtectedRoute>
        )}
      />

      
      <Route
        path="/store-management"
        component={() => (
          <ProtectedRoute requiredPermissions={["store_management"]}>
            <StoreManagement />
          </ProtectedRoute>
        )}
      />
      
      <Route
        path="/kitchen-requests"
        component={() => (
          <ProtectedRoute requiredPermissions={["kitchen_display", "sales_inventory"]}>
            <KitchenRequests />
          </ProtectedRoute>
        )}
      />
      
      <Route
        path="/transactions"
        component={() => (
          <ProtectedRoute requiredPermissions={["store_management", "sales_inventory"]}>
            <Transactions />
          </ProtectedRoute>
        )}
      />
      
      <Route
        path="/dashboard/customers"
        component={() => (
          <ProtectedRoute requiredPermissions={["customer_insights"]}>
            <CustomerAnalyticsDashboard />
          </ProtectedRoute>
        )}
      />

      {/* Fallback to not found for unauthorized access */}
      <Route path="*" component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const guestSession = getGuestSession();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Scroll to top of the main element whenever the location changes
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "auto" });
    } else {
      // Fallback to window scroll if main element is not available
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [location]);

  // Don't show sidebar on login, signup, forgot password, reset password, guest checkout, and tv-display pages
  const showSidebar =
    location !== "/login" &&
    location !== "/signup" &&
    location !== "/forgot-password" &&
    location !== "/reset-password" &&
    location !== "/guest-checkout" &&
    location !== "/unauthorized" &&
    location !== "/tv-display";

  return (
    <div className="flex h-screen w-full">
      {showSidebar && <AppSidebar />}
      <div
        className={`flex flex-col flex-1 overflow-hidden ${
          showSidebar ? "" : "w-full"
        }`}
      >
        {showSidebar && (
          <header className="flex items-center h-14 px-4 border-b shrink-0 justify-between" role="banner">
            <nav className="flex items-center" aria-label="Main navigation">
              <SidebarTrigger data-testid="button-sidebar-toggle" aria-label="Toggle sidebar" />
            </nav>
            <div className="flex items-center gap-2">
              <div className="text-[#50BAA8] font-medium">
                {user ? (user.username || user.email) : guestSession ? `${guestSession.guestName} (Guest)` : "Guest"}
              </div>
              <div className="text-[#50BAA8]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-user"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            </div>
          </header>
        )}
        <main className="flex-1 overflow-auto" ref={mainRef} role="main" id="main-content">
          {children}
        </main>
        {/* Show footer on home page and when logged in */}
        <Footer />
      </div>
    </div>
  );
}

function AppContent() {
  const [location] = useLocation();
  const { loading } = React.useContext(AuthContext);
  const [showSplash, setShowSplash] = useState(true);
  const [domReady, setDomReady] = useState(false);
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Check if DOM is ready
  useEffect(() => {
    if (document.readyState === "complete") {
      setDomReady(true);
    } else {
      const handleLoad = () => setDomReady(true);
      window.addEventListener("load", handleLoad);
      return () => window.removeEventListener("load", handleLoad);
    }
  }, []);

  // PERFORMANCE: Hide splash screen immediately - don't block FCP
  // Show content immediately, splash is just visual polish
  useEffect(() => {
    // Don't wait for auth loading - show content immediately
    // Auth check happens in background
    if (domReady) {
      // Minimal delay just for visual smoothness
      const minDisplayTime = 100; // 0.1 seconds - minimal delay
      
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, minDisplayTime);
      
      return () => clearTimeout(timer);
    }
  }, [domReady]);

  return (
    <>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <Layout>
            <Router />
          </Layout>
        </SidebarProvider>
        <Toaster />
        <InstallPWA />
        <UpdatePrompt />
      </TooltipProvider>
      <SplashScreen isVisible={showSplash} />
    </>
  );
}

function App() {
  const { updateAvailable, newVersion, dismissUpdate } = useVersionCheck();
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <ServiceChargesProvider>
            <SettingsProvider>
            <UpdateDialog 
              open={updateAvailable} 
              version={newVersion}
              onDismiss={dismissUpdate}
            />
              <AppContent />
            </SettingsProvider>
          </ServiceChargesProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
