"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/auth/api";

export default function LoginForm() {
  const router = useRouter();
  const {
    isAuthenticated,
    loading: authLoading,
    restoreError,
    logoutError,
    login,
  } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace("/quan-tri");
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const rememberMe = formData.get("rememberMe") === "on";

    try {
      setLoading(true);
      setError(null);
      await login(username, password, rememberMe);
      router.replace("/quan-tri");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setError("Tên đăng nhập hoặc mật khẩu không đúng.");
      } else if (cause instanceof ApiError && cause.status >= 500) {
        setError("Máy chủ đang gặp sự cố. Vui lòng thử lại sau.");
      } else if (cause instanceof TypeError) {
        setError("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
      } else {
        setError(
          cause instanceof Error
            ? cause.message
            : "Đăng nhập thất bại. Vui lòng thử lại.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="username"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Tên đăng nhập hoặc Email
        </label>

        <div className="relative">
          <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            placeholder="Nhập tên đăng nhập hoặc địa chỉ email"
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-sm font-semibold text-slate-700"
          >
            Mật khẩu
          </label>
        </div>

        <div className="relative">
          <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Nhập mật khẩu"
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          />

          <button
            type="button"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          name="rememberMe"
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
        />
        <span>Ghi nhớ đăng nhập</span>
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {logoutError && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          {logoutError}
        </p>
      )}
      {restoreError && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          {restoreError}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || authLoading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-700/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang đăng nhập...
          </>
        ) : (
          <>
            <KeyRound className="h-5 w-5" />
            Đăng nhập
          </>
        )}
      </button>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>

        <div className="relative flex justify-center">
          <span className="bg-slate-50 px-4 text-xs uppercase tracking-wide text-slate-400">
            Hoặc
          </span>
        </div>
      </div>

      <p className="text-center text-sm text-slate-600">
        Chưa có tài khoản?{" "}
        <Link
          href="/dang-ky"
          className="font-semibold text-blue-700 hover:text-blue-800 hover:underline"
        >
          Đăng ký tài khoản
        </Link>
      </p>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-xs leading-5 text-blue-800">
          Tài khoản được cấp quyền theo cơ quan, phòng ban và vai trò. Nếu không
          thể đăng nhập, vui lòng liên hệ quản trị viên hệ thống.
        </p>
      </div>
    </form>
  );
}