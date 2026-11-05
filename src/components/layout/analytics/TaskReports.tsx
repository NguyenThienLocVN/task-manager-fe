"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, BarChart3, Building2, CheckCircle2, ClipboardList, Clock3, Download, LoaderCircle, UserRound } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Worksheet } from "exceljs";
import { apiRequest } from "@/lib/auth/api";
import AnalyticsFilters from "./AnalyticsFilters";
import { AnalyticsFilters as Filters, AnalyticsOption, asRecord, buildFilterParams, dateRangeError, EMPTY_FILTERS, normalizeOption, read, readList, STATUS_LABELS, TASK_STATUSES, TaskStatus, text, unwrap } from "./analytics";

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

const STATUS_CHART_COLORS: Record<TaskStatus, string> = {
  NEW: "#94a3b8",
  ASSIGNED: "#f59e0b",
  IN_PROGRESS: "#2563eb",
  PENDING_REVIEW: "#8b5cf6",
  COMPLETED: "#10b981",
  CANCELLED: "#f43f5e",
};

const STATUS_GROUP_KEYS: Record<TaskStatus, keyof ReportGroup> = {
  NEW: "new",
  ASSIGNED: "assigned",
  IN_PROGRESS: "inProgress",
  PENDING_REVIEW: "pendingReview",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
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

function groupTotal(rows: ReportGroup[], key: keyof ReportGroup) {
  return rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
}

function styleTitleRow(
  worksheet: Worksheet,
  rowNumber: number,
  columnCount: number,
  fontSize = 12,
) {
  worksheet.mergeCells(rowNumber, 1, rowNumber, columnCount);
  worksheet.getRow(rowNumber).height = 26;
  for (let column = 1; column <= columnCount; column += 1) {
    const cell = worksheet.getCell(rowNumber, column);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: fontSize };
    cell.alignment = { vertical: "middle" };
  }
}

