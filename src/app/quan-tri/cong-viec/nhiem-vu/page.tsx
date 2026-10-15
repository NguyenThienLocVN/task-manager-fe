import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import TaskManagement from "@/components/layout/cong-viec/nhiem-vu/TaskManagement";

export const metadata: Metadata = {
  title: "Nhiệm vụ",
};

export default function TasksPage() {
  return (
    <AdminLayout
      title="Nhiệm vụ"
      description="Theo dõi nhiệm vụ được giao, người phụ trách và tiến độ xử lý."
    >
      <TaskManagement />
    </AdminLayout>
  );
}
