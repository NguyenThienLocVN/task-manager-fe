"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, ArrowRight, ArrowUpRight, Check, CheckCircle2, ClipboardList, Clock3, FileText, Inbox, LoaderCircle, MessageSquare, Plus, Search, ShieldAlert, Trash2, UserRound, UsersRound, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/auth/api";

type TaskStatus =
  | "NEW"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "COMPLETED"
  | "CANCELLED";
type Task = {
  id: string;
  code: string;
  title: string;
  description: string;
  documentId: string;
  organizationId: string;
  departmentId: string;
  departmentName: string;
  organizationName: string;
  assignedByName: string;
  responsibleUserId: string;
  responsibleUserName: string;
  startDate: string;
  dueDate: string;
  priority: string;
  status: TaskStatus;
  progress: number;
  result: string;
  isImportant: boolean;
  isConfidential: boolean;
};
type Option = { id: string; name: string; departmentId?: string; organizationId?: string };
type TaskForm = {
  title: string;
  description: string;
  documentId: string;
  organizationId: string;
  departmentId: string;
  assigneeId: string;
  startDate: string;
  dueDate: string;
  priority: string;
  assignmentMode: "department" | "direct";
  isImportant: boolean;
  isConfidential: boolean;
};
type DetailData = {
  task: Task;
  subtasks: Record<string, unknown>[];
  assignments: Record<string, unknown>[];
  progress: Record<string, unknown>[];
  comments: Record<string, unknown>[];
  history: Record<string, unknown>[];
  routes: Record<string, unknown>[];
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  NEW: "Mới",
  ASSIGNED: "Đã giao",
  IN_PROGRESS: "Đang thực hiện",
  PENDING_REVIEW: "Chờ phê duyệt",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};
const PRIORITIES = [
  { value: "low", label: "Thấp" },
  { value: "medium", label: "Trung bình" },
  { value: "high", label: "Cao" },
  { value: "urgent", label: "Khẩn" },
];
const TASK_PRIORITY_VALUES: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 5,
};
const PRIORITY_LABELS: Record<string, string> = {
  "1": "Thấp",
  "2": "Trung bình",
  "3": "Cao",
  "4": "Khẩn",
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  urgent: "Khẩn",
};
const INITIAL_FORM: TaskForm = {
  title: "",
  description: "",
  documentId: "",
  organizationId: "",
  departmentId: "",
  assigneeId: "",
  startDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  priority: "medium",
  assignmentMode: "department",
  isImportant: false,
  isConfidential: false,
};
const panelClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function read(value: Record<string, unknown>, camel: string, snake: string): unknown {
  return value[camel] ?? value[snake];
}

function unwrap(value: unknown): unknown {
  const wrapper = record(value);
  return wrapper && "data" in wrapper ? wrapper.data : value;
}

function list(value: unknown, label: string): unknown[] {
  const payload = unwrap(value);
  if (Array.isArray(payload)) return payload;
  const wrapper = record(payload);
  if (wrapper && Array.isArray(wrapper.items)) return wrapper.items;
  throw new Error(`API không trả về danh sách ${label} hợp lệ.`);
}

function normalizeTask(value: unknown): Task {
  const item = record(value);
  if (!item || (typeof item.id !== "string" && typeof item.id !== "number")) {
    throw new Error("Dữ liệu nhiệm vụ không có mã định danh hợp lệ.");
  }
  const department = record(item.department);
  const organization = record(item.organization);
  const assignee = record(item.responsibleUser ?? item.responsible_user ?? item.assignee);
  const assigner = record(item.assignedByUser ?? item.assigned_by_user ?? item.assigner);
  const status = text(item.status).toUpperCase() as TaskStatus;
  const progress = Number(read(item, "progressPercent", "progress_percent"));
  return {
    id: String(item.id),
    code: text(read(item, "taskCode", "task_code")),
    title: text(item.title) || "Nhiệm vụ không có tiêu đề",
    description: text(item.description),
    documentId: text(read(item, "documentId", "document_id")),
    organizationId: text(read(item, "organizationId", "organization_id") ?? organization?.id),
    departmentId: text(read(item, "departmentId", "department_id") ?? department?.id),
    departmentName: text(department?.name ?? item.departmentName ?? item.department_name),
    organizationName: text(organization?.name ?? item.organizationName ?? item.organization_name),
    assignedByName: text(
      assigner?.fullName ?? assigner?.full_name ?? assigner?.name ??
      item.assignedByName ?? item.assigned_by_name,
    ),
    responsibleUserId: text(
      read(item, "responsibleUserId", "responsible_user_id") ?? assignee?.id,
    ),
    responsibleUserName: text(
      assignee?.fullName ?? assignee?.full_name ?? assignee?.name ??
      item.responsibleUserName ?? item.responsible_user_name,
    ),
    startDate: text(read(item, "startDate", "start_date")),
    dueDate: text(read(item, "dueDate", "due_date")),
    priority: text(item.priority).toLowerCase() || "medium",
    status: Object.hasOwn(STATUS_LABELS, status) ? status : "NEW",
    progress: Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0,
    result: text(item.result),
    isImportant: item.isImportant === true || item.is_important === true,
    isConfidential: item.isConfidential === true || item.is_confidential === true,
  };
}

function resolveTaskNames(
  task: Task,
  users: Option[],
  departments: Option[],
): Task {
  return {
    ...task,
    departmentName:
      task.departmentName ||
      departments.find((department) => department.id === task.departmentId)
        ?.name ||
      "",
    responsibleUserName:
      task.responsibleUserName ||
      users.find((user) => user.id === task.responsibleUserId)?.name ||
      "",
  };
}

