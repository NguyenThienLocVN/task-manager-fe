"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Inbox,
  LoaderCircle,
  Target,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/auth/api";
import AnalyticsFilters from "./AnalyticsFilters";
import {
  AnalyticsFilters as Filters,
  AnalyticsTask,
  buildFilterParams,
  dateLabel,
  dateRangeError,
  EMPTY_FILTERS,
  isOverdue,
  normalizeTask,
  priorityLabel,
  readList,
  STATUS_BADGES,
  STATUS_COLORS,
  STATUS_LABELS,
  TASK_STATUSES,
} from "./analytics";

type PersonalTasksResult = {
  tasks: AnalyticsTask[];
  total: number | null;
};

function normalizeTasks(value: unknown): PersonalTasksResult {
  const result = readList(value, "công việc cá nhân");
  return {
    tasks: result.items
      .map(normalizeTask)
      .filter((task): task is AnalyticsTask => Boolean(task)),
    total: result.total,
  };
}

export default function PersonalKpi() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [activeFilters, setActiveFilters] = useState<Filters>({
    ...EMPTY_FILTERS,
  });
  const [tasks, setTasks] = useState<AnalyticsTask[]>([]);
  const [inboxTasks, setInboxTasks] = useState<AnalyticsTask[]>([]);
  const [taskTotal, setTaskTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadKpi = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    setError(null);
    const params = buildFilterParams(activeFilters);
    const query = params.size ? `?${params.toString()}` : "";
    const [tasksResult, inboxResult] = await Promise.allSettled([
      apiRequest<unknown>(`/tasks/my-tasks${query}`),
      apiRequest<unknown>(`/tasks/workflow/my-inbox${query}`),
    ]);
    if (currentRequestId !== requestId.current) return;
    const failures: string[] = [];

    if (tasksResult.status === "fulfilled") {
      try {
        const normalized = normalizeTasks(tasksResult.value);
        setTasks(normalized.tasks);
        setTaskTotal(normalized.total);
      } catch (loadError) {
        setTasks([]);
        setTaskTotal(null);
        failures.push(
          loadError instanceof Error
            ? loadError.message
            : "Không đọc được danh sách công việc cá nhân.",
        );
      }
    } else {
      setTasks([]);
      setTaskTotal(null);
      failures.push(
        tasksResult.reason instanceof Error
          ? tasksResult.reason.message
          : "Không tải được công việc cá nhân.",
      );
    }

    if (inboxResult.status === "fulfilled") {
      try {
        setInboxTasks(
          readList(inboxResult.value, "công việc chờ xử lý")
            .items.map(normalizeTask)
            .filter((task): task is AnalyticsTask => Boolean(task)),
        );
      } catch (loadError) {
        setInboxTasks([]);
        failures.push(
          loadError instanceof Error
            ? loadError.message
            : "Không đọc được hộp thư công việc.",
        );
      }
    } else {
      setInboxTasks([]);
      failures.push(
        inboxResult.reason instanceof Error
          ? inboxResult.reason.message
          : "Không tải được hộp thư công việc.",
      );
    }

    if (failures.length) setError(failures.join(" "));
    setIsLoading(false);
  }, [activeFilters]);

  useEffect(() => {
    Promise.resolve().then(() => {
      void loadKpi();
    });
  }, [loadKpi]);

  const taskCount = taskTotal ?? tasks.length;
  const completedCount = tasks.filter(
    (task) => task.status === "COMPLETED",
  ).length;
  const overdueTasks = tasks.filter(isOverdue);
  const averageProgress = tasks.length
    ? Math.round(
        tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length,
      )
    : 0;
  const completionRate = taskCount
    ? Math.round((completedCount / taskCount) * 100)
    : 0;
  const statusCounts = useMemo(
    () =>
      Object.fromEntries(
        TASK_STATUSES.map((status) => [
          status,
          tasks.filter((task) => task.status === status).length,
        ]),
      ),
    [tasks],
  );
  const activeCount =
    (statusCounts.ASSIGNED ?? 0) +
    (statusCounts.IN_PROGRESS ?? 0) +
    (statusCounts.PENDING_REVIEW ?? 0);

  const applyFilters = () => {
    const validationMessage = dateRangeError(filters);
    setDateError(validationMessage);
    if (validationMessage) return;
    setActiveFilters({ ...filters });
  };

  const resetFilters = () => {
    setDateError(null);
    setFilters({ ...EMPTY_FILTERS });
    setActiveFilters({ ...EMPTY_FILTERS });
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0e3060] via-[#164785] to-[#2364ae] p-6 text-white shadow-sm sm:px-8 sm:py-7">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-blue-100">
              <Target className="h-4 w-4" />
              Hiệu quả công việc cá nhân
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              KPI cá nhân
            </h2>
            <p className="mt-2 text-sm text-blue-100">
              {user?.fullName || "Chuyên viên"}
              {user?.department ? ` · ${user.department}` : ""}
            </p>
          </div>
          <div className="relative rounded-2xl border border-white/15 bg-white/10 p-4 sm:min-w-56">
            <p className="text-xs font-medium text-blue-100">Tỷ lệ hoàn thành</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-4xl font-bold">{completionRate}%</span>
              <span className="mb-1 text-xs text-blue-100">
                {completedCount} / {taskCount}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-emerald-300 transition-[width]"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <AnalyticsFilters
        filters={filters}
        onChange={setFilters}
        onApply={applyFilters}
        onReset={resetFilters}
        loading={isLoading}
      />

      {dateError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {dateError}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => void loadKpi()}
            className="shrink-0 font-semibold underline underline-offset-2"
          >
            Thử lại
          </button>
        </div>
      )}

      <section
        aria-label="Chỉ số KPI cá nhân"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          {
            label: "Tổng công việc",
            value: taskCount,
            note: "Theo bộ lọc đã chọn",
            Icon: ClipboardList,
            tone: "bg-blue-50 text-blue-700",
          },
          {
            label: "Đang xử lý",
            value: activeCount,
            note: "Đã giao, đang làm, chờ duyệt",
            Icon: Clock3,
            tone: "bg-violet-50 text-violet-700",
          },
          {
            label: "Quá hạn",
            value: overdueTasks.length,
            note: "Công việc cần ưu tiên",
            Icon: AlertTriangle,
            tone: "bg-rose-50 text-rose-700",
          },
          {
            label: "Tiến độ trung bình",
            value: `${averageProgress}%`,
            note: `${inboxTasks.length} việc trong hộp thư`,
            Icon: TrendingUp,
            tone: "bg-emerald-50 text-emerald-700",
          },
        ].map(({ label, value, note, Icon, tone }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
            <div className="mt-1 flex items-end justify-between gap-2">
              <p className="text-3xl font-bold tracking-tight text-slate-900">
                {isLoading ? (
                  <span className="inline-block h-9 w-12 animate-pulse rounded bg-slate-100" />
                ) : typeof value === "number" ? (
                  value.toLocaleString("vi-VN")
                ) : (
                  value
                )}
              </p>
              <span className="text-right text-[11px] text-slate-500">{note}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 className="font-bold text-slate-900">
                Công việc của tôi
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Danh sách do API cá nhân trả về theo quyền truy cập
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {taskCount} công việc
            </span>
          </header>
          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
              Đang tải KPI cá nhân...
            </div>
          ) : tasks.length ? (
            <div className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <article key={task.id} className="px-5 py-4 sm:px-6">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {task.code || `CV-${task.id}`}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGES[task.status]}`}
                        >
                          {STATUS_LABELS[task.status]}
                        </span>
                        {isOverdue(task) && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                            Quá hạn
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1.5 truncate text-sm font-semibold text-slate-800">
                        {task.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {task.departmentName || "Chưa phân phòng ban"} ·{" "}
                        {task.responsibleUserName || "Chưa xác định người phụ trách"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Hạn {dateLabel(task.dueDate)}</span>
                      <span>{priorityLabel(task.priority)}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          STATUS_COLORS[task.status]
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-semibold text-slate-600">
                      {task.progress}%
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="py-14 text-center text-sm text-slate-500">
              <ClipboardList className="mx-auto mb-2 h-7 w-7 text-slate-300" />
              Không có công việc trong khoảng lọc này.
            </div>
          )}
        </article>

        <div className="space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-bold text-slate-900">Phân bổ theo trạng thái</h2>
            <p className="mt-1 text-xs text-slate-500">
              Tổng số: {taskCount.toLocaleString("vi-VN")} công việc
            </p>
            <div className="mt-5 space-y-4">
              {TASK_STATUSES.map((status) => {
                const value = statusCounts[status] ?? 0;
                const percent =
                  tasks.length > 0
                    ? Math.min(100, (value / tasks.length) * 100)
                    : 0;
                return (
                  <div key={status}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-slate-600">
                        {STATUS_LABELS[status]}
                      </span>
                      <span className="font-semibold text-slate-800">{value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${STATUS_COLORS[status]}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">Hộp thư cần xử lý</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Công việc chờ bạn tiếp nhận hoặc xử lý
                </p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Inbox className="h-4 w-4" />
              </span>
            </header>
            {isLoading ? (
              <div className="flex min-h-28 items-center justify-center">
                <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
              </div>
            ) : inboxTasks.length ? (
              <ul className="divide-y divide-slate-100">
                {inboxTasks.slice(0, 6).map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {task.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {task.code || `CV-${task.id}`} · {dateLabel(task.dueDate)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                      {STATUS_LABELS[task.status]}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center text-sm text-slate-500">
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
                Hộp thư đang trống.
              </div>
            )}
            {inboxTasks.length > 6 && (
              <div className="border-t border-slate-100 px-5 py-3 text-right">
                <a
                  href="/quan-tri/cong-viec/nhiem-vu"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800"
                >
                  Mở danh sách nhiệm vụ <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
