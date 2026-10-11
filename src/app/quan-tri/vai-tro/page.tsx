import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import RoleManagement from "@/components/layout/vai-tro/RoleManagement";

export const metadata: Metadata = {
  title: "Quản lý vai trò",
};

export default function RolesPage() {
  return (
    <AdminLayout
      title="Quản lý vai trò"
      description="Quản lý vai trò và phạm vi truy cập trong hệ thống."
    >
      <RoleManagement />
    </AdminLayout>
  );
}