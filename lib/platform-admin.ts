import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

const ownerEmails = [
  "bekbergenbekbolat0@gmail.com",
  "bekbolatbekbergen0@gmail.com",
  "bekbolatbekbergen1208@gmail.com",
];

export async function requirePlatformAdmin() {
  const context = await requireUser();
  const userEmail = context.user!.email?.toLowerCase() ?? "";
  const isOwnerEmail = ownerEmails.includes(userEmail);
  const { data: admin } = await context.supabase
    .from("platform_admins")
    .select("id, email, full_name")
    .eq("user_id", context.user!.id)
    .maybeSingle();

  if (!admin && !isOwnerEmail) redirect("/dashboard");

  return {
    ...context,
    admin: admin ?? {
      id: context.user!.id,
      email: context.user!.email ?? userEmail,
      full_name: context.user!.user_metadata?.full_name ?? context.user!.email ?? "CRM.Space Owner",
    },
  };
}
