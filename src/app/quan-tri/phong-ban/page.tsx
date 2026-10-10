import AdminLayout from "@/components/layout/AdminLayout";
import DepartmentManagement from "@/components/layout/phong-ban/DepartmentManagement";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý phòng ban",
};

export default function DepartmentsPage() {
  return (
    <AdminLayout
      title="Quản lý phòng / ban"
      description="Quản lý cơ cấu tổ chức và phân cấp phòng ban."
    >
      <DepartmentManagement />
    </AdminLayout>
  );
}