"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashedCheck,
  LoaderCircle,
  Mail,
  MessageSquare,
  Send,
  Trash2,
  UserCheck,
  UserPlus,
  Waypoints,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { apiRequest } from "@/lib/auth/api";
import {
  formatNotificationTime,
  readNotificationPage,
  readUnreadCount,
  type NotificationItem,
} from "@/lib/notifications";

type NotificationType =
  | "TASK_ROUTED"
  | "TASK_ACCEPTED"
  | "TASK_DELEGATED"
  | "TASK_SUBMITTED"
  | "TASK_APPROVED"
  | "TASK_REJECTED"
  | "TASK_COMMENT";

const TYPE_META: Record<
  NotificationType,
  { label: string; icon: LucideIcon; tone: string }
> = {
  TASK_ROUTED: { label: "Giao việc", icon: Waypoints, tone: "bg-sky-100 text-sky-700" },
  TASK_ACCEPTED: { label: "Tiếp nhận", icon: UserCheck, tone: "bg-emerald-100 text-emerald-700" },
  TASK_DELEGATED: { label: "Phân công lại", icon: UserPlus, tone: "bg-violet-100 text-violet-700" },
  TASK_SUBMITTED: { label: "Chờ duyệt", icon: Send, tone: "bg-amber-100 text-amber-700" },
  TASK_APPROVED: { label: "Đã duyệt", icon: CheckCircle2, tone: "bg-green-100 text-green-700" },
  TASK_REJECTED: { label: "Yêu cầu làm lại", icon: XCircle, tone: "bg-red-100 text-red-700" },
  TASK_COMMENT: { label: "Bình luận", icon: MessageSquare, tone: "bg-slate-100 text-slate-700" },
};

const PAGE_SIZE = 20;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Đã xảy ra lỗi.";
}

const READ_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "false", label: "Chưa đọc" },
  { value: "true", label: "Đã đọc" },
];

export default function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isReadFilter, setIsReadFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    setUnread(null);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (isReadFilter) params.set("isRead", isReadFilter);
    if (typeFilter) params.set("notificationType", typeFilter);
    try {
      const [list, count] = await Promise.all([
        apiRequest<unknown>(`/notifications?${params}`),
        apiRequest<unknown>("/notifications/unread-count").catch(() => null),
      ]);
      if (id !== requestId.current) return;
      const result = readNotificationPage(list, PAGE_SIZE);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      const visibleUnreadCount = result.items.filter((item) => !item.isRead).length;
      let unreadCount = readUnreadCount(count);
      if (unreadCount === null || unreadCount === 0) {
        const unreadParams = new URLSearchParams({
          page: "1",
          limit: "1",
          isRead: "false",
        });
        const unreadList = await apiRequest<unknown>(
          `/notifications?${unreadParams}`,
        );
        unreadCount = Math.max(
          readNotificationPage(unreadList, 1).total,
          visibleUnreadCount,
        );
      }
      if (id !== requestId.current) return;
      setUnread(Math.max(unreadCount, visibleUnreadCount));
    } catch (e) {
      if (id === requestId.current) setError(errorMessage(e));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [page, isReadFilter, typeFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () =>
      document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const toggleRead = (n: NotificationItem) =>
    run(() =>
      apiRequest(`/notifications/${encodeURIComponent(n.id)}/${n.isRead ? "unread" : "read"}`, {
        method: "PATCH",
      }),
    );
  const remove = (n: NotificationItem) =>
    run(() => apiRequest(`/notifications/${encodeURIComponent(n.id)}`, { method: "DELETE" }));
  const readAll = () => run(() => apiRequest("/notifications/read-all", { method: "PATCH" }));
  const removeRead = () => {
    if (!window.confirm("Xoá tất cả thông báo đã đọc?")) return;
    void run(() => apiRequest("/notifications/read", { method: "DELETE" }));
  };
  const markReadOnOpen = (n: NotificationItem) => {
    if (n.isRead) return;
    void apiRequest(`/notifications/${encodeURIComponent(n.id)}/read`, { method: "PATCH" }).catch(
      () => undefined,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Bell className="h-5 w-5 text-slate-500" />
          <span className="text-sm font-semibold text-slate-800">
            {unread ?? "—"} chưa đọc
          </span>
          <span className="text-sm text-slate-500">/ {total} thông báo</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm"
            aria-label="Lọc theo loại"
          >
            <option value="">Mọi loại</option>
            {Object.entries(TYPE_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <div className="flex overflow-hidden rounded-lg border border-slate-300 text-sm">
            {READ_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setIsReadFilter(f.value);
                  setPage(1);
                }}
                className={`h-9 px-3 ${isReadFilter === f.value ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Đang tải...
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Không có thông báo nào.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => {
              const meta = TYPE_META[n.type as NotificationType];
              const Icon = meta?.icon ?? Bell;
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 p-4 ${n.isRead ? "" : "bg-sky-100"}`}
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta?.tone ?? "bg-slate-100 text-slate-700"}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-sky-500" />}
                      <p
                        className={`text-sm ${n.isRead ? "text-slate-700" : "font-semibold text-slate-900"}`}
                      >
                        {n.title || meta?.label || "Thông báo"}
                      </p>
                      {meta && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {meta.label}
                        </span>
                      )}
                    </div>
                    {n.content && <p className="mt-1 text-sm text-slate-600">{n.content}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{formatNotificationTime(n.createdAt)}</span>
                      {n.taskId && (
                        <Link
                          href={`/quan-tri/cong-viec/nhiem-vu?taskId=${encodeURIComponent(n.taskId)}`}
                          onClick={() => markReadOnOpen(n)}
                          className="font-medium text-sky-700 hover:underline"
                        >
                          {"Xem nhiệm vụ"}
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => void toggleRead(n)}
                      disabled={busy}
                      title={n.isRead ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
                      aria-label={n.isRead ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                    >
                      {n.isRead ? (
                        <CircleDashedCheck className="h-4 w-4" />
                      ) : (
                        <CheckCheck className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(n)}
                      disabled={busy}
                      title="Xoá"
                      aria-label="Xoá thông báo"
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex h-9 items-center rounded-lg border border-slate-300 px-2 disabled:opacity-50"
            aria-label="Trang trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>
            Trang {page}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="inline-flex h-9 items-center rounded-lg border border-slate-300 px-2 disabled:opacity-50"
            aria-label="Trang sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
