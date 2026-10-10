"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, CheckCircle2, ChevronDown, ChevronRight, Edit3, FolderTree, Info, Network, Plus, Power, Search, Trash2, X, XCircle } from "lucide-react";

type Organization = {
  id: string;
  code: string;
  name: string;
};

type Department = {
  id: string;
  organizationId: string;
  parentId: string | null;
  code: string;
  name: string;
  departmentType: string;
  sortOrder: number;
  isActive: boolean;
  parent?: Department | null;
};

type Notification = {
  id: number;
  type: "success" | "error";
  message: string;
};

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
    throw new Error(message || `Yêu cầu thất bại (${response.status})`);
  }

  return response.json() as Promise<T>;
}

function generateDepartmentCode(name: string) {
  return (
    name.match(/[\p{L}\p{N}]+/gu) ?? []
  )
    .map((word) =>
      Array.from(word)[0]
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[đĐ]/g, "D")
        .toLocaleUpperCase("vi-VN"),
    )
    .join("");
}

export default function DepartmentManagement() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [pendingDepartmentId, setPendingDepartmentId] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState("");
  const selectedOrganizationIdRef = useRef("");

  const [selectedDepartmentId, setSelectedDepartmentId] =
    useState<string | null>(null);

  const [keyword, setKeyword] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [editingDepartment, setEditingDepartment] =
    useState<Department | null>(null);
  const [newDepartmentParentId, setNewDepartmentParentId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!notification) return;

    const timeoutId = window.setTimeout(() => {
      setNotification(null);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [notification]);

  const notify = (type: Notification["type"], message: string) => {
    setNotification({ id: Date.now(), type, message });
  };

  const loadDepartments = useCallback(async (organizationId: string) => {
    setIsLoadingDepartments(true);
    setError(null);

    try {
      const data = await requestApi<Department[]>(
        `/departments?organizationId=${encodeURIComponent(organizationId)}`,
      );
      if (selectedOrganizationIdRef.current === organizationId) {
        setDepartments(
          data.map((department) => ({
            ...department,
            parentId: department.parentId ?? department.parent?.id ?? null,
          })),
        );
      }
    } catch (requestError) {
      if (selectedOrganizationIdRef.current === organizationId) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Không thể tải danh sách phòng ban.",
        );
        setDepartments([]);
      }
    } finally {
      if (selectedOrganizationIdRef.current === organizationId) {
        setIsLoadingDepartments(false);
      }
    }
  }, []);

  const loadOrganizations = useCallback(async () => {
    setIsLoadingOrganizations(true);
    setError(null);

    try {
      const data = await requestApi<Organization[]>("/organizations");
      setOrganizations(data);
      const currentId = selectedOrganizationIdRef.current;
      const nextOrganizationId =
        data.some((organization) => organization.id === currentId)
          ? currentId
          : (data[0]?.id ?? "");
      selectedOrganizationIdRef.current = nextOrganizationId;
      setSelectedOrganizationId(nextOrganizationId);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải danh sách cơ quan.",
      );
    } finally {
      setIsLoadingOrganizations(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    Promise.resolve()
      .then(() => {
        if (!isCurrent) return null;
        setIsLoadingOrganizations(true);
        setError(null);
        return requestApi<Organization[]>("/organizations");
      })
      .then((data) => {
        if (isCurrent && data) {
          setOrganizations(data);
          const currentId = selectedOrganizationIdRef.current;
          const nextOrganizationId =
            data.some((organization) => organization.id === currentId)
              ? currentId
              : (data[0]?.id ?? "");
          selectedOrganizationIdRef.current = nextOrganizationId;
          setSelectedOrganizationId(nextOrganizationId);
        }
      })
      .catch((requestError: unknown) => {
        if (isCurrent) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Không thể tải danh sách cơ quan.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingOrganizations(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    Promise.resolve()
      .then(() => {
        if (!selectedOrganizationId) {
          if (isCurrent) {
            setDepartments([]);
            setIsLoadingDepartments(false);
          }
          return [];
        }

        setIsLoadingDepartments(true);
        setError(null);
        return requestApi<Department[]>(
          `/departments?organizationId=${encodeURIComponent(selectedOrganizationId)}`,
        );
      })
      .then((data) => {
        if (isCurrent && data) {
          setDepartments(
            data.map((department) => ({
              ...department,
              parentId: department.parentId ?? department.parent?.id ?? null,
            })),
          );
        }
      })
      .catch((requestError: unknown) => {
        if (isCurrent) {
          setDepartments([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Không thể tải danh sách phòng ban.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingDepartments(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedOrganizationId]);

  const organizationDepartments = departments.filter(
    (item) => item.organizationId === selectedOrganizationId,
  );

  const filteredDepartments = useMemo(() => {
    return organizationDepartments.filter((item) =>
      `${item.code} ${item.name}`
        .toLowerCase()
        .includes(keyword.toLowerCase()),
    );
  }, [organizationDepartments, keyword]);

  const handleAdd = (parentId: string | null = null) => {
    setEditingDepartment(null);
    setNewDepartmentParentId(parentId);
    setFormError(null);
    setOpenForm(true);
  };

  const handleEdit = async (department: Department) => {
    setPendingDepartmentId(department.id);
    setError(null);

    try {
      const details = await requestApi<Department>(
        `/departments/${encodeURIComponent(department.id)}`,
      );
      setEditingDepartment({
        ...department,
        ...details,
        parentId: details.parentId ?? details.parent?.id ?? null,
      });
      setNewDepartmentParentId(null);
      setFormError(null);
      setOpenForm(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải thông tin phòng ban.",
      );
    } finally {
      setPendingDepartmentId(null);
    }
  };

  const handleSave = async (data: Partial<Department>) => {
    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        organizationId: selectedOrganizationId,
        parentId: data.parentId ?? null,
        code: data.code,
        name: data.name,
        departmentType: data.departmentType,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      };

      if (editingDepartment) {
        await requestApi<Department>(
          `/departments/${encodeURIComponent(editingDepartment.id)}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          },
        );
      } else {
        await requestApi<Department>("/departments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      notify(
        "success",
        editingDepartment
          ? `Đã cập nhật phòng ban "${data.name}".`
          : `Đã thêm phòng ban "${data.name}".`,
      );
      setOpenForm(false);
      await loadDepartments(selectedOrganizationId);
    } catch (requestError) {
      notify(
        "error",
        requestError instanceof Error
          ? requestError.message
          : "Không thể lưu thông tin phòng ban.",
      );
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể lưu thông tin phòng ban.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (department: Department) => {
    setPendingDepartmentId(department.id);
    setError(null);

    try {
      await requestApi<Department>(
        `/departments/${encodeURIComponent(department.id)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: !department.isActive }),
        },
      );
      notify(
        "success",
        `Đã ${department.isActive ? "ngừng hoạt động" : "kích hoạt"} phòng ban "${department.name}".`,
      );
      await loadDepartments(selectedOrganizationId);
    } catch (requestError) {
      notify(
        "error",
        requestError instanceof Error
          ? requestError.message
          : "Không thể cập nhật trạng thái phòng ban.",
      );
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể cập nhật trạng thái phòng ban.",
      );
    } finally {
      setPendingDepartmentId(null);
    }
  };

  const handleDelete = async (department: Department) => {
    if (!window.confirm(`Bạn có chắc muốn xóa "${department.name}"?`)) {
      return;
    }

    setPendingDepartmentId(department.id);
    setError(null);

    try {
      await requestApi<{ message: string }>(
        `/departments/${encodeURIComponent(department.id)}`,
        { method: "DELETE" },
      );
      notify("success", `Đã xóa phòng ban "${department.name}".`);
      await loadDepartments(selectedOrganizationId);
    } catch (requestError) {
      notify(
        "error",
        requestError instanceof Error
          ? requestError.message
          : "Không thể xóa phòng ban.",
      );
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể xóa phòng ban.",
      );
    } finally {
      setPendingDepartmentId(null);
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
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                notification.type === "success"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {notification.type === "success" ? "Thành công" : "Có lỗi"}
            </span>
            <p className="mt-1 text-sm font-medium">{notification.message}</p>
          </div>

          <button
            onClick={() => setNotification(null)}
            aria-label="Đóng thông báo"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Cơ quan / đơn vị
            </label>

            <select
              value={selectedOrganizationId}
              onChange={(e) => {
                selectedOrganizationIdRef.current = e.target.value;
                setSelectedOrganizationId(e.target.value);
                setSelectedDepartmentId(null);
              }}
              disabled={isLoadingOrganizations || organizations.length === 0}
              className="h-11 min-w-[360px] rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            >
              {organizations.length === 0 && (
                <option value="">
                  {isLoadingOrganizations
                    ? "Đang tải cơ quan..."
                    : "Chưa có cơ quan"}
                </option>
              )}
              {organizations.map((organization) => (
                <option
                  key={organization.id}
                  value={organization.id}
                >
                  {organization.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleAdd(null)}
            disabled={!selectedOrganizationId || isLoadingDepartments}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Plus className="h-5 w-5" />
            Thêm phòng / ban
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        {/* Tree */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-blue-700" />
              <h2 className="font-bold text-slate-900">
                Cơ cấu tổ chức
              </h2>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-blue-50 px-3 py-3 text-blue-800">
              <Building2 className="h-5 w-5 flex-none" />

              <span className="text-sm font-semibold">
                {organizations.find((x) => x.id === selectedOrganizationId)
                  ?.name || "Chưa chọn cơ quan"}
              </span>
            </div>

            {isLoadingDepartments ? (
              <p className="px-2 py-4 text-sm text-slate-500">
                Đang tải cơ cấu phòng ban...
              </p>
            ) : organizationDepartments.length > 0 ? (
              <DepartmentTree
                departments={organizationDepartments}
                selectedId={selectedDepartmentId}
                onSelect={setSelectedDepartmentId}
                onAddChild={(id) => handleAdd(id)}
              />
            ) : (
              <p className="px-2 py-4 text-sm text-slate-500">
                {selectedOrganizationId
                  ? "Cơ quan chưa có phòng ban."
                  : "Chọn cơ quan để xem cơ cấu phòng ban."}
              </p>
            )}
          </div>
        </div>

        {/* Department list */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Danh sách phòng / ban
              </h2>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo mã hoặc tên phòng ban..."
                className="h-11 w-full rounded-xl border border-slate-300 pl-12 pr-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mx-5 mt-5 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <span>{error}</span>
              <button
                onClick={() =>
                  selectedOrganizationId
                    ? void loadDepartments(selectedOrganizationId)
                    : void loadOrganizations()
                }
                className="shrink-0 font-semibold underline"
              >
                Thử lại
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase text-slate-500">
                    Phòng / ban
                  </th>

                  <th className="px-5 py-3.5 text-xs font-semibold uppercase text-slate-500">
                    Loại
                  </th>

                  <th className="px-5 py-3.5 text-xs font-semibold uppercase text-slate-500">
                    Cấp trên
                  </th>

                  <th className="px-5 py-3.5 text-xs font-semibold uppercase text-slate-500">
                    Trạng thái
                  </th>

                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase text-slate-500">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {isLoadingDepartments ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 text-center text-sm text-slate-500"
                    >
                      Đang tải danh sách phòng ban...
                    </td>
                  </tr>
                ) : filteredDepartments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 text-center text-sm text-slate-500"
                    >
                      {keyword
                        ? "Không tìm thấy phòng ban phù hợp."
                        : "Cơ quan chưa có phòng ban."}
                    </td>
                  </tr>
                ) : (
                  filteredDepartments
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((department) => {
                    const parent = departments.find(
                      (x) => x.id === department.parentId,
                    );

                    return (
                      <tr
                        key={department.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                              <Network className="h-5 w-5" />
                            </div>

                            <div>
                              <p className="font-semibold text-slate-900">
                                {department.name}
                              </p>

                              <p className="mt-1 font-mono text-xs text-slate-500">
                                {department.code}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <DepartmentTypeBadge
                            type={department.departmentType}
                          />
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {parent?.name || "Cơ quan"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              department.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {department.isActive
                              ? "Đang hoạt động"
                              : "Ngừng hoạt động"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() =>
                                handleAdd(department.id)
                              }
                              disabled={pendingDepartmentId === department.id}
                              title="Thêm phòng ban cấp dưới"
                              className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Plus className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() =>
                                void handleEdit(department)
                              }
                              disabled={pendingDepartmentId === department.id}
                              title="Chỉnh sửa"
                              className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => void handleToggleStatus(department)}
                              disabled={pendingDepartmentId === department.id}
                              title={
                                department.isActive
                                  ? "Ngừng hoạt động"
                                  : "Kích hoạt"
                              }
                              aria-label={`${
                                department.isActive ? "Ngừng hoạt động" : "Kích hoạt"
                              } ${department.name}`}
                              className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                            >
                              <Power className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => void handleDelete(department)}
                              disabled={pendingDepartmentId === department.id}
                              title="Xóa phòng ban"
                              aria-label={`Xóa ${department.name}`}
                              className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {openForm && (
        <DepartmentForm
          department={editingDepartment}
          organizationId={selectedOrganizationId}
          departments={organizationDepartments}
          initialParentId={newDepartmentParentId}
          onClose={() => setOpenForm(false)}
          onSave={handleSave}
          error={formError}
          isSaving={isSaving}
        />
      )}
    </>
  );
}

function DepartmentTree({
  departments,
  selectedId,
  onSelect,
  onAddChild,
}: {
  departments: Department[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (id: string) => void;
}) {
  const rootDepartments = departments
    .filter((x) => !x.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-1">
      {rootDepartments.map((department) => (
        <TreeNode
          key={department.id}
          department={department}
          departments={departments}
          selectedId={selectedId}
          onSelect={onSelect}
          onAddChild={onAddChild}
          level={0}
        />
      ))}
    </div>
  );
}

function TreeNode({
  department,
  departments,
  selectedId,
  onSelect,
  onAddChild,
  level,
}: {
  department: Department;
  departments: Department[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (id: string) => void;
  level: number;
}) {
  const [expanded, setExpanded] = useState(true);

  const children = departments
    .filter((x) => x.parentId === department.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-lg py-1.5 pr-1 transition ${
          selectedId === department.id
            ? "bg-blue-50"
            : "hover:bg-slate-50"
        }`}
        style={{
          paddingLeft: 6 + level * 18,
        }}
      >
        <button
          onClick={() => setExpanded((x) => !x)}
          className="flex h-6 w-6 items-center justify-center text-slate-400"
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="h-4 w-4" />
          )}
        </button>

        <button
          onClick={() => onSelect(department.id)}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
        >
          <Network className="h-4 w-4 flex-none text-blue-600" />

          <span
            className={`truncate text-sm ${
              selectedId === department.id
                ? "font-semibold text-blue-800"
                : "text-slate-700"
            }`}
          >
            {department.name}
          </span>
        </button>

        <button
          onClick={() => onAddChild(department.id)}
          className="hidden rounded-md p-1 text-slate-400 hover:bg-white hover:text-blue-700 group-hover:block"
          title="Thêm cấp dưới"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {expanded &&
        children.map((child) => (
          <TreeNode
            key={child.id}
            department={child}
            departments={departments}
            selectedId={selectedId}
            onSelect={onSelect}
            onAddChild={onAddChild}
            level={level + 1}
          />
        ))}
    </div>
  );
}

function DepartmentForm({
  department,
  organizationId,
  departments,
  initialParentId,
  onClose,
  onSave,
  error,
  isSaving,
}: {
  department: Department | null;
  organizationId: string;
  departments: Department[];
  onClose: () => void;
  onSave: (data: Partial<Department>) => Promise<void>;
  initialParentId: string | null;
  error: string | null;
  isSaving: boolean;
}) {
  const isEdit = Boolean(department?.id);
  const [name, setName] = useState(department?.name ?? "");
  const [isActive, setIsActive] = useState(
    department?.isActive ?? true,
  );
  const code = generateDepartmentCode(name);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const parentId = String(formData.get("parentId") || "") || null;
    const nextSortOrder =
      isEdit && parentId === department?.parentId
        ? department.sortOrder
        : Math.max(
            0,
            ...departments
              .filter(
                (item) =>
                  item.parentId === parentId &&
                  item.id !== department?.id,
              )
              .map((item) => item.sortOrder),
          ) + 1;

    onSave({
      organizationId,
      parentId,
      code,
      name: name.trim(),
      departmentType: String(
        formData.get("departmentType") || "PHONG",
      ),
      sortOrder: nextSortOrder,
      isActive: isEdit ? isActive : true,
    });
  };

  const validParents = departments.filter(
    (item) => item.id !== department?.id,
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px]">
      <div className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {isEdit
                ? "Cập nhật phòng / ban"
                : "Thêm phòng / ban"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Nhập thông tin phòng ban thuộc cơ quan.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Thuộc phòng / bộ phận cấp trên
              </label>

              <select
                name="parentId"
                defaultValue={department?.parentId ?? initialParentId ?? ""}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              >
                <option value="">
                  -- Trực thuộc cơ quan --
                </option>

                {validParents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} - {item.name}
                  </option>
                ))}
              </select>
            </div>

            <FormInput
              label="Mã phòng / ban"
              name="code"
              value={code}
              disabled
              required
            />

            <FormInput
              label="Tên phòng / ban"
              name="name"
              value={name}
              onChange={setName}
              required
            />

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Loại phòng / bộ phận
              </label>

              <select
                name="departmentType"
                defaultValue={
                  department?.departmentType || "PHONG"
                }
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-600"
              >
                <option value="PHONG">Phòng</option>
                <option value="BAN">Ban</option>
                <option value="TRUNG_TAM">Trung tâm</option>
                <option value="BO_PHAN">Bộ phận</option>
                <option value="TO">Tổ</option>
                <option value="KHAC">Khác</option>
              </select>
            </div>

            {isEdit && (
              <div className="rounded-xl border border-slate-200 p-4">
                <label className="flex cursor-pointer items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">
                      Trạng thái hoạt động
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Cho phép phòng / ban được sử dụng và phân công
                      công việc.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                </label>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="mx-6 mb-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="h-11 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Đang lưu..."
                : isEdit
                  ? "Lưu thay đổi"
                  : "Thêm phòng / ban"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DepartmentTypeBadge({
  type,
}: {
  type: string;
}) {
  const labels: Record<string, string> = {
    PHONG: "Phòng",
    BAN: "Ban",
    TRUNG_TAM: "Trung tâm",
    BO_PHAN: "Bộ phận",
    TO: "Tổ",
    KHAC: "Khác",
  };

  return (
    <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
      {labels[type] || type}
    </span>
  );
}

function FormInput({
  label,
  name,
  placeholder,
  required,
  defaultValue,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <input
        name={name}
        required={required}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        disabled={disabled}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      />
    </div>
  );
}