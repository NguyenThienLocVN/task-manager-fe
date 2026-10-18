export type TaskStatus =
  | "NEW"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "COMPLETED"
  | "CANCELLED";

export type AnalyticsTask = {
  id: string;
  code: string;
  title: string;
  departmentId: string;
  departmentName: string;
  responsibleUserId: string;
  responsibleUserName: string;
  startDate: string;
  dueDate: string;
  priority: string;
  status: TaskStatus;
  progress: number;
};

export type AnalyticsFilters = {
  departmentId: string;
  responsibleUserId: string;
  status: string;
  startDateFrom: string;
  startDateTo: string;
  dueDateFrom: string;
  dueDateTo: string;
  overdue: string;
  search: string;
};

export type AnalyticsOption = {
  id: string;
  name: string;
};

export const EMPTY_FILTERS: AnalyticsFilters = {
  departmentId: "",
  responsibleUserId: "",
  status: "",
  startDateFrom: "",
  startDateTo: "",
  dueDateFrom: "",
  dueDateTo: "",
  overdue: "",
  search: "",
};

export const TASK_STATUSES: TaskStatus[] = [
  "NEW",
  "ASSIGNED",
  "IN_PROGRESS",
  "PENDING_REVIEW",
  "COMPLETED",
  "CANCELLED",
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  NEW: "Mới",
  ASSIGNED: "Đã giao",
  IN_PROGRESS: "Đang thực hiện",
  PENDING_REVIEW: "Chờ phê duyệt",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  NEW: "bg-slate-400",
  ASSIGNED: "bg-amber-500",
  IN_PROGRESS: "bg-blue-600",
  PENDING_REVIEW: "bg-violet-500",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-rose-500",
};

export const STATUS_BADGES: Record<TaskStatus, string> = {
  NEW: "bg-slate-100 text-slate-700",
  ASSIGNED: "bg-amber-50 text-amber-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  PENDING_REVIEW: "bg-violet-50 text-violet-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-rose-50 text-rose-700",
};

export type ApiListResult = {
  items: unknown[];
  total: number | null;
};

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

export function read(
  value: Record<string, unknown>,
  camel: string,
  snake: string,
): unknown {
  return value[camel] ?? value[snake];
}

export function unwrap(value: unknown): unknown {
  const wrapper = asRecord(value);
  return wrapper && "data" in wrapper ? wrapper.data : value;
}

export function readList(value: unknown, label: string): ApiListResult {
  const root = asRecord(value);
  const payload = unwrap(value);
  const payloadRecord = asRecord(payload);
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payloadRecord?.items)
      ? payloadRecord.items
      : null;
  if (!items) {
    throw new Error(`API không trả về danh sách ${label} hợp lệ.`);
  }

  const meta = asRecord(root?.meta ?? payloadRecord?.meta);
  const totalValue = meta?.total;
  const total =
    typeof totalValue === "number" && Number.isFinite(totalValue)
      ? totalValue
      : typeof totalValue === "string" && Number.isFinite(Number(totalValue))
        ? Number(totalValue)
        : null;
  return { items, total };
}

export function normalizeOption(value: unknown): AnalyticsOption | null {
  const item = asRecord(value);
  if (!item || (typeof item.id !== "string" && typeof item.id !== "number")) {
    return null;
  }
  const name = text(
    item.fullName ?? item.full_name ?? item.name ?? item.username,
  );
  return name ? { id: String(item.id), name } : null;
}

export function normalizeTask(value: unknown): AnalyticsTask | null {
  const item = asRecord(value);
  if (!item || (typeof item.id !== "string" && typeof item.id !== "number")) {
    return null;
  }
  const department = asRecord(item.department);
  const responsibleUser = asRecord(
    item.responsibleUser ?? item.responsible_user ?? item.assignee,
  );
  const status = text(item.status).toUpperCase() as TaskStatus;
  const progress = Number(read(item, "progressPercent", "progress_percent"));

  return {
    id: String(item.id),
    code: text(read(item, "taskCode", "task_code")),
    title: text(item.title) || "Công việc không có tiêu đề",
    departmentId: text(
      read(item, "departmentId", "department_id") ?? department?.id,
    ),
    departmentName: text(
      department?.name ?? item.departmentName ?? item.department_name,
    ),
    responsibleUserId: text(
      read(item, "responsibleUserId", "responsible_user_id") ??
        responsibleUser?.id,
    ),
    responsibleUserName: text(
      responsibleUser?.fullName ??
        responsibleUser?.full_name ??
        responsibleUser?.name ??
        item.responsibleUserName ??
        item.responsible_user_name,
    ),
    startDate: text(read(item, "startDate", "start_date")),
    dueDate: text(read(item, "dueDate", "due_date")),
    priority: text(item.priority).toLowerCase(),
    status: Object.hasOwn(STATUS_LABELS, status) ? status : "NEW",
    progress: Number.isFinite(progress)
      ? Math.min(100, Math.max(0, progress))
      : 0,
  };
}

export function buildFilterParams(
  filters: AnalyticsFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of [
    "departmentId",
    "responsibleUserId",
    "status",
    "startDateFrom",
    "startDateTo",
    "dueDateFrom",
    "dueDateTo",
    "overdue",
    "search",
  ] as const) {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  }
  return params;
}

export function dateRangeError(filters: AnalyticsFilters): string | null {
  if (
    filters.startDateFrom &&
    filters.startDateTo &&
    filters.startDateFrom > filters.startDateTo
  ) {
    return "Ngày bắt đầu từ không được sau ngày bắt đầu đến.";
  }
  if (
    filters.dueDateFrom &&
    filters.dueDateTo &&
    filters.dueDateFrom > filters.dueDateTo
  ) {
    return "Hạn xử lý từ không được sau hạn xử lý đến.";
  }
  return null;
}

export function dateLabel(value: string): string {
  if (!value) return "Chưa đặt hạn";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
}

export function isOverdue(task: AnalyticsTask): boolean {
  if (
    !task.dueDate ||
    task.status === "COMPLETED" ||
    task.status === "CANCELLED"
  ) {
    return false;
  }
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

export function priorityLabel(value: string): string {
  const labels: Record<string, string> = {
    "1": "Thấp",
    "2": "Trung bình",
    "3": "Cao",
    "4": "Khẩn",
    "5": "Khẩn",
    low: "Thấp",
    medium: "Trung bình",
    high: "Cao",
    urgent: "Khẩn",
  };
  return labels[value] ?? (value || "Trung bình");
}
