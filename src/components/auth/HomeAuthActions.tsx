"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function HomeHeaderActions() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div aria-hidden="true" className="h-10 w-32 sm:w-48" />;
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <p className="hidden text-sm font-medium text-blue-100 sm:block">
          Xin chào, {user.username}
        </p>
        <Link
          href="/quan-tri"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-900 shadow-sm transition hover:bg-blue-50 sm:px-4"
        >
          <span className="sm:hidden">Xin chào, {user.username}</span>
          <span className="hidden sm:inline">Truy cập hệ thống</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <nav aria-label="Điều hướng tài khoản" className="flex items-center gap-2 sm:gap-3">
      <Link
        href="/dang-nhap"
        className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10 sm:px-4"
      >
        Đăng nhập
      </Link>
      <Link
        href="/dang-ky"
        className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-900 shadow-sm transition hover:bg-blue-50 sm:px-4"
      >
        Đăng ký
      </Link>
    </nav>
  );
}

export function HomeHeroAction() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div aria-hidden="true" className="h-12 w-48" />;

  return (
    <Link
      href={isAuthenticated ? "/quan-tri" : "/dang-nhap"}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
    >
      Truy cập hệ thống
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
