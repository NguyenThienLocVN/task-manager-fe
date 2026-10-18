"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, BarChart3, Building2, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Clock3, LoaderCircle, Search, UserRound, X } from "lucide-react";
import { apiRequest } from "@/lib/auth/api";
import AnalyticsFilters from "./AnalyticsFilters";
import { AnalyticsFilters as Filters, AnalyticsOption, AnalyticsTask, asRecord, buildFilterParams, dateLabel, dateRangeError, EMPTY_FILTERS, isOverdue, normalizeOption, normalizeTask, priorityLabel, read, readList, STATUS_BADGES, STATUS_COLORS, STATUS_LABELS, TASK_STATUSES, TaskStatus, text, unwrap } from "./analytics";

type GroupBy = "department" | "responsible";

type ReportGroup = {
  groupId: string | null;
  groupName: string | null;
  total: number;
  new: number;
  assigned: number;
  inProgress: number;
  pendingReview: number;
  completed: number;
  cancelled: number;
  overdue: number;
  avgProgress: number;
};

type Statistics = {
  total: number | null;
  overdue: number | null;
  counts: Partial<Record<TaskStatus, number>>;
};

type DetailPanel = {
  label: string;
  items: Record<string, unknown>[];
};

const PAGE_SIZE = 20;
const EMPTY_STATISTICS: Statistics = {
  total: null,
  overdue: null,
  counts: {},
};

const COUNT_KEYS: Record<TaskStatus, string[]> = {
  NEW: ["NEW", "new", "newCount", "new_count", "newTasks", "new_tasks"],
  ASSIGNED: [
    "ASSIGNED",
    "assigned",
    "assignedCount",
    "assigned_count",
    "assignedTasks",
    "assigned_tasks",
  ],
  IN_PROGRESS: [
    "IN_PROGRESS",
    "inProgress",
    "in_progress",
    "inProgressCount",
    "in_progress_count",
    "inProgressTasks",
    "in_progress_tasks",
  ],
  PENDING_REVIEW: [
    "PENDING_REVIEW",
    "pendingReview",
    "pending_review",
    "pendingReviewCount",
    "pending_review_count",
    "pendingReviewTasks",
    "pending_review_tasks",
  ],
  COMPLETED: [
    "COMPLETED",
    "completed",
    "completedCount",
    "completed_count",
    "completedTasks",
    "completed_tasks",
  ],
  CANCELLED: [
    "CANCELLED",
    "cancelled",
    "cancelledCount",
    "cancelled_count",
    "cancelledTasks",
    "cancelled_tasks",
  ],
};

