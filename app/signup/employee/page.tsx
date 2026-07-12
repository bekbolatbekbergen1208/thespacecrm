import Link from "next/link";
import { signUpEmployee } from "@/app/actions";
import { AuthCard, Field, SubmitButton } from "@/components/app/auth-card";

export default async function EmployeeSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthCard
      title="Employee registration"
      subtitle="Create your account and request access to an existing CRM.Space workspace."
      error={params.error}
      footer={<p>Already registered? <Link className="text-cyan-100" href="/login">Log in</Link></p>}
    >
      <form action={signUpEmployee} className="space-y-4">
        <Field label="Full name" name="fullName" />
        <Field label="Position / job title" name="position" />
        <Field label="Company name" name="companyName" />
        <Field label="Company ID or invite code" name="codeOrId" />
        <Field label="Phone number" name="phone" type="tel" />
        <Field label="Email" name="email" type="email" />
        <Field label="Password" name="password" type="password" />
        <Field label="Confirm password" name="confirmPassword" type="password" />
        <SubmitButton>Request access</SubmitButton>
      </form>
    </AuthCard>
  );
}
