import { updateCompany } from "@/app/actions";
import { Card, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Field } from "@/components/app/auth-card";
import { Select, SmallButton } from "@/components/app/forms";
import { canAdmin, requireUser } from "@/lib/auth";
import { translateLiteral } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { BUSINESS_INDUSTRIES, normalizeIndustry } from "@/lib/industries";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ supabase, membership }, params, locale] = await Promise.all([requireUser(), searchParams, getServerLocale()]);
  const tt = (value: string) => translateLiteral(locale, value);
  const companyId = membership!.company_id;
  const company = Array.isArray(membership!.companies) ? membership!.companies[0] : membership!.companies;

  if (!canAdmin(membership!.role)) {
    return (
      <>
        <PageHeader title={tt("Settings")} description={tt("Only founders and admins can manage company settings.")} />
        <EmptyState text={tt("Your personal settings are available from Profile Settings.")} />
      </>
    );
  }

  const { data: members } = await supabase
    .from("company_members")
    .select("id, user_id, role, position, dashboard_route, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });
  const memberIds = members?.map((member) => member.user_id) ?? [];
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name, phone").in("id", memberIds)
    : { data: [] };

  return (
    <>
      <PageHeader title={tt("Settings")} description={tt("Company information, invite employees, plan details, and workspace members.")} />
      {params.error && <p className="mb-4 rounded-[8px] border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{params.error}</p>}
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <h2 className="text-xl font-bold">{tt("Company Information")}</h2>
          <form action={updateCompany} className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label={tt("Company Name")} name="companyName" defaultValue={company?.name ?? ""} />
            <Field label="URL логотипа компании" name="logoUrl" type="url" defaultValue={company?.logo_url ?? ""} required={false} />
            <Field label="Фраза компании" name="brandPhrase" defaultValue={company?.brand_phrase ?? ""} required={false} />
            <Select label={tt("Business Industry")} name="businessType" defaultValue={normalizeIndustry(company?.business_type)}>
              {BUSINESS_INDUSTRIES.map((industry) => (
                <option key={industry} value={industry}>{tt(industry)}</option>
              ))}
            </Select>
            <Field label={tt("Country")} name="country" defaultValue={company?.country ?? ""} />
            <Field label={tt("Phone Number")} name="phone" type="tel" defaultValue={company?.phone ?? ""} required={false} />
            <div className="md:col-span-2"><SmallButton>{tt("Save company")}</SmallButton></div>
          </form>
        </Card>
        <Card>
          <h2 className="text-xl font-bold">{tt("Invite Employees")}</h2>
          <p className="mt-4 text-sm text-slate-400">{tt("Share either value with employees during onboarding.")}</p>
          <p className="mt-5 text-xs text-slate-400">{tt("Company ID")}</p>
          <p className="mt-1 break-all rounded-[8px] bg-white/[0.045] px-3 py-2 font-mono text-xs text-slate-200">{companyId}</p>
          <p className="mt-4 text-xs text-slate-400">{tt("Invite Code")}</p>
          <p className="mt-1 rounded-[8px] bg-cyan-300/10 px-3 py-2 font-mono text-sm text-cyan-100">{company?.invite_code}</p>
          <div className="mt-5 rounded-[8px] border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-50">
            {tt("Plan:")} {tt(company?.plan ?? "Free")} {tt("includes up to 5 employees, up to 500 customers, basic analytics, customer management, and task management.")}
          </div>
        </Card>
      </div>
      <Card className="mt-5">
        <h2 className="text-xl font-bold">{tt("Company Members List")}</h2>
        <div className="mt-5 space-y-3">
          {!members?.length && <EmptyState text={tt("No members yet.")} />}
          {members?.map((member) => {
            const profile = profiles?.find((item) => item.id === member.user_id);
            return (
              <div key={member.id} className="grid gap-2 rounded-[8px] bg-slate-950/70 px-4 py-3 text-sm md:grid-cols-5">
                <p className="font-semibold text-white">{profile?.full_name ?? tt("Member")}</p>
                <p className="font-mono text-xs text-slate-400">{member.user_id}</p>
                <p className="capitalize text-cyan-100">{tt(member.role)}</p>
                <p className="text-slate-400">{member.position ? tt(member.position) : profile?.phone ?? tt("No position")}</p>
                <p className="font-mono text-xs text-slate-400">{member.dashboard_route}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
