import { Card, EmptyState } from "@/components/app/app-shell";
import { PlatformRevenueChart } from "@/components/admin/platform-revenue-chart";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { BarChart3, Download } from "lucide-react";

type CompanyRow = {
  id: string;
  name: string;
  business_type: string;
  subscription_status?: string | null;
  subscription_due_date?: string | null;
  monthly_fee?: number | null;
};

type PaymentRow = {
  id: string;
  company_id: string;
  amount: number;
  paid_at: string;
};

function money(value: number) {
  return new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT", maximumFractionDigits: 0 }).format(value);
}

function monthKey(date: string) {
  return new Date(date).toLocaleDateString("ru-RU", { month: "short" });
}

function csvHref(rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

export default async function AdminReportsPage() {
  const { supabase } = await requirePlatformAdmin();
  const [{ data: companies }, { data: payments }] = await Promise.all([
    supabase.from("companies").select("*").order("created_at", { ascending: false }),
    supabase.from("platform_subscription_payments").select("*").order("paid_at", { ascending: false }).limit(1000),
  ]);

  const companyRows = (companies ?? []) as CompanyRow[];
  const paymentRows = (payments ?? []) as PaymentRow[];
  const revenue = paymentRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const mrr = companyRows.reduce((sum, row) => sum + Number(row.monthly_fee ?? 0), 0);
  const industryRows = Object.entries(companyRows.reduce<Record<string, number>>((acc, company) => {
    acc[company.business_type] = (acc[company.business_type] ?? 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const statusRows = Object.entries(companyRows.reduce<Record<string, number>>((acc, company) => {
    const status = company.subscription_status ?? "trial";
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {}));
  const chartData = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const month = monthKey(date.toISOString());
    return {
      month,
      revenue: paymentRows.filter((payment) => monthKey(payment.paid_at) === month).reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0),
      companies: companyRows.length,
    };
  });
  const exportRows = [
    ["company", "business_type", "status", "due_date", "monthly_fee"],
    ...companyRows.map((company) => [
      company.name,
      company.business_type,
      company.subscription_status ?? "trial",
      company.subscription_due_date ?? "",
      String(company.monthly_fee ?? 0),
    ]),
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
              <BarChart3 className="h-3.5 w-3.5" />
              Reports
            </p>
            <h2 className="mt-3 text-3xl font-black text-white">Отчёты платформы</h2>
            <p className="mt-2 text-sm text-slate-400">Финансы, подписки, отрасли и контроль риска просрочки.</p>
          </div>
          <a href={csvHref(exportRows)} download="crm-space-platform-report.csv" className="premium-button bg-white px-5 py-3 text-sm text-slate-950">
            <Download className="h-4 w-4" />
            CSV
          </a>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        <ReportMetric label="Всего выручка" value={money(revenue)} />
        <ReportMetric label="MRR план" value={money(mrr)} />
        <ReportMetric label="Компаний" value={String(companyRows.length)} />
      </section>

      <Card>
        <h3 className="mb-4 text-xl font-black text-white">Динамика оплат</h3>
        <PlatformRevenueChart data={chartData} />
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-xl font-black text-white">Сферы бизнеса</h3>
          {!industryRows.length ? <EmptyState text="Данных пока нет." /> : (
            <div className="grid gap-3">
              {industryRows.map(([industry, count]) => (
                <div key={industry} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                  <span className="font-bold text-slate-200">{industry}</span>
                  <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 text-xl font-black text-white">Статусы подписок</h3>
          <div className="grid gap-3">
            {statusRows.map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                <span className="font-bold text-slate-200">{status}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </Card>
  );
}
