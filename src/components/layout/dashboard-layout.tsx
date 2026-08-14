"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  Settings,
  FolderOpen,
  Workflow,
  Search,
  Bell,
  Bot,
  CreditCard,
  Users,
  KeySquare,
  LifeBuoy,
  LogOut,
  User,
  Menu,
  X,
  PanelLeft,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import type { Permission } from "@/lib/rbac";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/pipelines", label: "Pipelines", icon: Workflow },
  { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
];

const settingItems: { href: string; label: string; icon: typeof Settings; permission?: Permission }[] = [
  { href: "/api-keys", label: "API Keys", icon: KeySquare, permission: "manage_keys" },
  { href: "/billing", label: "Billing", icon: CreditCard, permission: "manage_billing" },
  { href: "/team", label: "Team", icon: Users, permission: "manage_team" },
  { href: "/roles-permissions", label: "Roles & Permissions", icon: ShieldCheck, permission: "manage_team" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "manage_settings" },
  { href: "/help", label: "Help", icon: LifeBuoy },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isNotificationsOpen, setNotificationsOpen] = React.useState(false);
  const [isProfileOpen, setProfileOpen] = React.useState(false);
  const { user, logout, role, permissions } = useAuth();

  // Hide management items the caller's role cannot use.
  const visibleSettingItems = settingItems.filter(
    (item) => !item.permission || permissions.includes(item.permission),
  );
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : null;
  const roleBadge = roleLabel ? (
    <span className="shrink-0 border border-primary/30 bg-primary/10 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-primary rounded-none">
      {roleLabel}
    </span>
  ) : null;

  // Real activity feed drives the notifications dropdown.
  const NOTIFICATIONS_READ_KEY = "lipi.notifications.lastReadId";
  const [notifications, setNotifications] = React.useState<{ id: number; message: string; time: string }[]>([]);
  const [lastReadId, setLastReadId] = React.useState(0);

  const fetchNotifications = React.useCallback(() => {
    fetch("/api/activity")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.activities) return;
        const latest = (data.activities as any[]).slice(0, 5).map((a) => ({
          id: a.id,
          message: a.description || a.title,
          time: a.time,
        }));
        setNotifications(latest);
      })
      .catch(() => {});
  }, []);

  // Fetch once on mount; the bell refetches on open. Read-state survives navigation via localStorage.
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(NOTIFICATIONS_READ_KEY);
      if (stored) setLastReadId(Number(stored) || 0);
    } catch {}
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => Number(n.id) > lastReadId).length;

  const markAllRead = () => {
    const maxId = notifications.reduce((max, n) => Math.max(max, Number(n.id) || 0), lastReadId);
    setLastReadId(maxId);
    try {
      window.localStorage.setItem(NOTIFICATIONS_READ_KEY, String(maxId));
    } catch {}
  };

  const [isDesktopMinimized, setIsDesktopMinimized] = React.useState(false);

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background relative font-sans">
      {/* Mobile Off-Canvas Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Off-Canvas Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out md:hidden ${
          isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setIsMobileOpen(false)}>
            <img src="https://saipals.com/wp-content/uploads/2026/08/lipi-logo.svg" alt="Lipi Logo" className="h-8" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close menu"
            onClick={() => setIsMobileOpen(false)}
            className="rounded-none hover:bg-sidebar-accent text-sidebar-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Main Menu
          </div>
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 text-sm transition-colors duration-200 rounded-none ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 opacity-80" />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8">
            <div className="px-4 mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Management
            </div>
            <nav className="px-3 space-y-1">
              {visibleSettingItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-200 rounded-none ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Mobile User Profile Footer */}
        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 truncate">
              <div className="w-8 h-8 bg-primary/20 text-primary flex items-center justify-center font-bold text-xs rounded-none border border-primary/30">
                {user ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-foreground truncate">{user?.name || "Demo User"}</p>
                  {roleBadge}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email || "user@lipi.ai"}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              title="Logout"
              onClick={() => {
                setIsMobileOpen(false);
                logout();
              }}
              className="rounded-none text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside className={`hidden md:flex md:flex-col ${isDesktopMinimized ? 'w-16' : 'w-64'} bg-sidebar border-r border-sidebar-border h-full shrink-0 transition-all duration-300 ease-in-out`}>
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border justify-between overflow-hidden">
          <Link href="/dashboard" className="flex items-center gap-2 flex-1 min-w-0">
            {isDesktopMinimized ? (
              <img src="https://saipals.com/wp-content/uploads/2026/08/lipi-logo.svg" alt="Lipi Logo" className="h-6 object-cover object-left w-6 ml-1" />
            ) : (
              <img src="https://saipals.com/wp-content/uploads/2026/08/lipi-logo.svg" alt="Lipi Logo" className="h-8 shrink-0" />
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDesktopMinimized(!isDesktopMinimized)}
            className="rounded-none hover:bg-sidebar-accent text-sidebar-foreground shrink-0 h-8 w-8"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 overflow-x-hidden">
          {!isDesktopMinimized && (
            <div className="px-6 mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              Main Menu
            </div>
          )}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isDesktopMinimized ? item.label : undefined}
                  className={`flex items-center ${isDesktopMinimized ? 'justify-center px-0' : 'justify-between px-3'} py-2 text-sm transition-colors duration-200 rounded-none ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isDesktopMinimized && <span>{item.label}</span>}
                  </div>
                  {!isDesktopMinimized && isActive && <ChevronRight className="h-4 w-4 opacity-75 shrink-0" />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8">
            {!isDesktopMinimized && (
              <div className="px-6 mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Management
              </div>
            )}
            <nav className="px-3 space-y-1">
              {visibleSettingItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isDesktopMinimized ? item.label : undefined}
                    className={`flex items-center ${isDesktopMinimized ? 'justify-center px-0' : 'gap-3 px-3'} py-2 text-sm transition-colors duration-200 rounded-none ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isDesktopMinimized && <span className="whitespace-nowrap">{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Desktop User Footer */}
        <div className={`p-4 border-t border-sidebar-border bg-sidebar-accent/20 ${isDesktopMinimized ? 'flex justify-center items-center' : ''}`}>
          <div className={`flex items-center ${isDesktopMinimized ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-3 truncate">
              <div className="w-8 h-8 shrink-0 bg-primary/20 text-primary flex items-center justify-center font-bold text-xs rounded-none border border-primary/30" title={user?.name}>
                {user ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              {!isDesktopMinimized && (
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-foreground truncate">{user?.name || "Demo User"}</p>
                    {roleBadge}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email || "user@lipi.ai"}</p>
                </div>
              )}
            </div>
            {!isDesktopMinimized && (
              <Button
                variant="ghost"
                size="icon-xs"
                title="Logout"
                onClick={logout}
                className="rounded-none text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Navbar */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-border bg-background z-10">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Mobile Hamburger Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle navigation menu"
              className="md:hidden rounded-none text-foreground hover:bg-muted shrink-0"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Global Search Bar */}
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search documents, OCR pipelines, settings..."
                className="w-full border border-input bg-background pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-none transition-all duration-200"
              />
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3 relative shrink-0">
            {/* Notifications Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="relative rounded-none text-foreground hover:bg-muted"
                onClick={() => {
                  const opening = !isNotificationsOpen;
                  setNotificationsOpen(opening);
                  setProfileOpen(false);
                  if (opening) fetchNotifications();
                }}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center rounded-none shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {isNotificationsOpen && (
                <div className="absolute top-12 right-0 w-80 bg-background border border-border shadow-lg rounded-none z-50 animate-in fade-in-50 duration-150">
                  <div className="p-3 border-b border-border flex justify-between items-center bg-muted/30">
                    <span className="font-semibold text-xs uppercase tracking-wider text-foreground">Notifications</span>
                    <button
                      className="text-[11px] text-primary hover:underline font-medium"
                      onClick={() => {
                        markAllRead();
                        setNotificationsOpen(false);
                      }}
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-border">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">No recent activity.</div>
                    ) : (
                      notifications.map((notification) => (
                        <div key={notification.id} className="p-3 hover:bg-muted/40 transition-colors duration-200">
                          <p className="text-xs text-foreground leading-relaxed">{notification.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 font-mono">{notification.time}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                className="h-8 w-8 bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/30 hover:bg-primary/20 transition-colors duration-200 rounded-none"
                onClick={() => {
                  setProfileOpen(!isProfileOpen);
                  setNotificationsOpen(false);
                }}
              >
                {user ? user.name.charAt(0).toUpperCase() : "U"}
              </button>

              {isProfileOpen && (
                <div className="absolute top-12 right-0 w-52 bg-background border border-border shadow-lg rounded-none z-50 animate-in fade-in-50 duration-150">
                  <div className="p-3 border-b border-border bg-muted/30">
                    <p className="font-semibold text-xs text-foreground truncate">{user?.name || "Demo User"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email || "user@lipi.ai"}</p>
                  </div>
                  <div className="p-1 space-y-0.5">
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors duration-200 rounded-none w-full"
                      onClick={() => setProfileOpen(false)}
                    >
                      <User className="h-3.5 w-3.5 text-muted-foreground" /> Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors duration-200 rounded-none w-full"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Settings
                    </Link>
                    <button
                      className="flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors duration-200 rounded-none w-full text-left font-medium"
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                    >
                      <LogOut className="h-3.5 w-3.5 text-destructive" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 overflow-y-auto bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
}
