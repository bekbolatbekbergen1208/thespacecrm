import { updateCompanySubscription } from "@/app/admin/actions";
import { Card, EmptyState } from "@/components/app/app-shell";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { Building2, Search } from "lucide-react";
import { StatusBadge } from "../page";

type CompanyRow = {
  id: string;
  name: string;
  business_type: string;
  country: string;
  phone: string | null;
  plan: string;
  subscription_status?: string | null;
  subscription_due_date?: string | null;
  monthly_fee?: number | null;
  invite_code: string;
  created_at: string;
};

export default async function AdminCompaniesPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string; saved?: string }> }) {
  const [{ supabase }, params] = await Promise.all([requirePlatformAdmin(), searchParams]);
  const q = (params.q ?? "").toLowerCase();
  const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
  const companies = ((data ?? []) as CompanyRow[]).filter((company) => {
    if (!q) return true;
    return [company.name, company.business_type, company.country, company.invite_code].some((item) => String(item ?? "").toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
              <Building2 className="h-3.5 w-3.5" />
              Companies
            </p>
            <h2 className="mt-3 text-3xl font-black text-white">Управление компаниями</h2>
            <p className="mt-2 text-sm text-slate-400">Контроль подписок, блокировок, тарифов и доступа компаний.</p>
          </div>
          <form className="relative w-full lg:w-96">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input name="q" defaultValue={params.q ?? ""} placeholder="Поиск компании, сферы, invite code" className="premium-input h-12 w-full pl-11 pr-4 text-sm text-white outline-none" />
          </form>
        </div>
        {params.error && <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{params.error}</p>}
        {params.saved && <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">Сохранено</p>}
        {error && <p className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">{error.message}</p>}
      </Card>

      <Card>
        {!companies.length ? (
          <EmptyState text="Компании не найдены." />
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-white/10">
            <table className="min-w-[1100px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-950/90 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Компания</th>
                  <th className="px-4 py-3">Сфера</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Тариф</th>
                  <th className="px-4 py-3">Invite</th>
                  <th className="px-4 py-3">Управление</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-t border-white/10 align-top text-slate-200 hover:bg-white/[0.04]">
                    <td className="px-4 py-4">
                      <p className="font-black text-white">{company.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{company.country} · {company.phone ?? "без телефона"}</p>
                    </td>
                    <td className="px-4 py-4">{company.business_type}</td>
                    <td className="px-4 py-4"><StatusBadge status={company.subscription_status ?? "trial"} /></td>
                    <td className="px-4 py-4">
                      <p>{company.plan}</p>
                      <p className="mt-1 text-xs text-slate-500">{Number(company.monthly_fee ?? 0).toLocaleString("ru-RU")} ₸ / месяц</p>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs">{company.invite_code}</td>
                    <td className="px-4 py-4">
                      <form action={updateCompanySubscription} className="grid min-w-[460px] gap-2 rounded-2xl border border-white/10 bg-slate-950/35 p-3 md:grid-cols-4">
                        <input type="hidden" name="companyId" value={company.id} />
                        <select name="subscriptionStatus" defaultValue={company.subscription_status ?? "trial" } className="premium-input h-10 px-3 text-xs text-white">
                          <option value="trial">trial</option>
                          <option value="active">active</option>
                          <option value="past_due">past_due</option>
                          <option value="blocked">blocked</option>
                        </select>
                        <input name="subscriptionDueDate" type="date" defaultValue={company.subscription_due_date ?? ""} className="premium-input h-10 px-3 text-xs text-white" />
                        <input name="monthlyFee" type="number" min="0" defaultValue={Number(company.monthly_fee ?? 0)} className="premium-input h-10 px-3 text-xs text-white" />
                        <button className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950">Сохранить</button>
                      </form>
                    </td>
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
