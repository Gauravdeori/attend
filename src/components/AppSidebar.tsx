import * as React from "react";
import { 
  LayoutGrid, 
  Users, 
  LogOut, 
  GraduationCap, 
  Shield,
  BookOpen
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

export function AppSidebar() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

  if (!user) return null;

  // Build items list dynamically based on role
  const sidebarItems = [];

  if (profile?.role === 'admin') {
    sidebarItems.push({
      title: "Admin Panel",
      url: "/admin",
      icon: Shield,
    });
  }

  // Both admins, teachers and students have access to Classes
  sidebarItems.push({
    title: "Classes",
    url: "/classes",
    icon: Users,
  });

  // Students see the personal subject tracking dashboard
  if (profile?.role === 'student') {
    sidebarItems.push({
      title: "Self Tracker",
      url: "/",
      icon: BookOpen,
    });
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200 bg-slate-100">
      <SidebarHeader className="p-4 bg-slate-100 border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight text-slate-800">PresentIQ</span>
            <span className="text-[10px] text-primary font-black uppercase tracking-wider">
              {profile?.institutionName || "Attendance Hub"}
            </span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2 bg-slate-100">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                    className={cn(
                      "transition-all duration-300 rounded-xl my-0.5",
                      location.pathname === item.url 
                        ? "bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/10" 
                        : "text-slate-600 hover:bg-slate-200/60"
                    )}
                  >
                    <Link to={item.url} className="flex items-center gap-3 px-2">
                      <item.icon className="h-4.5 w-4.5 transition-transform group-hover:scale-105" />
                      <span className="font-bold text-sm tracking-tight">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-200/60 bg-slate-100">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden overflow-hidden">
            <Avatar className="h-8 w-8 ring-2 ring-white border border-slate-200">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black">
                {profile?.displayName?.substring(0, 2).toUpperCase() || user.displayName?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-slate-800 truncate tracking-tight">
                {profile?.displayName || user.displayName || "User"}
              </span>
              <span className="text-[9px] text-primary truncate font-bold uppercase tracking-wider">
                {profile?.role || "Student"}
              </span>
            </div>
          </div>
          <button 
            onClick={signOut}
            className="p-2 rounded-lg hover:bg-destructive/10 text-slate-400 hover:text-destructive transition-colors group-data-[collapsible=icon]:hover:bg-destructive/10"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
