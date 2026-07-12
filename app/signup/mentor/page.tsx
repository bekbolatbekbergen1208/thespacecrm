import Link from "next/link";
import { signUpEmployee } from "@/app/actions";
import { AuthCard, Field, SubmitButton } from "@/components/app/auth-card";
import { getServerDictionary } from "@/lib/i18n-server";

export default async function MentorSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [params, t] = await Promise.all([searchParams, getServerDictionary()]);

  return (
    <AuthCard
      title={t.mentorRegistration}
      subtitle={t.mentorSubtitle}
      error={params.error}
      footer={<p>Уже зарегистрированы? <Link className="text-cyan-100" href="/login">Войти</Link></p>}
    >
      <form action={signUpEmployee} className="space-y-4">
        <input type="hidden" name="position" value="Mentor" />
        <Field label={t.fullName} name="fullName" />
        <Field label={t.companyName} name="companyName" />
        <Field label={t.codeOrId} name="codeOrId" />
        <Field label={t.phone} name="phone" type="tel" />
        <Field label={t.email} name="email" type="email" />
        <Field label={t.password} name="password" type="password" />
        <Field label={t.confirmPassword} name="confirmPassword" type="password" />
        <SubmitButton>{t.requestMentorAccess}</SubmitButton>
      </form>
    </AuthCard>
  );
}
