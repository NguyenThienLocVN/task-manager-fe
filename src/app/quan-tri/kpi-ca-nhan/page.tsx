import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import PersonalKpi from "@/components/layout/analytics/PersonalKpi";

export const metadata: Metadata = {
  title: "KPI cá nhân",
};

export default function PersonalKpiPage() {
  return (
    <AdminLayout
      title="KPI cá nhân"
      description="Theo dõi khối lượng, tiến độ và các công việc cần xử lý của bạn."
    >
      <PersonalKpi />
    </AdminLayout>
  );
}
