import { Switch, Route, useLocation } from "wouter";
import React, { useEffect, useState, useRef, createElement } from "react";
import { queryClient } from "./lib/queryClient";
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
import QRCodePage from "@/pages/qr-code";
import { useAuth } from "./hooks/useAuth";
import { CartProvider } from "@/context/CartContext";

// Fix missing import reference in the renderPage function
import DocketPage from "@/pages/docket";

// Define user type
interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "kitchen" | "customer";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (e) {
        // If there's an error parsing, clear the stored data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }

    setLoading(false);
  }, []);

  const login = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart'); // Clear cart when user logs out
    localStorage.removeItem('pendingCheckoutCart'); // Also clear any pending checkout cart
    localStorage.removeItem('location'); // Clear location data as well
  };

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
}> = ({ children, allowedRoles }) => {
  const [location, setLocation] = useLocation();
  const { user, loading } = React.useContext(AuthContext);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirect to login if not authenticated
        setLocation("/login");
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to unauthorized page if user doesn't have required role
        setLocation("/unauthorized");
      }
    }
  }, [user, loading, allowedRoles, setLocation]);

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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
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
        path="/unauthorized"
        component={() => <div className="p-6">Unauthorized Access</div>}
      />

      {/* Public routes */}
      <Route path="/" component={CustomerMenu} />
      <Route
        path="/checkout"
        component={() => (
          <ProtectedRoute allowedRoles={["customer", "admin"]}>
            <Checkout />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/order-status"
        component={() => (
          <ProtectedRoute allowedRoles={["customer", "admin"]}>
            <OrderStatus />
          </ProtectedRoute>
        )}
      />

      {/* Protected routes with role checks inside the components or via ProtectedRoute */}
      {/* Admins can access all pages, other roles only specific pages */}
      <Route
        path="/kitchen"
        component={() => (
          <ProtectedRoute allowedRoles={["kitchen", "admin"]}>
            <KitchenDisplay />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/staff"
        component={() => (
          <ProtectedRoute allowedRoles={["admin", "kitchen"]}>
            <StaffOrders />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/orders"
        component={() => (
          <ProtectedRoute allowedRoles={["admin"]}>
            <OrderManagement />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/menu"
        component={() => (
          <ProtectedRoute allowedRoles={["admin"]}>
            <MenuManagement />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/users"
        component={() => (
          <ProtectedRoute allowedRoles={["admin"]}>
            <UserManagement />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/docket"
        component={() => (
          <ProtectedRoute allowedRoles={["customer", "admin"]}>
            <DucketDisplay />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/qr-code"
        component={() => (
          <ProtectedRoute allowedRoles={["admin"]}>
            <QRCodePage />
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
  const mainRef = useRef<HTMLMainElement>(null);

  useEffect(() => {
    // Scroll to top of the main element whenever the location changes
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "auto" });
    } else {
      // Fallback to window scroll if main element is not available
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [location]);

  // Don't show sidebar on login, signup, forgot password, and reset password pages
  const showSidebar =
    location !== "/login" &&
    location !== "/signup" &&
    location !== "/forgot-password" &&
    location !== "/reset-password" &&
    location !== "/unauthorized";

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
                {user ? user.email || user.username : "Guest"}
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

function App() {
  const [location] = useLocation();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <SidebarProvider style={style as React.CSSProperties}>
              <Layout>
                <Router />
              </Layout>
            </SidebarProvider>
            <Toaster />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
