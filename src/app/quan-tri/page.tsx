import Link from "next/link";
import type { Metadata } from "next";
import { Activity, ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, FileText, MoreHorizontal, Plus, Target, TrendingUp, UsersRound, AlertTriangle
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";

export const metadata: Metadata = {
  title: "Bảng điều khiển",
};

const stats: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone: string;
  change?: string;
}[] = [
  {
    label: "Tổng nhiệm vụ",
    value: "248",
    note: "So với tháng trước",
    icon: FileText,
    tone: "blue",
    change: "+12,8%",
  },
  {
    label: "Đang thực hiện",
    value: "36",
    note: "Trên 12 phòng ban",
    icon: Activity,
    tone: "violet",
  },
  {
    label: "Hoàn thành đúng hạn",
    value: "182",
    note: "Tỷ lệ hoàn thành",
    icon: CheckCircle2,
    tone: "emerald",
    change: "73,4%",
  },
  {
    label: "Sắp đến hạn",
    value: "18",
    note: "Trong 7 ngày tới",
    icon: Clock3,
    tone: "amber",
  },
  {
    label: "Quá hạn",
    value: "12",
    note: "Cần được xử lý",
    icon: AlertTriangle,
    tone: "rose",
  },
];

const tasks = [
  {
    title: "Hoàn thiện kế hoạch chuyển đổi số quý IV",
    code: "CV-2026-084",
    department: "Phòng Công nghệ thông tin",
    owner: "Nguyễn Minh Anh",
    initials: "MA",
    due: "12 Th10, 2026",
    progress: 72,
    priority: "Cao",
    priorityTone: "rose",
    avatarTone: "blue",
  },
  {
    title: "Rà soát và chuẩn hóa quy trình nội bộ",
    code: "CV-2026-079",
    department: "Phòng Hành chính",
    owner: "Trần Hoàng Nam",
    initials: "HN",
    due: "14 Th10, 2026",
    progress: 48,
    priority: "Trung bình",
    priorityTone: "amber",
    avatarTone: "violet",
  },
  {
    title: "Báo cáo tổng kết hoạt động 6 tháng đầu năm",
    code: "CV-2026-071",
    department: "Phòng Kế hoạch - Tài chính",
    owner: "Lê Thu Hà",
    initials: "TH",
    due: "16 Th10, 2026",
    progress: 85,
    priority: "Cao",
    priorityTone: "rose",
    avatarTone: "emerald",
  },
  {
    title: "Tổ chức tập huấn nghiệp vụ cho cán bộ",
    code: "CV-2026-066",
    department: "Phòng Tổ chức cán bộ",
    owner: "Phạm Quốc Bảo",
    initials: "QB",
    due: "18 Th10, 2026",
    progress: 30,
    priority: "Thấp",
    priorityTone: "slate",
    avatarTone: "amber",
  },
];

const activities = [
  {
    initials: "MA",
    name: "Nguyễn Minh Anh",
    action: "đã cập nhật tiến độ nhiệm vụ",
    subject: "Kế hoạch chuyển đổi số quý IV",
    time: "10 phút trước",
    tone: "blue",
  },
  {
    initials: "TH",
    name: "Lê Thu Hà",
    action: "đã hoàn thành nhiệm vụ",
    subject: "Tổng hợp báo cáo tháng 9",
    time: "35 phút trước",
    tone: "emerald",
  },
  {
    initials: "HN",
    name: "Trần Hoàng Nam",
    action: "đã gửi nhiệm vụ để phê duyệt",
    subject: "Rà soát quy trình nội bộ",
    time: "1 giờ trước",
    tone: "violet",
  },
];

const chartValues = [42, 58, 49, 76, 63, 88, 70];

const iconToneClasses: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
};

const avatarToneClasses: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  violet: "bg-violet-100 text-violet-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
};

