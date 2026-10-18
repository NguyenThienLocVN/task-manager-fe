"use client";

import { FormEvent } from "react";
import { Filter, RotateCcw, Search } from "lucide-react";
import {
  AnalyticsFilters as Filters,
  AnalyticsOption,
  STATUS_LABELS,
  TASK_STATUSES,
  TaskStatus,
} from "./analytics";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100";

export default function AnalyticsFilters({
  filters,
  onChange,
  onApply,
  onReset,
  departments,
  users,
  includeAssignmentFilters = false,
  loading = false,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onApply: () => void;
  onReset: () => void;
  departments?: AnalyticsOption[];
  users?: AnalyticsOption[];
  includeAssignmentFilters?: boolean;
  loading?: boolean;
}) {
  const set = (key: keyof Filters, value: string) =>
    onChange({ ...filters, [key]: value });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply();
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Filter className="h-4 w-4 text-blue-700" />
        Bộ lọc báo cáo
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {includeAssignmentFilters && (
          <>
            <label className="text-xs font-semibold text-slate-600">
              Phòng ban
              <select
                className={inputClass}
                value={filters.departmentId}
                onChange={(event) => set("departmentId", event.target.value)}
              >
                <option value="">Tất cả phòng ban</option>
                {(departments ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Người phụ trách
              <select
                className={inputClass}
                value={filters.responsibleUserId}
                onChange={(event) =>
                  set("responsibleUserId", event.target.value)
                }
              >
                <option value="">Tất cả người phụ trách</option>
                {(users ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="text-xs font-semibold text-slate-600">
          Trạng thái
          <select
            className={inputClass}
            value={filters.status}
            onChange={(event) => set("status", event.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status as TaskStatus]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Tình trạng hạn
          <select
            className={inputClass}
            value={filters.overdue}
            onChange={(event) => set("overdue", event.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="true">Quá hạn</option>
            <option value="false">Chưa quá hạn</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Bắt đầu từ
          <input
            type="date"
            className={inputClass}
            value={filters.startDateFrom}
            onChange={(event) => set("startDateFrom", event.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Bắt đầu đến
          <input
            type="date"
            className={inputClass}
            value={filters.startDateTo}
            onChange={(event) => set("startDateTo", event.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Hạn xử lý từ
          <input
            type="date"
            className={inputClass}
            value={filters.dueDateFrom}
            onChange={(event) => set("dueDateFrom", event.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Hạn xử lý đến
          <input
            type="date"
            className={inputClass}
            value={filters.dueDateTo}
            onChange={(event) => set("dueDateTo", event.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2 xl:col-span-3">
          Tìm công việc
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClass} pl-9`}
              value={filters.search}
              onChange={(event) => set("search", event.target.value)}
              placeholder="Tìm theo tiêu đề hoặc mã công việc"
            />
          </span>
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Filter className="h-4 w-4" />
            Áp dụng
          </button>
          <button
            type="button"
            disabled={loading}
            aria-label="Xóa bộ lọc"
            title="Xóa bộ lọc"
            onClick={onReset}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-3 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </form>
  );
}
