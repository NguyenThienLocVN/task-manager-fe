import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import IncomingDocuments from "@/components/layout/cong-viec/van-ban-den/IncomingDocuments";

export const metadata: Metadata = {
  title: "Văn bản đi",
};

export default function OutgoingDocumentsPage() {
  return (
    <AdminLayout
      title="Văn bản đi"
      description="Theo dõi văn bản gắn với công việc bạn tạo, giao hoặc trình lãnh đạo phê duyệt."
      requiredPermission="DOCUMENT_VIEW"
    >
      <IncomingDocuments direction="OUTGOING" />
    </AdminLayout>
  );
}
