import { Link, useLocation } from "wouter";
import { Home, Users, ChefHat, LayoutDashboard, UtensilsCrossed, ClipboardList, LogOut } from "lucide-react";
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

// Define user type
interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'kitchen' | 'customer';
}

// Define menu item type
interface MenuItem {
  title: string;
  url: string;
  icon: React.ElementType;
  roles: string[]; // Roles that can access this item
}

const menuItems: MenuItem[] = [
  {
    title: "Customer Menu",
    url: "/",
    icon: Home,
    roles: ['admin', 'customer'],
  },
  {
    title: "Docket",  // Updated name as per request
    url: "/docket",
    icon: Users,
    roles: ['customer'],
  },
  {
    title: "Kitchen Display",
    url: "/kitchen",
    icon: ChefHat,
    roles: ['kitchen'],
  },
  {
    title: "Walk-in Orders",
    url: "/staff",
    icon: Users,
    roles: ['admin'],
  },
  {
    title: "Order Management",
    url: "/orders",
    icon: LayoutDashboard,
    roles: ['admin'],
  },
  {
    title: "Menu Management",
    url: "/menu",
    icon: UtensilsCrossed,
    roles: ['admin'],
  },
  {
    title: "User Management",
    url: "/users",
    icon: Users,
    roles: ['admin'],
  },
];

// Get menu items based on user role
const getMenuItems = (user: User | null) => {
  if (!user) {
    // Return public items for non-authenticated users
    return menuItems.filter(item => item.roles.includes('customer'));
  }
  return menuItems.filter(item => item.roles.includes(user.role));
};

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }
    setLoading(false);
  }, []);

  const availableMenuItems = getMenuItems(user);

  // Function to handle logout using the auth context
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Update state to trigger re-render
    setUser(null);
    // Redirect to login page
    setLocation('/login', { replace: true });
  };

  if (loading) {
    return (
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-lg font-serif">
              <ChefHat className="inline w-5 h-5 mr-2" />
              Nibbles Kitchen
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="flex items-center justify-center h-10">Loading...</div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-serif">
            <ChefHat className="inline w-5 h-5 mr-2" />
            Nibbles Kitchen
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {availableMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.replace("/", "") || "home"}`}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Logout button */}
              {user && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={handleLogout}
                    data-testid="nav-logout"
                  >
                    <LogOut />
                    <span>Logout</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
