import { updateProfile } from "@/app/actions";
import { Card, PageHeader } from "@/components/app/app-shell";
import { Field } from "@/components/app/auth-card";
import { SmallButton } from "@/components/app/forms";
import { requireUser } from "@/lib/auth";
import { translateLiteral } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ supabase, user }, params, locale] = await Promise.all([requireUser(), searchParams, getServerLocale()]);
  const tt = (value: string) => translateLiteral(locale, value);
  const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).single();

  return (
    <>
      <PageHeader title={tt("Profile Settings")} description={tt("Update the personal profile attached to your CRM.Space account.")} />
      {params.error && <p className="mb-4 rounded-[8px] border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{params.error}</p>}
      <Card>
        <form action={updateProfile} className="grid gap-4 md:grid-cols-2">
          <Field label={tt("Full Name")} name="fullName" defaultValue={profile?.full_name ?? ""} />
          <Field label={tt("Phone Number")} name="phone" type="tel" defaultValue={profile?.phone ?? ""} required={false} />
          <div className="md:col-span-2">
            <p className="mb-4 text-sm text-slate-400">{tt("Email is managed by Supabase Authentication:")} {user.email}</p>
            <SmallButton>{tt("Save profile")}</SmallButton>
          </div>
        </form>
      </Card>
    </>
  );
}
