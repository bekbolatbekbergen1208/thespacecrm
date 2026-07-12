import Link from "next/link";
import { updatePassword } from "@/app/actions";
import { AuthCard, Field, SubmitButton } from "@/components/app/auth-card";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthCard
      title="Reset password"
      subtitle="Create a new password for your CRM.Space account."
      error={params.error}
      message={params.message}
      footer={<p>Remembered it? <Link className="text-cyan-100" href="/login">Back to sign in</Link></p>}
    >
      <form action={updatePassword} className="space-y-4">
        <Field label="New Password" name="password" type="password" />
        <Field label="Confirm Password" name="confirmPassword" type="password" />
        <SubmitButton>Update password</SubmitButton>
      </form>
    </AuthCard>
  );
}
