"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  Film,
  Tv2,
  Boxes,
  Settings,
  LogOut,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { EnvironmentSelector } from "@/components/EnvironmentSelector";
import { useSession } from "@/lib/session/provider";
import { hasPermission, PERMISSIONS, type Permission } from "@/lib/auth/permissions";
import { useState, useEffect } from "react";
import { getDarkMode } from "@/lib/storage/settings";
import { toggleDarkMode } from "@/components/ThemeProvider";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  allowedPermissions?: Permission[];
};

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/live", label: "Live", icon: Radio },
  { href: "/vod", label: "VOD", icon: Film },
  { href: "/fast-channels", label: "Fast Channels", icon: Tv2 },
  { href: "/cdn-tokens", label: "CDN", icon: Boxes, allowedPermissions: [PERMISSIONS.CDN_PAGE] },
  { href: "/settings", label: "Settings", icon: Settings, allowedPermissions: [PERMISSIONS.SETTINGS_PAGE] },
];

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-150",
        active
          ? "bg-[#EEF2FF] text-[#3C50E0] dark:bg-[#3C50E0]/20 dark:text-[#818CF8]"
          : "text-[#1C2434] hover:bg-[#F1F5F9] hover:text-[#3C50E0] dark:text-[#DEE4EE] dark:hover:bg-white/10 dark:hover:text-white"
      )}
    >
      <Icon
        size={18}
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-[#3C50E0] dark:text-[#818CF8]" : "text-[#1C2434] group-hover:text-[#3C50E0] dark:text-[#DEE4EE] dark:group-hover:text-white"
        )}
      />
      {item.label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkModeState] = useState(false);

  useEffect(() => {
    setDarkModeState(getDarkMode());
  }, []);

  const handleToggleDarkMode = () => {
    const next = !darkMode;
    toggleDarkMode(next);
    setDarkModeState(next);
  };

  const visibleNavItems = navItems.filter(
    (item) => !item.allowedPermissions || hasPermission(user, item.allowedPermissions)
  );

  const currentPage = navItems.find((item) => item.href === pathname)?.label ?? "Overview";

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo area */}
      <div className="flex h-16 items-center gap-3 border-b border-[#E2E8F0] px-6 dark:border-[#2E3A47]">
        <svg width="36" height="36" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="shrink-0" aria-hidden="true">
          <rect x="2" y="2" width="44" height="44" rx="12.5" fill="#3C50E0"/>
          <path d="M20 15.5 L20 32.5 L34 24 Z" fill="#FFFFFF"/>
        </svg>
        <div className="flex flex-col leading-none">
          <span className="text-lg font-black tracking-tight text-[#1C2434] dark:text-white">VMS</span>
          <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#64748B] dark:text-[#8899A8]">Video Management System</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9FA6B2]">
          Menu
        </div>
        <div className="flex flex-col gap-0.5">
          {visibleNavItems.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={pathname === item.href}
            />
          ))}
        </div>
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#1A222C]">
      {/* Desktop sidebar — white background */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[290px] border-r border-[#E2E8F0] bg-white lg:flex lg:flex-col dark:border-[#2E3A47] dark:bg-[#24303F]">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-[290px] border-r border-[#E2E8F0] bg-white transition-transform lg:hidden dark:border-[#2E3A47] dark:bg-[#24303F]",
          mobileOpen ? "flex translate-x-0 flex-col" : "hidden -translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex min-h-screen flex-col lg:ml-[290px]">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white px-6 dark:border-[#2E3A47] dark:bg-[#24303F]">
          <div className="flex items-center gap-4">
            <button
              className="rounded-md p-1.5 text-[#637381] hover:bg-[#F1F5F9] lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <div className="text-sm font-semibold text-[#1C2434] dark:text-white">
                {currentPage}
              </div>
              <div className="hidden text-xs text-[#637381] sm:block">
                Manage API-driven workflows with confidence.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <EnvironmentSelector />
            <button
              onClick={handleToggleDarkMode}
              className="relative rounded-full p-2 text-[#637381] hover:bg-[#F1F5F9] dark:hover:bg-[#1A222C]"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {user && (
              <span className="hidden text-sm font-medium text-[#1C2434] dark:text-white sm:block">
                {user.name}
              </span>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#637381] transition hover:bg-[#F1F5F9] dark:border-[#2E3A47] dark:hover:bg-[#1A222C]"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