function normalizeOption(value: unknown, kind: "user" | "department" | "organization" | "document"): Option | null {
  const item = record(value);
  if (!item || (typeof item.id !== "string" && typeof item.id !== "number")) return null;
  const department = record(item.department);
  const organization = record(item.organization);
  const name =
    kind === "user"
      ? item.fullName ?? item.full_name ?? item.name ?? item.username
      : item.name ?? item.title;
  if (typeof name !== "string" || !name) return null;
  return {
    id: String(item.id),
    name,
    departmentId: text(read(item, "departmentId", "department_id") ?? department?.id),
    organizationId: text(read(item, "organizationId", "organization_id") ?? organization?.id),
  };
}

function asObjectList(value: unknown): Record<string, unknown>[] {
  return list(value, "chi tiết").map(record).filter((item): item is Record<string, unknown> => Boolean(item));
}

function displayDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
}

function displayDateTime(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("hour")}:${part("minute")} ${part("day")}/${part("month")}/${part("year")}`;
}

function priorityLabel(value: string): string {
  return PRIORITY_LABELS[value.toLowerCase()] ?? value;
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || ["COMPLETED", "CANCELLED"].includes(task.status)) return false;
  const dueDate = new Date(task.dueDate);
  if (Number.isNaN(dueDate.getTime())) return false;
  dueDate.setHours(23, 59, 59, 999);
  return dueDate.getTime() < Date.now();
}

function statusStyle(status: TaskStatus): string {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700";
  if (status === "IN_PROGRESS") return "bg-blue-50 text-blue-700";
  if (status === "PENDING_REVIEW") return "bg-violet-50 text-violet-700";
  if (status === "CANCELLED") return "bg-slate-100 text-slate-600";
  return "bg-amber-50 text-amber-800";
}

function itemTitle(value: Record<string, unknown>): string {
  return text(value.title ?? value.content ?? value.action ?? value.event ?? value.note ?? value.result) || "Cập nhật";
}

function historyItemTitle(value: Record<string, unknown>): string {
  const title = itemTitle(value);
  const actionLabels: Record<string, string> = {
    ROUTE: "Giao việc",
    ACCEPT: "Tiếp nhận",
    DELEGATE: "Phân công",
    PROGRESS: "Cập nhật tiến độ",
    SUBMIT_REVIEW: "Trình duyệt",
    REVIEW: "Duyệt kết quả",
    COMMENT: "Trao đổi",
    CREATE: "Tạo công việc",
    UPDATE: "Cập nhật công việc",
    DELETE: "Xóa công việc",
    CANCEL: "Hủy công việc",
  };
  return actionLabels[title.trim().toUpperCase()] ?? title;
}

function itemActor(value: Record<string, unknown>): string {
  const user = record(value.user ?? value.actor ?? value.createdByUser ?? value.created_by_user);
  return text(user?.fullName ?? user?.full_name ?? user?.name ?? value.userName ?? value.user_name ?? value.actorName);
}

function itemDate(value: Record<string, unknown>): string {
  return text(value.createdAt ?? value.created_at ?? value.updatedAt ?? value.updated_at ?? value.assignedAt ?? value.assigned_at);
}

function currentTaskRoute(
  routes: Record<string, unknown>[],
): Record<string, unknown> | null {
  return routes.reduce<Record<string, unknown> | null>(
    (latest, route) => {
      if (!latest) return route;
      const routeTime = Date.parse(text(read(route, "issuedAt", "issued_at")));
      const latestTime = Date.parse(
        text(read(latest, "issuedAt", "issued_at")),
      );
      return routeTime >= latestTime ? route : latest;
    },
    null,
  );
}

function assignmentUserId(value: Record<string, unknown>): string {
  const user = record(value.user);
  return text(read(value, "userId", "user_id") ?? user?.id);
}

function assignmentUserName(
  value: Record<string, unknown>,
  users: Option[],
): string {
  const user = record(value.user);
  const userId = assignmentUserId(value);
  const knownUser = users.find((item) => item.id === userId);
  return text(
    user?.fullName ??
      user?.full_name ??
      user?.name ??
      value.userName ??
      value.user_name ??
      knownUser?.name,
  );
}

export default function TaskWorkspace() {
  const { hasPermission } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inboxTasks, setInboxTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [organizations, setOrganizations] = useState<Option[]>([]);
  const [documents, setDocuments] = useState<Option[]>([]);
  const [activeView, setActiveView] = useState<"all" | "mine" | "inbox">("all");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<TaskForm>(INITIAL_FORM);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "progress" | "comments" | "history">("overview");
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressContent, setProgressContent] = useState("");
  const [difficulties, setDifficulties] = useState("");
  const [proposedSolution, setProposedSolution] = useState("");
  const [comment, setComment] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [acceptNote, setAcceptNote] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewResult, setReviewResult] = useState("");
  const [delegateUserId, setDelegateUserId] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [allResult, mineResult, inboxResult] = await Promise.allSettled([
        apiRequest<unknown>("/tasks"),
        apiRequest<unknown>("/tasks/my-tasks"),
        apiRequest<unknown>("/tasks/workflow/my-inbox"),
      ]);
      const errors: string[] = [];
      if (allResult.status === "fulfilled") {
        setTasks(list(allResult.value, "nhiệm vụ").map(normalizeTask));
      } else {
        setTasks([]);
        errors.push(allResult.reason instanceof Error ? allResult.reason.message : "Không tải được danh sách công việc.");
      }
      if (mineResult.status === "fulfilled") {
        setMyTasks(list(mineResult.value, "công việc cá nhân").map(normalizeTask));
      } else {
        setMyTasks([]);
        errors.push(`Công việc cá nhân: ${mineResult.reason instanceof Error ? mineResult.reason.message : "không tải được."}`);
      }
      if (inboxResult.status === "fulfilled") {
        setInboxTasks(list(inboxResult.value, "hộp thư công việc").map(normalizeTask));
      } else {
        setInboxTasks([]);
        errors.push(`Hộp thư: ${inboxResult.reason instanceof Error ? inboxResult.reason.message : "không tải được."}`);
      }
      if (allResult.status === "rejected") setError(errors.join(" "));
      else if (errors.length) setNotice({ type: "error", text: errors.join(" ") });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải công việc.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    setOptionsError(null);
    const [userResult, departmentResult, organizationResult, documentResult] = await Promise.allSettled([
      apiRequest<unknown>("/users"),
      apiRequest<unknown>("/departments"),
      apiRequest<unknown>("/organizations"),
      apiRequest<unknown>("/documents"),
    ]);
    const failures: string[] = [];
    const applyOptions = (
      result: PromiseSettledResult<unknown>,
      label: string,
      kind: "user" | "department" | "organization" | "document",
      setter: (options: Option[]) => void,
    ) => {
      if (result.status === "rejected") {
        failures.push(`${label}: ${result.reason instanceof Error ? result.reason.message : "không tải được."}`);
        setter([]);
        return;
      }
      try {
        setter(list(result.value, label).map((item) => normalizeOption(item, kind)).filter((item): item is Option => Boolean(item)));
      } catch (loadError) {
        setter([]);
        failures.push(loadError instanceof Error ? loadError.message : `Không tải được ${label}.`);
      }
    };
    applyOptions(userResult, "người dùng", "user", setUsers);
    applyOptions(departmentResult, "phòng ban", "department", setDepartments);
    applyOptions(organizationResult, "cơ quan", "organization", setOrganizations);
    applyOptions(documentResult, "văn bản", "document", setDocuments);
    if (failures.length) setOptionsError(failures.join(" "));
    setIsLoadingOptions(false);
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      void loadTasks();
      void loadOptions();
    });
  }, [loadOptions, loadTasks]);

  const visibleTasks = (activeView === "inbox" ? inboxTasks : activeView === "mine" ? myTasks : tasks)
    .map((task) => resolveTaskNames(task, users, departments));
  const filteredTasks = useMemo(() => {
    const search = keyword.trim().toLocaleLowerCase("vi-VN");
    return visibleTasks.filter((task) => {
      const matchesSearch =
        !search ||
        `${task.code} ${task.title} ${task.description} ${task.departmentName} ${task.organizationName} ${task.responsibleUserName}`
          .toLocaleLowerCase("vi-VN")
          .includes(search);
      return (
        matchesSearch &&
        (statusFilter === "all" || task.status === statusFilter) &&
        (userFilter === "all" || task.responsibleUserId === userFilter) &&
        (organizationFilter === "all" || task.organizationId === organizationFilter)
      );
    });
  }, [keyword, organizationFilter, statusFilter, userFilter, visibleTasks]);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const statusCounts = useMemo(
    () => ({
      total: visibleTasks.length,
      active: visibleTasks.filter((task) => ["ASSIGNED", "IN_PROGRESS", "PENDING_REVIEW"].includes(task.status)).length,
      overdue: visibleTasks.filter(isOverdue).length,
      completed: visibleTasks.filter((task) => task.status === "COMPLETED").length,
    }),
    [visibleTasks],
  );
  const departmentUsers = users.filter((person) => !person.departmentId || person.departmentId === form.departmentId);

  const openDetail = async (task: Task) => {
    const resolvedTask = resolveTaskNames(task, users, departments);
    setSelectedTask(resolvedTask);
    setDetail(null);
    setDetailLoading(true);
    setDetailError(null);
    setDetailTab("overview");
    setProgressPercent(task.progress);
    setActionNote("");
    setAcceptNote("");
    setReviewComment("");
    setReviewResult("");
    setDelegateUserId("");
    const prefix = `/tasks/${encodeURIComponent(task.id)}`;
    const endpoints = [
      `${prefix}`,
      `${prefix}/subtasks`,
      `${prefix}/assignments`,
      `${prefix}/progress`,
      `${prefix}/comments`,
      `${prefix}/history`,
      `${prefix}/routes`,
    ];
    const results = await Promise.allSettled(endpoints.map((path) => apiRequest<unknown>(path)));
    const names = ["chi tiết", "nhiệm vụ con", "phân công", "tiến độ", "trao đổi", "lịch sử", "luồng giao việc"];
    const partialErrors: string[] = [];
    results.forEach((result, index) => {
      if (result.status === "rejected") partialErrors.push(`${names[index]}: ${result.reason instanceof Error ? result.reason.message : "không tải được."}`);
    });
    if (results[0].status === "fulfilled") {
      try {
        const detailedTask = resolveTaskNames(
          normalizeTask(unwrap(results[0].value)),
          users,
          departments,
        );
        setDetail({
          task: detailedTask,
          subtasks: results[1].status === "fulfilled" ? asObjectList(results[1].value) : [],
          assignments: results[2].status === "fulfilled" ? asObjectList(results[2].value) : [],
          progress: results[3].status === "fulfilled" ? asObjectList(results[3].value) : [],
          comments: results[4].status === "fulfilled" ? asObjectList(results[4].value) : [],
          history: results[5].status === "fulfilled" ? asObjectList(results[5].value) : [],
          routes: results[6].status === "fulfilled" ? asObjectList(results[6].value) : [],
        });
        setSelectedTask(detailedTask);
        setProgressPercent(detailedTask.progress);
      } catch (loadError) {
        setDetailError(loadError instanceof Error ? loadError.message : "Không thể đọc chi tiết nhiệm vụ.");
      }
    } else {
      setDetailError(`Không thể tải thông tin chi tiết. ${partialErrors[0] ?? ""}`);
      setDetail({ task: resolvedTask, subtasks: [], assignments: [], progress: [], comments: [], history: [], routes: [] });
    }
    if (partialErrors.length > 1) setDetailError(`Một số thông tin chưa tải được: ${partialErrors.slice(1).join(" ")}`);
    setDetailLoading(false);
  };

  const submitTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasPermission("TASK_CREATE")) {
      setShowCreate(false);
      setNotice({
        type: "error",
        text: "Bạn không có quyền tạo công việc.",
      });
      return;
    }
    if (!form.title.trim() || !form.departmentId || !form.dueDate) {
      setNotice({ type: "error", text: "Vui lòng nhập tiêu đề, phòng ban và hạn xử lý." });
      return;
    }
    if (form.assignmentMode === "direct" && !form.assigneeId) {
      setNotice({ type: "error", text: "Vui lòng chọn chuyên viên nhận việc." });
      return;
    }
    const organizationId =
      form.organizationId ||
      departments.find((item) => item.id === form.departmentId)?.organizationId;
    if (!organizationId) {
      setNotice({
        type: "error",
        text: "Không xác định được cơ quan của phòng ban đã chọn.",
      });
      return;
    }
    setIsSaving(true);
    setNotice(null);
    let createdTaskId = "";
    try {
      const created = await apiRequest<unknown>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          documentId: form.documentId || null,
          organizationId,
          startDate: form.startDate || null,
          dueDate: form.dueDate,
          priority: TASK_PRIORITY_VALUES[form.priority] ?? 2,
          isImportant: form.isImportant,
          isConfidential: form.isConfidential,
        }),
      });
      const createdRecord = record(unwrap(created));
      const id = createdRecord?.id;
      if (typeof id !== "string" && typeof id !== "number") {
        throw new Error("API đã nhận tạo công việc nhưng không trả về mã công việc.");
      }
      createdTaskId = String(id);
      await apiRequest<unknown>(`/tasks/${encodeURIComponent(createdTaskId)}/route`, {
        method: "POST",
        body: JSON.stringify({
          routeType: form.assignmentMode === "direct" ? "DIRECT" : "DEPARTMENT",
          departmentId: form.departmentId,
          ...(form.assignmentMode === "direct"
            ? { assigneeId: form.assigneeId }
            : {}),
          note: form.assignmentMode === "direct" ? "Giao trực tiếp cho chuyên viên." : null,
        }),
      });
      setShowCreate(false);
      setForm(INITIAL_FORM);
      setNotice({ type: "success", text: form.assignmentMode === "direct" ? "Đã tạo và giao trực tiếp công việc." : "Đã tạo công việc và chuyển đến phòng ban." });
      setActiveView("all");
      await loadTasks();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Không thể tạo công việc.";
      if (createdTaskId) {
        await loadTasks();
      }
      setNotice({
        type: "error",
        text: createdTaskId
          ? `Công việc ${createdTaskId} đã được tạo nhưng chưa hoàn tất giao việc: ${message}`
          : message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const runTaskAction = async (actionName: string, path: string, payload: Record<string, unknown>, successText: string) => {
    if (!selectedTask) return;
    setActiveAction(actionName);
    setNotice(null);
    try {
      await apiRequest<unknown>(path, { method: "POST", body: JSON.stringify(payload) });
      setNotice({ type: "success", text: successText });
      await Promise.all([loadTasks(), openDetail(selectedTask)]);
    } catch (requestError) {
      setNotice({ type: "error", text: requestError instanceof Error ? requestError.message : "Không thể thực hiện thao tác." });
    } finally {
      setActiveAction(null);
    }
  };

  const submitProgress = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTask || !progressContent.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập nội dung cập nhật tiến độ." });
      return;
    }
    void runTaskAction(
      "progress",
      `/tasks/${encodeURIComponent(selectedTask.id)}/progress`,
      {
        progressPercent,
        content: progressContent.trim(),
        difficulties: difficulties.trim() || null,
        proposedSolution: proposedSolution.trim() || null,
      },
      "Đã cập nhật tiến độ công việc.",
    ).then(() => {
      setProgressContent("");
      setDifficulties("");
      setProposedSolution("");
    });
  };

  const submitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTask || !comment.trim()) return;
    void runTaskAction("comment", `/tasks/${encodeURIComponent(selectedTask.id)}/comments`, { content: comment.trim() }, "Đã gửi trao đổi.").then(() => setComment(""));
  };

  const submitReviewResult = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTask || !reviewResult.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập kết quả trước khi trình duyệt." });
      return;
    }
    void runTaskAction("submit-review", `/tasks/${encodeURIComponent(selectedTask.id)}/submit-review`, { result: reviewResult.trim() }, "Đã trình kết quả để lãnh đạo phê duyệt.").then(() => setReviewResult(""));
  };

  const submitReview = (decision: "APPROVE" | "RETURN") => {
    if (!selectedTask || !reviewComment.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập nhận xét phê duyệt hoặc lý do trả lại." });
      return;
    }
    void runTaskAction(
      "review",
      `/tasks/${encodeURIComponent(selectedTask.id)}/review`,
      { decision, comment: reviewComment.trim() },
      decision === "APPROVE" ? "Đã phê duyệt kết quả công việc." : "Đã trả công việc để tiếp tục xử lý.",
    ).then(() => setReviewComment(""));
  };

  const deleteTask = async (task: Task) => {
    if (!hasPermission("TASK_DELETE") || deletingTaskId) return;
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa công việc "${task.title}"? Thao tác này cũng có thể xóa các nhiệm vụ con và không thể hoàn tác.`,
    );
    if (!confirmed) return;

    setDeletingTaskId(task.id);
    setNotice(null);
    try {
      await apiRequest<unknown>(`/tasks/${encodeURIComponent(task.id)}`, {
        method: "DELETE",
      });
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setMyTasks((current) => current.filter((item) => item.id !== task.id));
      setInboxTasks((current) => current.filter((item) => item.id !== task.id));
      if (selectedTask?.id === task.id) {
        setSelectedTask(null);
        setDetail(null);
      }
      setNotice({ type: "success", text: `Đã xóa công việc "${task.title}".` });
    } catch (requestError) {
      setNotice({
        type: "error",
        text:
          requestError instanceof Error
            ? requestError.message
            : "Không thể xóa công việc.",
      });
    } finally {
      setDeletingTaskId(null);
    }
  };

  const filteredSpecialists = users.filter((person) => !person.departmentId || person.departmentId === (detail?.task.departmentId ?? selectedTask?.departmentId));
  const activeTaskAssignments =
    detail?.assignments.filter(
      (item) => item.isActive !== false && item.is_active !== false,
    ) ?? [];
  const currentResponsibleAssignment = detail
    ? activeTaskAssignments.find(
        (item) =>
          assignmentUserId(item) === detail.task.responsibleUserId ||
          text(item.assignmentType ?? item.assignment_type).toUpperCase() ===
            "MAIN",
      )
    : undefined;
  const responsibleUserId =
    detail?.task.responsibleUserId ||
    (currentResponsibleAssignment
      ? assignmentUserId(currentResponsibleAssignment)
      : "");
  const responsibleUserName =
    detail?.task.responsibleUserName ||
    users.find((person) => person.id === responsibleUserId)?.name ||
    (currentResponsibleAssignment
      ? assignmentUserName(currentResponsibleAssignment, users)
      : "");
  const taskRoute = currentTaskRoute(detail?.routes ?? []);
  const taskRouteType = text(
    taskRoute ? read(taskRoute, "routeType", "route_type") : "",
  ).toUpperCase();
  const taskRouteStatus = text(
    taskRoute ? read(taskRoute, "routeStatus", "route_status") : "",
  ).toUpperCase();
  const selectedTaskPath = selectedTask ? `/tasks/${encodeURIComponent(selectedTask.id)}` : "";

  return (
    <div className="space-y-6">
      {notice && (
        <div role="status" className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${selectedTask ? "fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-md shadow-2xl" : ""} ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {notice.type === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />}
          <span className="flex-1">{notice.text}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setNotice(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      <section className="rounded-3xl bg-gradient-to-br from-[#0e3060] via-[#124987] to-[#2775c7] p-5 text-white shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="mt-1 text-xl font-bold">Tổng quan công việc</h2>
          </div>
          {hasPermission("TASK_CREATE") && (
            <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-800 hover:bg-blue-50" onClick={() => { setNotice(null); setForm(INITIAL_FORM); setShowCreate(true); }}>
              <Plus className="h-4 w-4" /> TẠO CÔNG VIỆC
            </button>
          )}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: "Tổng công việc", value: statusCounts.total, icon: ClipboardList },
            { label: "Đang xử lý", value: statusCounts.active, icon: Clock3 },
            { label: "Quá hạn", value: statusCounts.overdue, icon: AlertTriangle },
            { label: "Hoàn thành", value: statusCounts.completed, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-blue-100"><span>{label}</span><Icon className="h-4 w-4" /></div>
              <div className="mt-1 text-2xl font-bold">{value}</div>
            </div>
          ))}
        </div>
      </section>

      {optionsError && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{optionsError}</div>}

      <section className={panelClass}>
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Danh sách công việc</h3>
            <p className="mt-1 text-sm text-slate-500">{filteredTasks.length} kết quả</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "Toàn bộ", icon: ClipboardList },
              { value: "mine", label: "Của tôi", icon: UserRound },
              { value: "inbox", label: `Hộp thư${inboxTasks.length ? ` (${inboxTasks.length})` : ""}`, icon: Inbox },
            ].map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" onClick={() => { setActiveView(value as typeof activeView); setPage(1); }} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${activeView === value ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2 border-b border-slate-100 py-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={`${inputClass} pl-9`} type="search" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} placeholder="Tìm tiêu đề, người phụ trách..." aria-label="Tìm công việc" />
          </label>
          <select className={inputClass} value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} aria-label="Lọc trạng thái">
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
          </select>
          <select className={inputClass} value={userFilter} onChange={(event) => { setUserFilter(event.target.value); setPage(1); }} aria-label="Lọc người phụ trách">
            <option value="all">Mọi người phụ trách</option>
            {users.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
          <select className={inputClass} value={organizationFilter} onChange={(event) => { setOrganizationFilter(event.target.value); setPage(1); }} aria-label="Lọc cơ quan">
            <option value="all">Mọi cơ quan</option>
            {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </select>
        </div>
        {error && <div className="my-4 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="h-5 w-5 shrink-0" /><span className="flex-1">{error}</span><button type="button" className="font-semibold underline" onClick={() => void loadTasks()}>Thử lại</button></div>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500"><tr className="border-b border-slate-100"><th className="py-4 pr-4">Công việc</th><th className="px-4 py-4">Người phụ trách</th><th className="px-4 py-4">Hạn xử lý</th><th className="px-4 py-4">Tiến độ</th><th className="px-4 py-4">Trạng thái</th><th className="py-4 pl-4 text-right">Hành động</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? <tr><td colSpan={6} className="py-14 text-center text-slate-500"><LoaderCircle className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-600" />Đang tải công việc...</td></tr> : pageTasks.length ? pageTasks.map((task) => (
                <tr key={task.id} className="cursor-pointer hover:bg-slate-50" onClick={() => void openDetail(task)}>
                  <td className="md:w-[400px] md:min-w-[400px] md:max-w-[400px] py-4 pr-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-blue-50 p-2 text-blue-700">
                        <ClipboardList className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
                          <span className={`rounded-full px-2 py-0.5 ${task.priority === "urgent" ? "bg-rose-50 text-rose-700" : task.priority === "high" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-600"}`}>Ưu tiên:&nbsp;{priorityLabel(task.priority)}</span>
                            {task.isImportant && <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />}
                            {task.isConfidential && <ShieldAlert className="h-3.5 w-3.5 text-slate-500" />}
                          </div>
                        <div className="mt-1 font-semibold text-slate-900">{task.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{task.departmentName || "Chưa có phòng ban"}{task.organizationName ? ` · ${task.organizationName}` : ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{task.responsibleUserName || "Chưa phân công"}</td>
                  <td className={`px-4 py-4 ${isOverdue(task) ? "font-semibold text-rose-700" : "text-slate-600"}`}><span className="inline-flex items-center gap-1.5">{displayDate(task.dueDate)}</span>{isOverdue(task) && <span className="mt-1 block text-xs">Quá hạn</span>}</td>
                  <td className="px-4 py-4"><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-blue-600" style={{ width: `${task.progress}%` }} /></div><span className="text-xs font-semibold">{task.progress}%</span></div></td>
                  <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(task.status)}`}>{STATUS_LABELS[task.status]}</span></td>
                  <td className="pl-4 py-4 text-right">
                    {hasPermission("TASK_DELETE") && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void deleteTask(task);
                        }}
                        disabled={deletingTaskId === task.id}
                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Xóa ${task.title}`}
                        title="Xóa công việc"
                      >
                        {deletingTaskId === task.id ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              )) : <tr><td colSpan={6} className="py-14 text-center text-slate-500"><ClipboardList className="mx-auto mb-2 h-7 w-7 text-slate-300" />Không có công việc phù hợp bộ lọc.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
          <span className="text-slate-500">Trang {currentPage}/{pageCount}</span>
          <div className="flex gap-2"><button type="button" className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)}>Trước</button><button type="button" className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40" disabled={currentPage >= pageCount} onClick={() => setPage((value) => value + 1)}>Tiếp</button></div>
        </div>
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) setShowCreate(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="task-create-heading" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
            <header className="mb-5 flex items-start justify-between"><div><h2 id="task-create-heading" className="text-xl font-bold text-slate-900">Tạo công việc</h2><p className="mt-1 text-sm text-slate-500">Chọn giao qua phòng ban hoặc giao trực tiếp cho chuyên viên.</p></div><button type="button" aria-label="Đóng" className="rounded-lg p-2 hover:bg-slate-100" onClick={() => setShowCreate(false)}><X className="h-5 w-5" /></button></header>
            <form className="space-y-4" onSubmit={submitTask}>
              <label className="block text-sm font-semibold text-slate-700">Tiêu đề công việc *<input required className={`${inputClass} mt-1.5`} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={250} /></label>
              <label className="block text-sm font-semibold text-slate-700">Mô tả<textarea className={`${inputClass} mt-1.5 min-h-24`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
              <label className="block text-sm font-semibold text-slate-700">Văn bản nguồn<select className={`${inputClass} mt-1.5`} value={form.documentId} onChange={(event) => setForm({ ...form, documentId: event.target.value })}><option value="">Không liên kết văn bản</option>{documents.map((document) => <option key={document.id} value={document.id}>{document.name}</option>)}</select></label>
              <fieldset className="rounded-2xl border border-slate-200 p-4"><legend className="px-2 text-sm font-semibold text-slate-700">Hình thức giao việc</legend><div className="grid gap-3 sm:grid-cols-2"><label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${form.assignmentMode === "department" ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}><input type="radio" name="assignmentMode" value="department" checked={form.assignmentMode === "department"} onChange={() => setForm({ ...form, assignmentMode: "department", assigneeId: "" })} /><span><span className="block text-sm font-semibold">Giao qua phòng</span><span className="mt-1 block text-xs text-slate-500">Trưởng phòng tiếp nhận và phân công chuyên viên.</span></span></label><label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${form.assignmentMode === "direct" ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}><input type="radio" name="assignmentMode" value="direct" checked={form.assignmentMode === "direct"} onChange={() => setForm({ ...form, assignmentMode: "direct" })} /><span><span className="block text-sm font-semibold">Giao trực tiếp</span><span className="mt-1 block text-xs text-slate-500">Chọn phòng ban và chuyên viên thực hiện.</span></span></label></div></fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">Cơ quan<select className={`${inputClass} mt-1.5`} value={form.organizationId} onChange={(event) => setForm({ ...form, organizationId: event.target.value, departmentId: "" })}><option value="">Chọn cơ quan</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="text-sm font-semibold text-slate-700">Phòng ban *<select required className={`${inputClass} mt-1.5`} value={form.departmentId} onChange={(event) => setForm({ ...form, departmentId: event.target.value, assigneeId: "" })}><option value="">Chọn phòng ban</option>{departments.filter((item) => !form.organizationId || !item.organizationId || item.organizationId === form.organizationId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                {form.assignmentMode === "direct" && <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Chuyên viên nhận việc *<select required className={`${inputClass} mt-1.5`} value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })} disabled={!form.departmentId || isLoadingOptions}><option value="">Chọn chuyên viên</option>{departmentUsers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
                <label className="text-sm font-semibold text-slate-700">Ngày bắt đầu<input type="date" className={`${inputClass} mt-1.5`} value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
                <label className="text-sm font-semibold text-slate-700">Hạn xử lý *<input required type="date" min={form.startDate || undefined} className={`${inputClass} mt-1.5`} value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Mức ưu tiên<select className={`${inputClass} mt-1.5`} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              </div>
              <div className="flex flex-wrap gap-5 text-sm text-slate-700"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.isImportant} onChange={(event) => setForm({ ...form, isImportant: event.target.checked })} />Công việc quan trọng</label><label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.isConfidential} onChange={(event) => setForm({ ...form, isConfidential: event.target.checked })} />Công việc bảo mật</label></div>
              <footer className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={() => setShowCreate(false)} disabled={isSaving}>Hủy</button><button type="submit" className={buttonClass} disabled={isSaving || isLoadingOptions}>{isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Tạo và giao việc</button></footer>
            </form>
          </section>
        </div>
      )}

      {selectedTask && detail && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !activeAction) { setSelectedTask(null); setDetail(null); } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="task-detail-heading" className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-t-3xl bg-slate-50 shadow-2xl sm:rounded-3xl">
            <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7"><div><h2 id="task-detail-heading" className="mt-1 text-lg font-bold text-slate-900">{detail.task.title}</h2><div className="mt-2 flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(detail.task.status)}`}>{STATUS_LABELS[detail.task.status]}</span>{detail.task.isImportant && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">Quan trọng</span>}{detail.task.isConfidential && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"><ShieldAlert className="h-3.5 w-3.5" />Bảo mật</span>}</div></div><button type="button" aria-label="Đóng chi tiết" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => { setSelectedTask(null); setDetail(null); }}><X className="h-5 w-5" /></button></header>
            <div className="grid grid-cols-1 gap-5 p-4 sm:p-6">
              <main className="w-full min-w-0 space-y-4">
                {detailError && <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertCircle className="h-5 w-5 shrink-0" />{detailError}</div>}
                <nav className="flex flex-wrap gap-2">{[{ value: "overview", label: "Tổng quan" }, { value: "progress", label: "Tiến độ" }, { value: "comments", label: "Trao đổi" }, { value: "history", label: "Lịch sử" }].map(({ value, label }) => <button key={value} type="button" onClick={() => setDetailTab(value as typeof detailTab)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${detailTab === value ? "bg-blue-700 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>{label}</button>)}</nav>
                {detailLoading && <div className="py-5 text-center text-sm text-slate-500"><LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" />Đang tải thông tin...</div>}
                {detailTab === "overview" && <div className="space-y-4">
                  <article className={panelClass}>
                    <h3 className="text-sm font-bold text-slate-900">Thông tin chung</h3>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {detail.task.description || "Chưa có mô tả."}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        ["Bắt đầu", displayDate(detail.task.startDate)],
                        ["Hạn xử lý", displayDate(detail.task.dueDate)],
                        ["Phòng ban", detail.task.departmentName || "—"],
                        [
                          "Văn bản nguồn", "",
                        ],
                        ["Người giao", detail.task.assignedByName || "—"],
                        [
                          "Người phụ trách",
                          detail.task.responsibleUserName || "Chưa phân công",
                        ],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-slate-50 p-3">
                          <span className="text-xs text-slate-500">{label}</span>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {value}
                          </p>
                          {label === "Văn bản nguồn" && detail.task.documentId && (
                            <a
                              href={`/api/documents/${encodeURIComponent(detail.task.documentId)}/file`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Xem file PDF
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                    {taskRouteStatus === "PENDING" &&
                      ["NEW", "ASSIGNED"].includes(detail.task.status) && (
                        <div className="mt-5 border-t border-slate-200 pt-4">
                          <h4 className="text-sm font-bold text-slate-900">
                            Tiếp nhận công việc
                          </h4>
                          <textarea
                            className={`${inputClass} mt-3 min-h-16`}
                            placeholder="Ghi chú tiếp nhận (không bắt buộc)"
                            value={acceptNote}
                            onChange={(event) =>
                              setAcceptNote(event.target.value)
                            }
                          />
                          <button
                            type="button"
                            className={`${buttonClass} mt-3`}
                            disabled={Boolean(activeAction)}
                            onClick={() =>
                              void runTaskAction(
                                "accept",
                                `${selectedTaskPath}/accept`,
                                { note: acceptNote.trim() || null },
                                "Đã tiếp nhận công việc.",
                              )
                            }
                          >
                            {activeAction === "accept" ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Tiếp nhận
                          </button>
                        </div>
                      )}
                  </article>
                  <article className={panelClass}>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <UsersRound className="h-4 w-4 text-blue-600" />
                      Người phụ trách &amp; phân công
                    </h3>
                    <div className="mt-3 space-y-2">
                      <div className="rounded-xl bg-blue-50 p-3">
                        <p className="text-xs font-medium text-blue-700">
                          Người phụ trách hiện tại: <b>{responsibleUserName || "Chưa phân công"}</b>
                        </p>
                      </div>
                      {detail.assignments
                        .filter(
                          (item) =>
                            item.isActive !== false &&
                            item.is_active !== false &&
                            assignmentUserId(item) !== responsibleUserId,
                        )
                        .map((item, index) => {
                          const userId = assignmentUserId(item);
                          const name = assignmentUserName(item, users);
                          return (
                            <div
                              key={text(item.id) || userId || index}
                              className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {name || "Không xác định người được phân công"}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {text(
                                    item.assignmentType ??
                                      item.assignment_type ??
                                      item.role,
                                  ) || "Chuyên viên được phân công"}
                                  {itemDate(item)
                                    ? ` · ${displayDate(itemDate(item))}`
                                    : ""}
                                </p>
                              </div>
                              <span className="text-xs text-emerald-700">
                                Đang tham gia
                              </span>
                            </div>
                          );
                        })}
                      {!responsibleUserId && !activeTaskAssignments.length && (
                          <p className="text-sm text-slate-500">
                            Chưa có chuyên viên được phân công.
                          </p>
                        )}
                    </div>
                    {hasPermission("TASK_ASSIGN") &&
                      taskRouteType === "DEPARTMENT" &&
                      ["ASSIGNED", "IN_PROGRESS"].includes(detail.task.status) && (
                      <div className="mt-5 border-t border-slate-200 pt-4">
                        <h4 className="text-sm font-bold text-slate-900">
                          Phân công chuyên viên
                        </h4>
                        <select
                          className={`${inputClass} mt-3`}
                          value={delegateUserId}
                          onChange={(event) =>
                            setDelegateUserId(event.target.value)
                          }
                        >
                          <option value="">Chọn chuyên viên</option>
                          {filteredSpecialists.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name}
                            </option>
                          ))}
                        </select>
                        <textarea
                          className={`${inputClass} mt-3 min-h-16`}
                          placeholder="Ghi chú giao việc"
                          value={actionNote}
                          onChange={(event) => setActionNote(event.target.value)}
                        />
                        <button
                          type="button"
                          className={`${buttonClass} mt-3 w-full`}
                          disabled={!delegateUserId || Boolean(activeAction)}
                          onClick={() =>
                            void runTaskAction(
                              "delegate",
                              `${selectedTaskPath}/delegate`,
                              {
                                assigneeId: delegateUserId,
                                note: actionNote.trim() || null,
                              },
                              "Đã phân công cho chuyên viên.",
                            )
                          }
                        >
                          {activeAction === "delegate" && (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          )}
                          Giao cho chuyên viên
                        </button>
                      </div>
                    )}
                    {detail.subtasks.length > 0 && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <h4 className="text-sm font-semibold text-slate-800">
                          Nhiệm vụ con
                        </h4>
                        <ul className="mt-2 space-y-2">
                          {detail.subtasks.map((item, index) => (
                            <li
                              key={text(item.id) || index}
                              className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                            >
                              {itemTitle(item)}
                              {item.status ? ` · ${text(item.status)}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                  <div className="grid gap-4 xl:grid-cols-2">
                    {detail.task.status === "PENDING_REVIEW" && <article className={`${panelClass} space-y-3`}><h3 className="text-sm font-bold text-slate-900">Phê duyệt kết quả</h3><textarea className={`${inputClass} min-h-20`} placeholder="Nhận xét bắt buộc" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} /><div className="grid grid-cols-2 gap-2"><button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50" disabled={Boolean(activeAction)} onClick={() => submitReview("APPROVE")}><Check className="h-4 w-4" />Phê duyệt</button><button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50" disabled={Boolean(activeAction)} onClick={() => submitReview("RETURN")}><X className="h-4 w-4" />Trả lại</button></div></article>}
                    {detail.task.status === "PENDING_REVIEW" && <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm leading-5 text-violet-800">Công việc đang chờ lãnh đạo xem xét. Kết quả và nhận xét được lưu theo luồng phê duyệt.</div>}
                  </div>
                </div>}
                {detailTab === "progress" && <div className="space-y-4">
                  {["ASSIGNED", "IN_PROGRESS"].includes(detail.task.status) && <form onSubmit={submitProgress} className={`${panelClass} space-y-3`}><h3 className="text-sm font-bold text-slate-900">Cập nhật tiến độ</h3><label className="block text-sm font-medium text-slate-700">Phần trăm hoàn thành: {progressPercent}%<input className="mt-2 w-full accent-blue-700" type="range" min="0" step={10} max="100" value={progressPercent} onChange={(event) => setProgressPercent(Number(event.target.value))} /></label><label className="block text-sm font-medium text-slate-700">Nội dung thực hiện *<textarea required className={`${inputClass} mt-1.5 min-h-20`} value={progressContent} onChange={(event) => setProgressContent(event.target.value)} /></label><label className="block text-sm font-medium text-slate-700">Khó khăn<textarea className={`${inputClass} mt-1.5 min-h-16`} value={difficulties} onChange={(event) => setDifficulties(event.target.value)} /></label><label className="block text-sm font-medium text-slate-700">Giải pháp đề xuất<textarea className={`${inputClass} mt-1.5 min-h-16`} value={proposedSolution} onChange={(event) => setProposedSolution(event.target.value)} /></label><button className={buttonClass} disabled={Boolean(activeAction)}>{activeAction === "progress" && <LoaderCircle className="h-4 w-4 animate-spin" />}Lưu cập nhật</button></form>}
                  {detail.task.status === "IN_PROGRESS" && <form onSubmit={submitReviewResult} className={`${panelClass} space-y-3`}><h3 className="text-sm font-bold text-slate-900">Trình kết quả</h3><textarea required className={`${inputClass} min-h-24`} placeholder="Mô tả kết quả đã thực hiện..." value={reviewResult} onChange={(event) => setReviewResult(event.target.value)} /><button className={buttonClass} disabled={Boolean(activeAction)}><ArrowRight className="h-4 w-4" />Trình lãnh đạo phê duyệt</button></form>}
                  <TimelineList items={detail.progress} empty="Chưa có cập nhật tiến độ." />
                </div>}
                {detailTab === "comments" && <div className="space-y-4"><form onSubmit={submitComment} className={`${panelClass} space-y-3`}><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><MessageSquare className="h-4 w-4 text-blue-600" />Trao đổi công việc</h3><textarea required className={`${inputClass} min-h-20`} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Nhập nội dung trao đổi..." /><button className={buttonClass} disabled={Boolean(activeAction)}>Gửi trao đổi</button></form><TimelineList items={detail.comments} empty="Chưa có trao đổi nào." /></div>}
                {detailTab === "history" && <div className="space-y-4"><TimelineList items={detail.history} empty="Chưa có lịch sử thao tác." heading="Lịch sử hoạt động" translateActions /></div>}
              </main>
            </div>
          </section>
        </div>
      )}

      {selectedTask && !detail && detailLoading && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50"><div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-600"><LoaderCircle className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-700" />Đang tải chi tiết công việc...</div></div>}
    </div>
  );
}

