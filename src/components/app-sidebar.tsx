import { Link, useLocation } from "wouter";
import {
  Home,
  Users,
  ChefHat,
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  LogOut,
  LogIn,
  User,
  BarChart3,
  Package,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import React from "react";
import { useAuth } from "@/hooks/useAuth";

interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "kitchen" | "customer";
}

interface MenuItem {
  title: string;
  url: string;
  icon: React.ElementType;
  roles: string[];
}

const menuItems: MenuItem[] = [
  {
    title: "Customer Menu",
    url: "/",
    icon: Home,
    roles: ["admin", "customer"],
  },
  { title: "Docket Display", url: "/docket", icon: Users, roles: ["customer"] },
  {
    title: "Kitchen Display",
    url: "/kitchen",
    icon: ChefHat,
    roles: ["kitchen"],
  },
  {
    title: "Walk-in Orders",
    url: "/staff",
    icon: Users,
    roles: ["admin", "kitchen"],
  },
  {
    title: "Order Management",
    url: "/orders",
    icon: LayoutDashboard,
    roles: ["admin"],
  },
  {
    title: "Menu Management",
    url: "/menu",
    icon: UtensilsCrossed,
    roles: ["admin", "kitchen"],
  },
  { title: "User Management", url: "/users", icon: Users, roles: ["admin"] },
  { title: "Sales Inventory", url: "/inventory", icon: Package, roles: ["admin", "kitchen"] },
  { title: "Analytics & Reports", url: "/dashboard/analytics", icon: BarChart3, roles: ["admin"] },
  { title: "Customer Analytics", url: "/customer-analytics", icon: BarChart3, roles: ["admin"] },
  { title: "Customer Insights", url: "/dashboard/customers", icon: BarChart3, roles: ["admin"] },
  { title: "QR Code", url: "/qr-code", icon: ClipboardList, roles: ["admin"] },
  { title: "Profile", url: "/profile", icon: User, roles: ["admin", "kitchen", "customer"] },
];

const getMenuItems = (user: User | null) =>
  user
    ? menuItems.filter((item) => item.roles.includes(user.role))
    : menuItems.filter((item) => item.roles.includes("customer"));

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const { isMobile, openMobile, setOpenMobile } = useSidebar();
  const [selectedUrl, setSelectedUrl] = React.useState(location);
  
  React.useEffect(() => setLoading(false), []);
  React.useEffect(() => {
    setSelectedUrl(location);
  }, [location]);

  const availableMenuItems = getMenuItems(user);

  const handleLogout = () => {
    logout();
    setLocation("/login", { replace: true });
  };

  const handleLogin = () => {
    setLocation("/login", { replace: true });
  };

  const handleMenuClick = (url: string) => {
    setSelectedUrl(url);
    setLocation(url);
    if (isMobile && openMobile) {
      setOpenMobile(false);
    }
  };

  if (loading) {
    return (
      <Sidebar className="bg-gradient-to-b from-[#50BAA8] to-[#50BAA8] text-white border-r border-white/10">
        <SidebarContent className="flex flex-col items-center justify-center h-full">
          <div className="relative">
            <div className="w-16 h-16 bg-white/20 rounded-2xl animate-pulse mb-4 flex items-center justify-center">
              <div className="w-8 h-8 bg-white/30 rounded-lg"></div>
            </div>
          </div>
          <p className="text-sm text-white/80 mt-2">Loading...</p>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar className="bg-gradient-to-b from-[#50BAA8] to-[#50BAA8] text-white border-r border-white/10 shadow-xl">
      <SidebarContent className="flex flex-col justify-between h-full">
        {/* === Top Section (Logo + Menu) === */}
        <div>
          {/* Logo Section */}
          <SidebarGroup>
            <SidebarGroupLabel className="flex justify-center py-6 px-4 border-b border-white/2 h-300">
              <div className="relative group">
                <div className="absolute inset-0 bg-white/10 rounded-2xl blur-md group-hover:blur-lg transition-all duration-300"></div>
                <img
                  src="/nibbles.jpg"
                  alt="Nibbles Kitchen Logo"
                  className="relative h-30 w-40 rounded-2xl object-cover shadow-lg border-2 border-white/20 transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </SidebarGroupLabel>

            {/* User Info Section */}
            {user && (
              <div className="px-4 py-3 mb-2">
                <div className="text-center">
                  <p className="font-semibold text-[#50BAAB] text-sm truncate">
                    {user.email}
                  </p>
                  <p className="text-[#50BAA8]/70 text-xs capitalize mt-1">
                    {user.role}
                  </p>
                </div>
              </div>
            )}

            {/* Menu Section */}
            <SidebarGroupContent className="mt-2 px-3">
              <SidebarMenu>
                {availableMenuItems.map((item) => {
                  const isActive = selectedUrl === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={`
                          group relative flex items-center gap-3 px-3 py-3 text-sm rounded-xl transition-all duration-200
                          ${
                            isActive
                              ? "sidebar-active bg-[#50BAA8] text-[#50BAA8] shadow-lg shadow-black/10 backdrop-blur-sm"
                              : "text-[#50BAA8] hover:bg-[#50BAA8] hover:text-white/90 hover:shadow-lg"
                          }
                          hover:scale-[1.02] active:scale-[0.98]
                        `}
                        onClick={() => handleMenuClick(item.url)}
                      >
                        <Link href={item.url} className="flex items-center gap-3 w-full">
                          <div className={`
                            relative transition-transform duration-200
                            ${isActive ? "scale-110" : "group-hover:scale-105"}
                          `}>
                            <item.icon className="w-5 h-5" />
                            {isActive && (
                              <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-20"></div>
                            )}
                          </div>
                          <span className={`font-medium transition-all duration-200 ${
                            isActive ? "text-white" : "text-/90"
                          }`}>
                            {item.title}
                          </span>
                          
                          {/* Active indicator dot */}
                          {isActive && (
                            <div className="absolute right-3 w-2 h-2 bg-white rounded-full shadow-sm"></div>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* === Bottom Section (Login/Logout) === */}
        <div className="p-4 border-t border-white/20">
          <SidebarMenu>
            <SidebarMenuItem>
              {user ? (
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="group flex items-center gap-3 px-3 py-3 text-sm rounded-xl transition-all duration-200 bg-red-500/10 hover:bg-red-500/90 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] text-red-400/90 hover:text-white border border-white/10 hover:border-red-400/50"
                >
                  <LogOut className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                  <span className="font-medium">Logout</span>
                  <div className="flex-1"></div>
                  <div className="w-2 h-2 bg-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  onClick={handleLogin}
                  className="group flex items-center gap-3 px-3 py-3 text-sm rounded-xl transition-all duration-200 bg-green-500/10 hover:bg-green-500/90 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] text-green-400/90 hover:text-white border border-white/10 hover:border-green-400/50"
                >
                  <LogIn className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                  <span className="font-medium">Login</span>
                  <div className="flex-1"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}