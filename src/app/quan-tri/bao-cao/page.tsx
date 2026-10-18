import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import TaskReports from "@/components/layout/analytics/TaskReports";

export const metadata: Metadata = {
  title: "Báo cáo công việc",
};

export default function TaskReportsPage() {
  return (
    <AdminLayout
      title="Báo cáo công việc"
      description="Tổng hợp tiến độ và kết quả xử lý theo phòng ban hoặc người phụ trách."
    >
      <TaskReports />
    </AdminLayout>
  );
}
