import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import PermissionManagement from "@/components/layout/phan-quyen/PermissionManagement";

export const metadata: Metadata = {
  title: "Quản lý quyền hạn",
};

export default function PermissionsPage() {
  return (
    <AdminLayout
      title="Quản lý quyền hạn"
      description="Quản lý danh mục quyền và phân quyền truy cập theo vai trò."
    >
      <PermissionManagement />
    </AdminLayout>
  );
}