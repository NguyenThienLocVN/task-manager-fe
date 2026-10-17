"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({
  children,
  requiredPermission,
  requiredPermissions = [],
}: {
  children: ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
}) {
  const router = useRouter();
  const {
    loading,
    isAuthenticated,
    restoreError,
    retrySessionRestore,
    hasPermission,
  } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated && !restoreError) {
      router.replace("/dang-nhap");
    }
  }, [isAuthenticated, loading, restoreError, router]);

  if (restoreError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Chưa thể khôi phục phiên
          </h1>
          <p role="alert" className="mt-2 text-sm text-slate-600">
            {restoreError}
          </p>
          <button
            type="button"
            onClick={() => void retrySessionRestore()}
            className="mt-5 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Thử kết nối lại
          </button>
        </section>
      </main>
    );
  }

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  const missingPermissions = [
    ...(requiredPermission ? [requiredPermission] : []),
    ...requiredPermissions,
  ].filter((permission) => !hasPermission(permission));

  if (missingPermissions.length > 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section
          aria-labelledby="permission-denied-title"
          className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
        >
          <h1
            id="permission-denied-title"
            className="text-xl font-semibold text-slate-900"
          >
            Không có quyền truy cập
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Tài khoản của bạn chưa được cấp quyền cần thiết cho trang này.
          </p>
        </section>
      </main>
    );
  }

  return children;
}
