"use client";

import Link from "next/link";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, BarChart3, Building2, ChevronRight, ClipboardList, FileText, LayoutDashboard, LoaderCircle, LogOut, LucideIcon, Menu, Network, Send, ShieldCheck, Target, UserRound, UsersRound, X, UserLock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest as requestApi } from "@/lib/auth/api";
import {
  formatNotificationTime,
  readNotificationPage,
  readUnreadCount,
  type NotificationItem,
} from "@/lib/notifications";
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
        label: "Văn bản đi",
        href: "/quan-tri/cong-viec/van-ban-di",
        icon: Send,
        permission: "DOCUMENT_VIEW",
      },
      {
        label: "Nhiệm vụ",
        href: "/quan-tri/cong-viec/nhiem-vu",
        icon: ClipboardList,
      },
      {
        label: "Thông báo",
        href: "/quan-tri/thong-bao",
        icon: Bell,
      },
      {
        label: "Báo cáo",
        href: "/quan-tri/bao-cao",
        icon: BarChart3,
        permission: "REPORT_VIEW",
      },
    ],
  },
  {
    label: "Cá nhân",
    items: [
      {
        label: "Tài khoản",
        href: "/quan-tri/tai-khoan",
        icon: UserRound,
      },
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
        icon: UserLock,
        permission: "ROLE_MANAGE",
      },
    ],
  },
];

