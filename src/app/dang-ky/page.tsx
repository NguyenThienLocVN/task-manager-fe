import AuthLayout from "@/components/auth/AuthLayout";
import RegisterForm from "@/components/auth/RegisterForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng ký",
};

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Đăng ký tài khoản"
      description="Tạo tài khoản để sử dụng hệ thống quản lý công việc."
    >
      <RegisterForm />
    </AuthLayout>
  );
}