"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ListTodo, Users, Trophy, Bell, User } from "lucide-react";
import { getUnreadCount } from "@/lib/actions/notifications";

// Mobile-only bottom navigation (md:hidden). Renders 5 fixed app-style icons
// — Tasks, Groups, Leaderboard, Notifications, Profile. The active pill
// slides between items via framer-motion `layoutId`. Notifications icon
// shows the live unread count as a pulsing badge.
//
// The dashboard layout adds `pb-24` on mobile so page content never hides
// behind this bar.

const items = [
  { href: "/tasks", icon: ListTodo, key: "tasks", label: "Tasks" },
  { href: "/groups", icon: Users, key: "groups", label: "Groups" },
  { href: "/leaderboard", icon: Trophy, key: "leaderboard", label: "Leaderboard" },
  { href: "/notifications", icon: Bell, key: "notifications", label: "Notifications", showBadge: true },
  { href: "/profile", icon: User, key: "profile", label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      {/* Soft fade above the bar so content scrolling under it doesn't crash hard against the edge */}
      <div className="pointer-events-none absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-background/90 to-transparent" />

      <div className="relative bg-card/95 backdrop-blur-xl border-t border-border/60 shadow-[0_-4px_24px_-6px_rgba(0,0,0,0.12)]">
        <ul className="flex items-center justify-around px-2 h-[68px]">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const showBadge = item.showBadge && unreadCount > 0;

            return (
              <li key={item.key} className="flex-1 flex justify-center">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className="relative flex h-[68px] w-full items-center justify-center group active:scale-95 transition-transform"
                >
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    {/* Active pill — animates between items */}
                    {isActive && (
                      <motion.div
                        layoutId="bottom-nav-pill"
                        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      />
                    )}

                    {/* Icon (lifts slightly + scales when active) */}
                    <motion.div
                      animate={{
                        y: isActive ? -2 : 0,
                        scale: isActive ? 1.1 : 1,
                      }}
                      transition={{ type: "spring", stiffness: 420, damping: 28 }}
                      className="relative z-10"
                    >
                      <Icon
                        className={`w-6 h-6 transition-colors duration-300 ${
                          isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                        }`}
                        strokeWidth={isActive ? 2.4 : 2}
                      />

                      {/* Notification badge */}
                      {showBadge && (
                        <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-card">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </motion.div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
