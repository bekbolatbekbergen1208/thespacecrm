import { redirect } from "next/navigation";
import Link from "next/link";
import { createCompany, joinCompany } from "@/app/actions";
import { Field, SubmitButton } from "@/components/app/auth-card";
import { Select } from "@/components/app/forms";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { requireUser } from "@/lib/auth";
import { getServerDictionary } from "@/lib/i18n-server";
import { BUSINESS_INDUSTRIES } from "@/lib/industries";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string; role?: string }>;
}) {
  const [{ supabase, user }, params, t] = await Promise.all([requireUser(), searchParams, getServerDictionary()]);
  const { data: membership } = await supabase.from("company_members").select("id").eq("user_id", user.id).limit(1).maybeSingle();
  if (membership) redirect("/dashboard");

  const [{ data: profile }, { data: pendingRequest }] = await Promise.all([
    supabase.from("profiles").select("full_name, pending_invite_code").eq("id", user.id).single(),
    supabase
      .from("employee_access_requests")
      .select("company_name, position, created_at")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (pendingRequest || params.status === "pending") {
    return (
      <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
        <div className="mx-auto max-w-2xl rounded-[8px] border border-cyan-300/25 bg-cyan-300/10 p-7">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-100">{t.pendingApproval}</p>
            <LanguageSwitcher />
          </div>
          <h1 className="mt-4 text-3xl font-black">{t.pendingTitle}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            {t.pendingDesc}
          </p>
          {pendingRequest && (
            <div className="mt-6 grid gap-3 rounded-[8px] border border-white/10 bg-slate-950/50 p-4 text-sm">
              <p><span className="text-slate-400">{t.company}:</span> {pendingRequest.company_name}</p>
              <p><span className="text-slate-400">{t.position}:</span> {pendingRequest.position}</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t.chooseRole}</h1>
            <p className="mt-3 text-slate-300">{t.chooseRoleDesc}</p>
          </div>
          <LanguageSwitcher />
        </div>
        {params.error && <p className="mt-5 rounded-[8px] border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{params.error}</p>}
        {!params.role && (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Link href="/onboarding?role=founder" className="rounded-[8px] border border-cyan-300/30 bg-cyan-300/10 p-6 transition hover:border-cyan-200/70">
              <h2 className="text-xl font-bold">{t.founder}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{t.founderDesc}</p>
            </Link>
            <Link href="/onboarding?role=employee" className="rounded-[8px] border border-white/10 bg-white/[0.045] p-6 transition hover:border-cyan-300/40">
              <h2 className="text-xl font-bold">{t.employee}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{t.employeeDesc}</p>
            </Link>
            <Link href="/onboarding?role=mentor" className="rounded-[8px] border border-violet-300/30 bg-violet-300/10 p-6 transition hover:border-violet-200/70">
              <h2 className="text-xl font-bold">{t.mentor}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{t.mentorDesc}</p>
            </Link>
          </div>
        )}
        {params.role === "founder" && (
          <form action={createCompany} className="rounded-[8px] border border-white/10 bg-white/[0.045] p-6">
            <h2 className="text-xl font-bold">{t.founder}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{t.founderDesc}</p>
            <div className="mt-5 space-y-4">
              <Field label={t.companyName} name="companyName" />
              <Select label={t.businessIndustry} name="businessType" defaultValue="Retail Store">
                {BUSINESS_INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </Select>
            </div>
            <div className="mt-5 rounded-[8px] border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-50">
              {t.generatedCodes}
            </div>
            <SubmitButton>{t.createCompany}</SubmitButton>
          </form>
        )}
        {params.role === "employee" && (
          <form action={joinCompany} className="rounded-[8px] border border-white/10 bg-white/[0.045] p-6">
            <h2 className="text-xl font-bold">{t.employee}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{t.employeeDesc}</p>
            <div className="mt-5 space-y-4">
              <Field label={t.fullName} name="fullName" defaultValue={profile?.full_name ?? ""} />
              <Field label={t.jobTitle} name="position" />
              <Field label={t.companyName} name="companyName" />
              <Field label={t.codeOrId} name="codeOrId" defaultValue={profile?.pending_invite_code ?? ""} />
            </div>
            <SubmitButton>{t.requestAccess}</SubmitButton>
          </form>
        )}
        {params.role === "mentor" && (
          <form action={joinCompany} className="rounded-[8px] border border-violet-300/20 bg-violet-300/10 p-6">
            <h2 className="text-xl font-bold">{t.mentor}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{t.mentorDesc}</p>
            <div className="mt-5 space-y-4">
              <input type="hidden" name="position" value="Mentor" />
              <Field label={t.fullName} name="fullName" defaultValue={profile?.full_name ?? ""} />
              <Field label={t.companyName} name="companyName" />
              <Field label={t.codeOrId} name="codeOrId" defaultValue={profile?.pending_invite_code ?? ""} />
            </div>
            <SubmitButton>{t.requestMentorAccess}</SubmitButton>
          </form>
        )}
      </div>
    </main>
  );
}
