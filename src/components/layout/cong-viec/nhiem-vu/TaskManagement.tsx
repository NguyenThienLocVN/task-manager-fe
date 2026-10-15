"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  LoaderCircle,
  Search,
  ShieldAlert,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/auth/api";

type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "on_hold"
  | string;

type Assignment = {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  assignmentType: string;
  assignedBy: string;
  assignedAt: string;
  note: string;
  isActive: boolean;
};

type Task = {
  id: string;
  taskCode: string;
  title: string;
  description: string;
  documentId: string;
  documentTitle: string;
  documentNo: string;
  documentFileUrl: string;
  organizationId: string;
  organizationName: string;
  departmentId: string;
  departmentName: string;
  assignedBy: string;
  assignedByName: string;
  responsibleUserId: string;
  responsibleUserName: string;
  startDate: string;
  dueDate: string;
  completedAt: string;
  priority: string;
  status: TaskStatus;
  progressPercent: number;
  result: string;
  isImportant: boolean;
  isConfidential: boolean;
  createdAt: string;
  assignments: Assignment[];
};

type Lookup = {
  id: string;
  name: string;
  relatedName: string;
};

type TaskLookups = {
  users: Map<string, string>;
  departments: Map<string, string>;
  organizations: Map<string, string>;
  documents: Map<string, { title: string; documentNo: string; fileUrl: string }>;
};

const emptyLookups: TaskLookups = {
  users: new Map(),
  departments: new Map(),
  organizations: new Map(),
  documents: new Map(),
};

const statusLabels: Record<string, string> = {
  pending: "Chờ tiếp nhận",
  in_progress: "Đang thực hiện",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  on_hold: "Tạm dừng",
};

const priorityLabels: Record<string, string> = {
  low: "Thấp",
  medium: "Bình thường",
  normal: "Bình thường",
  high: "Cao",
  urgent: "Khẩn",
  critical: "Khẩn",
};

