"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Info, KeyRound, Pencil, Plus, Power, Search, SlidersHorizontal, Trash2, UserRound, UsersRound, X, XCircle } from "lucide-react";
import { apiRequest as requestApi } from "@/lib/auth/api";

type Option = {
  id: string;
  name: string;
  code?: string;
  organizationId?: string;
};
type UserRecord = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  organizationId: string;
  organizationName: string;
  departmentId: string;
  departmentName: string;
  jobTitle: string;
  avatarUrl: string;
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  roleIds: string[];
  roleNames: string[];
};
type UserForm = {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  organizationId: string;
  departmentId: string;
  jobTitle: string;
  avatarUrl: string;
  roleIds: string[];
};
type Filters = {
  keyword: string;
  organizationId: string;
  departmentId: string;
  roleId: string;
  isActive: string;
};
type Notification = {
  id: number;
  type: "success" | "error";
  message: string;
};
type Modal = "form" | "password" | null;

function unwrapData(value: unknown): unknown {
  if (value && typeof value === "object" && "data" in value) {
    return (value as { data: unknown }).data;
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function normalizeList(value: unknown, label: string): unknown[] {
  const unwrapped = unwrapData(value);
  if (Array.isArray(unwrapped)) return unwrapped;
  const record = asRecord(unwrapped);
  if (record && Array.isArray(record.items)) return record.items;
  throw new Error(`API không trả về danh sách ${label} hợp lệ.`);
}

function normalizeOption(value: unknown): Option {
  const record = asRecord(value);
  if (!record) {
    throw new Error("Dữ liệu lựa chọn không hợp lệ.");
  }
  const id = record.id;
  const name = record.name ?? record.fullName ?? record.full_name;
  if (
    (typeof id !== "string" && typeof id !== "number") ||
    typeof name !== "string"
  ) {
    throw new Error("Dữ liệu lựa chọn không hợp lệ.");
  }
  return {
    id: String(id),
    name,
    code: typeof record.code === "string" ? record.code : undefined,
    organizationId: stringValue(
      record.organizationId ??
        record.organization_id ??
        asRecord(record.organization)?.id,
    ),
  };
}

function readRoleIds(value: unknown): { ids: string[]; names: string[] } {
  const unwrapped = unwrapData(value);
  const root = asRecord(unwrapped);
  const list = Array.isArray(unwrapped)
    ? unwrapped
    : root && Array.isArray(root.roles)
      ? root.roles
      : root && Array.isArray(root.items)
        ? root.items
        : root && Array.isArray(root.roleIds)
          ? root.roleIds
          : [];
  const ids: string[] = [];
  const names: string[] = [];
  for (const item of list) {
    if (typeof item === "string" || typeof item === "number") {
      ids.push(String(item));
      continue;
    }
    const record = asRecord(item);
    if (!record) continue;
    const nested = asRecord(record.role);
    const id = record.roleId ?? record.role_id ?? nested?.id ?? record.id;
    const name = nested?.name ?? record.name;
    if (typeof id === "string" || typeof id === "number") ids.push(String(id));
    if (typeof name === "string") names.push(name);
  }
  return { ids: [...new Set(ids)], names: [...new Set(names)] };
}

function normalizeUser(value: unknown): UserRecord {
  const record = asRecord(value);
  if (!record) throw new Error("Dữ liệu người dùng không hợp lệ.");
  const id = record.id;
  const username = record.username;
  const fullName = record.fullName ?? record.full_name;
  const isActive = record.isActive ?? record.is_active;
  const isLocked = record.isLocked ?? record.is_locked;
  if (
    (typeof id !== "string" && typeof id !== "number") ||
    typeof username !== "string" ||
    typeof fullName !== "string"
  ) {
    throw new Error("Dữ liệu người dùng thiếu thông tin bắt buộc.");
  }
  const organization = asRecord(record.organization);
  const department = asRecord(record.department);
  const roleInfo = readRoleIds(record.roles ?? record.userRoles ?? record.user_roles);
  return {
    id: String(id),
    username,
    fullName,
    email: stringValue(record.email),
    phone: stringValue(record.phone),
    organizationId: stringValue(
      record.organizationId ?? record.organization_id ?? organization?.id,
    ),
    organizationName: stringValue(organization?.name),
    departmentId: stringValue(
      record.departmentId ?? record.department_id ?? department?.id,
    ),
    departmentName: stringValue(department?.name),
    jobTitle: stringValue(record.jobTitle ?? record.job_title),
    avatarUrl: stringValue(record.avatarUrl ?? record.avatar_url),
    isActive: isActive === true || isActive === 1,
    isLocked: isLocked === true || isLocked === 1,
    lastLoginAt:
      typeof (record.lastLoginAt ?? record.last_login_at) === "string"
        ? String(record.lastLoginAt ?? record.last_login_at)
        : null,
    createdAt:
      typeof (record.createdAt ?? record.created_at) === "string"
        ? String(record.createdAt ?? record.created_at)
        : null,
    updatedAt:
      typeof (record.updatedAt ?? record.updated_at) === "string"
        ? String(record.updatedAt ?? record.updated_at)
        : null,
    roleIds: roleInfo.ids,
    roleNames: roleInfo.names,
  };
}

function normalizeUsers(value: unknown) {
  return normalizeList(value, "người dùng").map(normalizeUser);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const emptyForm: UserForm = {
  username: "",
  password: "",
  fullName: "",
  email: "",
  phone: "",
  organizationId: "",
  departmentId: "",
  jobTitle: "",
  avatarUrl: "",
  roleIds: [],
};

const emptyFilters: Filters = {
  keyword: "",
  organizationId: "",
  departmentId: "",
  roleId: "",
  isActive: "",
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [organizations, setOrganizations] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [roles, setRoles] = useState<Option[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [passwordUser, setPasswordUser] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const usersRequestId = useRef(0);
  const notificationId = useRef(0);

  const notify = useCallback(
    (type: Notification["type"], message: string) => {
      const nextId = notificationId.current + 1;
      notificationId.current = nextId;
      setNotification({ id: nextId, type, message });
    },
    [],
  );

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    setOptionsError(null);
    try {
      const [organizationData, departmentData, roleData] = await Promise.all([
        requestApi<unknown>("/organizations"),
        requestApi<unknown>("/departments"),
        requestApi<unknown>("/roles"),
      ]);
      setOrganizations(
        normalizeList(organizationData, "cơ quan").map(normalizeOption),
      );
      setDepartments(
        normalizeList(departmentData, "phòng ban").map(normalizeOption),
      );
      setRoles(normalizeList(roleData, "vai trò").map(normalizeOption));
    } catch (requestError) {
      setOptionsError(
        getErrorMessage(
          requestError,
          "Không thể tải thông tin cơ quan, phòng ban hoặc vai trò.",
        ),
      );
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  const loadUsers = useCallback(async (query: Filters) => {
    const requestId = ++usersRequestId.current;
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (query.keyword.trim()) params.set("keyword", query.keyword.trim());
    if (query.organizationId) params.set("organizationId", query.organizationId);
    if (query.departmentId) params.set("departmentId", query.departmentId);
    if (query.roleId) params.set("roleId", query.roleId);
    if (query.isActive) params.set("isActive", query.isActive);
    try {
      const suffix = params.size ? `?${params.toString()}` : "";
      const result = normalizeUsers(
        await requestApi<unknown>(`/users${suffix}`),
      );
      if (requestId === usersRequestId.current) setUsers(result);
    } catch (requestError) {
      if (requestId === usersRequestId.current) {
        setUsers([]);
        setError(
          getErrorMessage(requestError, "Không thể tải danh sách người dùng."),
        );
      }
    } finally {
      if (requestId === usersRequestId.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => loadOptions());
  }, [loadOptions]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadUsers(filters);
    }, filters.keyword ? 350 : 0);
    return () => window.clearTimeout(timeoutId);
  }, [filters, loadUsers]);

  useEffect(() => {
    if (!notification) return;
    const timeoutId = window.setTimeout(() => setNotification(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [notification]);

  const departmentOptions = useMemo(
    () =>
      filters.organizationId
        ? departments.filter(
            (department) =>
              !department.organizationId ||
              department.organizationId === filters.organizationId,
          )
        : departments,
    [departments, filters.organizationId],
  );

  const refresh = async () => {
    await Promise.all([loadUsers(filters), loadOptions()]);
  };

  const openCreateForm = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setFormError(null);
    setModal("form");
  };

  const openEditForm = async (user: UserRecord) => {
    setPendingUserId(user.id);
    setError(null);
    try {
      const details = normalizeUser(
        await requestApi<unknown>(`/users/${encodeURIComponent(user.id)}`),
      );
      const roleData = await requestApi<unknown>(
        `/users/${encodeURIComponent(user.id)}/roles`,
      );
      const assignedRoles = readRoleIds(roleData);
      setEditingUser(details);
      setForm({
        username: details.username,
        password: "",
        fullName: details.fullName,
        email: details.email,
        phone: details.phone,
        organizationId: details.organizationId,
        departmentId: details.departmentId,
        jobTitle: details.jobTitle,
        avatarUrl: details.avatarUrl,
        roleIds: (assignedRoles.ids.length ? assignedRoles.ids : details.roleIds).slice(
          0,
          1,
        ),
      });
      setFormError(null);
      setModal("form");
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Không thể tải thông tin người dùng."),
      );
    } finally {
      setPendingUserId(null);
    }
  };

  const handleSaveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      username: form.username.trim(),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      organizationId: form.organizationId || null,
      departmentId: form.departmentId || null,
      jobTitle: form.jobTitle.trim(),
      avatarUrl: form.avatarUrl.trim(),
      ...(editingUser ? {} : { password: form.password }),
    };
    if (!payload.username || !payload.fullName || (!editingUser && !form.password)) {
      setFormError("Vui lòng nhập tên đăng nhập, họ tên và mật khẩu.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    let savedUserId = editingUser?.id;
    try {
      const response = await requestApi<unknown>(
        editingUser
          ? `/users/${encodeURIComponent(editingUser.id)}`
          : "/users",
        {
          method: editingUser ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
      if (!editingUser) {
        const created = asRecord(unwrapData(response));
        let createdId = created?.id;
        if (typeof createdId !== "string" && typeof createdId !== "number") {
          const createdUsers = normalizeUsers(
            await requestApi<unknown>(
              `/users?keyword=${encodeURIComponent(payload.username)}`,
            ),
          );
          const matchedUser = createdUsers.find(
            (user) => user.username === payload.username,
          );
          createdId = matchedUser?.id;
        }
        if (typeof createdId !== "string" && typeof createdId !== "number") {
          const message =
            "Người dùng đã được tạo, nhưng không thể xác định ID để gán vai trò. Vui lòng tải lại danh sách và chỉnh sửa người dùng để gán vai trò.";
          setModal(null);
          notify("error", message);
          await loadUsers(filters);
          return;
        }
        savedUserId = String(createdId);
      }

      if (savedUserId) {
        await requestApi<unknown>(
          `/users/${encodeURIComponent(savedUserId)}/roles`,
          {
            method: "PUT",
            body: JSON.stringify({ roleIds: form.roleIds }),
          },
        );
      }
      notify(
        "success",
        editingUser
          ? `Đã cập nhật người dùng "${payload.fullName}".`
          : `Đã tạo người dùng "${payload.fullName}".`,
      );
      setModal(null);
      await loadUsers(filters);
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Không thể lưu người dùng.");
      setFormError(message);
      notify("error", message);
      if (savedUserId && !editingUser) {
        await loadUsers(filters);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const toggleUserStatus = async (user: UserRecord) => {
    setPendingUserId(user.id);
    setError(null);
    try {
      await requestApi<unknown>(`/users/${encodeURIComponent(user.id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      notify(
        "success",
        `Đã ${user.isActive ? "vô hiệu hóa" : "kích hoạt"} tài khoản "${user.username}".`,
      );
      await loadUsers(filters);
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Không thể cập nhật trạng thái tài khoản.",
      );
      setError(message);
      notify("error", message);
    } finally {
      setPendingUserId(null);
    }
  };

  const openPasswordModal = (user: UserRecord) => {
    setPasswordUser(user);
    setNewPassword("");
    setPasswordError(null);
    setModal("password");
  };

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordUser || !newPassword) {
      setPasswordError("Vui lòng nhập mật khẩu mới.");
      return;
    }
    setIsSavingPassword(true);
    setPasswordError(null);
    try {
      await requestApi<unknown>(
        `/users/${encodeURIComponent(passwordUser.id)}/password`,
        {
          method: "PATCH",
          body: JSON.stringify({ newPassword }),
        },
      );
      notify("success", `Đã đặt lại mật khẩu cho "${passwordUser.username}".`);
      setModal(null);
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "Không thể đặt lại mật khẩu.",
      );
      setPasswordError(message);
      notify("error", message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const deleteUser = async (user: UserRecord) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa người dùng "${user.fullName}" (${user.username})?`,
      )
    ) {
      return;
    }
    setPendingUserId(user.id);
    setError(null);
    try {
      await requestApi<unknown>(`/users/${encodeURIComponent(user.id)}`, {
        method: "DELETE",
      });
      notify("success", `Đã xóa người dùng "${user.fullName}".`);
      await loadUsers(filters);
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Không thể xóa người dùng.");
      setError(message);
      notify("error", message);
    } finally {
      setPendingUserId(null);
    }
  };

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === "organizationId") next.departmentId = "";
      return next;
    });
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

      <div className="mb-6 max-w-sm">
        <SummaryCard label="Tổng số người dùng" value={users.length} icon={UsersRound} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label className="flex-1">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Tìm kiếm
              </span>
              <span className="relative block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={filters.keyword}
                  onChange={(event) =>
                    updateFilter("keyword", event.target.value)
                  }
                  placeholder="Tên, tài khoản, email, số điện thoại..."
                  className="h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </span>
            </label>
            <button
              type="button"
              aria-expanded={showAdvancedSearch}
              onClick={() => setShowAdvancedSearch((visible) => !visible)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {showAdvancedSearch ? "ẨN TÌM KIẾM NÂNG CAO" : "TÌM KIẾM NÂNG CAO"}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  showAdvancedSearch ? "rotate-180" : ""
                }`}
              />
            </button>
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" />
              Thêm người dùng
            </button>
          </div>
          {showAdvancedSearch && (
            <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-4">
              <FilterSelect
                label="Cơ quan / tổ chức"
                value={filters.organizationId}
                onChange={(value) => updateFilter("organizationId", value)}
                options={organizations}
                allLabel="Tất cả cơ quan"
                disabled={isLoadingOptions}
              />
              <FilterSelect
                label="Phòng ban"
                value={filters.departmentId}
                onChange={(value) => updateFilter("departmentId", value)}
                options={departmentOptions}
                allLabel="Tất cả phòng ban"
                disabled={isLoadingOptions}
              />
              <FilterSelect
                label="Vai trò"
                value={filters.roleId}
                onChange={(value) => updateFilter("roleId", value)}
                options={roles}
                allLabel="Tất cả vai trò"
                disabled={isLoadingOptions}
              />
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Trạng thái
                </span>
                <select
                  value={filters.isActive}
                  onChange={(event) =>
                    updateFilter("isActive", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="true">Đang hoạt động</option>
                  <option value="false">Ngừng hoạt động</option>
                </select>
              </label>
            </div>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="m-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void refresh()}
              className="font-semibold underline underline-offset-2"
            >
              Thử tải lại
            </button>
          </div>
        )}
        {optionsError && (
          <div
            role="alert"
            className="mx-5 mb-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{optionsError}</span>
            <button
              type="button"
              onClick={() => void loadOptions()}
              className="font-semibold underline underline-offset-2"
            >
              Tải lại danh mục
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Người dùng</th>
                <th className="px-5 py-4 font-semibold">Liên hệ</th>
                <th className="px-5 py-4 font-semibold">Cơ quan / phòng ban</th>
                <th className="px-5 py-4 font-semibold">Vai trò</th>
                <th className="px-5 py-4 font-semibold">Trạng thái</th>
                <th className="px-5 py-4 font-semibold">Thời gian</th>
                <th className="px-5 py-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-slate-500">
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-slate-500">
                    Không tìm thấy người dùng phù hợp.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isPending = pendingUserId === user.id;
                  const organizationName =
                    organizations.find((item) => item.id === user.organizationId)
                      ?.name ??
                    user.organizationName ??
                    "—";
                  const departmentName =
                    departments.find((item) => item.id === user.departmentId)
                      ?.name ??
                    user.departmentName ??
                    "—";
                  const roleNames =
                    user.roleNames.length > 0
                      ? user.roleNames
                      : user.roleIds
                          .map((id) => roles.find((role) => role.id === id)?.name)
                          .filter((name): name is string => Boolean(name));
                  return (
                    <tr key={user.id} className="align-top hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} />
                          <div>
                            <p className="font-semibold text-slate-900">
                              {user.fullName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              @{user.username}
                            </p>
                            {user.jobTitle && (
                              <p className="mt-1 text-xs text-slate-500">
                                {user.jobTitle}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <p>{user.email || "—"}</p>
                        <p className="mt-1 text-xs">{user.phone || "—"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-700">
                          {organizationName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {departmentName}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex max-w-56 flex-wrap gap-1">
                          {roleNames.length ? (
                            roleNames.map((name) => (
                              <span
                                key={name}
                                className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                              >
                                {name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">Chưa gán</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <StatusPill active={user.isActive} />
                          {user.isLocked && (
                            <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                              Đã khóa
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        <p>
                          <span className="text-slate-400">Tạo: </span>
                          {formatDate(user.createdAt)}
                        </p>
                        <p className="mt-1">
                          <span className="text-slate-400">Đăng nhập: </span>
                          {formatDate(user.lastLoginAt)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <RowAction
                            label="Chỉnh sửa người dùng"
                            disabled={isPending}
                            onClick={() => void openEditForm(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </RowAction>
                          <RowAction
                            label={user.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                            disabled={isPending}
                            onClick={() => void toggleUserStatus(user)}
                          >
                            <Power
                              className={`h-4 w-4 ${
                                user.isActive ? "text-amber-600" : "text-emerald-600"
                              }`}
                            />
                          </RowAction>
                          <RowAction
                            label="Đặt lại mật khẩu"
                            disabled={isPending}
                            onClick={() => openPasswordModal(user)}
                          >
                            <KeyRound className="h-4 w-4" />
                          </RowAction>
                          <RowAction
                            label="Xóa người dùng"
                            disabled={isPending}
                            onClick={() => void deleteUser(user)}
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
        {!isLoading && users.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Hiển thị {users.length} người dùng.
          </div>
        )}
      </section>

      {modal === "form" && (
        <ModalShell
          title={editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng"}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSaveUser} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Tên đăng nhập" required>
                <input
                  required
                  maxLength={100}
                  autoComplete="username"
                  value={form.username}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </FormField>
              {!editingUser && (
                <FormField label="Mật khẩu" required>
                  <input
                    required
                    minLength={8}
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  />
                </FormField>
              )}
              <FormField label="Họ và tên" required>
                <input
                  required
                  maxLength={255}
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </FormField>
              <FormField label="Chức danh">
                <input
                  value={form.jobTitle}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      jobTitle: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  placeholder="VD: Nhân viên / Chuyên viên, Trưởng phòng, ..."
                />
              </FormField>
              <FormField label="Email">
                <input
                  type="email"
                  maxLength={255}
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </FormField>
              <FormField label="Số điện thoại">
                <input
                  type="tel"
                  maxLength={50}
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </FormField>
              <FormField label="Cơ quan / tổ chức">
                <select
                  value={form.organizationId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      organizationId: event.target.value,
                      departmentId: "",
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                >
                  <option value="">Chưa chọn</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Phòng ban">
                <select
                  value={form.departmentId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      departmentId: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                >
                  <option value="">Chưa chọn</option>
                  {departments
                    .filter(
                      (department) =>
                        !form.organizationId ||
                        !department.organizationId ||
                        department.organizationId === form.organizationId,
                    )
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                </select>
              </FormField>
              <FormField label="Ảnh đại diện (URL)">
                <input
                  type="url"
                  value={form.avatarUrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      avatarUrl: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                  placeholder="https://example.com/avatar.png"
                />
              </FormField>
              <FormField label="Vai trò">
                <select
                  value={form.roleIds[0] ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      roleIds: event.target.value ? [event.target.value] : [],
                    }))
                  }
                  disabled={isLoadingOptions || roles.length === 0}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:bg-slate-50"
                >
                  <option value="">
                    {isLoadingOptions ? "Đang tải vai trò..." : "Chưa gán vai trò"}
                  </option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
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
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {isSaving && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                )}
                {editingUser ? "Lưu thay đổi" : "Tạo người dùng"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "password" && passwordUser && (
        <ModalShell
          title="Đặt lại mật khẩu"
          onClose={() => setModal(null)}
        >
          <form onSubmit={resetPassword} className="space-y-4">
            <p className="text-sm text-slate-600">
              Tài khoản: <strong>{passwordUser.username}</strong>
            </p>
            <FormField label="Mật khẩu mới" required>
              <input
                required
                minLength={8}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
            </FormField>
            {passwordError && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {passwordError}
              </p>
            )}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={isSavingPassword}
                className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSavingPassword}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {isSavingPassword ? "Đang lưu..." : "Đặt lại mật khẩu"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof UsersRound;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  allLabel: string;
  disabled?: boolean;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:bg-slate-50"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function UserAvatar({ user }: { user: UserRecord }) {
  if (user.avatarUrl) {
    return (
      // Use a regular img so arbitrary avatar URLs do not need remote image configuration.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-blue-100 text-blue-700">
      <UserRound className="h-5 w-5" />
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {active ? "Hoạt động" : "Chưa kích hoạt"}
    </span>
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

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
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
        aria-labelledby="user-modal-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 id="user-modal-title" className="text-lg font-bold text-slate-900">
            {title}
          </h2>
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
