import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import TaskWorkspace from "@/components/layout/cong-viec/nhiem-vu/TaskWorkspace";

export const metadata: Metadata = {
  title: "Nhiệm vụ",
};

export default function TasksPage() {
  return (
    <AdminLayout
      title="Nhiệm vụ"
      description="Theo dõi nhiệm vụ được giao, người phụ trách và tiến độ xử lý."
    >
      <TaskWorkspace />
    </AdminLayout>
  );
}
