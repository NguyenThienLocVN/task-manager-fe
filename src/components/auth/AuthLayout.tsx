import { ReactNode } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  ShieldCheck,
} from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export default function AuthLayout({
  children,
  title,
  description,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-800 lg:flex">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -left-24 top-20 h-72 w-72 rounded-full border border-white" />
            <div className="absolute left-40 top-64 h-96 w-96 rounded-full border border-white" />
            <div className="absolute bottom-[-160px] right-[-120px] h-[500px] w-[500px] rounded-full bg-cyan-400 blur-3xl" />
          </div>

          <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
            <div>
              <Link href="/" className="inline-flex items-center gap-3 text-white">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
                  <Building2 className="h-7 w-7" />
                </div>

                <div>
                  <div className="text-xl font-bold tracking-wide">
                    TASK MANAGEMENT
                  </div>
                  <div className="text-sm text-blue-100">
                    Hệ thống quản lý công việc
                  </div>
                </div>
              </Link>

              <div className="mt-24 max-w-xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-blue-50 ring-1 ring-white/15">
                  <ShieldCheck className="h-4 w-4" />
                  Hệ thống quản lý tập trung
                </div>

                <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
                  Quản lý công việc
                  <br />
                  <span className="text-cyan-300">hiệu quả và minh bạch</span>
                </h1>


                <div className="mt-10 grid gap-5">
                  <Feature
                    icon={<ClipboardCheck className="h-5 w-5" />}
                    title="Quản lý giao việc"
                    description="Giao nhiệm vụ theo cơ quan, phòng ban và chuyên viên."
                  />

                  <Feature
                    icon={<FileText className="h-5 w-5" />}
                    title="Theo dõi hồ sơ"
                    description="Quản lý tài liệu, tiến độ và lịch sử xử lý tập trung."
                  />

                  <Feature
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    title="Kiểm soát tiến độ"
                    description="Theo dõi trạng thái và đánh giá kết quả thực hiện."
                  />
                </div>
              </div>
            </div>

            <div className="text-xs text-blue-200">
              © 2026 Hệ thống quản lý công việc. All rights reserved.
            </div>
          </div>
        </div>

        {/* Right */}
        <main className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-[500px]">
            {/* Logo mobile */}
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white">
                <Building2 className="h-6 w-6" />
              </div>

              <div>
                <p className="font-bold text-slate-900">TASK MANAGEMENT</p>
                <p className="text-xs text-slate-500">
                  Hệ thống quản lý công việc
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                {title}
              </h2>

              {description && (
                <p className="mt-2 leading-6 text-slate-500">{description}</p>
              )}
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-white/10 text-cyan-300 ring-1 ring-white/10">
        {icon}
      </div>

      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="text-sm leading-6 text-blue-100">{description}</p>
      </div>
    </div>
  );
}