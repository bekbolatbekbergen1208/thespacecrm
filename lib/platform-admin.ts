import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export async function requirePlatformAdmin() {
  const context = await requireUser();
  const { data: admin } = await context.supabase
    .from("platform_admins")
    .select("id, email, full_name")
    .eq("user_id", context.user!.id)
    .maybeSingle();

  if (!admin) redirect("/dashboard");

  return { ...context, admin };
}
