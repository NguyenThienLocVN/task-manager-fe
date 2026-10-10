"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Settings,
  ShieldCheck,
  Target,
  UserRound,
  UsersRound,
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

const menus = [
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
      },
      {
        label: "Nhiệm vụ",
        href: "/quan-tri/cong-viec/nhiem-vu",
        icon: ClipboardList,
      },
      {
        label: "Báo cáo",
        href: "/quan-tri/cong-viec/bao-cao",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Cá nhân",
    items: [
      {
        label: "KPI cá nhân",
        href: "/quan-tri/cong-viec/kpi",
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
      },
      {
        label: "Phòng ban",
        href: "/quan-tri/phong-ban",
        icon: Network,
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
      },
      {
        label: "Phân quyền",
        href: "/quan-tri/phan-quyen",
        icon: ShieldCheck,
      },
    ],
  },
];

export default function AdminLayout({
  children,
  title,
  description,
}: AdminLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="admin-sidebar fixed inset-y-0 left-0 hidden w-72 flex-col lg:flex">
        <div className="flex h-20 items-center border-b border-white/15 px-6">
          <Link href="/quan-tri" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white">
              <Building2 className="h-6 w-6" />
            </div>

            <div>
              <div className="font-bold tracking-wide text-white">
                TASK MANAGEMENT
              </div>
              <div className="text-xs text-white">
                Hệ thống quản lý công việc
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-6">
          {menus.map((menu) => (
            <div key={menu.label ?? menu.items[0].href}>
              {menu.label && (
                <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-white">
                  {menu.label}
                </h2>
              )}
              <div className="space-y-1">
                {menu.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/quan-tri" &&
                      pathname.startsWith(`${item.href}/`));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
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
          ))}
        </nav>

        <div className="border-t border-white/15 p-4">
          <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white hover:bg-white/10">
            <Settings className="h-5 w-5" />
            Cài đặt hệ thống
          </button>

          <button className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white hover:bg-white/10">
            <LogOut className="h-5 w-5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-4">
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden">
              <Menu className="h-6 w-6" />
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

          <button className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                Quản trị viên
              </p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <UserRound className="h-5 w-5" />
            </div>
          </button>
        </header>

        <main className="p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}