"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, BriefcaseBusiness, Eye, EyeOff, Loader2, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { apiRequest } from "@/lib/auth/api";

type Organization = {
  id: string;
  name: string;
};

type Department = {
  id: string;
  organizationId: string;
  name: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeList(value: unknown, label: string): unknown[] {
  const wrapped = asRecord(value);
  const unwrapped = wrapped && "data" in wrapped ? wrapped.data : value;
  if (Array.isArray(unwrapped)) return unwrapped;

  const record = asRecord(unwrapped);
  if (record && Array.isArray(record.items)) return record.items;
  throw new Error(`API không trả về danh sách ${label} hợp lệ.`);
}

function normalizeOrganization(value: unknown): Organization | null {
  const record = asRecord(value);
  const id = record?.id;
  const name = record?.name;
  const isActive = record?.isActive ?? record?.is_active;

  if (
    (typeof id !== "string" && typeof id !== "number") ||
    typeof name !== "string" ||
    typeof isActive !== "boolean"
  ) {
    throw new Error("Dữ liệu cơ quan không hợp lệ.");
  }

  return isActive ? { id: String(id), name } : null;
}

function normalizeDepartment(value: unknown): Department | null {
  const record = asRecord(value);
  const id = record?.id;
  const organizationId = record?.organizationId ?? record?.organization_id;
  const name = record?.name;
  const isActive = record?.isActive ?? record?.is_active;

  if (
    (typeof id !== "string" && typeof id !== "number") ||
    (typeof organizationId !== "string" && typeof organizationId !== "number") ||
    typeof name !== "string" ||
    typeof isActive !== "boolean"
  ) {
    throw new Error("Dữ liệu phòng ban không hợp lệ.");
  }

  return isActive
    ? { id: String(id), organizationId: String(organizationId), name }
    : null;
}

export default function RegisterForm() {
  const [organizationId, setOrganizationId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [reloadAttempt, setReloadAttempt] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadOptions() {
      setIsLoadingOptions(true);
      setOptionsError(null);

      try {
        const result = await apiRequest<{
          organizations: unknown;
          departments: unknown;
        }>("/auth/register/options");
        const organizationOptions = normalizeList(
          result.organizations,
          "cơ quan",
        )
          .map(normalizeOrganization)
          .filter((organization): organization is Organization =>
            Boolean(organization),
          );
        const departmentOptions = normalizeList(
          result.departments,
          "phòng ban",
        )
          .map(normalizeDepartment)
          .filter((department): department is Department =>
            Boolean(department),
          );

        if (isCurrent) {
          setOrganizations(organizationOptions);
          setDepartments(departmentOptions);
        }
      } catch (requestError) {
        if (isCurrent) {
          setOrganizations([]);
          setDepartments([]);
          setOptionsError(
            requestError instanceof Error
              ? requestError.message
              : "Không thể tải danh sách cơ quan và phòng ban.",
          );
        }
      } finally {
        if (isCurrent) setIsLoadingOptions(false);
      }
    }

    void loadOptions();
    return () => {
      isCurrent = false;
    };
  }, [reloadAttempt]);

  const filteredDepartments = departments.filter(
    (department) => department.organizationId === organizationId,
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    setSubmitError(null);
    setSubmitSuccess(null);

    if (password !== confirmPassword) {
      setSubmitError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setLoading(true);
      await apiRequest<unknown>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: String(formData.get("username") ?? "").trim(),
          password,
          fullName: String(formData.get("fullName") ?? "").trim(),
          email: String(formData.get("email") ?? "").trim() || null,
          phone: String(formData.get("phone") ?? "").trim() || null,
          organizationId,
          departmentId: departmentId || null,
          jobTitle: String(formData.get("jobTitle") ?? "").trim() || null,
        }),
      });
      form.reset();
      setOrganizationId("");
      setDepartmentId("");
      setSubmitSuccess(
        "Đăng ký thành công. Tài khoản sẽ được quản trị viên xác nhận trước khi sử dụng.",
      );
    } catch (requestError) {
      setSubmitError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể hoàn tất đăng ký. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Họ và tên"
          name="fullName"
          placeholder="Nguyễn Văn A"
          required
          icon={<UserRound className="h-5 w-5" />}
        />

        <Input
          label="Tên đăng nhập"
          name="username"
          placeholder="nguyenvana"
          required
          icon={<UserRound className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="example@domain.vn"
          icon={<Mail className="h-5 w-5" />}
        />

        <Input
          label="Số điện thoại"
          name="phone"
          type="tel"
          placeholder="09xxxxxxxx"
          icon={<Phone className="h-5 w-5" />}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Cơ quan / đơn vị
          <span className="ml-1 text-red-500">*</span>
        </label>

        <div className="relative">
          <Building2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <select
            name="organizationId"
            value={organizationId}
            required
            disabled={isLoadingOptions || organizations.length === 0}
            onChange={(e) => {
              setOrganizationId(e.target.value);
              setDepartmentId("");
            }}
            className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-12 pr-10 text-sm text-slate-900 outline-none transition hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          >
            <option value="">
              {isLoadingOptions
                ? "-- Đang tải cơ quan / đơn vị --"
                : "-- Chọn cơ quan / đơn vị --"}
            </option>

            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </div>
        {optionsError && (
          <div className="mt-2 flex items-center justify-between gap-3 text-sm text-red-600">
            <p role="alert">{optionsError}</p>
            <button
              type="button"
              onClick={() => setReloadAttempt((attempt) => attempt + 1)}
              className="shrink-0 font-semibold underline underline-offset-2"
            >
              Thử tải lại
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Phòng / ban
          </label>

          <select
            name="departmentId"
            value={departmentId}
            disabled={!organizationId || isLoadingOptions}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          >
            <option value="">-- Chọn phòng / ban --</option>

            {filteredDepartments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Chức vụ"
          name="jobTitle"
          placeholder="Trưởng phòng / Chuyên viên, ..."
          icon={<BriefcaseBusiness className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <PasswordInput
          label="Mật khẩu"
          name="password"
          show={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />

        <PasswordInput
          label="Nhập lại mật khẩu"
          name="confirmPassword"
          show={showConfirmPassword}
          onToggle={() => setShowConfirmPassword((value) => !value)}
        />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs leading-5 text-amber-800">
          Sau khi đăng ký, tài khoản cần được quản trị viên xác nhận và
          cấp quyền trước khi sử dụng hệ thống.
        </p>
      </div>

      {submitError && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {submitError}
        </p>
      )}
      {submitSuccess && (
        <p
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {submitSuccess}
        </p>
      )}

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          required
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
        />

        <span className="text-sm leading-6 text-slate-600">
          Tôi xác nhận các thông tin cung cấp là chính xác và đồng ý với{" "}
          <Link
            href="/terms"
            className="font-medium text-blue-700 hover:underline"
          >
            điều khoản sử dụng
          </Link>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={loading || isLoadingOptions || organizations.length === 0}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-700/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading && <Loader2 className="h-5 w-5 animate-spin" />}

        {loading ? "Đang tạo tài khoản..." : "Đăng ký tài khoản"}
      </button>

      <p className="text-center text-sm text-slate-600">
        Đã có tài khoản?{" "}
        <Link
          href="/dang-nhap"
          className="font-semibold text-blue-700 hover:text-blue-800 hover:underline"
        >
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}

function Input({
  label,
  name,
  type = "text",
  placeholder,
  required,
  icon,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}

        <input
          type={type}
          name={name}
          required={required}
          placeholder={placeholder}
          className={`h-12 w-full rounded-xl border border-slate-300 bg-white pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 ${
            icon ? "pl-12" : "pl-4"
          }`}
        />
      </div>
    </div>
  );
}

function PasswordInput({
  label,
  name,
  show,
  onToggle,
}: {
  label: string;
  name: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        <span className="ml-1 text-red-500">*</span>
      </label>

      <div className="relative">
        <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

        <input
          name={name}
          type={show ? "text" : "password"}
          required
          minLength={8}
          placeholder="Tối thiểu 8 ký tự"
          className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
        >
          {show ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}