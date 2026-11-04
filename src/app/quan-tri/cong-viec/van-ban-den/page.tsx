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
      description="Xem văn bản được phân công cho bạn hoặc phòng ban của bạn."
      requiredPermission="DOCUMENT_VIEW"
    >
      <IncomingDocuments direction="INCOMING" />
    </AdminLayout>
  );
}
