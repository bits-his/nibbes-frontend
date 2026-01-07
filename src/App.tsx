import { Switch, Route, useLocation } from "wouter";
import React, { useEffect, useState, useRef, createElement, lazy } from "react";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import CustomerMenu from "@/pages/customer-menu";
import Checkout from "@/pages/checkout";
import OrderStatus from "@/pages/order-status";
import StaffOrders from "@/pages/staff-orders";
import KitchenDisplay from "@/pages/kitchen-display";
import OrderManagement from "@/pages/order-management";
import MenuManagement from "@/pages/menu-management";
import UserManagement from "@/pages/user-management";
import DucketDisplay from "@/pages/docket";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import GuestCheckout from "@/pages/guest-checkout";
import QRCodePage from "@/pages/qr-code";
import ProfilePage from "@/pages/profile";
import CustomerAnalyticsPage from "@/pages/customer-analytics";
import AnalyticsPage from "@/pages/analytics";
import { useAuth } from "./hooks/useAuth";
import { useAutoLogout } from "./hooks/useAutoLogout";
import { CartProvider } from "@/context/CartContext";
import { getGuestSession } from "@/lib/guestSession";
import { InstallPWA } from "@/components/InstallPWA";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { SplashScreen } from "@/components/SplashScreen";

// Fix missing import reference in the renderPage function
import DocketPage from "@/pages/docket";
import InventoryPage from "@/pages/inventory";
import CustomerAnalyticsDashboard from "@/pages/customer-analytics-enhanced";
import StoreManagement from "@/pages/store-management";
import EMcard from "@/pages/EMcard";
import ManagerReportsList from "@/pages/ManagerReportsList";
import ManagerReportDetail from "@/pages/ManagerReportDetail";
import ManagerReportsDashboard from "@/pages/ManagerReportsDashboard";
import ManagerReportsByStaff from "@/pages/ManagerReportsByStaff";
import KitchenRequests from "@/pages/KitchenRequests";
import AboutPage from "@/pages/about";
import ContactPage from "@/pages/contact";
import TVDisplay from "@/pages/tv-display";
import CompletedOrders from "@/pages/completed-orders";
import Transactions from "@/pages/transactions";
import PrintReceipt from "@/pages/print-receipt";

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
    // Check if user is already logged in (from localStorage)
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    const sessionStartTime = localStorage.getItem("sessionStartTime");

    const initializeUser = async () => {
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

    initializeUser();
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
      <div className="flex items-center justify-center h-screen">
        Loading...
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
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  if (restricted && user) {
    return null; // Redirect happens in useEffect
  }

  return <>{children}</>;
};

function Router() {
  const { user } = React.useContext(AuthContext);

  return (
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
        component={() => <div className="p-6">Unauthorized Access</div>}
      />

      {/* Public routes */}
      <Route path="/" component={CustomerMenu} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/staff/checkout" component={Checkout} />
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
          <header className="flex items-center h-14 px-4 border-b shrink-0 justify-between">
            <div className="flex items-center">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </div>
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
        <main className="flex-1 overflow-auto" ref={mainRef}>
          {children}
        </main>
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

  // Hide splash screen when both auth and DOM are ready
  useEffect(() => {
    if (!loading && domReady) {
      // Minimum display time to ensure users see the splash screen
      const minDisplayTime = 1200; // 1.2 seconds minimum
      
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, minDisplayTime);
      
      return () => clearTimeout(timer);
    }
  }, [loading, domReady]);

  return (
    <>
      <CartProvider>
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
      </CartProvider>
      <SplashScreen isVisible={showSplash} />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