function recordOf(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function valueOf(
  record: Record<string, unknown>,
  camelName: string,
  snakeName: string,
): unknown {
  return record[camelName] ?? record[snakeName];
}

function stringOf(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function unwrap(value: unknown): unknown {
  const record = recordOf(value);
  return record && "data" in record ? record.data : value;
}

function readList(value: unknown, label: string): unknown[] {
  const unwrapped = unwrap(value);
  if (Array.isArray(unwrapped)) return unwrapped;
  const record = recordOf(unwrapped);
  if (record && Array.isArray(record.items)) return record.items;
  throw new Error(`API không trả về danh sách ${label} hợp lệ.`);
}

function nestedName(value: unknown, ...keys: string[]): string {
  const record = recordOf(value);
  if (!record) return "";
  for (const key of keys) {
    const found = record[key];
    if (typeof found === "string" && found) return found;
  }
  return "";
}

function normalizeAssignment(value: unknown): Assignment | null {
  const record = recordOf(value);
  if (!record) return null;
  const id = record.id;
  const taskId = valueOf(record, "taskId", "task_id") ?? recordOf(record.task)?.id;
  const userId = valueOf(record, "userId", "user_id");
  const nestedUser = record.user;
  const assignedBy = valueOf(record, "assignedBy", "assigned_by");
  const active = valueOf(record, "isActive", "is_active");
  return {
    id: id === undefined || id === null ? "" : String(id),
    taskId: taskId === undefined || taskId === null ? "" : String(taskId),
    userId: userId === undefined || userId === null ? "" : String(userId),
    userName:
      nestedName(nestedUser, "fullName", "full_name", "name", "username") ||
      stringOf(record.userName ?? record.user_name),
    assignmentType: stringOf(
      valueOf(record, "assignmentType", "assignment_type"),
    ),
    assignedBy:
      assignedBy === undefined || assignedBy === null
        ? ""
        : String(assignedBy),
    assignedAt: stringOf(valueOf(record, "assignedAt", "assigned_at")),
    note: stringOf(record.note),
    isActive: active === undefined ? true : active === true || active === 1,
  };
}

function normalizeTask(value: unknown): Task {
  const record = recordOf(value);
  if (!record) throw new Error("Dữ liệu nhiệm vụ không hợp lệ.");
  const id = record.id;
  const title = record.title;
  if (
    (typeof id !== "string" && typeof id !== "number") ||
    typeof title !== "string"
  ) {
    throw new Error("Nhiệm vụ thiếu mã định danh hoặc tiêu đề.");
  }
  const document = record.document;
  const department = record.department;
  const organization = record.organization;
  const responsibleUser =
    record.responsibleUser ?? record.responsible_user ?? record.assignee;
  const assignedByUser =
    record.assignedByUser ?? record.assigned_by_user ?? record.assigner;
  const rawAssignments =
    record.assignments ?? record.taskAssignments ?? record.task_assignments;
  const progress = Number(valueOf(record, "progressPercent", "progress_percent"));
  const important = valueOf(record, "isImportant", "is_important");
  const confidential = valueOf(record, "isConfidential", "is_confidential");
  const assignmentList = Array.isArray(rawAssignments)
    ? rawAssignments
        .map(normalizeAssignment)
        .filter((item): item is Assignment => item !== null)
    : [];
  return {
    id: String(id),
    taskCode: stringOf(valueOf(record, "taskCode", "task_code")),
    title,
    description: stringOf(record.description),
    documentId: stringOf(valueOf(record, "documentId", "document_id")),
    documentTitle: nestedName(document, "title"),
    documentNo: nestedName(document, "documentNo", "document_no"),
    documentFileUrl: nestedName(document, "fileUrl", "file_url"),
    organizationId: stringOf(
      valueOf(record, "organizationId", "organization_id") ??
        recordOf(organization)?.id,
    ),
    organizationName: nestedName(organization, "name"),
    departmentId: stringOf(
      valueOf(record, "departmentId", "department_id") ??
        recordOf(department)?.id,
    ),
    departmentName: nestedName(department, "name"),
    assignedBy: stringOf(valueOf(record, "assignedBy", "assigned_by")),
    assignedByName:
      nestedName(assignedByUser, "fullName", "full_name", "name", "username") ||
      stringOf(record.assignedByName ?? record.assigned_by_name),
    responsibleUserId: stringOf(
      valueOf(record, "responsibleUserId", "responsible_user_id") ??
        recordOf(responsibleUser)?.id,
    ),
    responsibleUserName:
      nestedName(
        responsibleUser,
        "fullName",
        "full_name",
        "name",
        "username",
      ) ||
      stringOf(record.responsibleUserName ?? record.responsible_user_name),
    startDate: stringOf(valueOf(record, "startDate", "start_date")),
    dueDate: stringOf(valueOf(record, "dueDate", "due_date")),
    completedAt: stringOf(valueOf(record, "completedAt", "completed_at")),
    priority: stringOf(record.priority).toLowerCase(),
    status: normalizeStatus(record.status),
    progressPercent: Number.isFinite(progress)
      ? Math.min(100, Math.max(0, progress))
      : 0,
    result: stringOf(record.result),
    isImportant: important === true || important === 1,
    isConfidential: confidential === true || confidential === 1,
    createdAt: stringOf(valueOf(record, "createdAt", "created_at")),
    assignments: assignmentList,
  };
}

function normalizeStatus(value: unknown): TaskStatus {
  if (typeof value !== "string" || !value.trim()) return "pending";
  return value.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function normalizeLookup(value: unknown, kind: "user" | "department" | "document" | "organization"): Lookup | null {
  const record = recordOf(value);
  if (!record || (typeof record.id !== "string" && typeof record.id !== "number")) {
    return null;
  }
  if (kind === "user") {
    return {
      id: String(record.id),
      name: stringOf(
        record.fullName ?? record.full_name ?? record.name ?? record.username,
      ),
      relatedName: stringOf(
        valueOf(record, "departmentId", "department_id") ??
          recordOf(record.department)?.id,
      ),
    };
  }
  if (kind === "document") {
    return {
      id: String(record.id),
      name: stringOf(record.title),
      relatedName: `${stringOf(valueOf(record, "documentNo", "document_no"))}|${stringOf(valueOf(record, "fileUrl", "file_url"))}`,
    };
  }
  if (kind === "organization") {
    return { id: String(record.id), name: stringOf(record.name), relatedName: "" };
  }
  return {
    id: String(record.id),
    name: stringOf(record.name),
    relatedName: stringOf(
      valueOf(record, "organizationId", "organization_id") ??
        recordOf(record.organization)?.id,
    ),
  };
}

function formatDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "completed" || task.status === "cancelled") {
    return false;
  }
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

function displayStatus(status: string): string {
  return statusLabels[status] ??
    status.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function displayPriority(priority: string): string {
  return priorityLabels[priority] ?? (priority || "Chưa đặt");
}

function statusTone(status: string): string {
  if (status === "completed") return "bg-emerald-50 text-emerald-700";
  if (status === "in_progress") return "bg-blue-50 text-blue-700";
  if (status === "cancelled") return "bg-slate-100 text-slate-600";
  if (status === "on_hold") return "bg-violet-50 text-violet-700";
  return "bg-amber-50 text-amber-700";
}

function priorityTone(priority: string): string {
  if (priority === "urgent" || priority === "critical") {
    return "bg-rose-50 text-rose-700";
  }
  if (priority === "high") return "bg-orange-50 text-orange-700";
  if (priority === "medium" || priority === "normal") {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-slate-100 text-slate-600";
}

function taskError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Không thể tải danh sách nhiệm vụ.";
}

function Modal({
  task,
  onClose,
}: {
  task: Task;
  onClose: () => void;
}) {
  const liveAssignments = task.assignments.filter((item) => item.isActive);
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {task.taskCode || `Nhiệm vụ #${task.id}`}
            </div>
            <h2 className="max-w-2xl text-lg font-bold text-slate-900">
              {task.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết nhiệm vụ"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(task.status)}`}>
                {displayStatus(task.status)}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityTone(task.priority)}`}>
                Ưu tiên {displayPriority(task.priority).toLowerCase()}
              </span>
              {task.isImportant && (
                <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                  Quan trọng
                </span>
              )}
              {task.isConfidential && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Mật
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Mô tả nhiệm vụ</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {task.description || "Chưa có mô tả."}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-800">Tiến độ</span>
                <span className="font-bold text-blue-700">{task.progressPercent}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all"
                  style={{ width: `${task.progressPercent}%` }}
                />
              </div>
            </div>
            {task.result && (
              <div className="rounded-2xl bg-emerald-50 p-4">
                <h3 className="text-sm font-semibold text-emerald-900">Kết quả</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-emerald-800">
                  {task.result}
                </p>
              </div>
            )}
            {(task.documentId || task.documentTitle) && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700">
                  <FileText className="h-4 w-4" />
                  Văn bản liên quan
                </div>
                <p className="mt-2 font-semibold text-slate-900">
                  {task.documentTitle || task.documentNo || "Văn bản đến"}
                </p>
                {task.documentNo && task.documentTitle && (
                  <p className="mt-1 text-xs text-slate-500">
                    Số văn bản: {task.documentNo}
                  </p>
                )}
                {task.documentFileUrl && (
                  <a
                    href={task.documentFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline"
                  >
                    Mở tệp văn bản <ArrowUpRight className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Bắt đầu", formatDate(task.startDate)],
                ["Hạn xử lý", formatDate(task.dueDate)],
                ["Phòng ban", task.departmentName || "—"],
                ["Cơ quan", task.organizationName || "—"],
                ["Người giao", task.assignedByName || "—"],
                ["Ngày hoàn thành", formatDate(task.completedAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-[11px] font-medium text-slate-500">{label}</div>
                  <div className="mt-1 break-words text-sm font-semibold text-slate-800">
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <UsersRound className="h-4 w-4 text-blue-600" />
                Phân công
              </h3>
              <div className="mt-3 space-y-2">
                {liveAssignments.length ? (
                  liveAssignments.map((assignment) => (
                    <article
                      key={assignment.id || `${assignment.userId}-${assignment.assignmentType}`}
                      className="rounded-2xl border border-slate-200 p-3.5"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {assignment.userName || `Chuyên viên #${assignment.userId}`}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {assignment.assignmentType === "responsible"
                              ? "Chuyên viên phụ trách"
                              : assignment.assignmentType || "Người được giao"}
                            {assignment.assignedAt
                              ? ` · ${formatDate(assignment.assignedAt)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      {assignment.note && (
                        <p className="mt-3 whitespace-pre-wrap border-t border-slate-100 pt-3 text-sm leading-5 text-slate-600">
                          {assignment.note}
                        </p>
                      )}
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    Chưa có thông tin phân công đang hiệu lực.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lookups, setLookups] = useState<TaskLookups>(emptyLookups);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignmentWarning, setAssignmentWarning] = useState<string | null>(null);
  const [lookupWarning, setLookupWarning] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAssignmentWarning(null);
    try {
      const taskResponse = await apiRequest<unknown>("/tasks");
      const normalizedTasks = readList(taskResponse, "nhiệm vụ").map(normalizeTask);
      setTasks(normalizedTasks);
      try {
        const assignmentResponse =
          await apiRequest<unknown>("/task-assignments");
        const allAssignments = readList(
          assignmentResponse,
          "thông tin phân công",
        )
          .map(normalizeAssignment)
          .filter((item): item is Assignment => item !== null);
        setTasks((current) =>
          current.map((task) => {
            const joined = allAssignments.filter(
              (assignment) => assignment.taskId === task.id,
            );
            const embedded = task.assignments;
            return {
              ...task,
              assignments: joined.length ? joined : embedded,
            };
          }),
        );
      } catch (assignmentError) {
        setAssignmentWarning(
          `Không tải được danh sách phân công riêng; đang hiển thị thông tin có sẵn trong nhiệm vụ. ${taskError(assignmentError)}`,
        );
      }
    } catch (requestError) {
      setTasks([]);
      setError(taskError(requestError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadLookups = useCallback(async () => {
    const [userResult, departmentResult, organizationResult, documentResult] =
      await Promise.allSettled([
        apiRequest<unknown>("/users"),
        apiRequest<unknown>("/departments"),
        apiRequest<unknown>("/organizations"),
        apiRequest<unknown>("/documents"),
      ]);
    const next = { ...emptyLookups };
    const warnings: string[] = [];
    const collect = (
      result: PromiseSettledResult<unknown>,
      label: string,
      kind: "user" | "department" | "organization" | "document",
    ) => {
      if (result.status === "rejected") {
        warnings.push(`${label}: ${taskError(result.reason)}`);
        return;
      }
      try {
        for (const item of readList(result.value, label)) {
          const lookup = normalizeLookup(item, kind);
          if (!lookup?.name) continue;
          if (kind === "user") next.users.set(lookup.id, lookup.name);
          if (kind === "department") {
            next.departments.set(lookup.id, lookup.name);
          }
          if (kind === "organization") {
            next.organizations.set(lookup.id, lookup.name);
          }
          if (kind === "document") {
            const [documentNo, fileUrl] = lookup.relatedName.split("|");
            next.documents.set(lookup.id, {
              title: lookup.name,
              documentNo,
              fileUrl,
            });
          }
        }
      } catch (lookupError) {
        warnings.push(`${label}: ${taskError(lookupError)}`);
      }
    };
    collect(userResult, "người dùng", "user");
    collect(departmentResult, "phòng ban", "department");
    collect(organizationResult, "cơ quan", "organization");
    collect(documentResult, "văn bản", "document");
    setLookupWarning(
      warnings.length
        ? `Một số thông tin tên chưa tải được; có thể hiển thị mã thay thế. ${warnings.join(" · ")}`
        : null,
    );
    setLookups(next);
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      void loadTasks();
      void loadLookups();
    });
  }, [loadLookups, loadTasks]);

  const enrichedTasks = useMemo(
    () =>
      tasks.map((task) => {
        const document = lookups.documents.get(task.documentId);
        return {
          ...task,
          documentTitle: task.documentTitle || document?.title || "",
          documentNo: task.documentNo || document?.documentNo || "",
          documentFileUrl: task.documentFileUrl || document?.fileUrl || "",
          departmentName:
            task.departmentName ||
            lookups.departments.get(task.departmentId) ||
            "",
          organizationName:
            task.organizationName ||
            lookups.organizations.get(task.organizationId) ||
            "",
          assignedByName:
            task.assignedByName || lookups.users.get(task.assignedBy) || "",
          responsibleUserName:
            task.responsibleUserName ||
            lookups.users.get(task.responsibleUserId) ||
            "",
          assignments: task.assignments.map((assignment) => ({
            ...assignment,
            userName:
              assignment.userName ||
              lookups.users.get(assignment.userId) ||
              "",
          })),
        };
      }),
    [lookups, tasks],
  );

  const filteredTasks = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi-VN");
    return enrichedTasks.filter((task) => {
      const matchedKeyword =
        !normalizedKeyword ||
        `${task.taskCode} ${task.title} ${task.description} ${task.documentNo} ${task.documentTitle} ${task.departmentName} ${task.responsibleUserName}`
          .toLocaleLowerCase("vi-VN")
          .includes(normalizedKeyword);
      return (
        matchedKeyword &&
        (statusFilter === "all" || task.status === statusFilter) &&
        (priorityFilter === "all" || task.priority === priorityFilter)
      );
    });
  }, [enrichedTasks, keyword, priorityFilter, statusFilter]);

  const counts = useMemo(
    () => ({
      total: enrichedTasks.length,
      active: enrichedTasks.filter(
        (task) =>
          task.status === "pending" ||
          task.status === "in_progress" ||
          task.status === "on_hold",
      ).length,
      overdue: enrichedTasks.filter(isOverdue).length,
      completed: enrichedTasks.filter((task) => task.status === "completed")
        .length,
    }),
    [enrichedTasks],
  );

  const selectedTask = selectedTaskId
    ? enrichedTasks.find((task) => task.id === selectedTaskId) ?? null
    : null;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e3060] via-[#124987] to-[#2775c7] px-6 py-7 text-white shadow-lg shadow-blue-950/10 sm:px-5 sm:py-5">
        <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Tổng nhiệm vụ", value: counts.total, icon: ClipboardList },
            { label: "Đang xử lý", value: counts.active, icon: Clock3 },
            { label: "Quá hạn", value: counts.overdue, icon: AlertTriangle },
            { label: "Hoàn thành", value: counts.completed, icon: CheckCircle2 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-blue-100">
                    {item.label}
                  </span>
                  <Icon className="h-4 w-4 text-blue-200" />
                </div>
                <div className="mt-1 text-2xl font-bold">{item.value}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:px-6 sm:py-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Danh sách nhiệm vụ</h3>
            <p className="mt-1 text-sm text-slate-500">
              {filteredTasks.length} nhiệm vụ
              {statusFilter !== "all" || priorityFilter !== "all" || keyword
                ? " phù hợp bộ lọc"
                : " trong hệ thống"}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="relative block sm:col-span-3 xl:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm nhiệm vụ, văn bản, người..."
                aria-label="Tìm nhiệm vụ"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 sm:min-w-[260px]"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Lọc theo trạng thái"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(statusLabels).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              aria-label="Lọc theo mức ưu tiên"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">Mọi mức ưu tiên</option>
              {Object.entries(priorityLabels).map(([priority, label]) => (
                <option key={priority} value={priority}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(assignmentWarning || lookupWarning) && (
          <div className="mx-4 mt-4 space-y-2 sm:mx-6">
            {[assignmentWarning, lookupWarning]
              .filter((warning): warning is string => Boolean(warning))
              .map((warning) => (
                <div
                  key={warning}
                  className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {warning}
                </div>
              ))}
          </div>
        )}
        {error && (
          <div className="m-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:m-6">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() => void loadTasks()}
              className="shrink-0 font-semibold underline underline-offset-2"
            >
              Thử lại
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Nhiệm vụ</th>
                <th className="px-5 py-4 font-semibold">Người phụ trách</th>
                <th className="px-5 py-4 font-semibold">Hạn xử lý</th>
                <th className="px-5 py-4 font-semibold">Tiến độ</th>
                <th className="px-5 py-4 font-semibold">Trạng thái</th>
                <th className="px-5 py-4 text-right font-semibold">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-600" />
                    Đang tải danh sách nhiệm vụ...
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <ClipboardList className="h-6 w-6" />
                    </div>
                    <p className="mt-3 font-semibold text-slate-800">
                      {tasks.length ? "Không tìm thấy nhiệm vụ" : "Chưa có nhiệm vụ được giao"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {tasks.length
                        ? "Hãy thử đổi từ khóa hoặc bộ lọc."
                        : "Nhiệm vụ được phân công từ trang Văn bản đến sẽ xuất hiện tại đây."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const overdue = isOverdue(task);
                  const activeAssignments = task.assignments.filter(
                    (assignment) => assignment.isActive,
                  );
                  const responsibleAssignment =
                    activeAssignments.find(
                      (assignment) =>
                        assignment.assignmentType === "responsible",
                    ) ?? activeAssignments[0];
                  return (
                    <tr
                      key={task.id}
                      className="group cursor-pointer hover:bg-slate-50/70"
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <ClipboardList className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                {task.taskCode || `NV-${task.id}`}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityTone(task.priority)}`}>
                                {displayPriority(task.priority)}
                              </span>
                              {task.isImportant && (
                                <span title="Nhiệm vụ quan trọng" className="text-rose-600">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>
                            <div className="mt-1 font-semibold text-slate-900 group-hover:text-blue-700">
                              {task.title}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                              <span>{task.departmentName || "Chưa gán phòng ban"}</span>
                              {task.documentId && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="inline-flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    {task.documentNo || task.documentTitle || "Văn bản liên quan"}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
                            <UserRound className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700">
                              {task.responsibleUserName ||
                                responsibleAssignment?.userName ||
                                "Chưa cập nhật"}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              Người giao: {task.assignedByName || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 ${overdue ? "font-semibold text-rose-700" : "text-slate-600"}`}>
                          {overdue ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <CalendarDays className="h-4 w-4 text-slate-400" />
                          )}
                          {formatDate(task.dueDate)}
                        </span>
                        {overdue && (
                          <span className="mt-1 block text-[11px] text-rose-600">
                            Quá hạn
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${task.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">
                            {task.progressPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(task.status)}`}>
                          {displayStatus(task.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedTaskId(task.id);
                          }}
                          className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                          aria-label={`Xem chi tiết ${task.title}`}
                          title="Xem chi tiết"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedTask && (
        <Modal task={selectedTask} onClose={() => setSelectedTaskId(null)} />
      )}
    </div>
  );
}
