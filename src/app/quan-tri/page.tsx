import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import DashboardOverview from "@/components/layout/DashboardOverview";

export const metadata: Metadata = {
  title: "Bảng điều khiển",
};

export default function AdminDashboardPage() {
  return (
    <AdminLayout
      title="Bảng điều khiển"
      description="Tổng quan tình hình công việc trên toàn hệ thống."
    >
      <DashboardOverview />
    </AdminLayout>
  );
}
