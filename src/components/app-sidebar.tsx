import { Link, useLocation } from "wouter";
import { Home, Users, ChefHat, LayoutDashboard, UtensilsCrossed } from "lucide-react";
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

const menuItems = [
  {
    title: "Customer Menu",
    url: "/",
    icon: Home,
  },
  {
    title: "Walk-in Orders",
    url: "/staff",
    icon: Users,
  },
  {
    title: "Kitchen Display",
    url: "/kitchen",
    icon: ChefHat,
  },
  {
    title: "Order Management",
    url: "/orders",
    icon: LayoutDashboard,
  },
  {
    title: "Menu Management",
    url: "/menu",
    icon: UtensilsCrossed,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

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
              {menuItems.map((item) => (
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
