"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  Building2,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";

type Organization = {
  id: string;
  name: string;
};

type Department = {
  id: string;
  organizationId: string;
  name: string;
};

const organizations: Organization[] = [
  {
    id: "org-1",
    name: "Sở Nông nghiệp và Môi trường",
  },
  {
    id: "org-2",
    name: "Trung tâm Quan trắc tài nguyên và môi trường",
  },
];

const departments: Department[] = [
  {
    id: "dep-1",
    organizationId: "org-1",
    name: "Văn phòng Sở",
  },
  {
    id: "dep-2",
    organizationId: "org-1",
    name: "Phòng Tài nguyên nước",
  },
  {
    id: "dep-3",
    organizationId: "org-1",
    name: "Phòng Quản lý môi trường",
  },
  {
    id: "dep-4",
    organizationId: "org-2",
    name: "Phòng Quan trắc",
  },
];

export default function RegisterForm() {
  const [organizationId, setOrganizationId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredDepartments = departments.filter(
    (department) => department.organizationId === organizationId,
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const payload = {
      username: formData.get("username"),
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      organizationId: formData.get("organizationId"),
      departmentId: formData.get("departmentId"),
      jobTitle: formData.get("jobTitle"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    };

    console.log(payload);

    try {
      setLoading(true);

      // TODO call API

      await new Promise((resolve) => setTimeout(resolve, 800));
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
            onChange={(e) => setOrganizationId(e.target.value)}
            className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-12 pr-10 text-sm text-slate-900 outline-none transition hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          >
            <option value="">-- Chọn cơ quan / đơn vị --</option>

            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Phòng / ban
          </label>

          <select
            name="departmentId"
            disabled={!organizationId}
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
          placeholder="Chuyên viên"
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
          Sau khi đăng ký, tài khoản có thể cần được quản trị viên xác nhận và
          cấp quyền trước khi sử dụng đầy đủ các chức năng của hệ thống.
        </p>
      </div>

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
        disabled={loading}
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