function normalizeRoleLabels(value: unknown): Record<string, string> {
  const unwrapped =
    value && typeof value === "object" && "data" in value
      ? value.data
      : value;
  const record =
    unwrapped && typeof unwrapped === "object"
      ? (unwrapped as Record<string, unknown>)
      : null;
  const roles = Array.isArray(unwrapped)
    ? unwrapped
    : record && Array.isArray(record.items)
      ? record.items
      : null;

  if (!roles) throw new Error("API không trả về danh sách vai trò hợp lệ.");

  return Object.fromEntries(
    roles.map((value) => {
      if (!value || typeof value !== "object") {
        throw new Error("Dữ liệu vai trò không hợp lệ.");
      }
      const role = value as Record<string, unknown>;
      if (typeof role.code !== "string" || typeof role.name !== "string") {
        throw new Error("Dữ liệu vai trò thiếu mã hoặc tên.");
      }
      return [role.code, role.name];
    }),
  );
}

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
  const [roleLabels, setRoleLabels] = useState<Record<string, string>>({});
  const [roleLabelsError, setRoleLabelsError] = useState(false);
  const [isLoadingRoleLabels, setIsLoadingRoleLabels] = useState(true);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationUnread, setNotificationUnread] = useState<number | null>(null);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const notificationPanelRef = useRef<HTMLDivElement>(null);
  const notificationCountRequestId = useRef(0);
  const notificationPreviewRequestId = useRef(0);
  const roleNames = (user?.roles ?? [])
    .map((role) =>
      typeof role === "string" ? roleLabels[role] ?? role : role.name,
    )
    .filter((name): name is string => Boolean(name));

  const loadNotifications = useCallback(async (includeRecent: boolean) => {
    const countRequestId = ++notificationCountRequestId.current;
    const previewRequestId = includeRecent
      ? ++notificationPreviewRequestId.current
      : null;
    const errors: string[] = [];
    if (includeRecent) setIsLoadingNotifications(true);
    setNotificationError("");

    try {
      const [countResult, recentResult] = await Promise.allSettled([
        requestApi<unknown>("/notifications/unread-count"),
        includeRecent
          ? requestApi<unknown>("/notifications?page=1&limit=5")
          : Promise.resolve(null),
      ]);
      let count =
        countResult.status === "fulfilled"
          ? readUnreadCount(countResult.value)
          : null;
      if (
        includeRecent &&
        previewRequestId === notificationPreviewRequestId.current
      ) {
        if (recentResult.status === "fulfilled") {
          setRecentNotifications(readNotificationPage(recentResult.value, 5).items);
        } else {
          errors.push(
            recentResult.reason instanceof Error
              ? recentResult.reason.message
              : "Không tải được thông báo mới nhất.",
          );
        }
      }
      if (countRequestId !== notificationCountRequestId.current) return;

      if (count === null || count === 0) {
        try {
          const unreadList = await requestApi<unknown>(
            "/notifications?page=1&limit=1&isRead=false",
          );
          count = readNotificationPage(unreadList, 1).total;
        } catch (error) {
          count = null;
          errors.push(
            error instanceof Error
              ? error.message
              : "Không tải được số thông báo chưa đọc.",
          );
        }
      }

      if (countRequestId !== notificationCountRequestId.current) return;
      setNotificationUnread(count);
      setNotificationError(errors.join(" "));
    } finally {
      if (
        includeRecent &&
        previewRequestId === notificationPreviewRequestId.current
      ) {
        setIsLoadingNotifications(false);
      }
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(
      () => void loadNotifications(false),
      0,
    );
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadNotifications(false);
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(initialLoad);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!notificationOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!notificationPanelRef.current?.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotificationOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [notificationOpen]);

  useEffect(() => {
    let cancelled = false;
    void requestApi<unknown>("/roles")
      .then((response) => {
        if (!cancelled) setRoleLabels(normalizeRoleLabels(response));
      })
      .catch(() => {
        if (!cancelled) setRoleLabelsError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRoleLabels(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
              <h1 className="text-lg font-bold text-slate-900">{title}</h1>

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
                  {user?.fullName  ?? "Người dùng"}
                </p>
                <p className="text-xs text-slate-500">
                  @{user?.username}
                  {roleLabelsError
                    ? " · Không thể tải tên vai trò"
                    : isLoadingRoleLabels && roleNames.length === 0
                      ? ""
                      : roleNames.length > 0 && ` · ${roleNames.join(", ")}`}
                </p>
              </div>

              <div className="relative" ref={notificationPanelRef}>
                <button
                  type="button"
                  aria-label={
                    notificationUnread === null
                      ? "Thông báo"
                      : `Thông báo, ${notificationUnread} chưa đọc`
                  }
                  aria-haspopup="dialog"
                  aria-expanded={notificationOpen}
                  onClick={() => {
                    if (notificationOpen) {
                      setNotificationOpen(false);
                    } else {
                      setNotificationOpen(true);
                      void loadNotifications(true);
                    }
                  }}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-blue-700"
                >
                  <Bell className="h-5 w-5" />
                  {notificationUnread !== null && notificationUnread > 0 && (
                    <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                      {notificationUnread > 99 ? "99+" : notificationUnread}
                    </span>
                  )}
                </button>
                {notificationOpen && (
                  <div
                    role="dialog"
                    aria-label="Thông báo mới nhất"
                    className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <h2 className="text-sm font-bold text-slate-900">
                        Thông báo
                      </h2>
                      <span className="text-xs text-slate-500">
                        {notificationUnread ?? "—"} chưa đọc
                      </span>
                    </div>
                    {notificationError && (
                      <p role="alert" className="px-4 py-3 text-sm text-red-600">
                        {notificationError}
                      </p>
                    )}
                    {isLoadingNotifications ? (
                      <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Đang tải...
                      </div>
                    ) : recentNotifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-slate-500">
                        Chưa có thông báo nào.
                      </p>
                    ) : (
                      <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
                        {recentNotifications.slice(0, 5).map((notification) => (
                          <li key={notification.id}>
                            <Link
                              href={
                                notification.taskId
                                  ? `/quan-tri/cong-viec/nhiem-vu/${encodeURIComponent(notification.taskId)}`
                                  : "/quan-tri/thong-bao"
                              }
                              onClick={() => {
                                setNotificationOpen(false);
                                if (!notification.isRead) {
                                  void requestApi(
                                    `/notifications/${encodeURIComponent(notification.id)}/read`,
                                    { method: "PATCH" },
                                  )
                                    .then(() =>
                                      setNotificationUnread((current) =>
                                        current === null
                                          ? current
                                          : Math.max(0, current - 1),
                                      ),
                                    )
                                    .catch((error: unknown) =>
                                      setNotificationError(
                                        error instanceof Error
                                          ? error.message
                                          : "Không thể cập nhật trạng thái thông báo.",
                                      ),
                                    );
                                }
                              }}
                              className={`block px-4 py-3 hover:bg-slate-50 ${
                                notification.isRead ? "" : "bg-sky-50/60"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {!notification.isRead && (
                                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                                )}
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-slate-800">
                                    {notification.title || "Thông báo"}
                                  </span>
                                  {notification.content && (
                                    <span className="mt-0.5 block line-clamp-2 text-xs text-slate-600">
                                      {notification.content}
                                    </span>
                                  )}
                                  <span className="mt-1 block text-xs text-slate-400">
                                    {formatNotificationTime(notification.createdAt)}
                                  </span>
                                </span>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      href="/quan-tri/thong-bao"
                      onClick={() => setNotificationOpen(false)}
                      className="block border-t border-slate-100 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-blue-700 hover:bg-blue-50"
                    >
                      XEM TẤT CẢ THÔNG BÁO
                    </Link>
                  </div>
                )}
              </div>

              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={`Ảnh đại diện của ${user.fullName || "người dùng"}`}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <UserRound className="h-5 w-5" />
                </div>
              )}
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