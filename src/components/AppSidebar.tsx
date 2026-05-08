import * as React from "react";
import { 
  LayoutGrid, 
  Users, 
  Settings, 
  LogOut, 
  GraduationCap, 
  Calendar,
  ChevronRight,
  Plus
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutGrid,
  },
  {
    title: "Classes",
    url: "/classes",
    icon: Users,
  },
];

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  if (!user) return null;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight">PresentIQ</span>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Attendance Hub</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                    className={cn(
                      "transition-all duration-300",
                      location.pathname === item.url 
                        ? "bg-primary/10 text-primary hover:bg-primary/20" 
                        : "hover:bg-accent/50"
                    )}
                  >
                    <Link to={item.url} className="flex items-center gap-3 px-2">
                      <item.icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", location.pathname === item.url && "text-primary")} />
                      <span className="font-bold text-sm tracking-tight">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden">
            <Avatar className="h-8 w-8 ring-2 ring-background border border-border/50">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black">
                {user.displayName?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold truncate tracking-tight">{user.displayName || "User"}</span>
              <span className="text-[10px] text-muted-foreground truncate font-medium">{user.email}</span>
            </div>
          </div>
          <button 
            onClick={signOut}
            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors group-data-[collapsible=icon]:hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
