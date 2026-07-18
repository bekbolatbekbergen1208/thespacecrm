import Link from "next/link";
import { updatePlatformCompanyBilling } from "@/app/actions";
import { BrandLogo } from "@/components/app/brand-logo";
import { Field, Select, SmallButton, Textarea } from "@/components/app/forms";
import { requirePlatformAdmin } from "@/lib/auth";
import { BarChart3, Building2, CheckCircle2, Lock, WalletCards } from "lucide-react";

type AdminCompanyRow = {
  id: string;
  name: string;
  business_type: string;
  country: string;
  phone: string | null;
  plan: string;
  subscription_status: "trial" | "active" | "past_due" | "blocked";
  subscription_due_date: string;
  monthly_fee: number;
  blocked_at: string | null;
  last_paid_at: string | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  company_id: string;
  amount: number;
  paid_at: string;
  method: string;
  notes: string | null;
  companies?: { name?: string | null } | null;
};

export default async function PlatformAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const [{ supabase, admin }, params] = await Promise.all([requirePlatformAdmin(), searchParams]);
  const today = new Date().toISOString().slice(0, 10);
  const nextMonth = addDaysIso(today, 30);

  const [{ data: companies }, { data: payments }] = await Promise.all([
    supabase
      .from("companies")
      .select("id,name,business_type,country,phone,plan,subscription_status,subscription_due_date,monthly_fee,blocked_at,last_paid_at,created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("platform_subscription_payments")
      .select("id,company_id,amount,paid_at,method,notes,companies(name)")
      .order("paid_at", { ascending: false })
      .limit(200),
  ]);

  const companyRows = (companies ?? []) as AdminCompanyRow[];
  const paymentRows = (payments ?? []) as unknown as PaymentRow[];
  const blockedCompanies = companyRows.filter((company) => isBlocked(company, today));
  const dueSoonCompanies = companyRows.filter((company) => !isBlocked(company, today) && company.subscription_due_date <= addDaysIso(today, 7));
  const monthlyRevenue = paymentRows
    .filter((payment) => payment.paid_at >= today.slice(0, 8) + "01")
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const expectedMonthly = companyRows.reduce((sum, company) => sum + Number(company.monthly_fee ?? 0), 0);

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(103,232,249,0.12),transparent_34rem)]" />
      <section className="relative mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-2xl lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-12 w-12" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">Platform Admin</p>
              <h1 className="text-3xl font-black">Управление CRM.Space</h1>
              <p className="mt-1 text-sm text-slate-400">Все бизнесы, абонементы, блокировки и отчёты платформы.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">{admin.email}</span>
            <Link href="/dashboard" className="premium-button h-10 border border-white/10 bg-white/[0.05] px-4 text-sm text-slate-100">В dashboard</Link>
          </div>
        </header>

        {params.error && <p className="mb-4 rounded-2xl border border-red-300/30 bg-red-500/10 p-3 text-sm font-semibold text-red-100">{params.error}</p>}
        {params.saved === "billing" && <p className="mb-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Абонемент обновлён.</p>}

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetric title="Компании" value={companyRows.length} note="все workspace" icon={<Building2 className="h-4 w-4" />} />
          <AdminMetric title="Заблокировано" value={blockedCompanies.length} note="нет доступа к dashboard" icon={<Lock className="h-4 w-4" />} danger={blockedCompanies.length > 0} />
          <AdminMetric title="Оплаты за месяц" value={`${monthlyRevenue.toLocaleString()} ₸`} note="факт" icon={<WalletCards className="h-4 w-4" />} />
          <AdminMetric title="Плановый MRR" value={`${expectedMonthly.toLocaleString()} ₸`} note="по тарифам компаний" icon={<BarChart3 className="h-4 w-4" />} />
        </div>

        <div className="mb-6 rounded-[2rem] border border-yellow-300/20 bg-yellow-300/10 p-5">
          <h2 className="text-xl font-black text-white">Контроль оплаты</h2>
          <p className="mt-1 text-sm text-yellow-50/80">
            Если компания не оплатила, поставьте статус `blocked`. После оплаты поставьте `active`, дату окончания и сумму платежа.
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {blockedCompanies.slice(0, 6).map((company) => (
              <div key={company.id} className="rounded-2xl border border-red-300/20 bg-red-500/10 p-3">
                <p className="font-black text-red-50">{company.name}</p>
                <p className="mt-1 text-xs text-red-100/80">{company.business_type} · до {company.subscription_due_date}</p>
              </div>
            ))}
            {!blockedCompanies.length && <p className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm font-semibold text-emerald-100">Заблокированных компаний нет.</p>}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Компании</h2>
                <p className="text-sm text-slate-400">Управление оплатой и блокировкой каждого бизнеса.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">{dueSoonCompanies.length} скоро оплатить</span>
            </div>
            <div className="grid gap-4">
              {companyRows.map((company) => (
                <details key={company.id} className={`group rounded-3xl border p-4 ${isBlocked(company, today) ? "border-red-300/25 bg-red-500/10" : "border-white/10 bg-slate-950/35"}`}>
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-black text-white">{company.name}</p>
                        <p className="mt-1 text-xs text-slate-400">{company.business_type} · {company.country} · {company.phone ?? "телефон не указан"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill company={company} today={today} />
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black text-slate-200">{Number(company.monthly_fee ?? 0).toLocaleString()} ₸/мес</span>
                      </div>
                    </div>
                  </summary>
                  <form action={updatePlatformCompanyBilling} className="mt-4 grid gap-4 border-t border-white/10 pt-4 md:grid-cols-2 xl:grid-cols-3">
                    <input type="hidden" name="companyId" value={company.id} />
                    <Field label="Тариф" name="plan" defaultValue={company.plan || "Monthly"} />
                    <Field label="Цена в месяц" name="monthlyFee" type="number" defaultValue={company.monthly_fee || 0} />
                    <Field label="Оплачено до" name="subscriptionDueDate" type="date" defaultValue={company.subscription_due_date || nextMonth} />
                    <Select label="Статус" name="subscriptionStatus" defaultValue={company.subscription_status || "trial"}>
                      <option value="trial">Trial</option>
                      <option value="active">Active</option>
                      <option value="past_due">Past due</option>
                      <option value="blocked">Blocked</option>
                    </Select>
                    <Field label="Сумма оплаты" name="paymentAmount" type="number" defaultValue={0} required={false} />
                    <Select label="Метод оплаты" name="paymentMethod" defaultValue="manual">
                      <option value="manual">Manual</option>
                      <option value="kaspi">Kaspi</option>
                      <option value="cash">Наличные</option>
                      <option value="bank">Банк</option>
                    </Select>
                    <div className="md:col-span-2 xl:col-span-3">
                      <Textarea label="Комментарий" name="notes" />
                    </div>
                    <div className="md:col-span-2 xl:col-span-3">
                      <SmallButton>Сохранить абонемент</SmallButton>
                    </div>
                  </form>
                </details>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5">
            <h2 className="text-xl font-black">Последние оплаты</h2>
            <div className="mt-4 grid gap-3">
              {!paymentRows.length && <p className="rounded-2xl bg-slate-950/35 p-3 text-sm text-slate-400">Оплат пока нет.</p>}
              {paymentRows.slice(0, 12).map((payment) => (
                <div key={payment.id} className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">{payment.companies?.name ?? "Компания"}</p>
                      <p className="mt-1 text-xs text-slate-500">{payment.paid_at} · {payment.method}</p>
                    </div>
                    <span className="rounded-full bg-emerald-300 px-3 py-1 text-xs font-black text-emerald-950">{Number(payment.amount ?? 0).toLocaleString()} ₸</span>
                  </div>
                  {payment.notes && <p className="mt-2 text-xs text-slate-400">{payment.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function AdminMetric({ title, value, note, icon, danger = false }: { title: string; value: string | number; note: string; icon: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`rounded-[2rem] border p-5 ${danger ? "border-red-300/20 bg-red-500/10" : "border-white/10 bg-white/[0.055]"}`}>
      <span className={`grid h-10 w-10 place-items-center rounded-2xl ${danger ? "bg-red-500/15 text-red-100" : "bg-cyan-300/10 text-cyan-100"}`}>{icon}</span>
      <p className="mt-4 text-sm text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function StatusPill({ company, today }: { company: AdminCompanyRow; today: string }) {
  const blocked = isBlocked(company, today);
  const className = blocked ? "bg-red-500 text-white" : company.subscription_status === "active" ? "bg-emerald-300 text-emerald-950" : "bg-yellow-300 text-yellow-950";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${className}`}>
      {blocked ? <Lock className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      {blocked ? "Blocked" : company.subscription_status} · до {company.subscription_due_date}
    </span>
  );
}

function isBlocked(company: AdminCompanyRow, today: string) {
  return company.subscription_status === "blocked" || (company.subscription_status === "past_due" && company.subscription_due_date < today);
}

function addDaysIso(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
