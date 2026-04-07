"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Btn } from "@/components/ui";
import { Menu, Bell, Sun, Moon, User, Settings, LogOut, Coins, ChevronDown } from "lucide-react";
import { getUnreadCount } from "@/lib/actions/notifications";
import Link from "next/link";
import type { SessionUser } from "@/types";
import { ROLE_LABELS } from "@/lib/constants/roles";
import type { UserRole } from "@/types/database";
import { MobileNav } from "./mobile-nav";
import { Breadcrumbs } from "./breadcrumbs";
import { getInitials } from "@/lib/utils";
import { getMyBalance } from "@/lib/actions/users";

export function Header({ user }: { user: SessionUser }) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMyBalance().then(setBalance);
    getUnreadCount().then(setUnreadCount);
  }, [pathname]);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Close on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <>
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 relative z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Breadcrumbs pathname={pathname} />
        </div>

        <div className="flex items-center gap-3">
          {/* Points balance */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/20">
            <Coins className="w-4 h-4 text-warning" />
            <span className="text-sm font-semibold text-warning">
              {balance !== null ? balance.toFixed(2) : "..."}
            </span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <Link href="/notifications" className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>

          {/* User menu */}
          <div ref={menuRef} className="relative z-50">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold">
                {getInitials(user.name || "U")}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card rounded-xl border border-border shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User info header */}
                <div className="px-4 py-3 bg-muted/40 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                      {getInitials(user.name || "U")}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                      {ROLE_LABELS[user.role as UserRole]}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-warning/10 text-warning text-xs font-medium sm:hidden">
                      {balance !== null ? `${balance.toFixed(2)} pts` : ""}
                    </span>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span>Settings</span>
                  </Link>
                </div>

                {/* Logout */}
                <div className="border-t border-border/50 py-1">
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error/5 transition-colors w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <MobileNav user={user} isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