function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function count(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = numericValue(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function normalizeStatistics(value: unknown): Statistics {
  const root = asRecord(unwrap(value));
  if (!root) throw new Error("API thống kê không trả về dữ liệu hợp lệ.");
  const nested =
    asRecord(root.byStatus) ??
    asRecord(root.by_status) ??
    asRecord(root.statusCounts) ??
    asRecord(root.status_counts) ??
    asRecord(root.statistics) ??
    root;
  return {
    total: count(root, ["total", "totalTasks", "total_tasks"]),
    overdue:
      count(root, ["overdue", "overdueCount", "overdue_count"]) ??
      count(nested, ["overdue", "overdueCount", "overdue_count"]),
    counts: Object.fromEntries(
      TASK_STATUSES.flatMap((status) => {
        const value = count(nested, COUNT_KEYS[status]);
        return value === null ? [] : [[status, value]];
      }),
    ) as Partial<Record<TaskStatus, number>>,
  };
}

function normalizeReportRows(value: unknown): ReportGroup[] {
  return readList(value, "báo cáo")
    .items.map((item): ReportGroup | null => {
      const row = asRecord(item);
      if (!row) return null;
      const groupId = row.groupId ?? row.group_id;
      const avgProgress = numericValue(
        read(row, "avgProgress", "avg_progress"),
      );
      return {
        groupId:
          typeof groupId === "string" || typeof groupId === "number"
            ? String(groupId)
            : null,
        groupName: text(read(row, "groupName", "group_name")) || null,
        total: count(row, ["total"]) ?? 0,
        new: count(row, COUNT_KEYS.NEW) ?? 0,
        assigned: count(row, COUNT_KEYS.ASSIGNED) ?? 0,
        inProgress: count(row, COUNT_KEYS.IN_PROGRESS) ?? 0,
        pendingReview: count(row, COUNT_KEYS.PENDING_REVIEW) ?? 0,
        completed: count(row, COUNT_KEYS.COMPLETED) ?? 0,
        cancelled: count(row, COUNT_KEYS.CANCELLED) ?? 0,
        overdue: count(row, ["overdue", "overdueCount", "overdue_count"]) ?? 0,
        avgProgress:
          avgProgress === null
            ? 0
            : Math.min(100, Math.max(0, avgProgress)),
      };
    })
    .filter((row): row is ReportGroup => Boolean(row));
}

function normalizeTaskDetail(value: unknown): AnalyticsTask {
  const payload = asRecord(unwrap(value));
  const task = payload?.task ?? payload;
  const normalized = normalizeTask(task);
  if (!normalized) {
    throw new Error("API không trả về thông tin công việc hợp lệ.");
  }
  return normalized;
}

function detailItems(value: unknown, label: string) {
  return readList(value, label).items
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => Boolean(item));
}

function itemHeading(item: Record<string, unknown>): string {
  return (
    text(
      item.title ??
        item.action ??
        item.activity ??
        item.message ??
        item.comment ??
        item.note ??
        item.result ??
        item.status ??
        item.name,
    ) || "Thông tin cập nhật"
  );
}

function itemMetadata(item: Record<string, unknown>): string {
  const actor = asRecord(
    item.user ?? item.actor ?? item.createdByUser ?? item.created_by_user,
  );
  const actorName = text(
    actor?.fullName ?? actor?.full_name ?? actor?.name ?? item.userName,
  );
  const timestamp = text(
    item.createdAt ??
      item.created_at ??
      item.updatedAt ??
      item.updated_at ??
      item.issuedAt ??
      item.issued_at,
  );
  return [actorName, timestamp ? dateLabel(timestamp) : ""]
    .filter(Boolean)
    .join(" · ");
}

function groupTotal(rows: ReportGroup[], key: keyof ReportGroup) {
  return rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
}

export default function TaskReports() {
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [activeFilters, setActiveFilters] = useState<Filters>({
    ...EMPTY_FILTERS,
  });
  const [groupBy, setGroupBy] = useState<GroupBy>("department");
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [tasks, setTasks] = useState<AnalyticsTask[]>([]);
  const [statistics, setStatistics] = useState(EMPTY_STATISTICS);
  const [departments, setDepartments] = useState<AnalyticsOption[]>([]);
  const [users, setUsers] = useState<AnalyticsOption[]>([]);
  const [page, setPage] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<AnalyticsTask | null>(null);
  const [detailTask, setDetailTask] = useState<AnalyticsTask | null>(null);
  const [detailPanels, setDetailPanels] = useState<DetailPanel[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const reportRequestId = useRef(0);
  const detailRequestId = useRef(0);
  const taskListRef = useRef<HTMLElement>(null);

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    setOptionsError(null);
    const [departmentResult, userResult] = await Promise.allSettled([
      apiRequest<unknown>("/departments"),
      apiRequest<unknown>("/users"),
    ]);
    const failures: string[] = [];
    if (departmentResult.status === "fulfilled") {
      try {
        setDepartments(
          readList(departmentResult.value, "phòng ban")
            .items.map(normalizeOption)
            .filter((item): item is AnalyticsOption => Boolean(item)),
        );
      } catch (loadError) {
        setDepartments([]);
        failures.push(
          loadError instanceof Error
            ? loadError.message
            : "Không đọc được danh sách phòng ban.",
        );
      }
    } else {
      setDepartments([]);
      failures.push(
        departmentResult.reason instanceof Error
          ? departmentResult.reason.message
          : "Không tải được danh sách phòng ban.",
      );
    }
    if (userResult.status === "fulfilled") {
      try {
        setUsers(
          readList(userResult.value, "người dùng")
            .items.map(normalizeOption)
            .filter((item): item is AnalyticsOption => Boolean(item)),
        );
      } catch (loadError) {
        setUsers([]);
        failures.push(
          loadError instanceof Error
            ? loadError.message
            : "Không đọc được danh sách người dùng.",
        );
      }
    } else {
      setUsers([]);
      failures.push(
        userResult.reason instanceof Error
          ? userResult.reason.message
          : "Không tải được danh sách người dùng.",
      );
    }
    if (failures.length) setOptionsError(failures.join(" "));
    setIsLoadingOptions(false);
  }, []);

  const loadReport = useCallback(async () => {
    const requestId = ++reportRequestId.current;
    setIsLoading(true);
    setError(null);
    const params = buildFilterParams(activeFilters);
    const reportParams = new URLSearchParams(params);
    reportParams.set("groupBy", groupBy);
    const taskParams = new URLSearchParams(params);
    taskParams.set("page", String(page));
    taskParams.set("limit", String(PAGE_SIZE));
    const [reportResult, statisticsResult, tasksResult] =
      await Promise.allSettled([
        apiRequest<unknown>(
          `/tasks/statistics/report?${reportParams.toString()}`,
        ),
        apiRequest<unknown>(
          `/tasks/statistics${params.size ? `?${params.toString()}` : ""}`,
        ),
        apiRequest<unknown>(`/tasks?${taskParams.toString()}`),
      ]);
    if (requestId !== reportRequestId.current) return;
    const failures: string[] = [];

    if (reportResult.status === "fulfilled") {
      try {
        setGroups(normalizeReportRows(reportResult.value));
      } catch (loadError) {
        setGroups([]);
        failures.push(
          loadError instanceof Error
            ? loadError.message
            : "Không đọc được báo cáo theo nhóm.",
        );
      }
    } else {
      setGroups([]);
      failures.push(
        reportResult.reason instanceof Error
          ? reportResult.reason.message
          : "Không tải được báo cáo theo nhóm.",
      );
    }

    if (statisticsResult.status === "fulfilled") {
      try {
        setStatistics(normalizeStatistics(statisticsResult.value));
      } catch (loadError) {
        setStatistics(EMPTY_STATISTICS);
        failures.push(
          loadError instanceof Error
            ? loadError.message
            : "Không đọc được thống kê tổng quan.",
        );
      }
    } else {
      setStatistics(EMPTY_STATISTICS);
      failures.push(
        statisticsResult.reason instanceof Error
          ? statisticsResult.reason.message
          : "Không tải được thống kê tổng quan.",
      );
    }

    if (tasksResult.status === "fulfilled") {
      try {
        const result = readList(tasksResult.value, "công việc");
        setTasks(
          result.items
            .map(normalizeTask)
            .filter((task): task is AnalyticsTask => Boolean(task)),
        );
        setTotalTasks(result.total ?? result.items.length);
      } catch (loadError) {
        setTasks([]);
        setTotalTasks(0);
        failures.push(
          loadError instanceof Error
            ? loadError.message
            : "Không đọc được danh sách công việc.",
        );
      }
    } else {
      setTasks([]);
      setTotalTasks(0);
      failures.push(
        tasksResult.reason instanceof Error
          ? tasksResult.reason.message
          : "Không tải được danh sách công việc.",
      );
    }

    if (failures.length) setError(failures.join(" "));
    setIsLoading(false);
  }, [activeFilters, groupBy, page]);

  useEffect(() => {
    Promise.resolve().then(() => {
      void loadOptions();
    });
  }, [loadOptions]);

  useEffect(() => {
    Promise.resolve().then(() => {
      void loadReport();
    });
  }, [loadReport]);

  const total = statistics.total ?? groupTotal(groups, "total");
  const overdue =
    statistics.overdue ?? groupTotal(groups, "overdue");
  const completed =
    statistics.counts.COMPLETED ?? groupTotal(groups, "completed");
  const active =
    (statistics.counts.ASSIGNED ?? groupTotal(groups, "assigned")) +
    (statistics.counts.IN_PROGRESS ?? groupTotal(groups, "inProgress")) +
    (statistics.counts.PENDING_REVIEW ??
      groupTotal(groups, "pendingReview"));
  const totalPages = Math.max(1, Math.ceil(totalTasks / PAGE_SIZE));
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const applyFilters = () => {
    const validationMessage = dateRangeError(filters);
    setDateError(validationMessage);
    if (validationMessage) return;
    setActiveFilters({ ...filters });
    setPage(1);
  };

  const resetFilters = () => {
    setDateError(null);
    setFilters({ ...EMPTY_FILTERS });
    setActiveFilters({ ...EMPTY_FILTERS });
    setPage(1);
  };

  const drillIntoGroup = (group: ReportGroup) => {
    if (!group.groupId) return;
    const key =
      groupBy === "department" ? "departmentId" : "responsibleUserId";
    const nextFilters = { ...activeFilters, [key]: group.groupId };
    setFilters(nextFilters);
    setActiveFilters(nextFilters);
    setPage(1);
    window.setTimeout(
      () => taskListRef.current?.scrollIntoView({ behavior: "smooth" }),
      0,
    );
  };

  const openTask = async (task: AnalyticsTask) => {
    const requestId = ++detailRequestId.current;
    setSelectedTask(task);
    setDetailTask(null);
    setDetailPanels([]);
    setDetailError(null);
    setDetailLoading(true);
    const encodedId = encodeURIComponent(task.id);
    const endpoints = [
      { key: "progress", label: "Cập nhật tiến độ" },
      { key: "history", label: "Lịch sử thao tác" },
      { key: "assignments", label: "Phân công" },
      { key: "routes", label: "Tuyến chuyển giao" },
      { key: "subtasks", label: "Công việc con" },
      { key: "comments", label: "Trao đổi" },
    ];
    const results = await Promise.allSettled([
      apiRequest<unknown>(`/tasks/${encodedId}`),
      ...endpoints.map(({ key }) =>
        apiRequest<unknown>(`/tasks/${encodedId}/${key}`),
      ),
    ]);
    if (requestId !== detailRequestId.current) return;

    const failures: string[] = [];
    const taskResult = results[0];
    if (taskResult.status === "fulfilled") {
      try {
        setDetailTask(normalizeTaskDetail(taskResult.value));
      } catch (loadError) {
        failures.push(
          loadError instanceof Error
            ? loadError.message
            : "Không đọc được chi tiết công việc.",
        );
      }
    } else {
      failures.push(
        taskResult.reason instanceof Error
          ? taskResult.reason.message
          : "Không tải được chi tiết công việc.",
      );
    }

    const panels: DetailPanel[] = [];
    for (const [index, endpoint] of endpoints.entries()) {
      const result = results[index + 1];
      if (result.status === "fulfilled") {
        try {
          panels.push({
            label: endpoint.label,
            items: detailItems(result.value, endpoint.label),
          });
        } catch (loadError) {
          failures.push(
            loadError instanceof Error
              ? loadError.message
              : `Không đọc được ${endpoint.label.toLowerCase()}.`,
          );
        }
      } else {
        failures.push(
          result.reason instanceof Error
            ? result.reason.message
            : `Không tải được ${endpoint.label.toLowerCase()}.`,
        );
      }
    }
    setDetailPanels(panels);
    if (failures.length) setDetailError(failures.join(" "));
    setDetailLoading(false);
  };

  const closeTask = () => {
    detailRequestId.current += 1;
    setSelectedTask(null);
    setDetailTask(null);
    setDetailPanels([]);
    setDetailError(null);
  };

  const currentTask = detailTask ?? selectedTask;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0e3060] via-[#164785] to-[#2364ae] p-6 text-white shadow-sm sm:flex sm:items-center sm:justify-between sm:px-8 sm:py-7">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative">
          <p className="flex items-center gap-2 text-sm font-medium text-blue-100">
            <BarChart3 className="h-4 w-4" />
            Theo dõi hiệu quả thực hiện công việc
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Báo cáo công việc
          </h2>
        </div>
        <div className="relative mt-5 inline-flex rounded-xl bg-white/10 p-1 sm:mt-0">
          {(
            [
              ["department", "Theo phòng ban"],
              ["responsible", "Theo người phụ trách"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setGroupBy(value);
                setPage(1);
              }}
              aria-pressed={groupBy === value}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                groupBy === value
                  ? "bg-white text-blue-800 shadow-sm"
                  : "text-white hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <AnalyticsFilters
        filters={filters}
        onChange={setFilters}
        onApply={applyFilters}
        onReset={resetFilters}
        departments={departments}
        users={users}
        includeAssignmentFilters
        loading={isLoading || isLoadingOptions}
      />

      {(dateError || optionsError) && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{[dateError, optionsError].filter(Boolean).join(" ")}</span>
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
            onClick={() => void loadReport()}
            className="shrink-0 font-semibold underline underline-offset-2"
          >
            Thử lại
          </button>
        </div>
      )}

      <section
        aria-label="Các chỉ số tổng quan"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          {
            label: "Tổng công việc",
            value: total,
            note: "Trong phạm vi bộ lọc",
            Icon: ClipboardList,
            color: "bg-blue-50 text-blue-700",
          },
          {
            label: "Đang xử lý",
            value: active,
            note: "Đã giao, đang làm, chờ duyệt",
            Icon: Clock3,
            color: "bg-violet-50 text-violet-700",
          },
          {
            label: "Quá hạn",
            value: overdue,
            note: "Cần ưu tiên theo dõi",
            Icon: AlertTriangle,
            color: "bg-rose-50 text-rose-700",
          },
          {
            label: "Đã hoàn thành",
            value: completed,
            note: `${completionRate}% tổng số công việc`,
            Icon: CheckCircle2,
            color: "bg-emerald-50 text-emerald-700",
          },
        ].map(({ label, value, note, Icon, color }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
            <div className="mt-1 flex items-end justify-between gap-2">
              <p className="text-3xl font-bold tracking-tight text-slate-900">
                {isLoading ? (
                  <span className="inline-block h-9 w-12 animate-pulse rounded bg-slate-100" />
                ) : (
                  value.toLocaleString("vi-VN")
                )}
              </p>
              <span className="text-right text-[11px] text-slate-500">{note}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.7fr)]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 className="font-bold text-slate-900">
                {groupBy === "department"
                  ? "Kết quả theo phòng ban"
                  : "Kết quả theo người phụ trách"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Chọn một dòng để lọc danh sách công việc phía dưới.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {groups.length} nhóm
            </span>
          </header>
          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
              Đang tổng hợp báo cáo...
            </div>
          ) : groups.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">
                      {groupBy === "department" ? "Phòng ban" : "Người phụ trách"}
                    </th>
                    <th className="px-3 py-3 text-right font-semibold">Tổng</th>
                    <th className="px-3 py-3 text-right font-semibold">Đang xử lý</th>
                    <th className="px-3 py-3 text-right font-semibold">Hoàn thành</th>
                    <th className="px-3 py-3 text-right font-semibold">Quá hạn</th>
                    <th className="px-5 py-3 font-semibold">Tiến độ TB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groups.map((group, index) => {
                    const groupFilterValue =
                      groupBy === "department"
                        ? activeFilters.departmentId
                        : activeFilters.responsibleUserId;
                    const selected = Boolean(
                      group.groupId && groupFilterValue === group.groupId,
                    );
                    return (
                      <tr
                        key={`${group.groupId ?? "unassigned"}-${index}`}
                        className={`transition ${
                          group.groupId
                            ? "cursor-pointer hover:bg-blue-50/70"
                            : ""
                        } ${selected ? "bg-blue-50" : ""}`}
                        onClick={() => drillIntoGroup(group)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                              {groupBy === "department" ? (
                                <Building2 className="h-4 w-4" />
                              ) : (
                                <UserRound className="h-4 w-4" />
                              )}
                            </span>
                            <span>
                              <span className="block font-semibold text-slate-800">
                                {group.groupName ||
                                  (groupBy === "department"
                                    ? "Chưa có phòng ban"
                                    : "Chưa có người phụ trách")}
                              </span>
                              <span className="mt-0.5 block text-xs text-slate-400">
                                {group.groupId
                                  ? "Nhấn để xem công việc"
                                  : "Không thể lọc theo nhóm chưa phân công"}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-right font-semibold text-slate-900">
                          {group.total}
                        </td>
                        <td className="px-3 py-4 text-right text-slate-600">
                          {group.assigned +
                            group.inProgress +
                            group.pendingReview}
                        </td>
                        <td className="px-3 py-4 text-right text-emerald-700">
                          {group.completed}
                        </td>
                        <td className="px-3 py-4 text-right">
                          <span
                            className={
                              group.overdue
                                ? "font-semibold text-rose-700"
                                : "text-slate-500"
                            }
                          >
                            {group.overdue}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex min-w-32 items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-600"
                                style={{ width: `${group.avgProgress}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-xs font-semibold text-slate-600">
                              {Math.round(group.avgProgress)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-14 text-center text-sm text-slate-500">
              <BarChart3 className="mx-auto mb-2 h-7 w-7 text-slate-300" />
              Chưa có dữ liệu phù hợp với bộ lọc.
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-bold text-slate-900">Cơ cấu trạng thái</h2>
          <p className="mt-1 text-xs text-slate-500">
            Số lượng công việc trong từng trạng thái
          </p>
          <div className="mt-5 space-y-4">
            {TASK_STATUSES.map((status) => {
              const value =
                statistics.counts[status] ??
                groupTotal(
                  groups,
                  ({
                    NEW: "new",
                    ASSIGNED: "assigned",
                    IN_PROGRESS: "inProgress",
                    PENDING_REVIEW: "pendingReview",
                    COMPLETED: "completed",
                    CANCELLED: "cancelled",
                  } as const)[status],
                );
              const percent = total > 0 ? Math.min(100, (value / total) * 100) : 0;
              return (
                <div key={status}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-slate-600">
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {value.toLocaleString("vi-VN")}
                    </span>
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
          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-600">
                Tỷ lệ hoàn thành
              </span>
              <span className="font-bold text-emerald-700">
                {completionRate}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </article>
      </section>

      <section
        id="task-list"
        ref={taskListRef}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2 className="font-bold text-slate-900">Danh sách công việc</h2>
            <p className="mt-1 text-xs text-slate-500">
              {totalTasks.toLocaleString("vi-VN")} công việc · Chọn một công
              việc để xem diễn biến chi tiết
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            <Search className="h-3.5 w-3.5" />
            Trang {page}/{totalPages}
          </span>
        </header>
        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
            Đang tải công việc...
          </div>
        ) : tasks.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Công việc</th>
                    <th className="px-3 py-3 font-semibold">Phòng ban</th>
                    <th className="px-3 py-3 font-semibold">Người phụ trách</th>
                    <th className="px-3 py-3 font-semibold">Trạng thái</th>
                    <th className="px-3 py-3 font-semibold">Hạn xử lý</th>
                    <th className="px-3 py-3 font-semibold">Tiến độ</th>
                    <th className="px-5 py-3 text-right font-semibold">Ưu tiên</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="cursor-pointer transition hover:bg-blue-50/60"
                      onClick={() => void openTask(task)}
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openTask(task);
                          }}
                          className="text-left"
                        >
                          <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {task.code || `CV-${task.id}`}
                          </span>
                          <span className="mt-1 block max-w-sm truncate font-semibold text-slate-800 hover:text-blue-700">
                            {task.title}
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-4 text-slate-600">
                        {task.departmentName || "Chưa phân phòng ban"}
                      </td>
                      <td className="px-3 py-4 text-slate-600">
                        {task.responsibleUserName || "Chưa phân công"}
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[task.status]}`}
                        >
                          {STATUS_LABELS[task.status]}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={
                            isOverdue(task)
                              ? "inline-flex items-center gap-1 font-semibold text-rose-700"
                              : "text-slate-600"
                          }
                        >
                          {isOverdue(task) && (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                          {dateLabel(task.dueDate)}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex min-w-28 items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs text-slate-600">
                            {task.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right text-slate-600">
                        {priorityLabel(task.priority)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-4 sm:px-6">
              <p className="text-xs text-slate-500">
                Hiển thị {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, totalTasks)} / {totalTasks}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || isLoading}
                  aria-label="Trang trước"
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page >= totalPages || isLoading}
                  aria-label="Trang tiếp theo"
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="py-14 text-center text-sm text-slate-500">
            <ClipboardList className="mx-auto mb-2 h-7 w-7 text-slate-300" />
            Không có công việc phù hợp.
          </div>
        )}
      </section>

      {selectedTask && currentTask && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeTask();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-task-detail-title"
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-t-3xl bg-slate-50 shadow-2xl sm:rounded-3xl"
          >
            <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {currentTask.code || `CV-${currentTask.id}`}
                </p>
                <h2
                  id="report-task-detail-title"
                  className="mt-1 text-lg font-bold text-slate-900"
                >
                  {currentTask.title}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[currentTask.status]}`}
                  >
                    {STATUS_LABELS[currentTask.status]}
                  </span>
                  {isOverdue(currentTask) && (
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                      Quá hạn
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label="Đóng chi tiết"
                onClick={closeTask}
                className="ml-3 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="space-y-5 p-4 sm:p-6">
              {detailError && (
                <div
                  role="alert"
                  className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                >
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{detailError}</span>
                </div>
              )}
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Phòng ban", currentTask.departmentName || "Chưa phân công"],
                  [
                    "Người phụ trách",
                    currentTask.responsibleUserName || "Chưa phân công",
                  ],
                  ["Ngày bắt đầu", dateLabel(currentTask.startDate)],
                  ["Hạn xử lý", dateLabel(currentTask.dueDate)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {value}
                    </p>
                  </div>
                ))}
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">
                    Tiến độ công việc
                  </span>
                  <span className="font-bold text-blue-700">
                    {currentTask.progress}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${currentTask.progress}%` }}
                  />
                </div>
              </section>
              {detailLoading && (
                <div className="flex items-center justify-center gap-2 py-5 text-sm text-slate-500">
                  <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
                  Đang tải lịch sử và chi tiết...
                </div>
              )}
              {!detailLoading && (
                <div className="grid gap-4 md:grid-cols-2">
                  {detailPanels.map((panel) => (
                    <section
                      key={panel.label}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800">
                          {panel.label}
                        </h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          {panel.items.length}
                        </span>
                      </div>
                      {panel.items.length ? (
                        <ul className="mt-3 max-h-56 space-y-3 overflow-y-auto">
                          {panel.items.map((item, index) => (
                            <li
                              key={text(item.id) || `${panel.label}-${index}`}
                              className="border-l-2 border-blue-200 pl-3"
                            >
                              <p className="text-sm font-medium text-slate-700">
                                {itemHeading(item)}
                              </p>
                              {itemMetadata(item) && (
                                <p className="mt-1 text-xs text-slate-400">
                                  {itemMetadata(item)}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-xs text-slate-500">
                          Chưa có dữ liệu.
                        </p>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
