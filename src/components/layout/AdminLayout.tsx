"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, ChevronRight, ClipboardList, FileText, LayoutDashboard, LogOut, LucideIcon, Menu, Network, ShieldCheck, Target, UserRound, UsersRound, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  requiredPermission?: string;
  requiredPermissions?: string[];
}

const menus: {
  label?: string;
  items: {
    label: string;
    href: string;
    icon: LucideIcon;
    permission?: string;
    permissions?: string[];
  }[];
}[] = [
  {
    items: [
      {
        label: "Bảng điều khiển",
        href: "/quan-tri",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Công việc",
    items: [
      {
        label: "Văn bản đến",
        href: "/quan-tri/cong-viec/van-ban-den",
        icon: FileText,
        permission: "DOCUMENT_VIEW",
      },
      {
        label: "Nhiệm vụ",
        href: "/quan-tri/cong-viec/nhiem-vu",
        icon: ClipboardList,
      },
      {
        label: "Báo cáo",
        href: "/quan-tri/bao-cao",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Cá nhân",
    items: [
      {
        label: "KPI cá nhân",
        href: "/quan-tri/kpi-ca-nhan",
        icon: Target,
      },
    ],
  },
  {
    label: "Cơ cấu tổ chức",
    items: [
      {
        label: "Cơ quan / Tổ chức",
        href: "/quan-tri/to-chuc",
        icon: Building2,
        permissions: ["ROLE_MANAGE", "USER_MANAGE"],
      },
      {
        label: "Phòng ban",
        href: "/quan-tri/phong-ban",
        icon: Network,
        permissions: ["ROLE_MANAGE", "USER_MANAGE"],
      },
    ],
  },
  {
    label: "Người dùng",
    items: [
      {
        label: "Người dùng",
        href: "/quan-tri/nguoi-dung",
        icon: UsersRound,
        permission: "USER_MANAGE",
      },
      {
        label: "Vai trò",
        href: "/quan-tri/vai-tro",
        icon: ShieldCheck,
        permission: "ROLE_MANAGE",
      },
      {
        label: "Phân quyền",
        href: "/quan-tri/phan-quyen",
        icon: ShieldCheck,
        permission: "ROLE_MANAGE",
      },
    ],
  },
];

export default function AdminLayout({
  children,
  title,
  description,
  requiredPermission,
  requiredPermissions,
}: AdminLayoutProps) {
  const pathname = usePathname();
  const { user, hasPermission, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  return (
    <ProtectedRoute
      requiredPermission={requiredPermission}
      requiredPermissions={requiredPermissions}
    >
    <div className="min-h-screen bg-slate-50">
      <button
        type="button"
        aria-label="Đóng menu"
        aria-hidden={!mobileMenuOpen}
        tabIndex={mobileMenuOpen ? 0 : -1}
        onClick={() => setMobileMenuOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-950/50 transition-[opacity,visibility] duration-300 ease-in-out motion-reduce:transition-none lg:hidden ${
          mobileMenuOpen
            ? "visible opacity-100 [transition-delay:0ms,0ms]"
            : "invisible opacity-0 [transition-delay:0ms,300ms]"
        }`}
      />

      {/* Sidebar */}
      <aside
        id="admin-navigation"
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex w-72 flex-col transition-[transform,visibility] duration-300 ease-in-out motion-reduce:transition-none lg:visible lg:translate-x-0 lg:delay-0 lg:z-auto ${
          mobileMenuOpen
            ? "visible translate-x-0 [transition-delay:0ms,0ms]"
            : "invisible -translate-x-full [transition-delay:0ms,300ms]"
        }`}
      >
        <div className="flex h-20 items-center border-b border-white/15 px-6">
          <Link
            href="/quan-tri"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white">
              <Building2 className="h-6 w-6" />
            </div>

            <div>
              <div className="font-bold tracking-wide text-white">
                UBND P. Tân Khai
              </div>
              <div className="text-xs text-white">
                Hệ thống quản lý công việc
              </div>
            </div>
          </Link>
        </div>

        <nav
          aria-label="Menu quản trị"
          className="flex-1 space-y-5 overflow-y-auto px-4 py-6"
        >
          {menus.map((menu) => {
            const visibleItems = menu.items.filter(
              (item) =>
                (!item.permission || hasPermission(item.permission)) &&
                (!item.permissions ||
                  item.permissions.every(hasPermission)),
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={menu.label ?? menu.items[0].href}>
                {menu.label && (
                  <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-white">
                    {menu.label}
                  </h2>
                )}
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/quan-tri" &&
                        pathname.startsWith(`${item.href}/`));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`admin-menu-link flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                          active ? "admin-menu-link-active" : ""
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="flex-1">{item.label}</span>
                        {active && <ChevronRight className="h-4 w-4" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/15 p-4">
          <div className="text-xs text-center text-blue-200">
              © 2026 | All rights reserved.
            </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="admin-navigation"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            <div>
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>

              {description && (
                <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 rounded-xl p-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-800">
                  {user?.fullName ?? user?.username ?? "Người dùng"}
                </p>
                <p className="text-xs text-slate-500">
                  {user?.roles.join(", ") ?? ""}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <UserRound className="h-5 w-5" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
                  void logout();
                }
              }}
              aria-label="Đăng xuất"
              className="flex items-center gap-2 rounded-xl p-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
    </ProtectedRoute>
  );
}