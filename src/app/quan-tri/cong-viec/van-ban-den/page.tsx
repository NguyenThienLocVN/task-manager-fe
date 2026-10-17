import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import IncomingDocuments from "@/components/layout/cong-viec/van-ban-den/IncomingDocuments";

export const metadata: Metadata = {
  title: "Văn bản đến",
};

export default function IncomingDocumentsPage() {
  return (
    <AdminLayout
      title="Văn bản đến"
      description="Tiếp nhận, theo dõi và phân công xử lý văn bản đến."
      requiredPermission="DOCUMENT_VIEW"
    >
      <IncomingDocuments />
    </AdminLayout>
  );
}
