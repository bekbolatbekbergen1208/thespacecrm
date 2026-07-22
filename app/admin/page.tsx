import Link from "next/link";
import { Card, EmptyState } from "@/components/app/app-shell";
import { PlatformRevenueChart } from "@/components/admin/platform-revenue-chart";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { AlertTriangle, Building2, CreditCard, ShieldAlert, UsersRound } from "lucide-react";

type CompanyRow = {
  id: string;
  name: string;
  business_type: string;
  plan: string;
  subscription_status?: string | null;
  subscription_due_date?: string | null;
  monthly_fee?: number | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  company_id: string;
  amount: number;
  paid_at: string;
  created_at: string;
};

function money(value: number) {
  return new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT", maximumFractionDigits: 0 }).format(value);
}

function monthKey(date: string) {
  return new Date(date).toLocaleDateString("ru-RU", { month: "short" });
}

export default async function SuperAdminPage() {
  const { supabase } = await requirePlatformAdmin();
  const [{ data: companies, error: companiesError }, { data: payments }, { count: membersCount }] = await Promise.all([
    supabase.from("companies").select("*").order("created_at", { ascending: false }),
    supabase.from("platform_subscription_payments").select("*").order("paid_at", { ascending: false }).limit(500),
    supabase.from("company_members").select("id", { count: "exact", head: true }),
  ]);

  if (companiesError) {
    return <AdminSchemaWarning message={companiesError.message} />;
  }

  const companyRows = (companies ?? []) as CompanyRow[];
  const paymentRows = (payments ?? []) as PaymentRow[];
  const revenue = paymentRows.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const activeCompanies = companyRows.filter((company) => (company.subscription_status ?? "trial") === "active").length;
  const blockedCompanies = companyRows.filter((company) => company.subscription_status === "blocked").length;
  const monthlyRecurring = companyRows.reduce((sum, company) => sum + Number(company.monthly_fee ?? 0), 0);
  const chartData = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const month = monthKey(date.toISOString());
    const revenueForMonth = paymentRows
      .filter((payment) => monthKey(payment.paid_at) === month)
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
    return { month, revenue: revenueForMonth, companies: companyRows.length };
  });

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Building2 className="h-5 w-5" />} label="Компании" value={String(companyRows.length)} note={`${activeCompanies} active`} />
        <Metric icon={<CreditCard className="h-5 w-5" />} label="Выручка" value={money(revenue)} note={`${money(monthlyRecurring)} MRR план`} />
        <Metric icon={<UsersRound className="h-5 w-5" />} label="Пользователи" value={String(membersCount ?? 0)} note="по всем workspace" />
        <Metric icon={<ShieldAlert className="h-5 w-5" />} label="Блокировки" value={String(blockedCompanies)} note="subscription blocked" tone={blockedCompanies ? "red" : "cyan"} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Revenue</p>
              <h2 className="mt-1 text-xl font-black text-white">Платежи SaaS за 6 месяцев</h2>
            </div>
            <Link href="/admin/payments" className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-950">Payments</Link>
          </div>
          <PlatformRevenueChart data={chartData} />
        </Card>

        <Card>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Health</p>
          <h2 className="mt-1 text-xl font-black text-white">Статус платформы</h2>
          <div className="mt-5 grid gap-3">
            {[
              ["Trial", companyRows.filter((company) => (company.subscription_status ?? "trial") === "trial").length],
              ["Past due", companyRows.filter((company) => company.subscription_status === "past_due").length],
              ["Blocked", blockedCompanies],
            ].map(([label, count]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                <span className="text-sm font-bold text-slate-300">{label}</span>
                <span className="text-lg font-black text-white">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">Companies</p>
            <h2 className="mt-1 text-xl font-black text-white">Последние workspace</h2>
          </div>
          <Link href="/admin/companies" className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100">Открыть все</Link>
        </div>
        {!companyRows.length ? (
          <EmptyState text="Компаний пока нет." />
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Компания</th>
                  <th className="px-4 py-3">Сфера</th>
                  <th className="px-4 py-3">План</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Оплата до</th>
                </tr>
              </thead>
              <tbody>
                {companyRows.slice(0, 8).map((company) => (
                  <tr key={company.id} className="border-t border-white/10 text-slate-200 hover:bg-white/[0.04]">
                    <td className="px-4 py-3 font-black text-white">{company.name}</td>
                    <td className="px-4 py-3">{company.business_type}</td>
                    <td className="px-4 py-3">{company.plan}</td>
                    <td className="px-4 py-3"><StatusBadge status={company.subscription_status ?? "trial"} /></td>
                    <td className="px-4 py-3">{company.subscription_due_date ?? "Не указано"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Metric({ icon, label, value, note, tone = "cyan" }: { icon: React.ReactNode; label: string; value: string; note: string; tone?: "cyan" | "red" }) {
  return (
    <Card className={tone === "red" ? "border-red-300/20 bg-red-500/[0.06]" : ""}>
      <div className={`grid h-11 w-11 place-items-center rounded-2xl border ${tone === "red" ? "border-red-300/20 bg-red-500/10 text-red-100" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"}`}>
        {icon}
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-400">{note}</p>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    trial: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    past_due: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    blocked: "border-red-300/25 bg-red-500/10 text-red-100",
  };
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${styles[status] ?? styles.trial}`}>{status}</span>;
}

function AdminSchemaWarning({ message }: { message: string }) {
  return (
    <Card className="border-amber-300/25 bg-amber-300/[0.06]">
      <AlertTriangle className="h-8 w-8 text-amber-100" />
      <h2 className="mt-4 text-2xl font-black text-white">Нужно запустить Super Admin SQL</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-50/80">
        Откройте Supabase SQL Editor и выполните файл <b>supabase/platform-admin.sql</b>. После этого таблицы, статусы подписок и RLS политики появятся в schema cache.
      </p>
      <code className="mt-4 block rounded-2xl bg-slate-950/70 px-4 py-3 text-xs text-amber-100">{message}</code>
    </Card>
  );
}
