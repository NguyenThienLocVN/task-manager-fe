import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, BarChart3, Building2, Check, CheckCircle2, ClipboardCheck, Clock3, FileText, LayoutDashboard, ListChecks, ShieldCheck, UsersRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Quản lý công việc hiệu quả và minh bạch",
  description:
    "Nền tảng quản lý công việc tập trung, giúp giao nhiệm vụ rõ ràng, theo dõi tiến độ và phối hợp hiệu quả.",
};

const features = [
  {
    icon: ClipboardCheck,
    title: "Giao việc rõ ràng",
    description:
      "Phân công nhiệm vụ theo cơ quan, phòng ban và chuyên viên; thống nhất người phụ trách, thời hạn và yêu cầu đầu ra.",
    iconClass: "bg-blue-50 text-blue-700",
  },
  {
    icon: Clock3,
    title: "Theo dõi tiến độ",
    description:
      "Nắm bắt trạng thái xử lý, thời hạn và các đầu việc cần ưu tiên để chủ động phối hợp, hạn chế bỏ sót nhiệm vụ.",
    iconClass: "bg-cyan-50 text-cyan-700",
  },
  {
    icon: FileText,
    title: "Quản lý hồ sơ tập trung",
    description:
      "Tập hợp văn bản, thông tin xử lý và lịch sử công việc tại một nơi, thuận tiện tra cứu và tiếp tục xử lý.",
    iconClass: "bg-indigo-50 text-indigo-700",
  },
  {
    icon: BarChart3,
    title: "Minh bạch kết quả",
    description:
      "Cung cấp góc nhìn tổng quan về tình hình thực hiện, hỗ trợ báo cáo và đánh giá công việc dựa trên dữ liệu.",
    iconClass: "bg-teal-50 text-teal-700",
  },
  {
    icon: UsersRound,
    title: "Phối hợp theo tổ chức",
    description:
      "Kết nối cơ quan, phòng ban và thành viên trong cùng quy trình để việc bàn giao, phối hợp luôn liền mạch.",
    iconClass: "bg-sky-50 text-sky-700",
  },
  {
    icon: ShieldCheck,
    title: "Phân quyền phù hợp",
    description:
      "Quản lý người dùng, vai trò và quyền truy cập theo trách nhiệm, góp phần bảo đảm thông tin được sử dụng đúng mục đích.",
    iconClass: "bg-violet-50 text-violet-700",
  },
];

const steps = [
  {
    number: "01",
    title: "Tiếp nhận và phân công",
    description:
      "Ghi nhận nội dung công việc, xác định người phụ trách và thời hạn hoàn thành.",
  },
  {
    number: "02",
    title: "Cập nhật và phối hợp",
    description:
      "Theo dõi diễn biến xử lý, trao đổi thông tin và chuyển tiếp công việc khi cần.",
  },
  {
    number: "03",
    title: "Hoàn thành và tổng hợp",
    description:
      "Cập nhật kết quả, lưu lại lịch sử và tổng hợp tình hình thực hiện thuận tiện.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900">
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-900 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-36 -top-52 h-[34rem] w-[34rem] rounded-full border border-white/10" />
          <div className="absolute -right-12 -top-28 h-[27rem] w-[27rem] rounded-full border border-white/10" />
          <div className="absolute -bottom-64 left-[34%] h-[34rem] w-[34rem] rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="absolute left-0 top-1/3 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        </div>

        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <Building2 className="h-6 w-6 text-cyan-200" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-wide sm:text-base">
                UBND Phường Tân Khai
              </span>
              <span className="mt-0.5 block text-xs text-blue-100">
                Hệ thống quản lý công việc
              </span>
            </span>
          </Link>

          <nav aria-label="Điều hướng chính" className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dang-nhap"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10 sm:px-4"
            >
              Đăng nhập
            </Link>
            <Link
              href="/dang-ky"
              className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-900 shadow-sm transition hover:bg-blue-50 sm:px-4"
            >
              Đăng ký
            </Link>
          </nav>
        </header>

        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-12 lg:pb-28 lg:pt-20">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-blue-50 backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-cyan-300" aria-hidden="true" />
              Một nền tảng, xuyên suốt quy trình công việc
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-[3.5rem]">
              Quản lý công việc
              <span className="mt-1 block text-cyan-300">
                hiệu quả và minh bạch
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-blue-100 sm:text-lg sm:leading-8">
              Tập trung nhiệm vụ, hồ sơ và tiến độ trên một hệ thống thống
              nhất. Mỗi công việc rõ người phụ trách, rõ thời hạn, rõ kết quả
              — giúp phối hợp chủ động và điều hành minh bạch hơn.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dang-nhap"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Truy cập hệ thống
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-blue-100">
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                Theo dõi tập trung
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                Phối hợp rõ trách nhiệm
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
            <div className="absolute -inset-5 rounded-[2rem] bg-cyan-300/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white p-4 text-slate-900 shadow-2xl shadow-blue-950/30 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Tổng quan công việc</p>
                    <p className="mt-0.5 text-xs text-slate-500">Theo dõi tiến độ tập trung</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Đang cập nhật
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-blue-50/80 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-blue-800">
                    <ListChecks className="h-4 w-4" aria-hidden="true" />
                    Nhiệm vụ
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">Rõ người phụ trách</p>
                  <p className="mt-1 text-xs text-slate-500">Phân công theo đơn vị</p>
                </div>
                <div className="rounded-xl bg-cyan-50/80 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-cyan-800">
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                    Tiến độ
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">Nắm bắt kịp thời</p>
                  <p className="mt-1 text-xs text-slate-500">Theo dõi từng trạng thái</p>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Các bước xử lý</p>
                  <span className="text-xs text-slate-400">Quy trình công việc</span>
                </div>
                <div className="space-y-3">
                  <TaskPreview
                    icon={<FileText className="h-4 w-4" aria-hidden="true" />}
                    title="Tiếp nhận và giao nhiệm vụ"
                    detail="Xác định nội dung, đơn vị và thời hạn"
                    status="Đã phân công"
                    statusClass="bg-blue-50 text-blue-700"
                  />
                  <TaskPreview
                    icon={<Clock3 className="h-4 w-4" aria-hidden="true" />}
                    title="Theo dõi quá trình xử lý"
                    detail="Cập nhật trạng thái và phối hợp"
                    status="Đang thực hiện"
                    statusClass="bg-amber-50 text-amber-700"
                  />
                  <TaskPreview
                    icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                    title="Tổng hợp kết quả"
                    detail="Lưu lịch sử và báo cáo tiến độ"
                    status="Minh bạch"
                    statusClass="bg-emerald-50 text-emerald-700"
                  />
                </div>
              </div>
              <p className="mt-4 text-center text-[11px] text-slate-400">
                Minh họa quy trình quản lý công việc
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-center text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© 2026 UBND Phường Tân Khai. Hệ thống quản lý công việc.</p>
          <p>Quản lý tập trung · Phối hợp minh bạch · Theo dõi hiệu quả</p>
        </div>
      </footer>
    </main>
  );
}

function TaskPreview({
  icon,
  title,
  detail,
  status,
  statusClass,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  status: string;
  statusClass: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-slate-50 text-blue-700">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-800 sm:text-sm">{title}</p>
        <p className="mt-1 truncate text-[11px] text-slate-500 sm:text-xs">{detail}</p>
      </div>
      <span className={`hidden flex-none rounded-full px-2.5 py-1 text-[10px] font-semibold sm:inline-flex ${statusClass}`}>
        {status}
      </span>
    </div>
  );
}
