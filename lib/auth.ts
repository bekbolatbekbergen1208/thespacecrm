import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { Role } from "@/lib/supabase/types";
import type { SubscriptionStatus } from "@/lib/supabase/types";

export type CompanyContext = {
  id: string;
  name: string;
  invite_code: string;
  business_type: string;
  dashboard_route: string;
  country: string;
  phone: string | null;
  plan: string;
  subscription_status?: SubscriptionStatus;
  subscription_due_date?: string;
  monthly_fee?: number;
  blocked_at?: string | null;
  last_paid_at?: string | null;
};

export type MembershipContext = {
  id: string;
  role: Role;
  position: string | null;
  dashboard_route: string;
  company_id: string;
  companies: CompanyContext | CompanyContext[] | null;
};

export const getSessionContext = cache(async function getSessionContext() {
  if (!hasSupabaseEnv()) {
    return { setupMissing: true as const };
  }

  const supabase = await createClient();
  const userResponse = await withTimeout(supabase.auth.getUser().catch(() => null), 6000, null);
  const user = userResponse?.error ? null : userResponse?.data.user ?? null;

  if (!user) {
    return { setupMissing: false as const, user: null, supabase };
  }

  const { data: membership } = await supabase
    .from("company_members")
    .select("id, role, position, dashboard_route, company_id, companies(id, name, invite_code, business_type, dashboard_route, country, phone, plan, subscription_status, subscription_due_date, monthly_fee, blocked_at, last_paid_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return { setupMissing: false as const, user, supabase, membership: membership as MembershipContext | null };
});

export async function requireUser() {
  const context = await getSessionContext();

  if (context.setupMissing) {
    redirect("/setup");
  }

  if (!context.user) {
    redirect("/login");
  }

  return context;
}

export async function requireMembership() {
  const context = await requireUser();

  if (!context.membership) {
    if (await isPlatformAdminUser(context.user.id)) {
      redirect("/admin");
    }
    redirect("/onboarding");
  }

  return { ...context, membership: context.membership };
}

export async function isPlatformAdminUser(userId: string) {
  if (!hasSupabaseEnv()) return false;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  return !error && Boolean(data);
}

export function canManage(role?: Role) {
  return role === "founder" || role === "admin" || role === "manager";
}

export function canAdmin(role?: Role) {
  return role === "founder" || role === "admin";
}

export function isCompanySubscriptionBlocked(company?: { subscription_status?: SubscriptionStatus; subscription_due_date?: string | null } | null) {
  if (!company) return false;
  if (company.subscription_status === "blocked") return true;
  if (!company.subscription_due_date) return false;

  const today = new Date().toISOString().slice(0, 10);
  return company.subscription_due_date < today && company.subscription_status !== "active";
}

export async function requirePlatformAdmin() {
  const context = await requireUser();
  const { data: admin } = await context.supabase
    .from("platform_admins")
    .select("id, user_id, email, full_name")
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (!admin) redirect("/dashboard");
  return { ...context, admin };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T) {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}
