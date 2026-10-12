"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, Info, Pencil, Plus, Power, Search, ShieldCheck, Trash2, X, XCircle } from "lucide-react";
import { apiRequest as requestApi, ApiError } from "@/lib/auth/api";

type Permission = {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string;
  isActive: boolean;
  createdAt: string | null;
};

type PermissionForm = Pick<
  Permission,
  "code" | "name" | "module" | "description"
>;

type Role = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

type Notification = {
  id: number;
  type: "success" | "error";
  message: string;
};

function unwrapData(value: unknown): unknown {
  if (value && typeof value === "object" && "data" in value) {
    return (value as { data: unknown }).data;
  }
  return value;
}

function normalizePermission(value: unknown): Permission {
  const unwrapped = unwrapData(value);
  if (!unwrapped || typeof unwrapped !== "object") {
    throw new Error("Dữ liệu quyền hạn không hợp lệ.");
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
    throw new Error("Dữ liệu quyền hạn thiếu thông tin bắt buộc.");
  }

  return {
    id: String(id),
    code,
    name,
    module:
      typeof record.module === "string"
        ? record.module
        : typeof record.moduleName === "string"
          ? record.moduleName
          : "",
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

function normalizeList(value: unknown, label: string): unknown[] {
  const unwrapped = unwrapData(value);
  if (Array.isArray(unwrapped)) return unwrapped;
  if (
    unwrapped &&
    typeof unwrapped === "object" &&
    "items" in unwrapped &&
    Array.isArray((unwrapped as { items: unknown }).items)
  ) {
    return (unwrapped as { items: unknown[] }).items;
  }
  throw new Error(`API không trả về danh sách ${label} hợp lệ.`);
}

function normalizePermissionList(value: unknown): Permission[] {
  return normalizeList(value, "quyền hạn").map(normalizePermission);
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
    typeof name !== "string"
  ) {
    throw new Error("Dữ liệu vai trò thiếu thông tin bắt buộc.");
  }
  return {
    id: String(id),
    code,
    name,
    isActive: isActive === true || isActive === 1,
  };
}

function getRolePermissionIds(value: unknown): string[] {
  const unwrapped = unwrapData(value);
  const items = Array.isArray(unwrapped)
    ? unwrapped
    : unwrapped &&
        typeof unwrapped === "object" &&
        "items" in unwrapped &&
        Array.isArray((unwrapped as { items: unknown }).items)
      ? (unwrapped as { items: unknown[] }).items
      : unwrapped &&
          typeof unwrapped === "object" &&
          "permissions" in unwrapped &&
          Array.isArray((unwrapped as { permissions: unknown }).permissions)
        ? (unwrapped as { permissions: unknown[] }).permissions
        : unwrapped &&
            typeof unwrapped === "object" &&
            "permissionIds" in unwrapped &&
            Array.isArray((unwrapped as { permissionIds: unknown }).permissionIds)
          ? (unwrapped as { permissionIds: unknown[] }).permissionIds
          : (() => {
              throw new Error(
                "API không trả về danh sách quyền của vai trò hợp lệ.",
              );
            })();

  return items.flatMap((item) => {
    if (typeof item === "string" || typeof item === "number") {
      return [String(item)];
    }
    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    const nested =
      record.permission && typeof record.permission === "object"
        ? (record.permission as Record<string, unknown>)
        : null;
    const id =
      record.permissionId ??
      record.permission_id ??
      nested?.id ??
      record.id;
    return typeof id === "string" || typeof id === "number"
      ? [String(id)]
      : [];
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function PermissionManagement() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingPermissionId, setPendingPermissionId] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const notificationId = useRef(0);
  const [keyword, setKeyword] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] =
    useState<Permission | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<PermissionForm>({
    code: "",
    name: "",
    module: "",
    description: "",
  });

  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [rolePermissionIds, setRolePermissionIds] = useState<string[]>([]);
  const [draftPermissionIds, setDraftPermissionIds] = useState<string[]>([]);
  const [isLoadingRolePermissions, setIsLoadingRolePermissions] =
    useState(false);
  const [isSavingRolePermissions, setIsSavingRolePermissions] = useState(false);
  const [rolePermissionError, setRolePermissionError] = useState<string | null>(
    null,
  );

  const loadPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setPermissions(
        normalizePermissionList(await requestApi<unknown>("/permissions")),
      );
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Không thể tải danh sách quyền hạn."),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    setIsLoadingRoles(true);
    try {
      const items = normalizeList(await requestApi<unknown>("/roles"), "vai trò");
      setRoles(items.map(normalizeRole));
    } catch (requestError) {
      setRolePermissionError(
        getErrorMessage(requestError, "Không thể tải danh sách vai trò."),
      );
    } finally {
      setIsLoadingRoles(false);
    }
  }, []);

  const loadRolePermissions = useCallback(async (roleId: string) => {
    setIsLoadingRolePermissions(true);
    setRolePermissionError(null);
    try {
      const ids = getRolePermissionIds(
        await requestApi<unknown>(
          `/roles/${encodeURIComponent(roleId)}/permissions`,
        ),
      );
      setRolePermissionIds(ids);
      setDraftPermissionIds(ids);
    } catch (requestError) {
      setRolePermissionIds([]);
      setDraftPermissionIds([]);
      setRolePermissionError(
        getErrorMessage(
          requestError,
          "Không thể tải danh sách quyền của vai trò.",
        ),
      );
    } finally {
      setIsLoadingRolePermissions(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      void loadPermissions();
      void loadRoles();
    });
  }, [loadPermissions, loadRoles]);

  useEffect(() => {
    if (!selectedRoleId) return;
    Promise.resolve().then(() => loadRolePermissions(selectedRoleId));
  }, [loadRolePermissions, selectedRoleId]);

  useEffect(() => {
    if (!notification) return;
    const timeoutId = window.setTimeout(() => setNotification(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [notification]);

  const notify = (type: Notification["type"], message: string) => {
    notificationId.current += 1;
    setNotification({ id: notificationId.current, type, message });
  };

  const modules = useMemo(
    () =>
      [...new Set(permissions.map((permission) => permission.module).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "vi"),
      ),
    [permissions],
  );

  const filteredPermissions = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi");
    return permissions.filter((permission) => {
      const matchesKeyword =
        !normalizedKeyword ||
        `${permission.code} ${permission.name} ${permission.module} ${permission.description}`
          .toLocaleLowerCase("vi")
          .includes(normalizedKeyword);
      const matchesModule =
        moduleFilter === "all" || permission.module === moduleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && permission.isActive) ||
        (statusFilter === "inactive" && !permission.isActive);
      return matchesKeyword && matchesModule && matchesStatus;
    });
  }, [keyword, moduleFilter, permissions, statusFilter]);

  const selectedRole = roles.find((role) => role.id === selectedRoleId);
  const hasRolePermissionChanges =
    draftPermissionIds.length !== rolePermissionIds.length ||
    draftPermissionIds.some((id) => !rolePermissionIds.includes(id));

  const openCreateForm = () => {
    setEditingPermission(null);
    setForm({ code: "", name: "", module: "", description: "" });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditForm = async (permission: Permission) => {
    setPendingPermissionId(permission.id);
    setError(null);
    try {
      const details = normalizePermission(
        await requestApi<unknown>(
          `/permissions/${encodeURIComponent(permission.id)}`,
        ),
      );
      setEditingPermission(details);
      setForm({
        code: details.code,
        name: details.name,
        module: details.module,
        description: details.description,
      });
      setFormError(null);
      setModalOpen(true);
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Không thể tải thông tin quyền hạn."),
      );
    } finally {
      setPendingPermissionId(null);
    }
  };

  const handleSavePermission = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      module: form.module.trim(),
      description: form.description.trim(),
      isActive: editingPermission?.isActive ?? true,
    };
    if (!payload.code || !payload.name || !payload.module) {
      setFormError("Vui lòng nhập mã, tên và phân hệ của quyền hạn.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      try {
        const existing = normalizePermission(
          await requestApi<unknown>(
            `/permissions/code/${encodeURIComponent(payload.code)}`,
          ),
        );
        if (existing.id !== editingPermission?.id) {
          throw new Error("Mã quyền hạn đã được sử dụng.");
        }
      } catch (lookupError) {
        if (
          !(lookupError instanceof ApiError && lookupError.status === 404)
        ) {
          throw lookupError;
        }
      }

      if (editingPermission) {
        await requestApi<unknown>(
          `/permissions/${encodeURIComponent(editingPermission.id)}`,
          { method: "PUT", body: JSON.stringify(payload) },
        );
      } else {
        await requestApi<unknown>("/permissions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      notify(
        "success",
        editingPermission
          ? `Đã cập nhật quyền "${payload.name}".`
          : `Đã tạo quyền "${payload.name}".`,
      );
      setModalOpen(false);
      await loadPermissions();
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Không thể lưu thông tin quyền hạn.",
      );
      setFormError(message);
      notify("error", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (permission: Permission) => {
    setPendingPermissionId(permission.id);
    setError(null);
    try {
      await requestApi<unknown>(
        `/permissions/${encodeURIComponent(permission.id)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: !permission.isActive }),
        },
      );
      notify(
        "success",
        `Đã ${permission.isActive ? "ngừng hoạt động" : "kích hoạt"} quyền "${permission.name}".`,
      );
      await loadPermissions();
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Không thể cập nhật trạng thái quyền hạn.",
      );
      setError(message);
      notify("error", message);
    } finally {
      setPendingPermissionId(null);
    }
  };

  const handleDelete = async (permission: Permission) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa quyền "${permission.name}"? Thao tác này không thể hoàn tác.`,
      )
    ) {
      return;
    }
    setPendingPermissionId(permission.id);
    setError(null);
    try {
      await requestApi<unknown>(
        `/permissions/${encodeURIComponent(permission.id)}`,
        { method: "DELETE" },
      );
      setRolePermissionIds((current) =>
        current.filter((id) => id !== permission.id),
      );
      setDraftPermissionIds((current) =>
        current.filter((id) => id !== permission.id),
      );
      notify("success", `Đã xóa quyền "${permission.name}".`);
      await loadPermissions();
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Không thể xóa quyền hạn.");
      setError(message);
      notify("error", message);
    } finally {
      setPendingPermissionId(null);
    }
  };

  const saveAllRolePermissions = async () => {
    if (!selectedRoleId) return;
    setIsSavingRolePermissions(true);
    setRolePermissionError(null);
    try {
      await requestApi<unknown>(
        `/roles/${encodeURIComponent(selectedRoleId)}/permissions`,
        {
          method: "PUT",
          body: JSON.stringify({ permissionIds: draftPermissionIds }),
        },
      );
      setRolePermissionIds(draftPermissionIds);
      notify("success", `Đã cập nhật quyền cho vai trò "${selectedRole?.name}".`);
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Không thể lưu danh sách quyền của vai trò.",
      );
      setRolePermissionError(message);
      notify("error", message);
    } finally {
      setIsSavingRolePermissions(false);
    }
  };

  const handleQuickAssignment = async (
    permission: Permission,
    shouldAssign: boolean,
  ) => {
    if (!selectedRoleId) return;
    setPendingPermissionId(permission.id);
    setRolePermissionError(null);
    try {
      const path = `/roles/${encodeURIComponent(selectedRoleId)}/permissions/${encodeURIComponent(permission.id)}`;
      await requestApi<unknown>(path, {
        method: shouldAssign ? "POST" : "DELETE",
      });
      const updateIds = (current: string[]) =>
        shouldAssign
          ? current.includes(permission.id)
            ? current
            : [...current, permission.id]
          : current.filter((id) => id !== permission.id);
      setRolePermissionIds(updateIds);
      setDraftPermissionIds(updateIds);
      notify(
        "success",
        `Đã ${shouldAssign ? "gán" : "gỡ"} quyền "${permission.name}"${selectedRole ? ` cho vai trò "${selectedRole.name}"` : ""}.`,
      );
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Không thể cập nhật quyền được gán cho vai trò.",
      );
      setRolePermissionError(message);
      notify("error", message);
    } finally {
      setPendingPermissionId(null);
    }
  };

  const toggleDraftPermission = (permissionId: string) => {
    setDraftPermissionIds((current) =>
      current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId],
    );
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

      <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ShieldCheck className="h-5 w-5 text-blue-700" />
              Gán quyền cho vai trò
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Chọn vai trò để xem và chỉnh sửa các quyền được gán.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="sm:min-w-72">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Vai trò
              </span>
              <select
                value={selectedRoleId}
                onChange={(event) => {
                  setRolePermissionIds([]);
                  setDraftPermissionIds([]);
                  setRolePermissionError(null);
                  setSelectedRoleId(event.target.value);
                }}
                disabled={isLoadingRoles || roles.length === 0}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              >
                <option value="">
                  {isLoadingRoles
                    ? "Đang tải vai trò..."
                    : roles.length
                      ? "Chọn vai trò"
                      : "Chưa có vai trò"}
                </option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} ({role.code})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void saveAllRolePermissions()}
              disabled={
                !selectedRoleId ||
                !hasRolePermissionChanges ||
                isLoadingRolePermissions ||
                isSavingRolePermissions
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingRolePermissions ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Lưu thay đổi
            </button>
          </div>
        </div>
        {rolePermissionError && (
          <div
            role="alert"
            className="m-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {rolePermissionError}
          </div>
        )}
        {!selectedRoleId ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            Chọn vai trò để quản lý quyền được gán.
          </p>
        ) : isLoadingRolePermissions ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">
            Đang tải quyền được gán...
          </p>
        ) : (
          <div className="grid gap-2 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {permissions.filter((permission) => permission.isActive).length ===
            0 ? (
              <p className="col-span-full py-5 text-center text-sm text-slate-500">
                Chưa có quyền đang hoạt động để gán.
              </p>
            ) : (
              permissions
                .filter((permission) => permission.isActive)
                .map((permission) => {
                  const isAssigned = draftPermissionIds.includes(permission.id);
                  const isPending = pendingPermissionId === permission.id;
                  return (
                    <div
                      key={permission.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => toggleDraftPermission(permission.id)}
                        aria-label={`${isAssigned ? "Bỏ chọn" : "Chọn"} quyền ${permission.name}`}
                        className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {permission.name}
                        </p>
                        <p className="truncate font-mono text-xs text-slate-500">
                          {permission.code}
                        </p>
                      </div>
                      <button
                        type="button"
                        title={rolePermissionIds.includes(permission.id) ? "Gỡ quyền ngay" : "Gán quyền ngay"}
                        aria-label={`${rolePermissionIds.includes(permission.id) ? "Gỡ quyền ngay" : "Gán quyền ngay"} ${permission.name}`}
                        disabled={isPending || hasRolePermissionChanges}
                        onClick={() =>
                          void handleQuickAssignment(
                            permission,
                            !rolePermissionIds.includes(permission.id),
                          )
                        }
                        className={`rounded-lg p-2 disabled:cursor-not-allowed disabled:opacity-40 ${
                          rolePermissionIds.includes(permission.id)
                            ? "text-amber-700 hover:bg-amber-50"
                            : "text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {rolePermissionIds.includes(permission.id) ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        )}
        {selectedRoleId && hasRolePermissionChanges && (
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-amber-700">
            Có thay đổi chưa lưu. Lưu để cập nhật đầy đủ danh sách quyền của vai trò.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label className="xl:col-span-1">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Tìm kiếm
              </span>
              <span className="relative block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Mã, tên, phân hệ hoặc mô tả..."
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </span>
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Phân hệ
              </span>
              <select
                value={moduleFilter}
                onChange={(event) => setModuleFilter(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              >
                <option value="all">Tất cả phân hệ</option>
                {modules.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </select>
            </label>
            <label>
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
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
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
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Plus className="h-4 w-4" />
            Thêm quyền
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
              onClick={() => void loadPermissions()}
              className="font-semibold underline underline-offset-2"
            >
              Thử tải lại
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Quyền hạn</th>
                <th className="px-5 py-4 font-semibold">Loại</th>
                <th className="px-5 py-4 font-semibold">Mô tả</th>
                <th className="px-5 py-4 font-semibold">Trạng thái</th>
                <th className="px-5 py-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-500">
                    Đang tải danh sách quyền hạn...
                  </td>
                </tr>
              ) : filteredPermissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-500">
                    {permissions.length
                      ? "Không tìm thấy quyền hạn phù hợp."
                      : "Chưa có quyền hạn. Hãy tạo quyền đầu tiên."}
                  </td>
                </tr>
              ) : (
                filteredPermissions.map((permission) => {
                  const isPending = pendingPermissionId === permission.id;
                  return (
                    <tr key={permission.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {permission.name}
                        </p>
                        <p className="mt-1 font-mono text-xs text-slate-500">
                          {permission.code}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          {permission.module || "—"}
                        </span>
                      </td>
                      <td className="max-w-sm px-5 py-4 text-slate-600">
                        <p className="line-clamp-2">
                          {permission.description || "Chưa có mô tả"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            permission.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              permission.isActive
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {permission.isActive
                            ? "Hoạt động"
                            : "Ngừng hoạt động"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <RowAction
                            label="Chỉnh sửa"
                            disabled={isPending}
                            onClick={() => void openEditForm(permission)}
                          >
                            <Pencil className="h-4 w-4" />
                          </RowAction>
                          <RowAction
                            label={
                              permission.isActive
                                ? "Ngừng hoạt động"
                                : "Kích hoạt"
                            }
                            disabled={isPending}
                            onClick={() => void handleToggleStatus(permission)}
                          >
                            <Power
                              className={`h-4 w-4 ${
                                permission.isActive
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            />
                          </RowAction>
                          <RowAction
                            label="Xóa quyền"
                            disabled={isPending}
                            onClick={() => void handleDelete(permission)}
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
        {!isLoading && filteredPermissions.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Hiển thị {filteredPermissions.length} / {permissions.length} quyền
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="permission-modal-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="permission-modal-title"
                  className="text-lg font-bold text-slate-900"
                >
                  {editingPermission ? "Chỉnh sửa quyền" : "Thêm quyền"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Khai báo mã quyền và phân hệ áp dụng.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Đóng cửa sổ"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSavePermission} className="space-y-4 p-5 sm:p-6">
              <FormField label="Mã quyền" required>
                <input
                  required
                  maxLength={100}
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: event.target.value,
                    }))
                  }
                  placeholder="Ví dụ: USERS_READ"
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </FormField>
              <FormField label="Tên quyền" required>
                <input
                  required
                  maxLength={255}
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Ví dụ: Xem danh sách người dùng"
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </FormField>
              <FormField label="Phân hệ" required>
                <input
                  required
                  maxLength={100}
                  value={form.module}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      module: event.target.value,
                    }))
                  }
                  placeholder="Ví dụ: Người dùng"
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
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
                  placeholder="Mô tả phạm vi của quyền hạn"
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
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
                  onClick={() => setModalOpen(false)}
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
                  {editingPermission ? "Lưu thay đổi" : "Tạo quyền"}
                </button>
              </div>
            </form>
          </section>
        </div>
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
