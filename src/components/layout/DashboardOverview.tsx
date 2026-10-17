"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LoaderCircle,
  Plus,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/auth/api";
import CurrentVietnameseDate from "@/components/layout/CurrentVietnameseDate";

type DashboardTask = {
  id: string;
  code: string;
  title: string;
  department: string;
  owner: string;
  dueDate: string;
  progress: number;
  priority: string;
  status: string;
};

type Statistics = {
  total: number | null;
  new: number | null;
  assigned: number | null;
  inProgress: number | null;
  pendingReview: number | null;
  completed: number | null;
  cancelled: number | null;
  overdue: number | null;
};

const EMPTY_STATISTICS: Statistics = {
  total: null,
  new: null,
  assigned: null,
  inProgress: null,
  pendingReview: null,
  completed: null,
  cancelled: null,
  overdue: null,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function unwrap(value: unknown): unknown {
  const wrapper = asRecord(value);
  return wrapper && "data" in wrapper ? wrapper.data : value;
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function list(value: unknown, label: string): unknown[] {
  const payload = unwrap(value);
  if (Array.isArray(payload)) return payload;
  const wrapper = asRecord(payload);
  if (wrapper && Array.isArray(wrapper.items)) return wrapper.items;
  throw new Error(`API không trả về danh sách ${label} hợp lệ.`);
}

function normalizedTask(value: unknown): DashboardTask | null {
  const item = asRecord(value);
  if (!item || (typeof item.id !== "string" && typeof item.id !== "number")) return null;
  const department = asRecord(item.department);
  const owner = asRecord(item.responsibleUser ?? item.responsible_user ?? item.assignee);
  const progressValue = Number(item.progressPercent ?? item.progress_percent);
  return {
    id: String(item.id),
    code: text(item.taskCode ?? item.task_code),
    title: text(item.title) || "Công việc không có tiêu đề",
    department: text(department?.name ?? item.departmentName ?? item.department_name),
    owner: text(owner?.fullName ?? owner?.full_name ?? owner?.name ?? item.responsibleUserName ?? item.responsible_user_name),
    dueDate: text(item.dueDate ?? item.due_date),
    progress: Number.isFinite(progressValue) ? Math.min(100, Math.max(0, progressValue)) : 0,
    priority: text(item.priority).toLowerCase(),
    status: text(item.status).toUpperCase(),
  };
}

function readCount(record: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function normalizeStatistics(value: unknown): Statistics {
  const root = asRecord(unwrap(value));
  if (!root) throw new Error("API thống kê không trả về dữ liệu hợp lệ.");
  const nested =
    asRecord(root.statusCounts) ??
    asRecord(root.status_counts) ??
    asRecord(root.byStatus) ??
    asRecord(root.by_status) ??
    asRecord(root.statistics) ??
    root;
  return {
    total: readCount(root, "total", "totalTasks", "total_tasks") ?? readCount(nested, "total", "totalTasks", "total_tasks"),
    new: readCount(nested, "NEW", "new", "newCount", "new_count", "newTasks", "new_tasks"),
    assigned: readCount(nested, "ASSIGNED", "assigned", "assignedCount", "assigned_count", "assignedTasks", "assigned_tasks"),
    inProgress: readCount(nested, "IN_PROGRESS", "inProgress", "in_progress", "inProgressCount", "in_progress_count", "inProgressTasks", "in_progress_tasks"),
    pendingReview: readCount(nested, "PENDING_REVIEW", "pendingReview", "pending_review", "pendingReviewCount", "pending_review_count", "pendingReviewTasks", "pending_review_tasks"),
    completed: readCount(nested, "COMPLETED", "completed", "completedCount", "completed_count", "completedTasks", "completed_tasks"),
    cancelled: readCount(nested, "CANCELLED", "cancelled", "cancelledCount", "cancelled_count", "cancelledTasks", "cancelled_tasks"),
    overdue: readCount(root, "overdue", "overdueCount", "overdue_count") ?? readCount(nested, "overdue", "overdueCount", "overdue_count"),
  };
}

function dateLabel(value: string): string {
  if (!value) return "Chưa đặt hạn";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function isOverdue(task: DashboardTask): boolean {
  if (!task.dueDate || ["COMPLETED", "CANCELLED"].includes(task.status)) return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState(EMPTY_STATISTICS);
  const [managedTasks, setManagedTasks] = useState<DashboardTask[]>([]);
  const [personalTasks, setPersonalTasks] = useState<DashboardTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [statisticsResult, tasksResult, personalResult] = await Promise.allSettled([
      apiRequest<unknown>("/tasks/statistics"),
      apiRequest<unknown>("/tasks"),
      apiRequest<unknown>("/tasks/my-tasks"),
    ]);
    const failures: string[] = [];
    if (statisticsResult.status === "fulfilled") {
      try {
        setStatistics(normalizeStatistics(statisticsResult.value));
      } catch (loadError) {
        setStatistics(EMPTY_STATISTICS);
        failures.push(loadError instanceof Error ? loadError.message : "Không đọc được thống kê.");
      }
    } else {
      setStatistics(EMPTY_STATISTICS);
      failures.push(statisticsResult.reason instanceof Error ? statisticsResult.reason.message : "Không tải được thống kê.");
    }
    if (tasksResult.status === "fulfilled") {
      try {
        setManagedTasks(list(tasksResult.value, "công việc").map(normalizedTask).filter((item): item is DashboardTask => Boolean(item)));
      } catch (loadError) {
        setManagedTasks([]);
        failures.push(loadError instanceof Error ? loadError.message : "Không tải được công việc.");
      }
    } else {
      setManagedTasks([]);
      failures.push(tasksResult.reason instanceof Error ? tasksResult.reason.message : "Không tải được danh sách công việc.");
    }
    if (personalResult.status === "fulfilled") {
      try {
        setPersonalTasks(list(personalResult.value, "công việc cá nhân").map(normalizedTask).filter((item): item is DashboardTask => Boolean(item)));
      } catch (loadError) {
        setPersonalTasks([]);
        failures.push(loadError instanceof Error ? loadError.message : "Không tải được công việc cá nhân.");
      }
    } else {
      setPersonalTasks([]);
      failures.push(personalResult.reason instanceof Error ? personalResult.reason.message : "Không tải được công việc cá nhân.");
    }
    if (failures.length) setError(failures.join(" "));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      void loadDashboard();
    });
  }, [loadDashboard]);

  const totals = useMemo(() => {
    const tasks = managedTasks;
    const fallback = (status: string) => tasks.filter((task) => task.status === status).length;
    const total = statistics.total ?? tasks.length;
    const active = (statistics.assigned ?? fallback("ASSIGNED")) +
      (statistics.inProgress ?? fallback("IN_PROGRESS")) +
      (statistics.pendingReview ?? fallback("PENDING_REVIEW"));
    return {
      total,
      active,
      overdue: tasks.filter(isOverdue).length,
      completed: statistics.completed ?? fallback("COMPLETED"),
      newTasks: statistics.new ?? fallback("NEW"),
      pendingReview: statistics.pendingReview ?? fallback("PENDING_REVIEW"),
    };
  }, [managedTasks, statistics]);

  const inProgressTasks = useMemo(
    () => personalTasks
      .filter((task) => ["ASSIGNED", "IN_PROGRESS", "PENDING_REVIEW"].includes(task.status))
      .sort((left, right) => {
        const a = left.dueDate ? new Date(left.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const b = right.dueDate ? new Date(right.dueDate).getTime() : Number.POSITIVE_INFINITY;
        return a - b;
      })
      .slice(0, 6),
    [personalTasks],
  );
  const overdueTasks = managedTasks.filter(isOverdue).slice(0, 5);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#0e3060] via-[#164785] to-[#2364ae] p-6 text-white shadow-sm sm:flex-row sm:items-center sm:px-8 sm:py-7">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-100"><CalendarDays className="h-4 w-4" /><CurrentVietnameseDate /></div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Xin chào, {user?.fullName || "bạn"}</h2>
        </div>
        <Link href="/quan-tri/cong-viec/nhiem-vu" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-blue-800 shadow-sm transition hover:bg-blue-50"><Plus className="h-4 w-4" />Tạo công việc mới</Link>
      </section>

      {error && <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><span className="flex-1">{error}</span><button type="button" className="font-semibold underline" onClick={() => void loadDashboard()}>Thử lại</button></div>}

      <section aria-label="Thống kê công việc" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tổng công việc", value: totals.total, note: `${totals.newTasks} công việc mới`, icon: ClipboardList, tone: "bg-blue-50 text-blue-700" },
          { label: "Đang xử lý", value: totals.active, note: `${totals.pendingReview} chờ phê duyệt`, icon: Clock3, tone: "bg-violet-50 text-violet-700" },
          { label: "Quá hạn", value: statistics.overdue ?? totals.overdue, note: "Cần được ưu tiên xử lý", icon: AlertTriangle, tone: "bg-rose-50 text-rose-700" },
          { label: "Đã hoàn thành", value: totals.completed, note: "Theo thống kê hệ thống", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
        ].map(({ label, value, note, icon: Icon, tone }) => (
          <article key={label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></div>
            <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
            <div className="mt-1 flex items-end justify-between gap-2"><p className="text-3xl font-bold tracking-tight text-slate-900">{isLoading ? <span className="inline-block h-9 w-12 animate-pulse rounded bg-slate-100" /> : value}</p><span className={`rounded-full px-2 py-1 text-right text-[11px] font-medium ${tone}`}>{note}</span></div>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
        <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6"><div><h2 className="font-bold text-slate-900">Công việc đang thực hiện</h2><p className="mt-1 text-xs text-slate-500">Công việc trong danh sách cá nhân của bạn</p></div><Link href="/quan-tri/cong-viec/nhiem-vu" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800">Xem tất cả <ArrowRight className="h-4 w-4" /></Link></header>
          {isLoading ? <div className="py-14 text-center text-slate-500"><LoaderCircle className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-600" />Đang tải công việc...</div> : inProgressTasks.length ? <div className="divide-y divide-slate-100">{inProgressTasks.map((task) => <div key={task.id} className="px-5 py-4 sm:px-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{task.code || `CV-${task.id}`}</span><span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{task.status === "PENDING_REVIEW" ? "Chờ duyệt" : task.status === "ASSIGNED" ? "Đã giao" : "Đang làm"}</span></div><h3 className="mt-1.5 truncate text-sm font-semibold text-slate-800">{task.title}</h3><p className="mt-1 text-xs text-slate-500">{task.department || "Chưa có phòng ban"}</p></div><div className="flex items-center gap-2 text-xs text-slate-500"><UserRound className="h-4 w-4" />{task.owner || "Bạn"}<span className="ml-2">Hạn {dateLabel(task.dueDate)}</span></div></div><div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${task.progress}%` }} /></div><span className="w-9 text-right text-xs font-semibold text-slate-600">{task.progress}%</span></div></div>)}</div> : <div className="py-14 text-center text-sm text-slate-500"><ClipboardList className="mx-auto mb-2 h-7 w-7 text-slate-300" />Không có công việc đang thực hiện.</div>}
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-bold text-slate-900">Tình hình xử lý</h2><p className="mt-1 text-xs text-slate-500">Theo trạng thái công việc</p>
          <div className="mt-5 space-y-4">{[
            ["Mới", totals.newTasks, "bg-slate-400"],
            ["Đã giao", statistics.assigned ?? managedTasks.filter((task) => task.status === "ASSIGNED").length, "bg-amber-500"],
            ["Đang thực hiện", statistics.inProgress ?? managedTasks.filter((task) => task.status === "IN_PROGRESS").length, "bg-blue-600"],
            ["Chờ phê duyệt", totals.pendingReview, "bg-violet-500"],
            ["Hoàn thành", totals.completed, "bg-emerald-500"],
            ["Đã hủy", statistics.cancelled ?? managedTasks.filter((task) => task.status === "CANCELLED").length, "bg-slate-400"],
          ].map(([label, value, color]) => {
            const amount = Number(value) || 0;
            const percentage = totals.total ? Math.min(100, (amount / totals.total) * 100) : 0;
            return <div key={label as string}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="text-slate-600">{label}</span><strong className="text-slate-800">{isLoading ? "—" : amount}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} /></div></div>;
          })}</div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6"><div><h2 className="font-bold text-slate-900">Công việc quá hạn</h2><p className="mt-1 text-xs text-slate-500">Các nhiệm vụ cần được theo dõi</p></div><span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">{isLoading ? "—" : statistics.overdue ?? totals.overdue}</span></header>
        {isLoading ? <div className="p-6 text-center text-slate-500"><LoaderCircle className="mx-auto h-5 w-5 animate-spin" /></div> : overdueTasks.length ? <div className="divide-y divide-slate-100">{overdueTasks.map((task) => <div key={task.id} className="flex flex-col justify-between gap-2 px-5 py-4 sm:flex-row sm:items-center sm:px-6"><div><p className="text-sm font-semibold text-slate-800">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.department || "Chưa có phòng ban"}{task.owner ? ` · ${task.owner}` : ""}</p></div><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700"><AlertTriangle className="h-4 w-4" />Hạn {dateLabel(task.dueDate)}</span></div>)}</div> : <div className="p-8 text-center text-sm text-slate-500"><CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500" />Không có công việc quá hạn.</div>}
        <div className="border-t border-slate-100 p-4 text-right"><Link href="/quan-tri/cong-viec/nhiem-vu" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800">Quản lý công việc <ArrowRight className="h-4 w-4" /></Link></div>
      </section>
    </div>
  );
}
