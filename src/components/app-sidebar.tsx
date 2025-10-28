import { Link, useLocation } from "wouter";
import {
  Home,
  Users,
  ChefHat,
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  LogOut,
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
    roles: ["admin"],
  },
  { title: "User Management", url: "/users", icon: Users, roles: ["admin"] },
  { title: "QR Code", url: "/qr-code", icon: ClipboardList, roles: ["admin"] },
];

const getMenuItems = (user: User | null) =>
  user
    ? menuItems.filter((item) => item.roles.includes(user.role))
    : menuItems.filter((item) => item.roles.includes("customer"));

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  React.useEffect(() => setLoading(false), []);

  const availableMenuItems = getMenuItems(user);

  const handleLogout = () => {
    logout();
    setLocation("/login", { replace: true });
  };
  const handleMenuClick = (url: string) => {
    setLocation(url);
    if (window.innerWidth < 1024) {
    // only close on mobile/tablet
    setIsMobileOpen(false);
    }
  };

  if (loading) {
    return (
      <Sidebar>
        <SidebarContent className="flex flex-col items-center justify-center h-full">
          <img
            src="/nibbles.jpg"
            alt="Nibbles Kitchen Logo"
            className="h-16 w-auto mb-4 object-contain"
          />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar
    >
      <SidebarContent className="flex flex-col justify-between h-full">
        {/* === Top Section (Logo + Menu) === */}
        <div>
          {/* Logo Section */}
          <SidebarGroup>
            <SidebarGroupLabel className="flex  h-30 justify-center py-6 border-b border-border">
              <img
                src="/nibbles.jpg"
                alt="Nibbles Kitchen Logo"
                className="h-30 w-40 rounded-xl shadow-sm"
              />
            </SidebarGroupLabel>

            {/* Menu Section */}
            <SidebarGroupContent className="mt-4">
              <SidebarMenu>
                {availableMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      className={`flex items-center gap-3 px-4 py-3 text-[15px] rounded-md transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                        location === item.url
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : ""
                      }`}
                      onClick={() => handleMenuClick(item.url)}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* === Bottom Section (Logout) === */}
        {user && (
          <div className="p-4 border-t border-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 text-[15px] rounded-md transition-all duration-150 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
