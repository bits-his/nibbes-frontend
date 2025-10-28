import { Switch, Route, useLocation } from "wouter";
import { useEffect, useRef, createElement } from "react";
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
import DocketPage from "@/pages/docket";
import NotFound from "@/pages/not-found";

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };
  const [location] = useLocation();
  const mainRef = useRef<HTMLMainElement>(null);

  useEffect(() => {
    // Scroll to top of the main element whenever the location changes
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      // Fallback to window scroll if main element is not available
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [location]);

  const renderPage = () => {
    if (location === '/') return createElement(CustomerMenu);
    if (location === '/checkout') return createElement(Checkout);
    if (location === '/order-status') return createElement(OrderStatus);
    if (location === '/docket') return createElement(DocketPage);
    if (location === '/staff') return createElement(StaffOrders);
    if (location === '/kitchen') return createElement(KitchenDisplay);
    if (location === '/orders') return createElement(OrderManagement);
    if (location === '/menu') return createElement(MenuManagement);
    return createElement(NotFound);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center h-14 px-4 border-b shrink-0">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
              </header>
              <main ref={mainRef} className="flex-1 overflow-auto">
                {renderPage()}
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
