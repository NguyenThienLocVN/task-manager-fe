import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AccountProfile from "@/components/layout/tai-khoan/AccountProfile";

export const metadata: Metadata = {
  title: "Tài khoản",
};

export default function AccountPage() {
  return (
    <AdminLayout
      title="Tài khoản"
      description="Xem thông tin cá nhân, vai trò và cập nhật hồ sơ của bạn."
    >
      <AccountProfile />
    </AdminLayout>
  );
}
