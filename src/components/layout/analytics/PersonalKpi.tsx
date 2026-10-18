"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ClipboardList, LoaderCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/auth/api";
import AnalyticsFilters from "./AnalyticsFilters";
import { AnalyticsFilters as Filters, AnalyticsTask, buildFilterParams, dateLabel, dateRangeError, EMPTY_FILTERS, isOverdue, normalizeTask, priorityLabel, readList, STATUS_BADGES, STATUS_COLORS, STATUS_LABELS, TASK_STATUSES } from "./analytics";

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
    const [tasksResult] = await Promise.allSettled([
      apiRequest<unknown>(`/tasks/my-tasks${query}`),
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
  const departmentName =
    typeof user?.department === "string"
      ? user.department
      : user?.department?.name ??
        user?.department?.departmentName ??
        user?.department?.department_name ??
        "";
  const profileDetails = [user?.jobTitle, departmentName]
    .filter((value): value is string => Boolean(value))
    .join(" - ");

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
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              KPI cá nhân
            </h2>
            <p className="mt-2 text-sm text-blue-100">
              {user?.fullName || "Chuyên viên"}
              {profileDetails ? ` · ${profileDetails}` : ""}
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,0.7fr)]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-bold text-slate-900">
                Công việc của tôi
              </h2>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {taskCount} công việc
            </span>
          </header>
          <AnalyticsFilters
            filters={filters}
            onChange={setFilters}
            onApply={applyFilters}
            onReset={resetFilters}
            applyLabel="Tìm kiếm"
            advancedToggle
            embedded
            loading={isLoading}
          />
          {dateError && (
            <div
              role="alert"
              className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:mx-6"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {dateError}
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:mx-6"
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
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGES[task.status]}`} >
                          {STATUS_LABELS[task.status]}
                        </span>
                        {isOverdue(task) && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                            Quá hạn
                          </span>
                        )}
                      </div>
                      <h3 className="md:w-[500px] md:min-w-[500px] md:max-w-[500px] mt-1.5 text-sm font-semibold text-slate-800">
                        {task.title}
                      </h3>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Hạn: {dateLabel(task.dueDate)}</span>
                      <span>Ưu tiên: {priorityLabel(task.priority)}</span>
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

        </div>
      </section>
    </div>
  );
}
