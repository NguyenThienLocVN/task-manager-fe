"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Info, Pencil, Plus, Power, Search, Shield, Trash2, X, XCircle
} from "lucide-react";

type Role = {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string | null;
};

type RoleForm = Pick<Role, "code" | "name" | "description">;
type Notification = { id: number; type: "success" | "error"; message: string };
type Modal = "form" | null;

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api"
).replace(/\/+$/, "");

async function requestApi<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;
    throw new ApiError(
      message || `Yêu cầu thất bại (${response.status})`,
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  if (!response.headers.get("content-type")?.includes("json")) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

function unwrapData(value: unknown): unknown {
  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    (Array.isArray((value as { data: unknown }).data) ||
      (value as { data: unknown }).data !== null)
  ) {
    return (value as { data: unknown }).data;
  }
  return value;
}

function normalizeRole(value: unknown): Role {
  const unwrapped = unwrapData(value);
  if (!unwrapped || typeof unwrapped !== "object") {
    throw new Error("Dữ liệu vai trò không hợp lệ.");
  }
  const record = unwrapped as Record<string, unknown>;
  const id = record.id;
  const code = record.code;
  const name = record.name;
  const isActive = record.isActive ?? record.is_active;

  if (
    (typeof id !== "string" && typeof id !== "number") ||
    typeof code !== "string" ||
    typeof name !== "string" ||
    (typeof isActive !== "boolean" && isActive !== 0 && isActive !== 1)
  ) {
    throw new Error("Dữ liệu vai trò thiếu thông tin bắt buộc.");
  }

  return {
    id: String(id),
    code,
    name,
    description:
      typeof record.description === "string" ? record.description : "",
    isActive: isActive === true || isActive === 1,
    createdAt:
      typeof record.createdAt === "string"
        ? record.createdAt
        : typeof record.created_at === "string"
          ? record.created_at
          : null,
  };
}

