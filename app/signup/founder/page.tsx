import Link from "next/link";
import { signUpFounder } from "@/app/actions";
import { AuthCard, Field, SubmitButton } from "@/components/app/auth-card";
import { Select } from "@/components/app/forms";
import { BUSINESS_INDUSTRIES } from "@/lib/industries";

export default async function FounderSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthCard
      title="Founder registration"
      subtitle="Create your account and first company workspace."
      error={params.error}
      footer={<p>Already registered? <Link className="text-cyan-100" href="/login">Log in</Link></p>}
    >
      <form action={signUpFounder} className="space-y-4">
        <Field label="Full name" name="fullName" />
        <Field label="Company name" name="companyName" />
        <Select label="Business industry" name="businessType" defaultValue="Retail Store">
          {BUSINESS_INDUSTRIES.map((industry) => (
            <option key={industry} value={industry}>{industry}</option>
          ))}
        </Select>
        <Field label="Country" name="country" />
        <Field label="Phone number" name="phone" type="tel" />
        <Field label="Email" name="email" type="email" />
        <Field label="Password" name="password" type="password" />
        <Field label="Confirm password" name="confirmPassword" type="password" />
        <SubmitButton>Create company</SubmitButton>
      </form>
    </AuthCard>
  );
}