function TimelineList({
  items,
  empty,
  heading,
  translateActions = false,
}: {
  items: Record<string, unknown>[];
  empty: string;
  heading?: string;
  translateActions?: boolean;
}) {
  return (
    <section className={panelClass}>
      <h3 className="text-sm font-bold text-slate-900">{heading ?? "Lịch sử cập nhật"}</h3>
      {items.length ? (
        <div className="mt-3 space-y-3">
          {items.map((item, index) => {
            const difficulty = text(item.difficulties ?? item.challenges);
            const solution = text(item.proposedSolution ?? item.proposed_solution);
            return (
              <article key={text(item.id) || index} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="whitespace-pre-wrap text-sm leading-5 text-slate-700">
                    {translateActions ? historyItemTitle(item) : itemTitle(item)}
                  </p>
                  {itemDate(item) && <time className="shrink-0 text-[11px] text-slate-400">{displayDateTime(itemDate(item))}</time>}
                </div>
                {itemActor(item) && <p className="mt-2 text-xs font-medium text-slate-500">{itemActor(item)}</p>}
                {difficulty && <p className="mt-2 text-xs text-amber-800">Khó khăn: {difficulty}</p>}
                {solution && <p className="mt-1 text-xs text-blue-800">Giải pháp đề xuất: {solution}</p>}
                {item.progressPercent !== undefined && <p className="mt-2 text-xs font-semibold text-blue-700">Tiến độ {text(item.progressPercent)}%</p>}
              </article>
            );
          })}
        </div>
      ) : <p className="mt-3 text-sm text-slate-500">{empty}</p>}
    </section>
  );
}
