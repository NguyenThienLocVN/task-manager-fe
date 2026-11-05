"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertCircle, LoaderCircle, Save, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/auth/api";

type AccountProfileData = {
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
  lastLoginAt: string;
  roles: string[];
};

type AccountForm = Pick<
  AccountProfileData,
  "fullName" | "email" | "phone" | "avatarUrl"
>;

type RecordValue = Record<string, unknown>;

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50 read-only:text-slate-600";

function asRecord(value: unknown): RecordValue | null {
  return value && typeof value === "object"
    ? (value as RecordValue)
    : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function formatLastLogin(value: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeProfile(value: unknown, fallback: NonNullable<ReturnType<typeof useAuth>["user"]>): AccountProfileData {
  let record = asRecord(value);
  while (record && asRecord(record.data)) record = asRecord(record.data);
  if (record && asRecord(record.user)) record = asRecord(record.user);
  if (!record) throw new Error("API không trả về thông tin tài khoản hợp lệ.");

  const organization = asRecord(record.organization);
  const department = asRecord(record.department);
  const rawRoles = record.roles ?? record.userRoles ?? record.user_roles;
  const roles = (Array.isArray(rawRoles) ? rawRoles : fallback.roles)
    .map((role) => {
      if (typeof role === "string") return role;
      const roleRecord = asRecord(role);
      const nestedRole = asRecord(roleRecord?.role);
      return stringValue(
        roleRecord?.name ??
          roleRecord?.code ??
          nestedRole?.name ??
          nestedRole?.code,
      );
    })
    .filter(Boolean);

  return {
    id: stringValue(record.id ?? fallback.id),
    username: stringValue(record.username ?? fallback.username),
    fullName: stringValue(
      record.fullName ?? record.full_name ?? fallback.fullName,
    ),
    email: stringValue(record.email ?? fallback.email),
    phone: stringValue(record.phone ?? fallback.phone),
    organizationId: stringValue(
      record.organizationId ?? record.organization_id ?? organization?.id,
    ),
    organizationName: stringValue(
      record.organizationName ??
        record.organization_name ??
        organization?.name ??
        (typeof record.organization === "string"
          ? record.organization
          : fallback.organization),
    ),
    departmentId: stringValue(
      record.departmentId ??
        record.department_id ??
        department?.id ??
        (typeof fallback.department === "object"
          ? fallback.department?.id
          : ""),
    ),
    departmentName: stringValue(
      record.departmentName ??
        record.department_name ??
        department?.name ??
        department?.departmentName ??
        department?.department_name ??
        (typeof record.department === "string" ? record.department : null) ??
        (typeof fallback.department === "string"
          ? fallback.department
          : fallback.department?.name),
    ),
    jobTitle: stringValue(record.jobTitle ?? record.job_title ?? fallback.jobTitle),
    avatarUrl: stringValue(record.avatarUrl ?? record.avatar_url ?? fallback.avatarUrl),
    lastLoginAt: stringValue(
      record.lastLoginAt ?? record.last_login_at ?? fallback.lastLoginAt,
    ),
    roles,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AccountProfile() {
  const { user, getCurrentUser } = useAuth();
  const [profile, setProfile] = useState<AccountProfileData | null>(null);
  const [form, setForm] = useState<AccountForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setError("Không tìm thấy tài khoản đang đăng nhập.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<unknown>(
        `/users/${encodeURIComponent(user.id)}`,
      );
      const loadedProfile = normalizeProfile(result, user);
      setProfile(loadedProfile);
      setForm({
        fullName: loadedProfile.fullName,
        email: loadedProfile.email,
        phone: loadedProfile.phone,
        avatarUrl: loadedProfile.avatarUrl,
      });
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Không thể tải thông tin tài khoản."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    Promise.resolve().then(() => {
      void loadProfile();
    });
  }, [loadProfile]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile || !form) return;

    const fullName = form.fullName.trim();
    if (!fullName) {
      setError("Vui lòng nhập họ và tên.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setNotice(null);
    const updatedForm = {
      fullName,
      email: form.email.trim(),
      phone: form.phone.trim(),
      avatarUrl: form.avatarUrl.trim(),
    };

    try {
      await apiRequest<unknown>(`/users/${encodeURIComponent(profile.id)}`, {
        method: "PUT",
        body: JSON.stringify({
          username: profile.username,
          fullName: updatedForm.fullName,
          email: updatedForm.email,
          phone: updatedForm.phone,
          organizationId: profile.organizationId || null,
          departmentId: profile.departmentId || null,
          jobTitle: profile.jobTitle,
          avatarUrl: updatedForm.avatarUrl,
        }),
      });

      setProfile((current) =>
        current ? { ...current, ...updatedForm } : current,
      );
      setForm(updatedForm);
      setNotice("Đã cập nhật thông tin tài khoản.");
      try {
        await getCurrentUser();
      } catch (refreshError) {
        setError(
          `Thông tin đã được lưu, nhưng không thể làm mới phiên đăng nhập: ${getErrorMessage(refreshError, "lỗi không xác định")}`,
        );
      }
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Không thể cập nhật thông tin tài khoản."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateForm = (field: keyof AccountForm, value: string) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        <LoaderCircle className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-700" />
        Đang tải thông tin tài khoản...
      </div>
    );
  }

  if (!profile || !form) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
      >
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div className="flex-1">{error || "Không thể tải thông tin tài khoản."}</div>
        <button
          type="button"
          className="font-semibold underline"
          onClick={() => void loadProfile()}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {(error || notice) && (
        <div
          role={error ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-sm ${
            error
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || notice}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Thông tin tài khoản</h2>
            <p className="mt-1 text-sm text-slate-500">
              Chỉ có thể chỉnh sửa thông tin cá nhân cơ bản.
            </p>
          </div>
        </header>

        <form className="space-y-6 p-5 sm:p-6" onSubmit={handleSave}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Họ và tên
              <input
                required
                className={inputClass}
                value={form.fullName}
                onChange={(event) => updateForm("fullName", event.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Email
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(event) => updateForm("email", event.target.value)}
                autoComplete="email"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Điện thoại
              <input
                type="tel"
                className={inputClass}
                value={form.phone}
                onChange={(event) => updateForm("phone", event.target.value)}
                autoComplete="tel"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              URL ảnh đại diện
              <input
                type="url"
                className={inputClass}
                value={form.avatarUrl}
                onChange={(event) => updateForm("avatarUrl", event.target.value)}
                placeholder="https://..."
              />
            </label>
            <ReadOnlyField label="Tên đăng nhập" value={profile.username} />
            <ReadOnlyField label="Tổ chức" value={profile.organizationName} />
            <ReadOnlyField label="Phòng ban" value={profile.departmentName} />
            <ReadOnlyField label="Chức danh" value={profile.jobTitle} />
            <ReadOnlyField
              label="Thời gian đăng nhập"
              value={formatLastLogin(profile.lastLoginAt)}
            />
          </div>

          <section aria-labelledby="account-roles-heading">
            <h3
              id="account-roles-heading"
              className="flex items-center gap-2 text-sm font-bold text-slate-900"
            >
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Vai trò
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.roles.length ? (
                profile.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                  >
                    {role}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">Chưa được gán vai trò.</span>
              )}
            </div>
          </section>

          <footer className="flex justify-end border-t border-slate-100 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <input className={inputClass} value={value || "—"} readOnly />
      {detail && <span className="mt-1 block text-xs font-normal text-slate-500">{detail}</span>}
    </label>
  );
}
