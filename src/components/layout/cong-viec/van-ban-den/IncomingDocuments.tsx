"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  FilePlus2,
  FileSearch2,
  FileText,
  LoaderCircle,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/auth/api";

type DocumentStatus =
  | "RECEIVED"
  | "CLASSIFIED"
  | "ASSIGNED"
  | "PROCESSING"
  | "COMPLETED"
  | "ARCHIVED";
type Priority = "low" | "medium" | "high" | "urgent";

type AiAnalysis = {
  summary: string;
  category: string;
  proposedDepartmentId: string;
  proposedAssigneeId: string;
  proposedDueDate: string;
  priority: Priority | "";
  confidence: number | null;
};

type IncomingDocument = {
  id: string;
  documentNo: string;
  documentDate: string;
  title: string;
  documentType: string;
  issuingAgency: string;
  fieldId: string;
  fieldName: string;
  receivedDate: string;
  fileUrl: string;
  receivedBy: string;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
  aiAnalysis: AiAnalysis | null;
};

type Option = {
  id: string;
  name: string;
  organizationId: string;
  departmentId: string;
};

type DocumentField = {
  id: string;
  name: string;
};

type DocumentForm = {
  documentNo: string;
  documentDate: string;
  title: string;
  documentType: string;
  issuingAgency: string;
  fieldId: string;
  receivedDate: string;
  receivedBy: string;
  status: DocumentStatus;
};

type DocumentTypeOption = {
  label: string;
  value: string;
};

type AssignmentForm = {
  departmentId: string;
  assigneeId: string;
  dueDate: string;
  priority: Priority;
  note: string;
};

type ModalState =
  | { type: "form"; document: IncomingDocument | null }
  | { type: "detail"; document: IncomingDocument }
  | null;

const emptyDocumentForm: DocumentForm = {
  documentNo: "",
  documentDate: "",
  title: "",
  documentType: "",
  issuingAgency: "",
  fieldId: "",
  receivedDate: "",
  receivedBy: "",
  status: "RECEIVED",
};

const emptyAssignmentForm: AssignmentForm = {
  departmentId: "",
  assigneeId: "",
  dueDate: "",
  priority: "medium",
  note: "",
};

const statusLabels: Record<DocumentStatus, string> = {
  RECEIVED: "Mới tiếp nhận",
  CLASSIFIED: "Đã phân loại",
  ASSIGNED: "Đã phân công",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Đã hoàn thành",
  ARCHIVED: "Đã lưu trữ",
};

const priorityLabels: Record<Priority, string> = {
  low: "Thấp",
  medium: "Bình thường",
  high: "Cao",
  urgent: "Khẩn",
};

