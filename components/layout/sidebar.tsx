"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Btn } from "@/components/ui";
import { useAppSettings } from "@/components/providers/settings-provider";
import {
  LayoutDashboard, ListTodo, Users, UserCog, BarChart3,
  Bell, Settings, Globe, LogOut, ChevronLeft, ChevronRight, Trophy,
  CreditCard, Megaphone, ShieldAlert,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { hasPermission, type Permission } from "@/lib/constants/roles";
import type { SessionUser } from "@/types";
import type { UserRole } from "@/types/database";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: Permission;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Groups", href: "/groups", icon: Users },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Plans", href: "/plans", icon: CreditCard },
  { label: "Users", href: "/users", icon: UserCog, permission: "manage_users" },
  { label: "Notices", href: "/notices", icon: Megaphone, permission: "manage_notices" },
  { label: "Appeals", href: "/appeals", icon: ShieldAlert, permission: "manage_appeals" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "view_all_reports" },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings, permission: "system_settings" },
  { label: "Landing Editor", href: "/landing-editor", icon: Globe, permission: "landing_page_edit" },
];

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const appSettings = useAppSettings();
  const visibleItems = navItems.filter(
    (item) => !item.permission || hasPermission(user.role as UserRole, item.permission)
  );

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar-bg transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <Link href="/dashboard" className={cn("flex items-center gap-2", collapsed && "mx-auto")}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          {!collapsed && <span className="font-bold text-lg">{appSettings.site_name}</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="ml-2">Collapse</span>}
        </button>

        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {getInitials(user.name || "U")}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-error hover:bg-error/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