function normalizeRoleList(value: unknown): Role[] {
  const unwrapped = unwrapData(value);
  if (!Array.isArray(unwrapped)) {
    throw new Error("API không trả về danh sách vai trò hợp lệ.");
  }
  return unwrapped.map(normalizeRole);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function generateRoleCode(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "D")
    .toLocaleUpperCase("vi-VN")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [modal, setModal] = useState<Modal>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<RoleForm>({
    code: "",
    name: "",
    description: "",
  });

  const loadRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRoles(normalizeRoleList(await requestApi<unknown>("/roles")));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Không thể tải danh sách vai trò."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => loadRoles());
  }, [loadRoles]);

  useEffect(() => {
    if (!notification) return;
    const timeoutId = window.setTimeout(() => setNotification(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [notification]);

  const notify = (type: Notification["type"], message: string) => {
    setNotification({ id: Date.now(), type, message });
  };

  const filteredRoles = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi");
    return roles.filter((role) => {
      const matchesKeyword =
        !normalizedKeyword ||
        `${role.code} ${role.name} ${role.description}`
          .toLocaleLowerCase("vi")
          .includes(normalizedKeyword);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && role.isActive) ||
        (statusFilter === "inactive" && !role.isActive);
      return matchesKeyword && matchesStatus;
    });
  }, [keyword, roles, statusFilter]);

  const openCreateForm = () => {
    setEditingRole(null);
    setForm({ code: "", name: "", description: "" });
    setFormError(null);
    setModal("form");
  };

  const openEditForm = async (role: Role) => {
    setPendingRoleId(role.id);
    setError(null);
    try {
      const details = normalizeRole(
        await requestApi<unknown>(`/roles/${encodeURIComponent(role.id)}`),
      );
      setEditingRole(details);
      setForm({
        code: generateRoleCode(details.name),
        name: details.name,
        description: details.description,
      });
      setFormError(null);
      setModal("form");
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Không thể tải thông tin vai trò."),
      );
    } finally {
      setPendingRoleId(null);
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      code: generateRoleCode(form.name),
      name: form.name.trim(),
      description: form.description.trim(),
      isActive: editingRole?.isActive ?? true,
    };

    if (!payload.code || !payload.name) {
      setFormError("Vui lòng nhập mã và tên vai trò.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      try {
        const matchingRole = normalizeRole(
          await requestApi<unknown>(
            `/roles/code/${encodeURIComponent(payload.code)}`,
          ),
        );
        if (matchingRole.id !== editingRole?.id) {
          throw new Error("Mã vai trò đã được sử dụng.");
        }
      } catch (lookupError) {
        if (lookupError instanceof ApiError && lookupError.status === 404) {
          // A missing code is available for use.
        } else {
          throw lookupError;
        }
      }

      if (editingRole) {
        await requestApi<unknown>(
          `/roles/${encodeURIComponent(editingRole.id)}`,
          { method: "PUT", body: JSON.stringify(payload) },
        );
      } else {
        await requestApi<unknown>("/roles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      notify(
        "success",
        editingRole
          ? `Đã cập nhật vai trò "${payload.name}".`
          : `Đã tạo vai trò "${payload.name}".`,
      );
      setModal(null);
      await loadRoles();
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Không thể lưu vai trò.");
      setFormError(message);
      notify("error", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (role: Role) => {
    setPendingRoleId(role.id);
    setError(null);
    try {
      await requestApi<unknown>(
        `/roles/${encodeURIComponent(role.id)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: !role.isActive }),
        },
      );
      notify(
        "success",
        `Đã ${role.isActive ? "ngừng hoạt động" : "kích hoạt"} vai trò "${role.name}".`,
      );
      await loadRoles();
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Không thể cập nhật trạng thái vai trò.",
      );
      setError(message);
      notify("error", message);
    } finally {
      setPendingRoleId(null);
    }
  };

  const handleDelete = async (role: Role) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa vai trò "${role.name}"? Thao tác này không thể hoàn tác.`,
      )
    ) {
      return;
    }
    setPendingRoleId(role.id);
    setError(null);
    try {
      await requestApi<unknown>(`/roles/${encodeURIComponent(role.id)}`, {
        method: "DELETE",
      });
      notify("success", `Đã xóa vai trò "${role.name}".`);
      await loadRoles();
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Không thể xóa vai trò.");
      setError(message);
      notify("error", message);
    } finally {
      setPendingRoleId(null);
    }
  };

  return (
    <>
      {notification && (
        <div
          key={notification.id}
          role={notification.type === "error" ? "alert" : "status"}
          aria-live={notification.type === "error" ? "assertive" : "polite"}
          className={`fixed right-5 top-5 z-[70] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${
            notification.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-950"
              : "border-red-300 bg-red-50 text-red-950"
          }`}
        >
          <span
            className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full ${
              notification.type === "success"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Info className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {notification.type === "success" ? "Thành công" : "Có lỗi"}
            </p>
            <p className="mt-1 text-sm">{notification.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            aria-label="Đóng thông báo"
            className="rounded-lg p-1 text-slate-400 hover:bg-white/70 hover:text-slate-700"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Tìm kiếm
              </span>
              <span className="relative block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Tìm theo mã, tên hoặc mô tả..."
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </span>
            </label>
            <label className="sm:w-56">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Trạng thái
              </span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "all" | "active" | "inactive",
                  )
                }
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-700/20"
          >
            <Plus className="h-4 w-4" />
            Thêm vai trò
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="m-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadRoles()}
              className="font-semibold underline underline-offset-2"
            >
              Thử tải lại
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Vai trò</th>
                <th className="px-5 py-4 font-semibold">Mô tả</th>
                <th className="px-5 py-4 font-semibold">Trạng thái</th>
                <th className="px-5 py-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-slate-500">
                    <span className="inline-flex items-center gap-3">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-700 border-r-transparent" />
                      Đang tải danh sách vai trò...
                    </span>
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <Shield className="h-6 w-6" />
                      </div>
                      <p className="font-semibold text-slate-800">
                        {roles.length ? "Không tìm thấy vai trò" : "Chưa có vai trò"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {roles.length
                          ? "Hãy thay đổi từ khóa hoặc bộ lọc trạng thái."
                          : "Tạo vai trò đầu tiên để bắt đầu quản lý quyền truy cập."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => {
                  const isPending = pendingRoleId === role.id;
                  return (
                    <tr key={role.id} className="transition hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{role.name}</div>
                        <div className="mt-1 font-mono text-xs text-slate-400">
                          {role.code}
                        </div>
                      </td>
                      <td className="max-w-sm px-5 py-4 text-slate-600">
                        <p className="line-clamp-2">
                          {role.description || "Chưa có mô tả"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            role.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              role.isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {role.isActive ? "Hoạt động" : "Ngừng hoạt động"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <RowAction
                            label="Chỉnh sửa"
                            disabled={isPending}
                            onClick={() => void openEditForm(role)}
                          >
                            <Pencil className="h-4 w-4" />
                          </RowAction>
                          <RowAction
                            label={role.isActive ? "Ngừng hoạt động" : "Kích hoạt"}
                            disabled={isPending}
                            onClick={() => void handleToggleStatus(role)}
                          >
                            <Power
                              className={`h-4 w-4 ${
                                role.isActive ? "text-amber-600" : "text-emerald-600"
                              }`}
                            />
                          </RowAction>
                          <RowAction
                            label="Xóa vai trò"
                            disabled={isPending}
                            onClick={() => void handleDelete(role)}
                            danger
                          >
                            <Trash2 className="h-4 w-4" />
                          </RowAction>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && filteredRoles.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Hiển thị {filteredRoles.length} / {roles.length} vai trò
          </div>
        )}
      </section>

      {modal === "form" && (
        <ModalShell
          title={editingRole ? "Chỉnh sửa vai trò" : "Thêm vai trò"}
          subtitle="Thông tin vai trò được sử dụng để quản lý quyền truy cập hệ thống."
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <FormField label="Mã vai trò" required>
              <input
                required
                maxLength={100}
                value={form.code}
                disabled
                placeholder="Tự động tạo từ tên vai trò"
                aria-describedby="role-code-hint"
                className="h-11 w-full rounded-xl border border-slate-300 bg-slate-100 px-3 text-sm text-slate-500 outline-none disabled:cursor-not-allowed"
              />
              <span id="role-code-hint" className="mt-1 block text-xs text-slate-500">
                Mã được tự động tạo từ tên vai trò.
              </span>
            </FormField>
            <FormField label="Tên vai trò" required>
              <input
                required
                maxLength={255}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                    code: generateRoleCode(event.target.value),
                  }))
                }
                placeholder="Nhập tên vai trò"
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
            </FormField>
            <FormField label="Mô tả">
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Mô tả nhiệm vụ hoặc phạm vi của vai trò"
                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
            </FormField>
            {formError && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {formError}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={isSaving}
                className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                )}
                {editingRole ? "Lưu thay đổi" : "Tạo vai trò"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}

function RowAction({
  children,
  label,
  disabled,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg p-2 transition disabled:cursor-wait disabled:opacity-40 ${
        danger
          ? "text-slate-500 hover:bg-red-50 hover:text-red-700"
          : "text-slate-500 hover:bg-blue-50 hover:text-blue-700"
      }`}
    >
      {children}
    </button>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-modal-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 id="role-modal-title" className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </section>
    </div>
  );
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}