const documentTypeOptions: DocumentTypeOption[] = [
  { label: "Nghị quyết - NQ", value: "NQ" },
  { label: "Quyết định - QĐ", value: "QĐ" },
  { label: "Chỉ thị - CT", value: "CT" },
  { label: "Quy chế - QC", value: "QC" },
  { label: "Quy định - QYĐ", value: "QYĐ" },
  { label: "Thông cáo - TC", value: "TC" },
  { label: "Thông báo - TB", value: "TB" },
  { label: "Hướng dẫn - HD", value: "HD" },
  { label: "Chương trình - CTr", value: "CTr" },
  { label: "Kế hoạch - KH", value: "KH" },
  { label: "Phương án - PA", value: "PA" },
  { label: "Đề án - ĐA", value: "ĐA" },
  { label: "Dự án - DA", value: "DA" },
  { label: "Báo cáo - BC", value: "BC" },
  { label: "Biên bản - BB", value: "BB" },
  { label: "Tờ trình - TTr", value: "TTr" },
  { label: "Hợp đồng - HĐ", value: "HĐ" },
  { label: "Công văn - CV", value: "CV" },
  { label: "Công điện - CĐ", value: "CĐ" },
  { label: "Bản ghi nhớ - BGN", value: "BGN" },
  { label: "Bản thỏa thuận - BTT", value: "BTT" },
  { label: "Giấy ủy quyền - GUQ", value: "GUQ" },
  { label: "Giấy mời - GM", value: "GM" },
  { label: "Giấy giới thiệu - GGT", value: "GGT" },
  { label: "Giấy nghỉ phép - GNP", value: "GNP" },
  { label: "Phiếu gửi - PG", value: "PG" },
  { label: "Phiếu chuyển - PC", value: "PC" },
  { label: "Phiếu báo - PB", value: "PB" },
  { label: "Thư công", value: "Thư công" },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function readValue(
  record: Record<string, unknown>,
  camel: string,
  snake: string,
): unknown {
  return record[camel] ?? record[snake];
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function unwrap(value: unknown): unknown {
  const record = asRecord(value);
  return record && "data" in record ? record.data : value;
}

function readList(value: unknown, label: string): unknown[] {
  const unwrapped = unwrap(value);
  if (Array.isArray(unwrapped)) return unwrapped;
  const record = asRecord(unwrapped);
  if (record && Array.isArray(record.items)) return record.items;
  throw new Error(`API không trả về danh sách ${label} hợp lệ.`);
}

type DocumentPage = {
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
};

function numericValue(value: unknown, fallback: number): number {
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : fallback;
}

function normalizeDocumentPage(
  value: unknown,
  requestedPage: number,
  requestedPageSize: number,
): DocumentPage {
  const root = asRecord(value);
  const payload = unwrap(value);
  const data = asRecord(payload);
  const metadata = asRecord(data?.meta ?? root?.meta ?? data?.pagination ?? root?.pagination);
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(root?.items)
            ? root.items
            : Array.isArray(root?.results)
              ? root.results
              : [];
  const page = numericValue(
    data?.page ?? data?.currentPage ?? data?.current_page ??
      metadata?.page ?? metadata?.currentPage ?? metadata?.current_page ??
      root?.page ?? root?.currentPage ?? root?.current_page,
    requestedPage,
  );
  const pageSize = numericValue(
    data?.limit ?? data?.pageSize ?? data?.page_size ?? data?.perPage ??
      metadata?.limit ?? metadata?.pageSize ?? metadata?.page_size ??
      metadata?.perPage ?? root?.limit ?? root?.pageSize ?? root?.page_size ??
      root?.perPage,
    requestedPageSize,
  );
  const total = numericValue(
    data?.total ?? data?.totalCount ?? data?.total_count ?? data?.totalItems ??
      data?.total_items ?? data?.count ?? metadata?.total ??
      metadata?.totalCount ?? metadata?.total_count ?? metadata?.totalItems ??
      metadata?.total_items ?? root?.total ?? root?.totalCount ??
      root?.total_count ?? root?.totalItems ?? root?.total_items ?? root?.count,
    items.length,
  );
  return { items, total, page, pageSize };
}

function documentFilePath(documentId: string, action: "file" | "download") {
  return `/api/documents/${encodeURIComponent(documentId)}/${action}`;
}

function normalizeStatus(value: unknown): DocumentStatus {
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    if (
      normalized === "RECEIVED" ||
      normalized === "CLASSIFIED" ||
      normalized === "ASSIGNED" ||
      normalized === "PROCESSING" ||
      normalized === "COMPLETED" ||
      normalized === "ARCHIVED"
    ) {
      return normalized;
    }
    if (normalized === "PENDING") return "RECEIVED";
    if (normalized === "REJECTED") return "ARCHIVED";
  }
  return "RECEIVED";
}

function normalizePriority(value: unknown): Priority | "" {
  if (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "urgent"
  ) {
    return value;
  }
  return "";
}

function documentTypeLabel(value: string): string {
  return (
    documentTypeOptions.find(
      (option) =>
        option.value.toLocaleLowerCase("vi-VN") ===
          value.toLocaleLowerCase("vi-VN") ||
        option.label.toLocaleLowerCase("vi-VN") ===
          value.toLocaleLowerCase("vi-VN"),
    )?.label ?? value
  );
}

function normalizeAnalysis(value: unknown): AiAnalysis | null {
  const record = asRecord(value);
  if (!record) return null;
  const confidenceValue = record.confidence;
  return {
    summary: text(record.summary),
    category: text(record.category),
    proposedDepartmentId: text(
      readValue(record, "proposedDepartmentId", "proposed_department_id"),
    ),
    proposedAssigneeId: text(
      readValue(record, "proposedAssigneeId", "proposed_assignee_id"),
    ),
    proposedDueDate: text(
      readValue(record, "proposedDueDate", "proposed_due_date"),
    ),
    priority: normalizePriority(record.priority),
    confidence:
      typeof confidenceValue === "number" ? confidenceValue : null,
  };
}

function normalizeDocument(value: unknown): IncomingDocument {
  const record = asRecord(value);
  if (!record) throw new Error("Dữ liệu văn bản không hợp lệ.");
  const id = record.id;
  const title = record.title;
  if (
    (typeof id !== "string" && typeof id !== "number") ||
    typeof title !== "string"
  ) {
    throw new Error("Văn bản thiếu mã định danh hoặc trích yếu.");
  }
  const analysis =
    record.aiAnalysis ??
    record.ai_analysis ??
    record.analysis ??
    record.documentAiAnalysis ??
    record.document_ai_analysis;
  return {
    id: String(id),
    documentNo: text(readValue(record, "documentNo", "document_no")),
    documentDate: text(readValue(record, "documentDate", "document_date")),
    title,
    documentType: text(readValue(record, "documentType", "document_type")),
    issuingAgency: text(readValue(record, "issuingAgency", "issuing_agency")),
    fieldId: text(
      readValue(record, "fieldId", "field_id") ??
        asRecord(record.field)?.id ??
        asRecord(record.documentField ?? record.document_field)?.id,
    ),
    fieldName: text(
      asRecord(record.field)?.name ??
        asRecord(record.documentField ?? record.document_field)?.name ??
        record.fieldName ??
        record.field_name,
    ),
    receivedDate: text(readValue(record, "receivedDate", "received_date")),
    fileUrl: text(readValue(record, "fileUrl", "file_url")),
    receivedBy: text(readValue(record, "receivedBy", "received_by")),
    status: normalizeStatus(record.status),
    createdAt: text(readValue(record, "createdAt", "created_at")),
    updatedAt: text(readValue(record, "updatedAt", "updated_at")),
    aiAnalysis: normalizeAnalysis(
      Array.isArray(analysis) ? analysis[0] : analysis,
    ),
  };
}

function normalizeOption(value: unknown, kind: "user" | "department"): Option {
  const record = asRecord(value);
  if (!record) throw new Error("Dữ liệu lựa chọn không hợp lệ.");
  const organization = asRecord(record.organization);
  const department = asRecord(record.department);
  const id = record.id;
  const name =
    kind === "user"
      ? record.fullName ?? record.full_name ?? record.name ?? record.username
      : record.name;
  if (
    (typeof id !== "string" && typeof id !== "number") ||
    typeof name !== "string"
  ) {
    throw new Error("Dữ liệu lựa chọn thiếu mã hoặc tên.");
  }
  return {
    id: String(id),
    name,
    organizationId: text(
      readValue(record, "organizationId", "organization_id") ?? organization?.id,
    ),
    departmentId: text(
      readValue(record, "departmentId", "department_id") ?? department?.id,
    ),
  };
}

function normalizeDocumentField(value: unknown): DocumentField {
  const record = asRecord(value);
  const id = record?.id;
  const name = record?.name ?? record?.title;
  if (
    (typeof id !== "string" && typeof id !== "number") ||
    typeof name !== "string"
  ) {
    throw new Error("Dữ liệu lĩnh vực thiếu mã hoặc tên.");
  }
  return { id: String(id), name };
}

function dateInput(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function displayDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function statusClass(status: DocumentStatus): string {
  switch (status) {
    case "PROCESSING":
      return "bg-blue-50 text-blue-700 ring-blue-600/15";
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/15";
    case "ARCHIVED":
      return "bg-slate-100 text-slate-600 ring-slate-500/15";
    case "ASSIGNED":
      return "bg-violet-50 text-violet-700 ring-violet-600/15";
    case "CLASSIFIED":
      return "bg-cyan-50 text-cyan-700 ring-cyan-600/15";
    default:
      return "bg-amber-50 text-amber-700 ring-amber-600/15";
  }
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
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
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${
          wide ? "max-w-4xl" : "max-w-2xl"
        }`}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="p-5 sm:p-7">{children}</div>
      </section>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100";

export default function IncomingDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<IncomingDocument[]>([]);
  const [documentFields, setDocumentFields] = useState<DocumentField[]>([]);
  const [users, setUsers] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState<DocumentForm>(emptyDocumentForm);
  const [documentTypeQuery, setDocumentTypeQuery] = useState("");
  const [isDocumentTypeMenuOpen, setIsDocumentTypeMenuOpen] = useState(false);
  const [assignment, setAssignment] =
    useState<AssignmentForm>(emptyAssignmentForm);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fieldFilter, setFieldFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const listRequestId = useRef(0);
  const detailRequestId = useRef(0);

  const loadDocuments = useCallback(async (
    requestedPage: number,
    search: string,
    status: string,
    fieldId: string,
  ) => {
    const requestId = ++listRequestId.current;
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(requestedPage),
      limit: String(pageSize),
    });
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (fieldId) params.set("fieldId", fieldId);
    try {
      const result = normalizeDocumentPage(
        await apiRequest<unknown>(`/documents?${params.toString()}`),
        requestedPage,
        pageSize,
      );
      if (requestId !== listRequestId.current) return;
      setDocuments(result.items.map(normalizeDocument));
      setTotalDocuments(result.total);
      setPage(result.page || requestedPage);
      setPageSize(result.pageSize || pageSize);
    } catch (requestError) {
      if (requestId !== listRequestId.current) return;
      setDocuments([]);
      setTotalDocuments(0);
      setError(
        errorMessage(requestError, "Không thể tải danh sách văn bản đến."),
      );
    } finally {
      if (requestId === listRequestId.current) setIsLoading(false);
    }
  }, [pageSize]);

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    setOptionsError(null);
    const [userResult, departmentResult, fieldResult] =
      await Promise.allSettled([
        apiRequest<unknown>("/users"),
        apiRequest<unknown>("/departments"),
        apiRequest<unknown>("/document-fields"),
      ]);
    const loadErrors: string[] = [];
    if (userResult.status === "fulfilled") {
      try {
        setUsers(
          readList(userResult.value, "chuyên viên").map((item) =>
            normalizeOption(item, "user"),
          ),
        );
      } catch (requestError) {
        setUsers([]);
        loadErrors.push(errorMessage(requestError, "Không thể tải chuyên viên."));
      }
    } else {
      setUsers([]);
      loadErrors.push(errorMessage(userResult.reason, "Không thể tải chuyên viên."));
    }
    if (departmentResult.status === "fulfilled") {
      try {
        setDepartments(
          readList(departmentResult.value, "phòng ban").map((item) =>
            normalizeOption(item, "department"),
          ),
        );
      } catch (requestError) {
        setDepartments([]);
        loadErrors.push(errorMessage(requestError, "Không thể tải phòng ban."));
      }
    } else {
      setDepartments([]);
      loadErrors.push(
        errorMessage(departmentResult.reason, "Không thể tải phòng ban."),
      );
    }
    if (fieldResult.status === "fulfilled") {
      try {
        setDocumentFields(
          readList(fieldResult.value, "lĩnh vực").map(normalizeDocumentField),
        );
      } catch (requestError) {
        setDocumentFields([]);
        loadErrors.push(errorMessage(requestError, "Không thể tải lĩnh vực."));
      }
    } else {
      setDocumentFields([]);
      loadErrors.push(errorMessage(fieldResult.reason, "Không thể tải lĩnh vực."));
    }
    setOptionsError(loadErrors.length ? loadErrors.join(" ") : null);
    setIsLoadingOptions(false);
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      void loadOptions();
    });
  }, [loadOptions]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadDocuments(page, keyword, statusFilter, fieldFilter);
    }, keyword ? 300 : 0);
    return () => window.clearTimeout(timeout);
  }, [fieldFilter, keyword, loadDocuments, page, statusFilter]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const counts = useMemo(
    () => ({
      all: totalDocuments,
      pending: documents.filter((item) => item.status === "RECEIVED").length,
      processing: documents.filter((item) => item.status === "PROCESSING").length,
      completed: documents.filter((item) => item.status === "COMPLETED").length,
    }),
    [documents, totalDocuments],
  );

  const filteredDocumentTypes = useMemo(() => {
    const query = documentTypeQuery.trim().toLocaleLowerCase("vi-VN");
    if (!query) return documentTypeOptions;
    return documentTypeOptions.filter((option) =>
      `${option.label} ${option.value}`
        .toLocaleLowerCase("vi-VN")
        .includes(query),
    );
  }, [documentTypeQuery]);

  const openCreate = () => {
    setForm(emptyDocumentForm);
    setDocumentTypeQuery("");
    setIsDocumentTypeMenuOpen(false);
    setSelectedFile(null);
    setFormError(null);
    setModal({ type: "form", document: null });
  };

  const openEdit = (document: IncomingDocument) => {
    setForm({
      documentNo: document.documentNo,
      documentDate: dateInput(document.documentDate),
      title: document.title,
      documentType: document.documentType,
      issuingAgency: document.issuingAgency,
      fieldId: document.fieldId,
      receivedDate: dateInput(document.receivedDate),
      receivedBy: document.receivedBy,
      status: document.status,
    });
    setDocumentTypeQuery(documentTypeLabel(document.documentType));
    setIsDocumentTypeMenuOpen(false);
    setSelectedFile(null);
    setFormError(null);
    setModal({ type: "form", document });
  };

  const openDetail = (document: IncomingDocument) => {
    const requestId = ++detailRequestId.current;
    setAssignment({
      ...emptyAssignmentForm,
      departmentId: document.aiAnalysis?.proposedDepartmentId ?? "",
      assigneeId: document.aiAnalysis?.proposedAssigneeId ?? "",
      dueDate: dateInput(document.aiAnalysis?.proposedDueDate ?? ""),
      priority: document.aiAnalysis?.priority || "medium",
    });
    setAssignmentError(null);
    setDetailError(null);
    setModal({ type: "detail", document });
    setIsDetailLoading(true);
    void apiRequest<unknown>(
      `/documents/${encodeURIComponent(document.id)}`,
    )
      .then((response) => {
        if (requestId !== detailRequestId.current) return;
        const details = normalizeDocument(unwrap(response));
        setDocuments((current) =>
          current.map((item) => (item.id === details.id ? details : item)),
        );
        setModal((current) =>
          current?.type === "detail" && current.document.id === details.id
            ? { type: "detail", document: details }
            : current,
        );
      })
      .catch((requestError: unknown) => {
        if (requestId !== detailRequestId.current) return;
        setDetailError(
          errorMessage(requestError, "Không thể tải chi tiết văn bản."),
        );
      })
      .finally(() => {
        if (requestId === detailRequestId.current) {
          setIsDetailLoading(false);
        }
      });
  };

  const closeModal = () => {
    if (isSaving || isAssigning || isDetailLoading) return;
    detailRequestId.current += 1;
    setModal(null);
  };

  const saveDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.documentNo.trim() || !form.title.trim()) {
      setFormError("Vui lòng nhập số văn bản và trích yếu.");
      return;
    }
    if (documentTypeQuery.trim() && !form.documentType) {
      setFormError("Vui lòng chọn loại văn bản trong danh sách gợi ý.");
      return;
    }
    const editingDocument =
      modal?.type === "form" ? modal.document : null;
    if (!editingDocument && !selectedFile) {
      setFormError("Vui lòng tải lên tệp văn bản.");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    const payload = {
      documentNo: form.documentNo.trim(),
      documentDate: form.documentDate || null,
      title: form.title.trim(),
      documentType: form.documentType.trim(),
      issuingAgency: form.issuingAgency.trim(),
      fieldId: form.fieldId || null,
      receivedDate: form.receivedDate || null,
      receivedBy: form.receivedBy.trim() || user?.id || null,
      status: form.status,
    };
    let metadataSaved = false;
    try {
      if (editingDocument) {
        await apiRequest<unknown>(
          `/documents/${encodeURIComponent(editingDocument.id)}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
        );
        metadataSaved = true;
        if (selectedFile) {
          const fileData = new FormData();
          fileData.append("file", selectedFile);
          await apiRequest<unknown>(
            `/documents/${encodeURIComponent(editingDocument.id)}/file`,
            { method: "POST", body: fileData },
          );
        }
      } else {
        const documentData = new FormData();
        for (const [key, value] of Object.entries(payload)) {
          if (value !== null && value !== "") {
            documentData.append(key, String(value));
          }
        }
        documentData.append("file", selectedFile as File);
        await apiRequest<unknown>("/documents", {
          method: "POST",
          body: documentData,
        });
      }
      setNotice({
        type: "success",
        text: editingDocument
          ? selectedFile
            ? "Đã cập nhật văn bản và thay thế tệp đính kèm."
            : "Đã cập nhật văn bản."
          : "Đã thêm văn bản và tải tệp lên.",
      });
      setModal(null);
      setSelectedFile(null);
      const nextPage = editingDocument ? page : 1;
      setPage(nextPage);
      await loadDocuments(nextPage, keyword, statusFilter, fieldFilter);
    } catch (requestError) {
      const message = errorMessage(
        requestError,
        "Không thể lưu văn bản hoặc tải tệp lên.",
      );
      const contextualMessage =
        metadataSaved && selectedFile
          ? `Đã lưu thông tin văn bản nhưng chưa thay được tệp: ${message}`
          : message;
      setFormError(contextualMessage);
      setNotice({ type: "error", text: contextualMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDocument = async (document: IncomingDocument) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa văn bản "${document.documentNo || document.title}"?`,
      )
    ) {
      return;
    }
    setPendingDeleteId(document.id);
    setError(null);
    try {
      await apiRequest<unknown>(
        `/documents/${encodeURIComponent(document.id)}`,
        { method: "DELETE" },
      );
      setDocuments((current) =>
        current.filter((item) => item.id !== document.id),
      );
      setTotalDocuments((current) => Math.max(0, current - 1));
      if (documents.length === 1 && page > 1) {
        setPage((current) => current - 1);
      }
      if (modal?.type === "detail" && modal.document.id === document.id) {
        setModal(null);
      }
      setNotice({ type: "success", text: "Đã xóa văn bản." });
    } catch (requestError) {
      const message = errorMessage(requestError, "Không thể xóa văn bản.");
      setError(message);
      setNotice({ type: "error", text: message });
    } finally {
      setPendingDeleteId(null);
    }
  };

  const assignDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (modal?.type !== "detail") return;
    if (!assignment.assigneeId || !assignment.departmentId) {
      setAssignmentError("Vui lòng chọn phòng ban và chuyên viên phụ trách.");
      return;
    }
    setIsAssigning(true);
    setAssignmentError(null);
    let taskCreated = false;
    let assignmentCreated = false;
    try {
      const document = modal.document;
      const taskResponse = await apiRequest<unknown>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: document.title,
          description: [
            `Xử lý văn bản đến ${document.documentNo}.`,
            `Cơ quan ban hành: ${document.issuingAgency || "Chưa cập nhật"}.`,
            assignment.note.trim(),
          ]
            .filter(Boolean)
            .join("\n"),
          documentId: document.id,
          organizationId:
            departments.find((item) => item.id === assignment.departmentId)
              ?.organizationId || null,
          departmentId: assignment.departmentId,
          assignedBy: user?.id ?? null,
          responsibleUserId: assignment.assigneeId,
          startDate: new Date().toISOString().slice(0, 10),
          dueDate: assignment.dueDate || null,
          priority: assignment.priority,
          status: "RECEIVED",
          progressPercent: 0,
          isImportant: assignment.priority === "urgent",
          isConfidential: false,
          createdBy: user?.id ?? null,
        }),
      });
      taskCreated = true;
      const taskRecord = asRecord(unwrap(taskResponse));
      const taskId = taskRecord?.id;
      if (typeof taskId !== "string" && typeof taskId !== "number") {
        throw new Error(
          "Đã tạo nhiệm vụ nhưng API không trả về mã nhiệm vụ để ghi nhận phân công.",
        );
      }

      await apiRequest<unknown>("/task-assignments", {
        method: "POST",
        body: JSON.stringify({
          taskId: String(taskId),
          userId: assignment.assigneeId,
          assignmentType: "responsible",
          assignedBy: user?.id ?? null,
          note: assignment.note.trim() || null,
          isActive: true,
        }),
      });
      assignmentCreated = true;

      setDocuments((current) =>
        current.map((item) =>
          item.id === document.id
            ? { ...item, status: "PROCESSING" }
            : item,
        ),
      );
      setModal(null);
      setNotice({
        type: "success",
        text: "Đã tạo nhiệm vụ và phân công cho chuyên viên.",
      });
      await apiRequest<unknown>(`/documents/${encodeURIComponent(document.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "PROCESSING" }),
      });
      await loadDocuments(page, keyword, statusFilter, fieldFilter);
    } catch (requestError) {
      const message = errorMessage(
        requestError,
        "Không thể hoàn tất phân công văn bản.",
      );
      const contextualMessage = assignmentCreated
        ? `Nhiệm vụ đã được phân công nhưng trạng thái văn bản chưa đồng bộ: ${message}`
        : taskCreated
          ? `Nhiệm vụ đã được tạo nhưng chưa ghi nhận đầy đủ phân công: ${message}`
          : message;
      setAssignmentError(contextualMessage);
      setNotice({ type: "error", text: contextualMessage });
    } finally {
      setIsAssigning(false);
    }
  };

  const applyAiSuggestion = (document: IncomingDocument) => {
    const analysis = document.aiAnalysis;
    if (!analysis) return;
    setAssignment((current) => ({
      ...current,
      departmentId: analysis.proposedDepartmentId || current.departmentId,
      assigneeId: analysis.proposedAssigneeId || current.assigneeId,
      dueDate: dateInput(analysis.proposedDueDate) || current.dueDate,
      priority: analysis.priority || current.priority,
      note: analysis.summary || current.note,
    }));
  };

  const eligibleUsers = users.filter(
    (item) =>
      !item.departmentId || item.departmentId === assignment.departmentId,
  );

  return (
    <div className="space-y-6">
      {notice && (
        <div
          role="status"
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{notice.text}</span>
          <button
            type="button"
            className="ml-auto rounded-lg p-1 hover:bg-black/5"
            onClick={() => setNotice(null)}
            aria-label="Đóng thông báo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e3060] via-[#124987] to-[#2775c7] px-6 py-7 text-white shadow-lg shadow-blue-950/10 sm:px-5 sm:py-5">
        <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute -right-3 -top-7 h-44 w-44 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:justify-between items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50">
              <Sparkles className="h-4 w-4 text-amber-300" />
              TRUNG TÂM ĐIỀU PHỐI VĂN BẢN
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#0e3060] shadow-lg shadow-blue-950/15 transition hover:-translate-y-0.5 hover:bg-blue-50"
          >
            <FilePlus2 className="h-4 w-4" />
            Thêm văn bản
          </button>
        </div>
        <div className="relative mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Tổng văn bản", value: counts.all, icon: FileText },
            { label: "Chờ xử lý · trang này", value: counts.pending, icon: FileSearch2 },
            { label: "Đang xử lý · trang này", value: counts.processing, icon: UsersRound },
            { label: "Hoàn thành · trang này", value: counts.completed, icon: CheckCircle2 },
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
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="font-bold text-slate-900">Danh sách văn bản</h3>
            <p className="mt-1 text-sm text-slate-500">
              {totalDocuments} văn bản
              {keyword || statusFilter !== "all" || fieldFilter
                ? " phù hợp điều kiện tìm kiếm"
                : " trong hệ thống"}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value);
                  setPage(1);
                }}
                placeholder="Tìm số, trích yếu, cơ quan..."
                className={`${inputClass} min-w-0 pl-9 sm:w-72`}
                aria-label="Tìm văn bản"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className={`${inputClass} sm:w-44`}
              aria-label="Lọc theo trạng thái"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={fieldFilter}
              onChange={(event) => {
                setFieldFilter(event.target.value);
                setPage(1);
              }}
              className={inputClass}
              aria-label="Lọc theo lĩnh vực"
              disabled={!documentFields.length}
            >
              <option value="">Tất cả lĩnh vực</option>
              {documentFields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="m-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:m-6">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() =>
                void loadDocuments(page, keyword, statusFilter, fieldFilter)
              }
              className="font-semibold underline underline-offset-2"
            >
              Thử lại
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-auto px-6 py-4 font-semibold md:w-[400px] md:min-w-[400px] md:max-w-[400px]">
                  Văn bản
                </th>
                <th className="px-5 py-4 font-semibold">Cơ quan ban hành</th>
                <th className="px-5 py-4 font-semibold">Lĩnh vực</th>
                <th className="px-5 py-4 font-semibold">Ngày nhận</th>
                <th className="px-5 py-4 font-semibold">Trạng thái</th>
                <th className="px-5 py-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-600" />
                    Đang tải danh sách văn bản...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <FileSearch2 className="h-6 w-6" />
                    </div>
                    <p className="mt-3 font-semibold text-slate-800">
                      {totalDocuments ? "Không tìm thấy văn bản" : "Chưa có văn bản đến"}
                    </p>
                  </td>
                </tr>
              ) : (
                documents.map((document) => (
                  <tr key={document.id} className="group hover:bg-slate-50/70">
                    <td className="w-auto px-6 py-4 md:w-[400px] md:min-w-[400px] md:max-w-[400px]">
                      <button
                        type="button"
                        onClick={() => openDetail(document)}
                        className="block w-full text-left"
                      >
                        <span className="block break-words font-semibold text-slate-900 group-hover:text-blue-700">
                          {document.title}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {document.documentNo || "Chưa có số"} ·{" "}
                          {document.documentType || "Chưa phân loại"}
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {document.issuingAgency || "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {document.fieldName ||
                        documentFields.find((field) => field.id === document.fieldId)
                          ?.name ||
                        "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {displayDate(document.receivedDate)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(document.status)}`}
                      >
                        {statusLabels[document.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openDetail(document)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                          aria-label={`Xem chi tiết ${document.documentNo || document.title}`}
                          title="Xem chi tiết"
                        >
                          <FileSearch2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(document)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                          aria-label={`Sửa ${document.documentNo || document.title}`}
                          title="Chỉnh sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteDocument(document)}
                          disabled={pendingDeleteId === document.id}
                          className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                          aria-label={`Xóa ${document.documentNo || document.title}`}
                          title="Xóa"
                        >
                          {pendingDeleteId === document.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-slate-500">
            {totalDocuments === 0
              ? "Không có kết quả"
              : `Hiển thị ${(page - 1) * pageSize + 1}–${Math.min(
                  page * pageSize,
                  totalDocuments,
                )} trong ${totalDocuments} văn bản`}
          </p>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Số dòng
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
                aria-label="Số văn bản mỗi trang"
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <span className="min-w-20 text-center text-xs font-medium text-slate-600">
              Trang {page} / {Math.max(1, Math.ceil(totalDocuments / pageSize))}
            </span>
            <button
              type="button"
              disabled={isLoading || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={
                isLoading || page >= Math.ceil(totalDocuments / pageSize)
              }
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      {modal?.type === "form" && (
        <ModalShell
          title={modal.document ? "Chỉnh sửa văn bản" : "Thêm văn bản đến"}
          onClose={closeModal}
          wide
        >
          <form onSubmit={saveDocument} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Số văn bản" required>
                <input
                  required
                  value={form.documentNo}
                  onChange={(event) =>
                    setForm({ ...form, documentNo: event.target.value })
                  }
                  className={inputClass}
                  placeholder="Ví dụ: 125/UBND-VP"
                />
              </Field>
              <Field label="Loại văn bản">
                <div className="relative">
                  <input
                    type="search"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={isDocumentTypeMenuOpen}
                    aria-controls="document-type-options"
                    aria-label="Tìm và chọn loại văn bản"
                    autoComplete="off"
                    value={documentTypeQuery}
                    onFocus={() => setIsDocumentTypeMenuOpen(true)}
                    onChange={(event) => {
                      const query = event.target.value;
                      setDocumentTypeQuery(query);
                      setForm({
                        ...form,
                        documentType:
                          documentTypeOptions.find(
                            (option) =>
                              option.label.toLocaleLowerCase("vi-VN") ===
                                query.trim().toLocaleLowerCase("vi-VN") ||
                              option.value.toLocaleLowerCase("vi-VN") ===
                                query.trim().toLocaleLowerCase("vi-VN"),
                          )?.value ?? "",
                      });
                      setIsDocumentTypeMenuOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setIsDocumentTypeMenuOpen(false);
                      }
                      if (
                        event.key === "Enter" &&
                        isDocumentTypeMenuOpen &&
                        filteredDocumentTypes.length === 1
                      ) {
                        event.preventDefault();
                        const [option] = filteredDocumentTypes;
                        setForm({ ...form, documentType: option.value });
                        setDocumentTypeQuery(option.label);
                        setIsDocumentTypeMenuOpen(false);
                      }
                    }}
                    className={inputClass}
                    placeholder="Nhập tên hoặc mã loại văn bản..."
                  />
                  {isDocumentTypeMenuOpen && (
                    <div
                      id="document-type-options"
                      role="listbox"
                      aria-label="Các loại văn bản"
                      className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
                    >
                      {filteredDocumentTypes.length ? (
                        filteredDocumentTypes.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={form.documentType === option.value}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setForm({ ...form, documentType: option.value });
                              setDocumentTypeQuery(option.label);
                              setIsDocumentTypeMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                              form.documentType === option.value
                                ? "bg-blue-50 font-semibold text-blue-800"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span>{option.label}</span>
                            {form.documentType === option.value && (
                              <Check className="h-4 w-4 text-blue-700" />
                            )}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-sm text-slate-500">
                          Không tìm thấy loại văn bản phù hợp.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Ngày ký">
                <input
                  type="date"
                  value={form.documentDate}
                  onChange={(event) =>
                    setForm({ ...form, documentDate: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Ngày tiếp nhận">
                <input
                  type="date"
                  value={form.receivedDate}
                  onChange={(event) =>
                    setForm({ ...form, receivedDate: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Tên văn bản" required>
                  <textarea
                    required
                    rows={3}
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                    className={`${inputClass} resize-y`}
                    placeholder="Nhập tên văn bản"
                  />
                </Field>
              <Field label="Cơ quan ban hành">
                <input
                  value={form.issuingAgency}
                  onChange={(event) =>
                    setForm({ ...form, issuingAgency: event.target.value })
                  }
                  className={inputClass}
                  placeholder="Tên cơ quan ban hành"
                />
              </Field>
              <Field label="Lĩnh vực">
                <select
                  value={form.fieldId}
                  onChange={(event) =>
                    setForm({ ...form, fieldId: event.target.value })
                  }
                  className={inputClass}
                  disabled={!documentFields.length}
                >
                  <option value="">
                    {documentFields.length
                      ? "Chọn lĩnh vực"
                      : "Không có lĩnh vực"}
                  </option>
                  {documentFields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Trạng thái">
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: normalizeStatus(event.target.value),
                    })
                  }
                  className={inputClass}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label={modal.document ? "Tệp văn bản" : "Tải lên tệp văn bản"}
                  required={!modal.document}
                >
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-blue-400 hover:bg-blue-50/40">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                          <Upload className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {selectedFile?.name ??
                              (modal.document?.fileUrl
                                ? "Đã có tệp đính kèm"
                                : "Chọn tệp văn bản")}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {selectedFile
                              ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                              : modal.document
                                ? "Chọn tệp mới nếu muốn thay thế tệp hiện tại."
                                : "Tải tệp văn bản định dạng PDF, JPEG, PNG."}
                          </p>
                        </div>
                      </div>
                      <label className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                        Chọn tệp
                        <input
                          type="file"
                          className="sr-only"
                          required={!modal.document && !selectedFile}
                          onChange={(event) =>
                            setSelectedFile(event.target.files?.[0] ?? null)
                          }
                        />
                      </label>
                    </div>
                  </div>
                  {modal.document?.fileUrl && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      <a
                        href={documentFilePath(modal.document.id, "file")}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                      >
                        Xem tệp hiện tại <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={documentFilePath(modal.document.id, "download")}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                      >
                        Tải xuống <Download className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </Field>
              </div>
            </div>
            {formError && (
              <p className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {formError}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {modal.document ? "Lưu thay đổi" : "Thêm văn bản"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal?.type === "detail" && (
        <ModalShell
          title="Chi tiết văn bản"
          subtitle={`${modal.document.documentNo || "Chưa có số"} · ${modal.document.documentType || "Chưa phân loại"}`}
          onClose={closeModal}
          wide
        >
          <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-5">
              <div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(modal.document.status)}`}
                >
                  {statusLabels[modal.document.status]}
                </span>
                <h3 className="mt-3 text-xl font-bold leading-snug text-slate-900">
                  {modal.document.title}
                </h3>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl bg-slate-50 p-4">
                {[
                  ["Cơ quan ban hành", modal.document.issuingAgency || "—"],
                  [
                    "Lĩnh vực",
                    modal.document.fieldName ||
                      documentFields.find(
                        (field) => field.id === modal.document.fieldId,
                      )?.name ||
                      "—",
                  ],
                  ["Loại văn bản", modal.document.documentType || "—"],
                  ["Ngày ký", displayDate(modal.document.documentDate)],
                  ["Ngày tiếp nhận", displayDate(modal.document.receivedDate)],
                  ["Người tiếp nhận", modal.document.receivedBy || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="col-span-2 sm:col-span-1">
                    <dt className="text-xs font-medium text-slate-500">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-slate-800">
                      {value}
                    </dd>
                  </div>
                ))}
                {modal.document.fileUrl && (
                  <div className="col-span-2">
                    <dt className="text-xs font-medium text-slate-500">Tệp đính kèm</dt>
                    <dd className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                      <a
                        href={documentFilePath(modal.document.id, "file")}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline"
                      >
                        Mở tệp văn bản <ArrowUpRight className="h-4 w-4" />
                      </a>
                      <a
                        href={documentFilePath(modal.document.id, "download")}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline"
                      >
                        Tải xuống <Download className="h-4 w-4" />
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
              {detailError && (
                <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {detailError}
                </p>
              )}
              {isDetailLoading && (
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Đang tải thông tin chi tiết...
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(modal.document)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" />
                  Chỉnh sửa
                </button>
              </div>
            </div>

            <form
              onSubmit={assignDocument}
              className="relative overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4 shadow-[0_14px_40px_-20px_rgba(79,70,229,0.55)] sm:p-5"
            >
              <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-indigo-300/20 blur-2xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/25">
                      <Bot className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">Phân công xử lý</h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                          <Sparkles className="h-3 w-3" />
                          Sẵn sàng cho AI
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Gợi ý thông minh sẽ xuất hiện tại đây. Bạn luôn có thể
                        rà soát và xác nhận trước khi giao việc.
                      </p>
                    </div>
                  </div>
                  {modal.document.aiAnalysis?.confidence !== null &&
                    modal.document.aiAnalysis?.confidence !== undefined && (
                      <span className="shrink-0 rounded-lg border border-indigo-100 bg-white/80 px-2 py-1 text-[10px] font-semibold text-indigo-700">
                        AI {Math.round(modal.document.aiAnalysis.confidence * 100)}%
                      </span>
                    )}
                </div>

                {modal.document.aiAnalysis ? (
                  <div className="mt-4 rounded-2xl border border-indigo-100 bg-white/80 p-3.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-800">
                      <Sparkles className="h-4 w-4" />
                      Gợi ý từ phân tích văn bản
                    </div>
                    <p className="mt-2 text-sm leading-5 text-slate-700">
                      {modal.document.aiAnalysis.summary ||
                        modal.document.aiAnalysis.category ||
                        "Đã có dữ liệu phân tích, kiểm tra các đề xuất bên dưới."}
                    </p>
                    <button
                      type="button"
                      onClick={() => applyAiSuggestion(modal.document)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Áp dụng gợi ý
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex items-start gap-2 rounded-2xl border border-dashed border-indigo-200 bg-white/60 p-3 text-xs leading-5 text-slate-600">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                    Chưa có kết quả phân tích AI cho văn bản này. Form đã sẵn sàng
                    để kết nối gợi ý phòng ban, chuyên viên và hạn xử lý.
                  </div>
                )}

                {optionsError && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {optionsError}
                    <button
                      type="button"
                      onClick={() => void loadOptions()}
                      className="ml-auto shrink-0 font-bold underline"
                    >
                      Tải lại
                    </button>
                  </p>
                )}

                <div className="mt-4 space-y-3">
                  <Field label="Phòng ban phụ trách" required>
                    <select
                      required
                      value={assignment.departmentId}
                      onChange={(event) =>
                        setAssignment({
                          ...assignment,
                          departmentId: event.target.value,
                          assigneeId: "",
                        })
                      }
                      className={`${inputClass} border-indigo-100 bg-white/90`}
                      disabled={isLoadingOptions}
                    >
                      <option value="">Chọn phòng ban</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Chuyên viên nhận việc" required>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
                      <select
                        required
                        value={assignment.assigneeId}
                        onChange={(event) =>
                          setAssignment({
                            ...assignment,
                            assigneeId: event.target.value,
                          })
                        }
                        className={`${inputClass} border-indigo-100 bg-white/90 pl-9`}
                        disabled={!assignment.departmentId || isLoadingOptions}
                      >
                        <option value="">
                          {assignment.departmentId
                            ? "Chọn chuyên viên"
                            : "Chọn phòng ban trước"}
                        </option>
                        {eligibleUsers.map((specialist) => (
                          <option key={specialist.id} value={specialist.id}>
                            {specialist.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Hạn xử lý">
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
                        <input
                          type="date"
                          value={assignment.dueDate}
                          onChange={(event) =>
                            setAssignment({
                              ...assignment,
                              dueDate: event.target.value,
                            })
                          }
                          className={`${inputClass} border-indigo-100 bg-white/90 pl-9`}
                        />
                      </div>
                    </Field>
                    <Field label="Mức ưu tiên">
                      <select
                        value={assignment.priority}
                        onChange={(event) =>
                          setAssignment({
                            ...assignment,
                            priority: normalizePriority(event.target.value) || "medium",
                          })
                        }
                        className={`${inputClass} border-indigo-100 bg-white/90`}
                      >
                        {Object.entries(priorityLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Ghi chú giao việc">
                    <textarea
                      rows={2}
                      value={assignment.note}
                      onChange={(event) =>
                        setAssignment({ ...assignment, note: event.target.value })
                      }
                      className={`${inputClass} resize-y border-indigo-100 bg-white/90`}
                      placeholder="Yêu cầu hoặc lưu ý cho chuyên viên"
                    />
                  </Field>
                </div>
                {assignmentError && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {assignmentError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isAssigning || isLoadingOptions || users.length === 0}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAssigning ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <UsersRound className="h-4 w-4" />
                  )}
                  {isAssigning ? "Đang tạo nhiệm vụ..." : "Xác nhận phân công"}
                </button>
                <p className="mt-2 text-center text-[11px] leading-4 text-slate-500">
                  Thao tác này tạo nhiệm vụ xử lý và ghi nhận chuyên viên phụ trách.
                </p>
              </div>
            </form>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
