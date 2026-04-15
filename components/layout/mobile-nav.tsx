"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Btn } from "@/components/ui";
import {
  LayoutDashboard, ListTodo, Users, UserCog, BarChart3,
  Bell, Settings, Globe, LogOut, X, Trophy, CreditCard, Megaphone, ShieldAlert,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { hasPermission, type Permission } from "@/lib/constants/roles";
import type { SessionUser } from "@/types";
import type { UserRole } from "@/types/database";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Groups", href: "/groups", icon: Users },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Plans", href: "/plans", icon: CreditCard },
  { label: "Users", href: "/users", icon: UserCog, permission: "manage_users" as Permission },
  { label: "Notices", href: "/notices", icon: Megaphone, permission: "manage_notices" as Permission },
  { label: "Appeals", href: "/appeals", icon: ShieldAlert, permission: "manage_appeals" as Permission },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "view_all_reports" as Permission },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings, permission: "system_settings" as Permission },
  { label: "Landing Editor", href: "/landing-editor", icon: Globe, permission: "landing_page_edit" as Permission },
];

interface MobileNavProps {
  user: SessionUser;
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ user, isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => !item.permission || hasPermission(user.role as UserRole, item.permission)
  );

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={onClose} />
      )}

      {/* Drawer */}
      <div className={cn(
        "fixed top-0 left-0 h-full w-[280px] bg-card border-r border-border z-50 transition-transform duration-300 ease-in-out md:hidden flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-lg">TaskFlow</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary">
              {getInitials(user.name || "U")}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <Btn variant="danger" className="w-full" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Btn>
        </div>
      </div>
    </>
  );
}