function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function ProgressRing() {
  const circumference = 2 * Math.PI * 42;
  const progress = (73.4 / 100) * circumference;

  return (
    <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="9"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="#2563eb"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold tracking-tight text-slate-900">73,4%</p>
        <p className="mt-0.5 text-[11px] text-slate-500">Hoàn thành</p>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminLayout
      title="Bảng điều khiển"
      description="Tổng quan tình hình công việc trên toàn hệ thống."
    >
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#0e3060] via-[#164785] to-[#2364ae] p-6 text-white shadow-sm sm:flex-row sm:items-center sm:px-8 sm:py-7">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-100">
              <CalendarDays className="h-4 w-4" />
              <span>TỔNG QUAN HOẠT ĐỘNG</span>
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Xin chào, Quản trị viên
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
              Chúc bạn một ngày làm việc hiệu quả!
            </p>
          </div>
          <Link
            href="/quan-tri/cong-viec/nhiem-vu"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-blue-800 shadow-sm transition hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" />
            Tạo nhiệm vụ mới
          </Link>
        </section>

        <section
          aria-label="Các chỉ số tổng quan"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <article
                key={stat.label}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconToneClasses[stat.tone]}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {stat.change && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                        stat.tone === "emerald"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {stat.tone === "emerald" ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <TrendingUp className="h-3 w-3" />
                      )}
                      {stat.change}
                    </span>
                  )}
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <p className="text-3xl font-bold tracking-tight text-slate-900">
                    {stat.value}
                  </p>
                  <p className="pb-1 text-right text-xs text-slate-400">
                    {stat.note}
                  </p>
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
          <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <SectionHeading
                title="Nhiệm vụ đang triển khai"
              />
              <Link
                href="/quan-tri/cong-viec/nhiem-vu"
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                Xem tất cả <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <div
                  key={task.code}
                  className="px-5 py-4 transition hover:bg-slate-50/70 sm:px-6"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {task.code}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            task.priorityTone === "rose"
                              ? "bg-rose-50 text-rose-700"
                              : task.priorityTone === "amber"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          Ưu tiên {task.priority.toLowerCase()}
                        </span>
                      </div>
                      <h3 className="mt-1.5 truncate text-sm font-semibold text-slate-800">
                        {task.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {task.department}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-5 sm:justify-end">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${avatarToneClasses[task.avatarTone]}`}
                        >
                          {task.initials}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            {task.owner}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                            <CalendarDays className="h-3 w-3" />
                            Hạn {task.due}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Tùy chọn nhiệm vụ ${task.code}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="w-9 text-right text-xs font-semibold text-slate-600">
                      {task.progress}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              title="Tổng quan tiến độ"
              subtitle="Tình trạng nhiệm vụ toàn hệ thống"
              action={
                <button
                  type="button"
                  aria-label="Tùy chọn tổng quan tiến độ"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              }
            />
            <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
              <ProgressRing />
              <div className="w-full space-y-4 sm:w-auto">
                {[
                  ["Đã hoàn thành", "182", "bg-blue-600"],
                  ["Đang thực hiện", "36", "bg-violet-500"],
                  ["Chưa bắt đầu", "18", "bg-slate-300"],
                  ["Quá hạn", "12", "bg-rose-500"],
                ].map(([label, value, color]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-8 text-sm"
                  >
                    <span className="flex items-center gap-2.5 text-slate-600">
                      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                      {label}
                    </span>
                    <span className="font-semibold text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 rounded-xl bg-blue-50/80 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2 text-blue-700 shadow-sm">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Tiến độ rất tốt!
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Tỷ lệ hoàn thành tăng 8,2% so với tháng trước.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
          <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              title="Hiệu suất công việc"
              subtitle="Số nhiệm vụ được xử lý trong 7 ngày gần nhất"
              action={
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  7 ngày qua
                </button>
              }
            />
            <div className="mt-7 flex h-48 items-end justify-between gap-3 border-b border-l border-slate-100 px-3 pb-2 sm:gap-6 sm:px-6">
              {chartValues.map((value, index) => (
                <div
                  key={index}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-[10px] font-medium text-slate-400">
                    {value}
                  </span>
                  <div className="flex h-[82%] w-full items-end">
                    <div
                      className={`w-full rounded-t-md transition-colors ${
                        index === chartValues.length - 1
                          ? "bg-blue-600"
                          : "bg-blue-100 hover:bg-blue-200"
                      }`}
                      style={{ height: `${value}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {["T2", "T3", "T4", "T5", "T6", "T7", "CN"][index]}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
              Nhiệm vụ hoàn thành
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              title="Người dùng hệ thống"
              subtitle="Thống kê tài khoản đang hoạt động"
            />
            <div className="mt-6 flex items-center gap-4 rounded-xl bg-slate-50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <UsersRound className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-slate-900">
                  86
                </p>
                <p className="text-xs text-slate-500">Tổng số người dùng</p>
              </div>
              <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                82 hoạt động
              </span>
            </div>
            <div className="mt-5 space-y-4">
              {[
                ["Quản trị viên", 8, 9, "bg-blue-600"],
                ["Cán bộ, nhân viên", 64, 74, "bg-violet-500"],
                ["Lãnh đạo", 14, 17, "bg-emerald-500"],
              ].map(([label, count, percent, color]) => (
                <div key={label}>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">{label}</span>
                    <span className="text-slate-500">
                      <strong className="text-slate-800">{count}</strong> người
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/quan-tri/nguoi-dung"
              className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              Quản lý người dùng <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </section>
      </div>
    </AdminLayout>
  );
}