function styleHeaderRow(worksheet: Worksheet, rowNumber: number) {
  const row = worksheet.getRow(rowNumber);
  row.height = 22;
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
    cell.font = { bold: true, color: { argb: "FF1E293B" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
}

function formatFilterDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export default function TaskReports() {
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [activeFilters, setActiveFilters] = useState<Filters>({
    ...EMPTY_FILTERS,
  });
  const groupBy: GroupBy = "department";
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [statistics, setStatistics] = useState(EMPTY_STATISTICS);
  const [departments, setDepartments] = useState<AnalyticsOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const reportRequestId = useRef(0);

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    setOptionsError(null);
    try {
      const result = await apiRequest<unknown>("/departments");
      setDepartments(
        readList(result, "phòng ban")
          .items.map(normalizeOption)
          .filter((item): item is AnalyticsOption => Boolean(item)),
      );
    } catch (loadError) {
      setDepartments([]);
      setOptionsError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được danh sách phòng ban.",
      );
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  const loadReport = useCallback(async () => {
    const requestId = ++reportRequestId.current;
    setIsLoading(true);
    setError(null);
    const params = buildFilterParams(activeFilters);
    const reportParams = new URLSearchParams(params);
    reportParams.set("groupBy", groupBy);
    const [reportResult, statisticsResult] = await Promise.allSettled([
        apiRequest<unknown>(
          `/tasks/statistics/report?${reportParams.toString()}`,
        ),
        apiRequest<unknown>(
          `/tasks/statistics${params.size ? `?${params.toString()}` : ""}`,
        ),
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

    if (failures.length) setError(failures.join(" "));
    setIsLoading(false);
  }, [activeFilters, groupBy]);

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
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const statusChartData = TASK_STATUSES.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    count:
      statistics.counts[status] ??
      groupTotal(groups, STATUS_GROUP_KEYS[status]),
  }));
  const statusChartTotal = statusChartData.reduce(
    (sum, { count }) => sum + count,
    0,
  );

  const exportReport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const exportedAt = new Date();
      workbook.creator = "Task Manager";
      workbook.created = exportedAt;

    const departmentName =
      departments.find(({ id }) => id === activeFilters.departmentId)?.name ||
      (activeFilters.departmentId || "Tất cả phòng ban");
    const selectedStatus = TASK_STATUSES.find(
      (status) => status === activeFilters.status,
    );
      const overview = workbook.addWorksheet("Tổng quan", {
        views: [{ state: "frozen", ySplit: 1 }],
      });
      overview.columns = [{ width: 30 }, { width: 42 }];
      overview.addRow(["BÁO CÁO CÔNG VIỆC"]);
      styleTitleRow(overview, 1, 2, 16);
      overview.addRow(["THÔNG TIN BỘ LỌC"]);
      styleTitleRow(overview, 2, 2);
      overview.addRows([
        ["Thời gian xuất", exportedAt.toLocaleString("vi-VN")],
        ["Phòng ban", departmentName],
        [
          "Trạng thái",
          selectedStatus ? STATUS_LABELS[selectedStatus] : "Tất cả trạng thái",
        ],
        [
          "Trạng thái hạn",
          activeFilters.overdue === "true"
            ? "Quá hạn"
            : activeFilters.overdue === "false"
              ? "Chưa quá hạn"
              : "Tất cả",
        ],
        [
          "Thời gian bắt đầu",
          activeFilters.startDateFrom
            ? formatFilterDate(activeFilters.startDateFrom)
            : "Không giới hạn",
        ],
        [
          "Thời gian kết thúc",
          activeFilters.startDateTo
            ? formatFilterDate(activeFilters.startDateTo)
            : "Không giới hạn",
        ],
        [],
        ["CHỈ SỐ TỔNG QUAN"],
      ]);
      styleTitleRow(overview, 10, 2);
      overview.addRows([
        ["Tổng công việc", total],
        ["Đang xử lý", active],
        ["Quá hạn", overdue],
        ["Đã hoàn thành", completed],
        ["Tỷ lệ hoàn thành", completionRate / 100],
      ]);
      for (const rowNumber of [3, 4, 5, 6, 7, 8, 11, 12, 13, 14, 15]) {
        overview.getCell(rowNumber, 1).font = {
          bold: true,
          color: { argb: "FF475569" },
        };
      }
      for (const rowNumber of [11, 12, 13, 14]) {
        overview.getCell(rowNumber, 2).numFmt = "#,##0";
      }
      overview.getCell(15, 2).numFmt = "0%";

      const statusSheet = workbook.addWorksheet("Cơ cấu trạng thái", {
        views: [{ state: "frozen", ySplit: 3 }],
      });
      statusSheet.columns = [{ width: 30 }, { width: 18 }];
      statusSheet.addRow(["CƠ CẤU TRẠNG THÁI"]);
      styleTitleRow(statusSheet, 1, 2, 16);
      statusSheet.addRow([]);
      statusSheet.addRow(["Trạng thái", "Số lượng"]);
      styleHeaderRow(statusSheet, 3);
      statusChartData.forEach(({ label, count: statusCount }) => {
        statusSheet.addRow([label, statusCount]);
      });
      statusSheet.autoFilter = `A3:B${3 + statusChartData.length}`;
      for (let rowNumber = 4; rowNumber < 4 + statusChartData.length; rowNumber += 1) {
        statusSheet.getCell(rowNumber, 2).numFmt = "#,##0";
      }

      const departmentSheet = workbook.addWorksheet("Theo phòng ban", {
        views: [{ state: "frozen", ySplit: 3 }],
      });
      departmentSheet.columns = [
        { width: 32 },
        { width: 16 },
        { width: 20 },
        { width: 18 },
        { width: 16 },
        { width: 26 },
      ];
      departmentSheet.addRow(["KẾT QUẢ THEO PHÒNG BAN"]);
      styleTitleRow(departmentSheet, 1, 6, 16);
      departmentSheet.addRow([]);
      departmentSheet.addRow([
        "Phòng ban",
        "Tổng",
        "Đang xử lý",
        "Hoàn thành",
        "Quá hạn",
        "Tiến độ trung bình",
      ]);
      styleHeaderRow(departmentSheet, 3);
      groups.forEach((group) => {
        departmentSheet.addRow([
          group.groupName || "Chưa có phòng ban",
          group.total,
          group.assigned + group.inProgress + group.pendingReview,
          group.completed,
          group.overdue,
          group.avgProgress / 100,
        ]);
      });
      departmentSheet.autoFilter = `A3:F${Math.max(3, 3 + groups.length)}`;
      for (let rowNumber = 4; rowNumber < 4 + groups.length; rowNumber += 1) {
        for (let column = 2; column <= 5; column += 1) {
          departmentSheet.getCell(rowNumber, column).numFmt = "#,##0";
        }
        departmentSheet.getCell(rowNumber, 6).numFmt = "0%";
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([new Uint8Array(buffer)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = [
        exportedAt.getFullYear(),
        String(exportedAt.getMonth() + 1).padStart(2, "0"),
        String(exportedAt.getDate()).padStart(2, "0"),
      ].join("-");
      link.href = url;
      link.download = `bao-cao-cong-viec-${date}.xlsx`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (exportFailure) {
      setExportError(
        exportFailure instanceof Error
          ? `Không thể xuất báo cáo Excel: ${exportFailure.message}`
          : "Không thể xuất báo cáo Excel. Vui lòng thử lại.",
      );
    } finally {
      setIsExporting(false);
    }
  };

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

      <AnalyticsFilters
        filters={filters}
        onChange={setFilters}
        onApply={applyFilters}
        onReset={resetFilters}
        departments={departments}
        includeAssignmentFilters
        advancedToggle
        reportFiltersOnly
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

      {exportError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{exportError}</span>
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
            Icon: ClipboardList,
            color: "bg-blue-50 text-blue-700",
          },
          {
            label: "Đang xử lý",
            value: active,
            Icon: Clock3,
            color: "bg-violet-50 text-violet-700",
          },
          {
            label: "Quá hạn",
            value: overdue,
            Icon: AlertTriangle,
            color: "bg-rose-50 text-rose-700",
          },
          {
            label: "Đã hoàn thành",
            value: completed,
            Icon: CheckCircle2,
            color: "bg-emerald-50 text-emerald-700",
          },
        ].map(({ label, value, Icon, color }) => (
          <article
            key={label}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:gap-4 sm:p-4"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-500">{label}</p>
              </div>
              <p className="shrink-0 text-2xl font-bold tracking-tight text-slate-900">
                {isLoading ? (
                  <span className="inline-block h-7 w-10 animate-pulse rounded bg-slate-100" />
                ) : (
                  value.toLocaleString("vi-VN")
                )}
              </p>
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
                Tổng hợp số lượng, trạng thái và tiến độ theo từng phòng ban.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {groups.length} nhóm
              </span>
              <button
                type="button"
                onClick={() => void exportReport()}
                disabled={isLoading || Boolean(error) || isExporting}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExporting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isExporting ? "ĐANG XUẤT..." : "XUẤT BÁO CÁO"}
              </button>
            </div>
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
                    return (
                      <tr
                        key={`${group.groupId ?? "unassigned"}-${index}`}
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
          <div
            className="mt-3 h-48 w-full"
            aria-label="Biểu đồ tròn cơ cấu trạng thái"
          >
            {statusChartTotal > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie
                    data={statusChartData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {statusChartData.map(({ status }) => (
                      <Cell key={status} fill={STATUS_CHART_COLORS[status]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Chưa có dữ liệu trạng thái.
              </div>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
            {statusChartData.map(({ status, label, count }) => (
              <div key={status} className="flex min-w-0 items-center gap-1.5 text-xs">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: STATUS_CHART_COLORS[status] }}
                />
                <span className="min-w-0 flex-1 truncate text-slate-600" title={label}>
                  {label}
                </span>
                <span className="shrink-0 font-semibold text-slate-800">
                  {count.toLocaleString("vi-VN")}
                </span>
              </div>
            ))}
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

    </div>
  );
}
