"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAppSettings } from "@/components/providers/settings-provider";
import {
  LayoutDashboard, ListTodo, Users, UserCog, BarChart3,
  Bell, Settings, Globe, LogOut, ChevronLeft, ChevronRight, Trophy,
  CreditCard, Megaphone, ShieldAlert, Wallet, MessageCircle, Image as ImageIcon, Send, History, Mail, Inbox, Crown,
} from "lucide-react";
import { useMyTicketAccess } from "@/hooks/use-tickets";
import { useAdminInboxCounts } from "@/hooks/use-inbox";
import { cn, getInitials } from "@/lib/utils";
import { hasPermission, isStaffRole, type Permission } from "@/lib/constants/roles";
import { Logo } from "@/components/shared/logo";
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
  { label: "Inbox", href: "/inbox", icon: Inbox, permission: "manage_users" },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Groups", href: "/groups", icon: Users },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Plans", href: "/plans", icon: CreditCard },
  { label: "Users", href: "/users", icon: UserCog, permission: "manage_users" },
  { label: "Broadcast", href: "/broadcast", icon: Send, permission: "broadcast" },
  { label: "Contact Messages", href: "/contact-messages", icon: Mail, permission: "manage_users" },
  { label: "Notices", href: "/notices", icon: Megaphone, permission: "manage_notices" },
  { label: "Appeals", href: "/appeals", icon: ShieldAlert, permission: "manage_appeals" },
  { label: "Group Applications", href: "/group-applications", icon: Crown, permission: "manage_group_applications" },
  { label: "Payments", href: "/payments", icon: Wallet, permission: "manage_payments" },
  { label: "Popups", href: "/popups", icon: ImageIcon, permission: "manage_popups" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "view_all_reports" },
  { label: "Support", href: "/support", icon: MessageCircle },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings, permission: "system_settings" },
  { label: "Audit Log", href: "/audit", icon: History, permission: "system_settings" },
  { label: "Landing Editor", href: "/landing-editor", icon: Globe, permission: "landing_page_edit" },
];

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const appSettings = useAppSettings();
  const subscriptionRequired = appSettings.require_subscription === true;
  const { data: ticketAccess } = useMyTicketAccess();
  // Inbox count badge — only fetched when the user is staff. The hook
  // itself is staff-gated server-side too, so non-staff just see no badge.
  const isStaff = isStaffRole(user.role);
  const { data: inboxCounts } = useAdminInboxCounts();
  const inboxBadge = isStaff ? (inboxCounts?.totalPending ?? 0) : 0;
  const visibleItems = navItems.filter((item) => {
    if (item.href === "/plans" && !subscriptionRequired) return false;
    if (item.href === "/support" && ticketAccess?.access === "none") return false;
    if (item.permission && !hasPermission(user.role as UserRole, item.permission)) return false;
    return true;
  });

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar-bg transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <Logo
          href="/dashboard"
          compact={collapsed}
          size="sm"
          name={(appSettings.site_name as string) || undefined}
          className={cn(collapsed && "mx-auto")}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          // Live count for the Inbox row — only the Inbox item gets this
          // treatment to avoid a generic counts-prop creeping into NavItem.
          const showInboxBadge = item.href === "/inbox" && inboxBadge > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? `${item.label}${showInboxBadge ? ` (${inboxBadge})` : ""}` : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {showInboxBadge && !collapsed && (
                <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
                  {inboxBadge > 99 ? "99+" : inboxBadge}
                </span>
              )}
              {showInboxBadge && collapsed && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
              )}
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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="w-full h-full rounded-lg object-cover" />
            ) : (
              getInitials(user.name || "U")
            )}
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
