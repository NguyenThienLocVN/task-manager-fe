import AdminLayout from "@/components/layout/AdminLayout";
import OrganizationManagement from "@/components/layout/to-chuc/OrganizationManagement";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý cơ quan / đơn vị",
};

export default function OrganizationsPage() {
  return (
    <AdminLayout
      title="Quản lý cơ quan / đơn vị"
      description="Thông tin cơ quan sử dụng hệ thống."
    >
      <OrganizationManagement />
    </AdminLayout>
  );
}