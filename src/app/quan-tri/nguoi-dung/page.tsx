import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import UserManagement from "@/components/layout/nguoi-dung/UserManagement";

export const metadata: Metadata = {
  title: "Quản lý người dùng",
};

export default function UsersPage() {
  return (
    <AdminLayout
      title="Quản lý người dùng"
      description="Quản lý tài khoản, thông tin công tác và vai trò người dùng."
    >
      <UserManagement />
    </AdminLayout>
  );
}