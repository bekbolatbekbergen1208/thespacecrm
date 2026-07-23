import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { Role } from "@/lib/supabase/types";

export type MembershipContext = {
  id: string;
  role: Role;
  position: string | null;
  dashboard_route: string;
  allowed_routes?: string[] | null;
  company_id: string;
  companies:
    | { id: string; name: string; invite_code: string; business_type: string; dashboard_route: string; country: string; phone: string | null; plan: string }
    | { id: string; name: string; invite_code: string; business_type: string; dashboard_route: string; country: string; phone: string | null; plan: string }[]
    | null;
};

export const getSessionContext = cache(async function getSessionContext() {
  if (!hasSupabaseEnv()) {
    return { setupMissing: true as const };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { setupMissing: false as const, user: null, supabase };
  }

  const { data: membership } = await supabase
    .from("company_members")
    .select("id, role, position, dashboard_route, allowed_routes, company_id, companies(id, name, invite_code, business_type, dashboard_route, country, phone, plan)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const membershipRow = membership as MembershipContext | null;
  const allowedRoutes = Array.isArray(membershipRow?.allowed_routes) ? membershipRow.allowed_routes : [];

  return { setupMissing: false as const, user, supabase, membership: membershipRow ? ({ ...membershipRow, allowed_routes: allowedRoutes } as MembershipContext) : null };
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

export function canManage(role?: Role) {
  return role === "founder" || role === "admin" || role === "manager";
}

export function canAdmin(role?: Role) {
  return role === "founder" || role === "admin";
}
