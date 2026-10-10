"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Edit3,
  Info,
  Mail,
  MapPin,
  Phone,
  Plus,
  Power,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

type Organization = {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  departmentCount: number;
  createdAt: string;
  departments?: unknown[];
};

type Notification = {
  id: number;
  type: "success" | "error";
  message: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

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

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const parts = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}`;
}

function normalizeOrganization(organization: Organization): Organization {
  return {
    ...organization,
    address: organization.address || "",
    phone: organization.phone || "",
    email: organization.email || "",
    departmentCount:
    organization.departmentCount ?? organization.departments?.length ?? 0,
    createdAt: formatDate(organization.createdAt),
  };
}

function generateOrganizationCode(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      const letters = word.match(/[\p{L}\p{N}]+/gu)?.join("");
      if (!letters) return "";

      const isAcronym = letters === letters.toLocaleUpperCase("vi-VN");
      const source = isAcronym ? letters : Array.from(letters)[0];

      return source
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[đĐ]/g, "D")
        .toLocaleUpperCase("vi-VN");
    })
    .join("");
}

export default function OrganizationManagement() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingOrganizationId, setPendingOrganizationId] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [openForm, setOpenForm] = useState(false);
  const [editingOrganization, setEditingOrganization] =
    useState<Organization | null>(null);

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

  const fetchOrganizations = useCallback(async () => {
    const data = await requestApi<Organization[]>("/organizations");
    return data.map(normalizeOrganization);
  }, []);

  const loadOrganizations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setOrganizations(await fetchOrganizations());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải danh sách cơ quan.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [fetchOrganizations]);

  useEffect(() => {
    let isCurrent = true;

    fetchOrganizations()
      .then((data) => {
        if (isCurrent) setOrganizations(data);
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
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [fetchOrganizations]);

  const filteredOrganizations = useMemo(() => {
    return organizations.filter((item) => {
      const matchKeyword =
        item.name.toLowerCase().includes(keyword.toLowerCase()) ||
        item.code.toLowerCase().includes(keyword.toLowerCase());

      const matchStatus =
        status === "ALL" ||
        (status === "ACTIVE" && item.isActive) ||
        (status === "INACTIVE" && !item.isActive);

      return matchKeyword && matchStatus;
    });
  }, [organizations, keyword, status]);

  const activeCount = organizations.filter((x) => x.isActive).length;

  const totalDepartments = organizations.reduce(
    (sum, item) => sum + item.departmentCount,
    0,
  );

  const handleAdd = () => {
    setEditingOrganization(null);
    setFormError(null);
    setOpenForm(true);
  };

  const handleEdit = async (organization: Organization) => {
    setPendingOrganizationId(organization.id);
    setError(null);

    try {
      const details = await requestApi<Organization>(
        `/organizations/${encodeURIComponent(organization.id)}`,
      );
      setEditingOrganization({
        ...organization,
        ...details,
        address: details.address || "",
        phone: details.phone || "",
        email: details.email || "",
        createdAt: formatDate(details.createdAt),
      });
      setFormError(null);
      setOpenForm(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải thông tin cơ quan.",
      );
    } finally {
      setPendingOrganizationId(null);
    }
  };

  const handleSave = async (data: Partial<Organization>) => {
    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        code: data.code,
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        ...(!editingOrganization && { isActive: true }),
      };

      if (editingOrganization) {
        await requestApi<Organization>(
          `/organizations/${encodeURIComponent(editingOrganization.id)}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          },
        );
      } else {
        await requestApi<Organization>("/organizations", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      notify(
        "success",
        editingOrganization
          ? `Đã cập nhật cơ quan "${data.name}".`
          : `Đã thêm cơ quan "${data.name}".`,
      );
      setOpenForm(false);
      await loadOrganizations();
    } catch (requestError) {
      notify(
        "error",
        requestError instanceof Error
          ? requestError.message
          : "Không thể lưu thông tin cơ quan.",
      );
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể lưu thông tin cơ quan.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (organization: Organization) => {
    setPendingOrganizationId(organization.id);
    setError(null);

    try {
      await requestApi<Organization>(
        `/organizations/${encodeURIComponent(organization.id)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: !organization.isActive }),
        },
      );
      notify(
        "success",
        `Đã ${organization.isActive ? "ngừng hoạt động" : "kích hoạt"} cơ quan "${organization.name}".`,
      );
      await loadOrganizations();
    } catch (requestError) {
      notify(
        "error",
        requestError instanceof Error
          ? requestError.message
          : "Không thể cập nhật trạng thái cơ quan.",
      );
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể cập nhật trạng thái cơ quan.",
      );
    } finally {
      setPendingOrganizationId(null);
    }
  };

  const handleDelete = async (organization: Organization) => {
    if (!window.confirm(`Bạn có chắc muốn xóa "${organization.name}"?`)) {
      return;
    }

    setPendingOrganizationId(organization.id);
    setError(null);

    try {
      await requestApi<{ message: string }>(
        `/organizations/${encodeURIComponent(organization.id)}`,
        { method: "DELETE" },
      );
      notify("success", `Đã xóa cơ quan "${organization.name}".`);
      await loadOrganizations();
    } catch (requestError) {
      notify(
        "error",
        requestError instanceof Error
          ? requestError.message
          : "Không thể xóa cơ quan.",
      );
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể xóa cơ quan.",
      );
    } finally {
      setPendingOrganizationId(null);
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
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Statistic */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatisticCard
          label="Tổng số cơ quan"
          value={organizations.length}
          icon={<Building2 className="h-6 w-6" />}
        />

        <StatisticCard
          label="Đang hoạt động"
          value={activeCount}
          icon={<CheckCircle2 className="h-6 w-6" />}
        />

        <StatisticCard
          label="Tổng phòng / ban"
          value={totalDepartments}
          icon={<Building2 className="h-6 w-6" />}
        />

      </div>

      {/* Main card */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Danh sách cơ quan / đơn vị
              </h2>
            </div>

            <button
              onClick={handleAdd}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              <Plus className="h-5 w-5" />
              Thêm cơ quan
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo mã hoặc tên cơ quan..."
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
            </div>

            <div className="relative">
              <SlidersHorizontal className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as "ALL" | "ACTIVE" | "INACTIVE",
                  )
                }
                className="h-11 min-w-[190px] rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-600"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Ngừng hoạt động</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mx-5 mt-5 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              onClick={() => void loadOrganizations()}
              className="shrink-0 font-semibold underline"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <TableHead>Mã</TableHead>
                <TableHead>Cơ quan / đơn vị</TableHead>
                <TableHead>Thông tin liên hệ</TableHead>
                <TableHead>Phòng ban</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead align="right">Thao tác</TableHead>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Đang tải danh sách cơ quan...
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredOrganizations.map((organization) => (
                  <tr
                    key={organization.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50/70"
                  >
                  <TableCell>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-600">
                      {organization.code}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <Building2 className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="font-semibold text-slate-900">
                          {organization.name}
                        </p>

                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3.5 w-3.5" />
                          {organization.address}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {organization.phone || "-"}
                      </div>

                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {organization.email || "-"}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="font-semibold text-slate-700">
                      {organization.departmentCount}
                    </span>
                  </TableCell>

                  <TableCell>
                    {organization.isActive ? (
                      <StatusBadge active>Đang hoạt động</StatusBadge>
                    ) : (
                      <StatusBadge>Ngừng hoạt động</StatusBadge>
                    )}
                  </TableCell>

                  <TableCell>
                    <span className="text-sm text-slate-500">
                      {organization.createdAt}
                    </span>
                  </TableCell>

                  <TableCell align="right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleEdit(organization)}
                        disabled={pendingOrganizationId === organization.id}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                        title="Xem chi tiết và chỉnh sửa"
                        aria-label={`Xem chi tiết và chỉnh sửa ${organization.name}`}
                      >
                        {pendingOrganizationId === organization.id ? (
                          <span className="block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700" />
                        ) : (
                          <Edit3 className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        onClick={() => void handleToggleStatus(organization)}
                        disabled={pendingOrganizationId === organization.id}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                        title={organization.isActive ? "Ngừng hoạt động" : "Kích hoạt"}
                        aria-label={`${organization.isActive ? "Ngừng hoạt động" : "Kích hoạt"} ${organization.name}`}
                      >
                        <Power className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => void handleDelete(organization)}
                        disabled={pendingOrganizationId === organization.id}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        title="Xóa cơ quan"
                        aria-label={`Xóa ${organization.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                  </tr>
                ))}

              {!isLoading && filteredOrganizations.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="py-16 text-center">
                      <Building2 className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-3 font-medium text-slate-600">
                        Không tìm thấy cơ quan phù hợp
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <p className="text-sm text-slate-500">
            Hiển thị {filteredOrganizations.length} / {organizations.length} cơ
            quan
          </p>
        </div>
      </div>

      {openForm && (
        <OrganizationForm
          organization={editingOrganization}
          onClose={() => setOpenForm(false)}
          onSave={handleSave}
          error={formError}
          isSaving={isSaving}
        />
      )}
    </>
  );
}

function StatisticCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function TableHead({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={`px-5 py-4 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}

function StatusBadge({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {active ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}

      {children}
    </span>
  );
}

function OrganizationForm({
  organization,
  onClose,
  onSave,
  error,
  isSaving,
}: {
  organization: Organization | null;
  onClose: () => void;
  onSave: (data: Partial<Organization>) => Promise<void>;
  error: string | null;
  isSaving: boolean;
}) {
  const [name, setName] = useState(organization?.name ?? "");
  const code = generateOrganizationCode(name);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    onSave({
      code,
      name: name.trim(),
      address: String(formData.get("address") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      isActive: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px]">
      <div className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {organization ? "Cập nhật cơ quan" : "Thêm cơ quan"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Nhập thông tin cơ quan / đơn vị.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            <FormInput
              label="Mã cơ quan"
              name="code"
              value={code}
              disabled
              required
            />

            <FormInput
              label="Tên cơ quan / đơn vị"
              name="name"
              value={name}
              onChange={setName}
              placeholder="Nhập tên cơ quan"
              required
            />

            <FormInput
              label="Địa chỉ"
              name="address"
              defaultValue={organization?.address}
              placeholder="Nhập địa chỉ"
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <FormInput
                label="Điện thoại"
                name="phone"
                defaultValue={organization?.phone}
                placeholder="024..."
              />

              <FormInput
                label="Email"
                name="email"
                type="email"
                defaultValue={organization?.email}
                placeholder="email@domain.vn"
              />
            </div>
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
              className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
                : organization
                  ? "Lưu thay đổi"
                  : "Thêm cơ quan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormInput({
  label,
  name,
  placeholder,
  type = "text",
  required,
  defaultValue,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
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
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        name={name}
        type={type}
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