"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import type { SubscriptionStatus } from "@/lib/supabase/types";

function value(formData: FormData, key: string) {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

function numberValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  return raw ? Number(raw) : 0;
}

export async function updateCompanySubscription(formData: FormData) {
  const { supabase } = await requirePlatformAdmin();
  const companyId = z.string().uuid().parse(value(formData, "companyId"));
  const status = z.enum(["trial", "active", "past_due", "blocked"]).parse(value(formData, "subscriptionStatus")) as SubscriptionStatus;
  const dueDate = value(formData, "subscriptionDueDate") || null;
  const monthlyFee = Math.max(0, numberValue(formData, "monthlyFee"));

  const { error } = await supabase
    .from("companies")
    .update({
      subscription_status: status,
      subscription_due_date: dueDate ?? new Date().toISOString().slice(0, 10),
      monthly_fee: monthlyFee,
      blocked_at: status === "blocked" ? new Date().toISOString() : null,
    })
    .eq("id", companyId);

  if (error) redirect(`/admin/companies?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin");
  revalidatePath("/admin/companies");
  redirect("/admin/companies?saved=subscription");
}

export async function recordPlatformPayment(formData: FormData) {
  const { supabase, user } = await requirePlatformAdmin();
  const companyId = z.string().uuid().parse(value(formData, "companyId"));
  const amount = Math.max(0, numberValue(formData, "amount"));
  const paidAt = value(formData, "paidAt") || new Date().toISOString().slice(0, 10);
  const periodStart = value(formData, "periodStart") || null;
  const periodEnd = value(formData, "periodEnd") || null;

  if (!amount) redirect(`/admin/payments?error=${encodeURIComponent("Введите сумму оплаты")}`);

  const { error: paymentError } = await supabase.from("platform_subscription_payments").insert({
    company_id: companyId,
    amount,
    paid_at: paidAt,
    period_start: periodStart,
    period_end: periodEnd,
    method: value(formData, "method") || "manual",
    notes: value(formData, "notes") || null,
    recorded_by: user!.id,
  });

  if (paymentError) redirect(`/admin/payments?error=${encodeURIComponent(paymentError.message)}`);

  const { error: companyError } = await supabase
    .from("companies")
    .update({
      subscription_status: "active",
      subscription_due_date: periodEnd ?? paidAt,
      last_paid_at: new Date().toISOString(),
      blocked_at: null,
    })
    .eq("id", companyId);

  if (companyError) redirect(`/admin/payments?error=${encodeURIComponent(companyError.message)}`);
  revalidatePath("/admin");
  revalidatePath("/admin/companies");
  revalidatePath("/admin/payments");
  redirect("/admin/payments?saved=payment");
}
