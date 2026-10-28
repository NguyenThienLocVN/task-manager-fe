import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import NotificationCenter from "@/components/layout/thong-bao/NotificationCenter";

export const metadata: Metadata = {
  title: "Thông báo",
};

export default function NotificationsPage() {
  return (
    <AdminLayout
      title="Thông báo"
      description="Theo dõi các cập nhật liên quan đến nhiệm vụ của bạn."
    >
      <NotificationCenter />
    </AdminLayout>
  );
}
