import { Suspense } from "react";
import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import TaskWorkspace from "@/components/layout/cong-viec/nhiem-vu/TaskWorkspace";

export const metadata: Metadata = {
  title: "Chi tiết nhiệm vụ",
};

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Đang tải chi tiết công việc...
        </div>
      }
    >
      <AdminLayout
        title="Chi tiết nhiệm vụ"
        description="Thông tin và quá trình xử lý nhiệm vụ."
      >
        {params.then(({ taskId }) => <TaskWorkspace taskId={taskId} />)}
      </AdminLayout>
    </Suspense>
  );
}
