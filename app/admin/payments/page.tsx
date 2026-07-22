import { recordPlatformPayment } from "@/app/admin/actions";
import { Card, EmptyState } from "@/components/app/app-shell";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { CreditCard } from "lucide-react";

type CompanyRow = { id: string; name: string; business_type: string };
type PaymentRow = {
  id: string;
  company_id: string;
  amount: number;
  paid_at: string;
  period_start: string | null;
  period_end: string | null;
  method: string;
  notes: string | null;
  created_at: string;
};

function money(value: number) {
  return new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT", maximumFractionDigits: 0 }).format(value);
}

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const [{ supabase }, params] = await Promise.all([requirePlatformAdmin(), searchParams]);
  const [{ data: companies }, { data: payments, error }] = await Promise.all([
    supabase.from("companies").select("id, name, business_type").order("name"),
    supabase.from("platform_subscription_payments").select("*").order("paid_at", { ascending: false }).limit(500),
  ]);

  const companyRows = (companies ?? []) as CompanyRow[];
  const paymentRows = (payments ?? []) as PaymentRow[];
  const companyName = new Map(companyRows.map((company) => [company.id, company.name]));

  return (
    <div className="space-y-6">
      <Card>
        <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
          <CreditCard className="h-3.5 w-3.5" />
          Billing
        </p>
        <h2 className="mt-3 text-3xl font-black text-white">Оплаты компаний</h2>
        <p className="mt-2 text-sm text-slate-400">Записывайте оплату SaaS абонемента и автоматически активируйте компанию.</p>
        {params.error && <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{params.error}</p>}
        {params.saved && <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">Оплата записана</p>}
        {error && <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">{error.message}</p>}
      </Card>

      <Card>
        <h3 className="text-xl font-black text-white">Новая оплата</h3>
        <form action={recordPlatformPayment} className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <label className="md:col-span-2">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Компания</span>
            <select name="companyId" required className="premium-input h-12 w-full px-4 text-sm text-white">
              <option value="">Выберите компанию</option>
              {companyRows.map((company) => <option key={company.id} value={company.id}>{company.name} · {company.business_type}</option>)}
            </select>
          </label>
          <AdminField label="Сумма" name="amount" type="number" />
          <AdminField label="Дата оплаты" name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          <AdminField label="Период с" name="periodStart" type="date" required={false} />
          <AdminField label="Период до" name="periodEnd" type="date" required={false} />
          <AdminField label="Метод" name="method" defaultValue="manual" required={false} />
          <label className="md:col-span-2 xl:col-span-4">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Заметки</span>
            <input name="notes" className="premium-input h-12 w-full px-4 text-sm text-white" placeholder="Kaspi, наличные, комментарий..." />
          </label>
          <div className="flex items-end">
            <button className="premium-button h-12 w-full bg-white px-5 text-sm text-slate-950">Записать оплату</button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="mb-4 text-xl font-black text-white">История оплат</h3>
        {!paymentRows.length ? (
          <EmptyState text="Платежей пока нет." />
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/90 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Компания</th>
                  <th className="px-4 py-3">Сумма</th>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Период</th>
                  <th className="px-4 py-3">Метод</th>
                  <th className="px-4 py-3">Заметки</th>
                </tr>
              </thead>
              <tbody>
                {paymentRows.map((payment) => (
                  <tr key={payment.id} className="border-t border-white/10 text-slate-200 hover:bg-white/[0.04]">
                    <td className="px-4 py-3 font-black text-white">{companyName.get(payment.company_id) ?? payment.company_id}</td>
                    <td className="px-4 py-3">{money(Number(payment.amount ?? 0))}</td>
                    <td className="px-4 py-3">{payment.paid_at}</td>
                    <td className="px-4 py-3">{payment.period_start ?? "-"} / {payment.period_end ?? "-"}</td>
                    <td className="px-4 py-3">{payment.method}</td>
                    <td className="px-4 py-3">{payment.notes ?? "-"}</td>
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

function AdminField({ label, name, type = "text", defaultValue = "", required = true }: { label: string; name: string; type?: string; defaultValue?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} required={required} className="premium-input h-12 w-full px-4 text-sm text-white" />
    </label>
  );
}
