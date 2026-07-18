"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canManage, requireUser } from "@/lib/auth";
import { BUSINESS_INDUSTRIES, dashboardRouteForIndustry } from "@/lib/industries";
import { getRoboticsModule, roboticsModuleList, type RoboticsModuleKey } from "@/lib/robotics-crm";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { Role, TaskStatus } from "@/lib/supabase/types";

function value(formData: FormData, key: string) {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

function numberValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  return raw ? Number(raw) : 0;
}

function roboticsValue(formData: FormData, key: string, type?: string) {
  const raw = value(formData, key);
  if (type === "number") return raw ? Number(raw) : 0;
  return raw || null;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function weekdayIndex(day: string) {
  const normalized = day.trim().toLowerCase();
  const map: Record<string, number> = {
    sunday: 0,
    sun: 0,
    воскресенье: 0,
    жексенбі: 0,
    monday: 1,
    mon: 1,
    понедельник: 1,
    дүйсенбі: 1,
    tuesday: 2,
    tue: 2,
    вторник: 2,
    сейсенбі: 2,
    wednesday: 3,
    wed: 3,
    среда: 3,
    сәрсенбі: 3,
    thursday: 4,
    thu: 4,
    четверг: 4,
    бейсенбі: 4,
    friday: 5,
    fri: 5,
    пятница: 5,
    жұма: 5,
    saturday: 6,
    sat: 6,
    суббота: 6,
    сенбі: 6,
  };
  return map[normalized];
}

function parseScheduleDays(raw: string) {
  return raw
    .split(/[,;/\n]+/)
    .map(weekdayIndex)
    .filter((day): day is number => typeof day === "number");
}

function ensureSupabase() {
  if (!hasSupabaseEnv()) {
    redirect("/setup");
  }
}

const FREE_EMPLOYEE_LIMIT = 5;
const FREE_CUSTOMER_LIMIT = 500;
const businessIndustrySchema = z.enum(BUSINESS_INDUSTRIES);
const BAKERY_PRICES = {
  keks: 650,
  korzhik: 550,
  plyannik: 550,
} as const;

function validationMessage(error: z.ZodError) {
  const issue = error.issues[0];
  const field = issue?.path.join(" ") || "Form";
  if (issue?.code === "too_small" && field.toLowerCase().includes("password")) {
    return "Password must be at least 8 characters";
  }
  if (issue?.code === "invalid_format" && field.toLowerCase().includes("email")) {
    return "Enter a valid email address";
  }
  return issue ? `${field}: ${issue.message}` : "Please check the form and try again";
}

function parseOrRedirect<T>(schema: z.ZodType<T>, input: unknown, redirectTo: string) {
  const result = schema.safeParse(input);
  if (!result.success) {
    redirect(`${redirectTo}?error=${encodeURIComponent(validationMessage(result.error))}`);
  }
  return result.data;
}

function validatePasswordPair(password: string, confirmPassword: string, redirectTo: string) {
  if (password !== confirmPassword) {
    redirect(`${redirectTo}?error=${encodeURIComponent("Passwords do not match")}`);
  }
}

function authErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Authentication service is unavailable";
  const cause = error instanceof Error && "cause" in error ? error.cause : null;
  const causeMessage = cause instanceof Error ? cause.message : "";

  if (message === "fetch failed" || causeMessage.includes("ENOTFOUND") || causeMessage.includes("getaddrinfo")) {
    return "Cannot connect to Supabase. Check NEXT_PUBLIC_SUPABASE_URL in .env.local.";
  }

  if (message.toLowerCase().includes("email rate limit")) {
    return "Supabase временно заблокировал отправку email. Подождите 1-5 минут или выключите Confirm email в Supabase Authentication > Providers > Email.";
  }

  return message;
}

export async function createAccount(formData: FormData) {
  ensureSupabase();
  const schema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    phone: z.string().min(5, "Phone number must be at least 5 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  });
  const input = parseOrRedirect(schema, {
    fullName: value(formData, "fullName"),
    email: value(formData, "email"),
    phone: value(formData, "phone"),
    password: value(formData, "password"),
    confirmPassword: value(formData, "confirmPassword"),
  }, "/auth");
  validatePasswordPair(input.password, input.confirmPassword, "/auth");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName, phone: input.phone } },
  }).catch((error) => redirect(`/auth?error=${encodeURIComponent(authErrorMessage(error))}`));

  if (error) redirect(`/auth?error=${encodeURIComponent(error.message)}`);
  if (!data.session || !data.user) redirect("/login?message=Check your email to finish registration");
  redirect("/onboarding");
}

export async function signUpFounder(formData: FormData) {
  ensureSupabase();
  const schema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    companyName: z.string().min(2, "Company name must be at least 2 characters"),
    businessType: businessIndustrySchema,
    country: z.string().min(2, "Country must be at least 2 characters"),
    phone: z.string().min(5, "Phone number must be at least 5 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  });
  const input = parseOrRedirect(schema, {
    fullName: value(formData, "fullName"),
    companyName: value(formData, "companyName"),
    businessType: value(formData, "businessType"),
    country: value(formData, "country"),
    phone: value(formData, "phone"),
    email: value(formData, "email"),
    password: value(formData, "password"),
    confirmPassword: value(formData, "confirmPassword"),
  }, "/signup/founder");
  validatePasswordPair(input.password, input.confirmPassword, "/signup/founder");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName, phone: input.phone, flow: "founder" } },
  }).catch((error) => redirect(`/signup/founder?error=${encodeURIComponent(authErrorMessage(error))}`));

  if (error) redirect(`/signup/founder?error=${encodeURIComponent(error.message)}`);
  if (!data.session || !data.user) redirect("/login?message=Check your email to finish registration");

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      name: input.companyName,
      business_type: input.businessType,
      dashboard_route: dashboardRouteForIndustry(input.businessType),
      country: input.country,
      phone: input.phone,
      plan: "Free",
      created_by: data.user.id,
    })
    .select("id")
    .single();

  if (companyError) redirect(`/signup/founder?error=${encodeURIComponent(companyError.message)}`);

  const { error: memberError } = await supabase
    .from("company_members")
    .insert({ company_id: company.id, user_id: data.user.id, role: "founder", position: "Founder", dashboard_route: dashboardRouteForIndustry(input.businessType) });

  if (memberError) redirect(`/signup/founder?error=${encodeURIComponent(memberError.message)}`);
  await supabase.from("employees").insert({
    company_id: company.id,
    user_id: data.user.id,
    name: input.fullName,
    email: input.email,
    phone: input.phone,
    position: "Founder",
  });
  redirect(dashboardRouteForIndustry(input.businessType));
}

export async function updatePlatformCompanyBilling(formData: FormData) {
  const { supabase, user } = await requirePlatformAdminAction();
  const schema = z.object({
    companyId: z.string().uuid(),
    subscriptionStatus: z.enum(["trial", "active", "past_due", "blocked"]),
    plan: z.string().min(1).default("Monthly"),
    monthlyFee: z.coerce.number().min(0).default(0),
    subscriptionDueDate: z.string().min(4),
    paymentAmount: z.coerce.number().min(0).default(0),
    paymentMethod: z.string().default("manual"),
    notes: z.string().optional(),
  });
  const input = parseOrRedirect(schema, {
    companyId: value(formData, "companyId"),
    subscriptionStatus: value(formData, "subscriptionStatus"),
    plan: value(formData, "plan") || "Monthly",
    monthlyFee: numberValue(formData, "monthlyFee"),
    subscriptionDueDate: value(formData, "subscriptionDueDate"),
    paymentAmount: numberValue(formData, "paymentAmount"),
    paymentMethod: value(formData, "paymentMethod") || "manual",
    notes: value(formData, "notes"),
  }, "/admin");

  const { error } = await supabase
    .from("companies")
    .update({
      plan: input.plan,
      monthly_fee: input.monthlyFee,
      subscription_status: input.subscriptionStatus,
      subscription_due_date: input.subscriptionDueDate,
      blocked_at: input.subscriptionStatus === "blocked" ? new Date().toISOString() : null,
      last_paid_at: input.paymentAmount > 0 ? new Date().toISOString() : undefined,
    })
    .eq("id", input.companyId);

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  if (input.paymentAmount > 0) {
    const { error: paymentError } = await supabase.from("platform_subscription_payments").insert({
      company_id: input.companyId,
      amount: input.paymentAmount,
      paid_at: new Date().toISOString().slice(0, 10),
      period_end: input.subscriptionDueDate,
      method: input.paymentMethod,
      notes: input.notes || null,
      recorded_by: user.id,
    });
    if (paymentError) redirect(`/admin?error=${encodeURIComponent(paymentError.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect("/admin?saved=billing");
}

async function requirePlatformAdminAction() {
  const context = await requireUser();
  const { data: admin } = await context.supabase
    .from("platform_admins")
    .select("id")
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (!admin) redirect("/dashboard");
  return context;
}

export async function signUpEmployee(formData: FormData) {
  ensureSupabase();
  const schema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    position: z.string().min(2, "Position must be at least 2 characters"),
    companyName: z.string().min(2, "Company name must be at least 2 characters"),
    codeOrId: z.string().min(4, "Company ID or invite code is required"),
    phone: z.string().min(5, "Phone number must be at least 5 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  });
  const input = parseOrRedirect(schema, {
    fullName: value(formData, "fullName"),
    position: value(formData, "position"),
    companyName: value(formData, "companyName"),
    codeOrId: value(formData, "codeOrId").toUpperCase(),
    phone: value(formData, "phone"),
    email: value(formData, "email"),
    password: value(formData, "password"),
    confirmPassword: value(formData, "confirmPassword"),
  }, "/signup/employee");
  validatePasswordPair(input.password, input.confirmPassword, "/signup/employee");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName, phone: input.phone, invite_code: input.codeOrId, flow: "employee" } },
  }).catch((error) => redirect(`/signup/employee?error=${encodeURIComponent(authErrorMessage(error))}`));

  if (error) redirect(`/signup/employee?error=${encodeURIComponent(error.message)}`);
  if (!data.session || !data.user) redirect("/login?message=Check your email to finish registration");

  await requestEmployeeAccessForUser({
    fullName: input.fullName,
    position: input.position,
    companyName: input.companyName,
    codeOrId: input.codeOrId,
  });
  redirect("/onboarding?status=pending");
}

export async function login(formData: FormData) {
  ensureSupabase();
  const email = value(formData, "email");
  const password = value(formData, "password");
  const supabase = await createClient();
  const { error } = await supabase.auth
    .signInWithPassword({ email, password })
    .catch((error) => redirect(`/login?error=${encodeURIComponent(authErrorMessage(error))}`));

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function forgotPassword(formData: FormData) {
  ensureSupabase();
  const email = z.string().email().parse(value(formData, "email"));
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth
    .resetPasswordForEmail(email, {
      redirectTo: origin ? `${origin}/auth/callback?next=/reset-password` : undefined,
    })
    .catch((error) => redirect(`/login?error=${encodeURIComponent(authErrorMessage(error))}`));

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/login?message=Password reset email sent");
}

export async function updatePassword(formData: FormData) {
  ensureSupabase();
  const password = z.string().min(8).parse(value(formData, "password"));
  const confirmPassword = z.string().min(8).parse(value(formData, "confirmPassword"));
  validatePasswordPair(password, confirmPassword, "/reset-password");
  const supabase = await createClient();
  const { error } = await supabase.auth
    .updateUser({ password })
    .catch((error) => redirect(`/reset-password?error=${encodeURIComponent(authErrorMessage(error))}`));

  if (error) redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  redirect("/login?message=Password updated. Sign in with your new password.");
}

export async function logout() {
  ensureSupabase();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createCompany(formData: FormData) {
  const { user, supabase } = await requireUser();
  const schema = z.object({
    companyName: z.string().min(2),
    businessType: businessIndustrySchema,
    country: z.string().optional(),
    phone: z.string().optional(),
  });
  const input = parseOrRedirect(schema, {
    companyName: value(formData, "companyName"),
    businessType: value(formData, "businessType"),
    country: value(formData, "country"),
    phone: value(formData, "phone"),
  }, "/onboarding");
  const dashboardRoute = dashboardRouteForIndustry(input.businessType);
  const { data: company, error } = await supabase
    .from("companies")
    .insert({
      name: input.companyName,
      business_type: input.businessType,
      dashboard_route: dashboardRoute,
      country: input.country || "United States",
      phone: input.phone || null,
      plan: "Free",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  const { error: memberError } = await supabase
    .from("company_members")
    .insert({ company_id: company.id, user_id: user.id, role: "founder", position: "Founder", dashboard_route: dashboardRoute });

  if (memberError) redirect(`/onboarding?error=${encodeURIComponent(memberError.message)}`);
  const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).single();
  await supabase.from("employees").insert({
    company_id: company.id,
    user_id: user.id,
    name: profile?.full_name ?? user.email ?? "Founder",
    email: user.email,
    phone: profile?.phone ?? input.phone ?? null,
    position: "Founder",
  });
  redirect(dashboardRoute);
}

export async function joinCompany(formData: FormData) {
  const schema = z.object({
    fullName: z.string().min(2),
    position: z.string().min(2),
    companyName: z.string().min(2),
    codeOrId: z.string().min(4),
  });
  const input = parseOrRedirect(schema, {
    fullName: value(formData, "fullName"),
    position: value(formData, "position"),
    companyName: value(formData, "companyName"),
    codeOrId: value(formData, "codeOrId").toUpperCase(),
  }, "/onboarding");
  await requestEmployeeAccessForUser(input);
  redirect("/onboarding?status=pending");
}

async function requestEmployeeAccessForUser(input: {
  fullName: string;
  position: string;
  companyName: string;
  codeOrId?: string;
}) {
  const { user, supabase } = await requireUser();
  const codeOrId = input.codeOrId?.trim();
  let matchedCompanyId: string | null = null;
  let inviteCode: string | null = null;

  if (codeOrId) {
    const company = await findCompanyByCodeOrId(supabase, codeOrId);
    if (!company) redirect(`/onboarding?error=${encodeURIComponent("Invalid company ID or invite code")}`);
    matchedCompanyId = company.id;
    inviteCode = codeOrId.includes("-") ? null : codeOrId.toUpperCase();
  }

  const { data: existingMembership } = await supabase
    .from("company_members")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existingMembership) redirect("/dashboard");

  const { data: existingRequest } = await supabase
    .from("employee_access_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (existingRequest) redirect("/onboarding?status=pending");

  const { error } = await supabase.from("employee_access_requests").insert({
    company_id: matchedCompanyId,
    user_id: user.id,
    full_name: input.fullName,
    position: input.position,
    company_name: input.companyName,
    invite_code: inviteCode || null,
  });
  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  await supabase.from("profiles").update({ full_name: input.fullName, pending_invite_code: inviteCode || null }).eq("id", user.id);
}

async function findCompanyByCodeOrId(supabase: Awaited<ReturnType<typeof createClient>>, codeOrId: string) {
  const normalized = codeOrId.trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const companyQuery = supabase.from("companies").select("id, name, business_type, dashboard_route");
  const { data: company, error } = uuidPattern.test(normalized)
    ? await companyQuery.eq("id", normalized).maybeSingle()
    : await companyQuery.eq("invite_code", normalized.toUpperCase()).maybeSingle();
  if (error) return null;
  return company;
}

export async function approveEmployeeAccess(formData: FormData) {
  const context = await requireUser();
  if (!context.membership || !canManage(context.membership.role)) {
    redirect(`/dashboard/employees?error=${encodeURIComponent("Only founders, admins, and managers can approve requests")}`);
  }

  const company = Array.isArray(context.membership.companies) ? context.membership.companies[0] : context.membership.companies;
  const companyId = context.membership.company_id;
  const dashboardRoute = company?.dashboard_route || dashboardRouteForIndustry(company?.business_type ?? "Other");
  const requestId = z.string().uuid().parse(value(formData, "requestId"));
  const { supabase, user } = context;

  const { data: request, error: requestError } = await supabase
    .from("employee_access_requests")
    .select("*")
    .eq("id", requestId)
    .eq("status", "pending")
    .maybeSingle();

  if (requestError || !request) redirect(`/dashboard/employees?error=${encodeURIComponent("Request not found")}`);
  const matchesCompany = request.company_id === companyId || (!request.company_id && company?.name.toLowerCase() === request.company_name.toLowerCase());
  if (!matchesCompany) redirect(`/dashboard/employees?error=${encodeURIComponent("This request belongs to another company")}`);

  const { count } = await supabase
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if ((count ?? 0) >= FREE_EMPLOYEE_LIMIT) {
    redirect(`/dashboard/employees?error=${encodeURIComponent("Free plan allows up to 5 employees")}`);
  }

  const { error: memberError } = await supabase
    .from("company_members")
    .insert({ company_id: companyId, user_id: request.user_id, role: "employee", position: request.position, dashboard_route: dashboardRoute });

  if (memberError && !memberError.message.includes("duplicate")) {
    redirect(`/dashboard/employees?error=${encodeURIComponent(memberError.message)}`);
  }

  const { data: profile } = await supabase.from("profiles").select("phone").eq("id", request.user_id).single();
  const { data: existingEmployee } = await supabase
    .from("employees")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", request.user_id)
    .maybeSingle();
  if (!existingEmployee) {
    await supabase.from("employees").insert({
      company_id: companyId,
      user_id: request.user_id,
      name: request.full_name,
      email: null,
      phone: profile?.phone ?? null,
      position: request.position,
    });
  }
  const { error: updateError } = await supabase
    .from("employee_access_requests")
    .update({ company_id: companyId, status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", request.id);
  if (updateError) redirect(`/dashboard/employees?error=${encodeURIComponent(updateError.message)}`);
  revalidatePath("/dashboard/employees");
  revalidatePath(dashboardRoute);
}

async function companyContext() {
  const context = await requireUser();
  if (!context.membership) redirect("/onboarding");
  return {
    supabase: context.supabase,
    companyId: context.membership.company_id,
    role: context.membership.role as Role,
  };
}

export async function saveBakeryShop(formData: FormData) {
  const { supabase, companyId, role } = await companyContext();
  if (!canManage(role)) redirect(`/dashboard/bakery?error=${encodeURIComponent("Только founder/admin/manager может добавлять магазины")}`);

  const id = value(formData, "id");
  const payload = {
    name: z.string().min(2).parse(value(formData, "name")),
    address: value(formData, "address") || null,
    latitude: value(formData, "latitude") ? numberValue(formData, "latitude") : null,
    longitude: value(formData, "longitude") ? numberValue(formData, "longitude") : null,
    phone: value(formData, "phone") || null,
    driver_name: value(formData, "driverName") || null,
    notes: value(formData, "notes") || null,
  };

  const result = id
    ? await supabase.from("bakery_shops").update(payload).eq("id", id).eq("company_id", companyId)
    : await supabase.from("bakery_shops").insert({ ...payload, company_id: companyId });

  if (result.error) redirect(`/dashboard/bakery/shops?error=${encodeURIComponent(result.error.message)}`);
  revalidatePath("/dashboard/bakery");
  revalidatePath("/dashboard/bakery/shops");
  redirect("/dashboard/bakery/shops");
}

export async function saveBakeryVehicle(formData: FormData) {
  const { supabase, companyId, role } = await companyContext();
  if (!canManage(role)) redirect(`/dashboard/bakery/delivery?error=${encodeURIComponent("Только founder/admin/manager может добавлять авто")}`);

  const payload = {
    company_id: companyId,
    name: z.string().min(2).parse(value(formData, "name")),
    plate_number: value(formData, "plateNumber") || null,
    driver_name: value(formData, "driverName") || null,
    phone: value(formData, "phone") || null,
    capacity: value(formData, "capacity") || null,
    status: value(formData, "status") || "active",
    notes: value(formData, "notes") || null,
  };

  const { error } = await supabase.from("bakery_vehicles").insert(payload);
  if (error) redirect(`/dashboard/bakery/delivery?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/bakery");
  revalidatePath("/dashboard/bakery/delivery");
  redirect("/dashboard/bakery/delivery?saved=vehicle");
}

export async function saveBakeryDeliveryRoute(formData: FormData) {
  const { supabase, companyId, role } = await companyContext();
  if (!canManage(role)) redirect(`/dashboard/bakery/delivery?error=${encodeURIComponent("Только founder/admin/manager может создавать маршруты")}`);

  const routeDate = value(formData, "routeDate") || new Date().toISOString().slice(0, 10);
  const shopIds = formData
    .getAll("shopIds")
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  if (!shopIds.length) {
    redirect(`/dashboard/bakery/delivery?date=${encodeURIComponent(routeDate)}&error=${encodeURIComponent("Выберите хотя бы один магазин для маршрута")}`);
  }

  const payload = {
    company_id: companyId,
    route_date: routeDate,
    route_name: z.string().min(2).parse(value(formData, "routeName")),
    vehicle_id: value(formData, "vehicleId") || null,
    driver_name: value(formData, "driverName") || null,
    shop_ids: shopIds.join(","),
    status: value(formData, "status") || "planned",
    notes: value(formData, "notes") || null,
  };

  const { error } = await supabase.from("bakery_delivery_routes").insert(payload);
  if (error) redirect(`/dashboard/bakery/delivery?date=${encodeURIComponent(routeDate)}&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/bakery");
  revalidatePath("/dashboard/bakery/delivery");
  redirect(`/dashboard/bakery/delivery?date=${encodeURIComponent(routeDate)}&saved=route`);
}

export async function saveBakeryStock(formData: FormData) {
  const { supabase, companyId, role } = await companyContext();
  if (!canManage(role)) redirect(`/dashboard/bakery?error=${encodeURIComponent("Водитель не может изменять общий продукт")}`);
  const stockDate = value(formData, "stockDate") || new Date().toISOString().slice(0, 10);
  const keksQty = Math.max(0, numberValue(formData, "keksQty"));
  const korzhikQty = Math.max(0, numberValue(formData, "korzhikQty"));
  const plyannikQty = Math.max(0, numberValue(formData, "plyannikQty"));

  if (keksQty + korzhikQty + plyannikQty <= 0) {
    redirect(`/dashboard/bakery/production?date=${encodeURIComponent(stockDate)}&error=${encodeURIComponent("Введите количество хотя бы одного продукта")}`);
  }

  const payload = {
    company_id: companyId,
    stock_date: stockDate,
    keks_qty: keksQty,
    korzhik_qty: korzhikQty,
    plyannik_qty: plyannikQty,
    notes: value(formData, "notes") || null,
  };

  const { error } = await supabase.from("bakery_stock").insert(payload);
  if (error) redirect(`/dashboard/bakery/production?date=${encodeURIComponent(stockDate)}&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/bakery");
  revalidatePath("/dashboard/bakery/production");
  redirect(`/dashboard/bakery/production?date=${encodeURIComponent(stockDate)}&saved=stock`);
}

export async function saveBakerySupplier(formData: FormData) {
  const { supabase, companyId, role } = await companyContext();
  if (!canManage(role)) redirect(`/dashboard/bakery?error=${encodeURIComponent("Только founder/admin/manager может добавлять поставщиков")}`);

  const supplyDate = value(formData, "lastSupplyDate") || new Date().toISOString().slice(0, 10);
  const payload = {
    company_id: companyId,
    name: z.string().min(2).parse(value(formData, "name")),
    contact_name: value(formData, "contactName") || null,
    phone: value(formData, "phone") || null,
    product_type: z.string().min(2).parse(value(formData, "productType")),
    last_supply_date: supplyDate,
    amount: Math.max(0, numberValue(formData, "amount")),
    debt_amount: Math.max(0, numberValue(formData, "debtAmount")),
    notes: value(formData, "notes") || null,
  };

  const { error } = await supabase.from("bakery_suppliers").insert(payload);
  if (error) redirect(`/dashboard/bakery/suppliers?date=${encodeURIComponent(supplyDate)}&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/bakery");
  revalidatePath("/dashboard/bakery/suppliers");
  redirect(`/dashboard/bakery/suppliers?date=${encodeURIComponent(supplyDate)}&saved=supplier`);
}

export async function saveBakeryExpense(formData: FormData) {
  const { supabase, companyId, role } = await companyContext();
  if (!canManage(role)) redirect(`/dashboard/bakery?error=${encodeURIComponent("Только founder/admin/manager может добавлять расходы")}`);

  const expenseDate = value(formData, "expenseDate") || new Date().toISOString().slice(0, 10);
  const payload = {
    company_id: companyId,
    expense_date: expenseDate,
    category: z.string().min(2).parse(value(formData, "category")),
    amount: Math.max(0, numberValue(formData, "amount")),
    notes: value(formData, "notes") || null,
  };

  if (payload.amount <= 0) {
    redirect(`/dashboard/bakery/expenses?date=${encodeURIComponent(expenseDate)}&error=${encodeURIComponent("Введите сумму расхода")}`);
  }

  const { error } = await supabase.from("bakery_expenses").insert(payload);
  if (error) redirect(`/dashboard/bakery/expenses?date=${encodeURIComponent(expenseDate)}&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/bakery");
  revalidatePath("/dashboard/bakery/expenses");
  redirect(`/dashboard/bakery/expenses?date=${encodeURIComponent(expenseDate)}&saved=expense`);
}

export async function saveBakeryProduct(formData: FormData) {
  const { supabase, companyId, role } = await companyContext();
  if (!canManage(role)) redirect(`/dashboard/bakery/products?error=${encodeURIComponent("Только founder/admin/manager может добавлять товары")}`);

  const id = value(formData, "id");
  const payload = {
    name: z.string().min(2).parse(value(formData, "name")),
    category: value(formData, "category") || null,
    photo_url: value(formData, "photoUrl") || null,
    photo_keywords: value(formData, "photoKeywords") || null,
    purchase_price: Math.max(0, numberValue(formData, "purchasePrice")),
    sale_price: Math.max(0, numberValue(formData, "salePrice")),
    initial_quantity: Math.max(0, numberValue(formData, "initialQuantity")),
    status: value(formData, "status") || "active",
    notes: value(formData, "notes") || null,
  };

  if (payload.sale_price <= 0) {
    redirect(`/dashboard/bakery/products?error=${encodeURIComponent("Введите цену продажи")}`);
  }

  const result = id
    ? await supabase.from("bakery_products").update(payload).eq("id", id).eq("company_id", companyId)
    : await supabase.from("bakery_products").insert({ ...payload, company_id: companyId });

  if (result.error) redirect(`/dashboard/bakery/products?error=${encodeURIComponent(result.error.message)}`);
  revalidatePath("/dashboard/bakery");
  revalidatePath("/dashboard/bakery/products");
  redirect("/dashboard/bakery/products?saved=product");
}

export async function markBakeryProductSold(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const productId = z.string().uuid().parse(value(formData, "productId"));
  const saleDate = value(formData, "saleDate") || new Date().toISOString().slice(0, 10);
  const quantity = Math.max(1, numberValue(formData, "quantity"));

  const { data: product, error: productError } = await supabase
    .from("bakery_products")
    .select("id, purchase_price, sale_price, initial_quantity")
    .eq("company_id", companyId)
    .eq("id", productId)
    .maybeSingle();

  if (productError || !product) {
    redirect(`/dashboard/bakery/products?date=${encodeURIComponent(saleDate)}&error=${encodeURIComponent(productError?.message || "Товар не найден")}`);
  }

  const salePrice = Number(product.sale_price ?? 0);
  const purchasePrice = Number(product.purchase_price ?? 0);
  const totalAmount = salePrice * quantity;
  const profitAmount = Math.max(0, salePrice - purchasePrice) * quantity;

  const { error } = await supabase.from("bakery_product_sales").insert({
    company_id: companyId,
    product_id: productId,
    sale_date: saleDate,
    quantity,
    payment_method: value(formData, "paymentMethod") || "cash",
    total_amount: totalAmount,
    profit_amount: profitAmount,
    customer_name: value(formData, "customerName") || null,
    notes: value(formData, "notes") || null,
  });

  if (error) redirect(`/dashboard/bakery/products?date=${encodeURIComponent(saleDate)}&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/bakery");
  revalidatePath("/dashboard/bakery/products");
  redirect(`/dashboard/bakery/products?date=${encodeURIComponent(saleDate)}&saved=product-sale`);
}

export async function saveRetailProduct(formData: FormData) {
  const { supabase, companyId, role } = await companyContext();
  if (!canManage(role)) redirect(`/dashboard/retail/products?error=${encodeURIComponent("Только founder/admin/manager может добавлять товары")}`);

  const id = value(formData, "id");
  const payload = {
    name: z.string().min(2).parse(value(formData, "name")),
    category: value(formData, "category") || null,
    address: value(formData, "address") || null,
    photo_url: value(formData, "photoUrl") || null,
    photo_keywords: value(formData, "photoKeywords") || null,
    purchase_price: Math.max(0, numberValue(formData, "purchasePrice")),
    sale_price: Math.max(0, numberValue(formData, "salePrice")),
    initial_quantity: Math.max(0, numberValue(formData, "initialQuantity")),
    status: value(formData, "status") || "active",
    notes: value(formData, "notes") || null,
  };

  const result = id
    ? await supabase.from("retail_products").update(payload).eq("id", id).eq("company_id", companyId)
    : await supabase.from("retail_products").insert({ ...payload, company_id: companyId });

  if (result.error) redirect(`/dashboard/retail/products?error=${encodeURIComponent(result.error.message)}`);
  revalidatePath("/dashboard/retail");
  revalidatePath("/dashboard/retail/products");
  redirect("/dashboard/retail/products?saved=product");
}

export async function deleteRetailProduct(formData: FormData) {
  const { supabase, companyId, role } = await companyContext();
  if (!canManage(role)) redirect(`/dashboard/retail/products?error=${encodeURIComponent("Только founder/admin/manager может удалять товары")}`);

  const productId = z.string().uuid().parse(value(formData, "productId"));
  const selectedDate = value(formData, "selectedDate");
  const redirectPath = selectedDate ? `/dashboard/retail/products?date=${encodeURIComponent(selectedDate)}` : "/dashboard/retail/products";
  const joiner = redirectPath.includes("?") ? "&" : "?";

  const { error } = await supabase
    .from("retail_products")
    .update({ status: "archived" })
    .eq("id", productId)
    .eq("company_id", companyId);

  if (error) redirect(`${redirectPath}${joiner}error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/retail");
  revalidatePath("/dashboard/retail/products");
  revalidatePath("/dashboard/retail/trash");
  redirect(`${redirectPath}${joiner}saved=deleted`);
}

export async function restoreRetailProduct(formData: FormData) {
  const { supabase, companyId, role } = await companyContext();
  if (!canManage(role)) redirect(`/dashboard/retail/trash?error=${encodeURIComponent("Только founder/admin/manager может восстановить товары")}`);

  const productId = z.string().uuid().parse(value(formData, "productId"));
  const { error } = await supabase
    .from("retail_products")
    .update({ status: "active" })
    .eq("id", productId)
    .eq("company_id", companyId);

  if (error) redirect(`/dashboard/retail/trash?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/retail");
  revalidatePath("/dashboard/retail/products");
  revalidatePath("/dashboard/retail/trash");
  redirect("/dashboard/retail/trash?saved=restored");
}

export async function permanentlyDeleteRetailProduct(formData: FormData) {
  const { supabase, companyId, role } = await companyContext();
  if (!canManage(role)) redirect(`/dashboard/retail/trash?error=${encodeURIComponent("Только founder/admin/manager может окончательно удалять товары")}`);

  const productId = z.string().uuid().parse(value(formData, "productId"));
  const { error: salesError } = await supabase.from("retail_product_sales").delete().eq("product_id", productId).eq("company_id", companyId);
  if (salesError) redirect(`/dashboard/retail/trash?error=${encodeURIComponent(salesError.message)}`);

  const { error } = await supabase.from("retail_products").delete().eq("id", productId).eq("company_id", companyId);
  if (error) redirect(`/dashboard/retail/trash?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard/retail");
  revalidatePath("/dashboard/retail/trash");
  redirect("/dashboard/retail/trash?saved=purged");
}

export async function markRetailProductSold(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const productId = z.string().uuid().parse(value(formData, "productId"));
  const saleDate = value(formData, "saleDate") || new Date().toISOString().slice(0, 10);
  const quantity = Math.max(1, numberValue(formData, "quantity"));

  const { data: product, error: productError } = await supabase
    .from("retail_products")
    .select("id, purchase_price, sale_price, initial_quantity")
    .eq("company_id", companyId)
    .eq("id", productId)
    .maybeSingle();

  if (productError || !product) {
    redirect(`/dashboard/retail/products?date=${encodeURIComponent(saleDate)}&error=${encodeURIComponent(productError?.message || "Товар не найден")}`);
  }

  const salePrice = Math.max(0, numberValue(formData, "salePrice") || Number(product.sale_price ?? 0));
  const purchasePrice = Number(product.purchase_price ?? 0);
  const totalAmount = salePrice * quantity;
  const profitAmount = (salePrice - purchasePrice) * quantity;

  if (salePrice <= 0) {
    redirect(`/dashboard/retail/products?date=${encodeURIComponent(saleDate)}&error=${encodeURIComponent("Введите цену продажи")}`);
  }

  const { error } = await supabase.from("retail_product_sales").insert({
    company_id: companyId,
    product_id: productId,
    sale_date: saleDate,
    quantity,
    payment_method: value(formData, "paymentMethod") || "cash",
    total_amount: totalAmount,
    profit_amount: profitAmount,
    customer_name: value(formData, "customerName") || null,
    notes: value(formData, "notes") || null,
  });

  if (error) redirect(`/dashboard/retail/products?date=${encodeURIComponent(saleDate)}&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/retail");
  revalidatePath("/dashboard/retail/products");
  revalidatePath("/dashboard/retail/calendar");
  revalidatePath("/dashboard/retail/reports");
  redirect(`/dashboard/retail/products?date=${encodeURIComponent(saleDate)}&saved=sale`);
}

export async function returnRetailProduct(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const productId = z.string().uuid().parse(value(formData, "productId"));
  const returnDate = value(formData, "returnDate") || new Date().toISOString().slice(0, 10);
  const quantity = Math.max(1, numberValue(formData, "quantity"));

  const { data: product, error: productError } = await supabase
    .from("retail_products")
    .select("id, purchase_price, sale_price")
    .eq("company_id", companyId)
    .eq("id", productId)
    .maybeSingle();

  if (productError || !product) {
    redirect(`/dashboard/retail/products?date=${encodeURIComponent(returnDate)}&error=${encodeURIComponent(productError?.message || "Товар не найден")}`);
  }

  const salePrice = Math.max(0, numberValue(formData, "returnPrice") || Number(product.sale_price ?? 0));
  const purchasePrice = Number(product.purchase_price ?? 0);

  if (salePrice <= 0) {
    redirect(`/dashboard/retail/products?date=${encodeURIComponent(returnDate)}&error=${encodeURIComponent("Введите сумму возврата")}`);
  }

  const { error } = await supabase.from("retail_product_sales").insert({
    company_id: companyId,
    product_id: productId,
    sale_date: returnDate,
    quantity: -quantity,
    payment_method: value(formData, "paymentMethod") || "return",
    total_amount: -(salePrice * quantity),
    profit_amount: -((salePrice - purchasePrice) * quantity),
    customer_name: value(formData, "customerName") || "Возврат",
    notes: value(formData, "notes") || "Возврат товара",
  });

  if (error) redirect(`/dashboard/retail/products?date=${encodeURIComponent(returnDate)}&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/retail");
  revalidatePath("/dashboard/retail/products");
  revalidatePath("/dashboard/retail/calendar");
  revalidatePath("/dashboard/retail/reports");
  redirect(`/dashboard/retail/products?date=${encodeURIComponent(returnDate)}&saved=return`);
}

export async function saveRetailDebt(formData: FormData) {
  const { supabase, companyId, role } = await companyContext();
  if (!canManage(role)) redirect(`/dashboard/retail/debts?error=${encodeURIComponent("Только founder/admin/manager может добавлять долги")}`);

  const dueDate = value(formData, "dueDate") || new Date().toISOString().slice(0, 10);
  const amount = Math.max(0, numberValue(formData, "amount"));
  if (amount <= 0) {
    redirect(`/dashboard/retail/debts?error=${encodeURIComponent("Введите сумму долга")}`);
  }

  const { error } = await supabase.from("retail_debts").insert({
    company_id: companyId,
    product_id: value(formData, "productId") || null,
    customer_name: z.string().min(2).parse(value(formData, "customerName")),
    phone: z.string().min(5).parse(value(formData, "phone")),
    amount,
    due_date: dueDate,
    status: value(formData, "status") || "open",
    notes: value(formData, "notes") || null,
  });

  if (error) redirect(`/dashboard/retail/debts?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/retail");
  revalidatePath("/dashboard/retail/debts");
  redirect("/dashboard/retail/debts?saved=debt");
}

export async function markRetailDebtPaid(formData: FormData) {
  const { supabase, companyId, role } = await companyContext();
  if (!canManage(role)) redirect(`/dashboard/retail/debts?error=${encodeURIComponent("Только founder/admin/manager может закрывать долги")}`);

  const debtId = z.string().uuid().parse(value(formData, "debtId"));
  const { error } = await supabase
    .from("retail_debts")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", debtId)
    .eq("company_id", companyId);

  if (error) redirect(`/dashboard/retail/debts?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/retail");
  revalidatePath("/dashboard/retail/debts");
  redirect("/dashboard/retail/debts?saved=debt-paid");
}

export async function markRetailDebtReminderSent(formData: FormData) {
  const { supabase, companyId, role } = await companyContext();
  if (!canManage(role)) redirect(`/dashboard/retail/debts?error=${encodeURIComponent("Только founder/admin/manager может отмечать напоминания")}`);

  const debtId = z.string().uuid().parse(value(formData, "debtId"));
  const { error } = await supabase
    .from("retail_debts")
    .update({ last_reminded_at: new Date().toISOString() })
    .eq("id", debtId)
    .eq("company_id", companyId);

  if (error) redirect(`/dashboard/retail/debts?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/retail");
  revalidatePath("/dashboard/retail/debts");
  redirect("/dashboard/retail/debts?saved=debt-reminder");
}

export async function saveBakerySale(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const shopId = z.string().uuid().parse(value(formData, "shopId"));
  const keksQty = Math.max(0, numberValue(formData, "keksQty"));
  const korzhikQty = Math.max(0, numberValue(formData, "korzhikQty"));
  const plyannikQty = Math.max(0, numberValue(formData, "plyannikQty"));
  const keksReturn = Math.max(0, numberValue(formData, "keksReturn"));
  const korzhikReturn = Math.max(0, numberValue(formData, "korzhikReturn"));
  const plyannikReturn = Math.max(0, numberValue(formData, "plyannikReturn"));
  const expectedAmount =
    Math.max(0, keksQty - keksReturn) * BAKERY_PRICES.keks
    + Math.max(0, korzhikQty - korzhikReturn) * BAKERY_PRICES.korzhik
    + Math.max(0, plyannikQty - plyannikReturn) * BAKERY_PRICES.plyannik;
  const cashAmount = Math.max(0, numberValue(formData, "cashAmount"));
  const kaspiAmount = Math.max(0, numberValue(formData, "kaspiAmount"));
  const debtAmount = Math.max(0, numberValue(formData, "debtAmount") || expectedAmount - cashAmount - kaspiAmount);

  const { error } = await supabase.from("bakery_sales").insert({
    company_id: companyId,
    shop_id: shopId,
    sale_date: value(formData, "saleDate") || new Date().toISOString().slice(0, 10),
    keks_qty: keksQty,
    korzhik_qty: korzhikQty,
    plyannik_qty: plyannikQty,
    keks_return: keksReturn,
    korzhik_return: korzhikReturn,
    plyannik_return: plyannikReturn,
    cash_amount: cashAmount,
    kaspi_amount: kaspiAmount,
    debt_amount: debtAmount,
    expected_amount: expectedAmount,
    comment: value(formData, "comment") || null,
  });

  if (error) redirect(`/dashboard/bakery/shops?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/bakery");
  revalidatePath("/dashboard/bakery/shops");
  redirect("/dashboard/bakery/shops");
}

export async function markBakeryShopDebtPaid(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const shopId = z.string().uuid().parse(value(formData, "shopId"));

  const { error } = await supabase
    .from("bakery_sales")
    .update({ debt_amount: 0 })
    .eq("company_id", companyId)
    .eq("shop_id", shopId)
    .gt("debt_amount", 0);

  if (error) redirect(`/dashboard/bakery/debts?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/bakery");
  revalidatePath("/dashboard/bakery/debts");
  redirect("/dashboard/bakery/debts?saved=debt");
}

export async function saveCustomer(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const id = value(formData, "id");
  if (!id) {
    const { count } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);
    if ((count ?? 0) >= FREE_CUSTOMER_LIMIT) {
      redirect(`/dashboard/customers?error=${encodeURIComponent("Free plan allows up to 500 customers")}`);
    }
  }
  const payload = {
    name: z.string().min(2).parse(value(formData, "name")),
    phone: value(formData, "phone") || null,
    email: value(formData, "email") || null,
    status: value(formData, "status") || "lead",
    value: numberValue(formData, "value"),
  };
  const result = id
    ? await supabase.from("customers").update(payload).eq("id", id)
    : await supabase.from("customers").insert({ ...payload, company_id: companyId });

  if (result.error) redirect(`/dashboard/customers?error=${encodeURIComponent(result.error.message)}`);
  revalidatePath("/dashboard/customers");
}

export async function deleteCustomer(formData: FormData) {
  const { supabase } = await companyContext();
  const { error } = await supabase.from("customers").delete().eq("id", value(formData, "id"));
  if (error) redirect(`/dashboard/customers?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/customers");
}

export async function saveEmployee(formData: FormData) {
  const { supabase, companyId, role } = await companyContext();
  if (!canManage(role)) redirect(`/dashboard/employees?error=${encodeURIComponent("Only founders, admins, and managers can save employees")}`);

  const id = value(formData, "id");
  if (!id) {
    const { count } = await supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);
    if ((count ?? 0) >= FREE_EMPLOYEE_LIMIT) {
      redirect(`/dashboard/employees?error=${encodeURIComponent("Free plan allows up to 5 employees")}`);
    }
  }
  const payload = {
    name: z.string().min(2).parse(value(formData, "name")),
    email: value(formData, "email") || null,
    phone: value(formData, "phone") || null,
    position: value(formData, "position") || "Employee",
    salary: numberValue(formData, "salary"),
  };
  const result = id
    ? await supabase.from("employees").update(payload).eq("id", id)
    : await supabase.from("employees").insert({ ...payload, company_id: companyId });

  if (result.error) redirect(`/dashboard/employees?error=${encodeURIComponent(result.error.message)}`);
  revalidatePath("/dashboard/employees");
  redirect("/dashboard/employees?saved=employee");
}

export async function deleteEmployee(formData: FormData) {
  const { supabase, companyId, role } = await companyContext();
  if (!canManage(role)) redirect(`/dashboard/employees?error=${encodeURIComponent("Only founders, admins, and managers can delete employees")}`);

  const { error } = await supabase.from("employees").delete().eq("id", value(formData, "id")).eq("company_id", companyId);
  if (error) redirect(`/dashboard/employees?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/employees");
  redirect("/dashboard/employees?saved=deleted");
}

export async function saveTask(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const id = value(formData, "id");
  const assignee = value(formData, "assigneeId");
  const payload = {
    title: z.string().min(2).parse(value(formData, "title")),
    description: value(formData, "description") || null,
    assignee_id: assignee || null,
    status: (value(formData, "status") || "todo") as TaskStatus,
    due_date: value(formData, "dueDate") || null,
  };
  const result = id
    ? await supabase.from("tasks").update(payload).eq("id", id)
    : await supabase.from("tasks").insert({ ...payload, company_id: companyId });
  if (result.error) redirect(`/dashboard/tasks?error=${encodeURIComponent(result.error.message)}`);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTask(formData: FormData) {
  const { supabase } = await companyContext();
  const { error } = await supabase.from("tasks").delete().eq("id", value(formData, "id"));
  if (error) redirect(`/dashboard/tasks?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/tasks");
}

export async function saveInventoryItem(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const id = value(formData, "id");
  const payload = {
    name: z.string().min(2).parse(value(formData, "name")),
    sku: value(formData, "sku") || null,
    quantity: Math.trunc(numberValue(formData, "quantity")),
    price: numberValue(formData, "price"),
    reorder_level: Math.trunc(numberValue(formData, "reorderLevel")),
  };
  const result = id
    ? await supabase.from("inventory_items").update(payload).eq("id", id)
    : await supabase.from("inventory_items").insert({ ...payload, company_id: companyId });

  if (result.error) redirect(`/dashboard/inventory?error=${encodeURIComponent(result.error.message)}`);
  revalidatePath("/dashboard/inventory");
}

export async function deleteInventoryItem(formData: FormData) {
  const { supabase } = await companyContext();
  const { error } = await supabase.from("inventory_items").delete().eq("id", value(formData, "id"));
  if (error) redirect(`/dashboard/inventory?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/inventory");
}

export async function updateCompany(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const businessType = businessIndustrySchema.parse(value(formData, "businessType"));
  const dashboardRoute = dashboardRouteForIndustry(businessType);
  const payload = {
    name: z.string().min(2).parse(value(formData, "companyName")),
    business_type: businessType,
    dashboard_route: dashboardRoute,
    country: z.string().min(2).parse(value(formData, "country")),
    phone: value(formData, "phone") || null,
  };
  const { error } = await supabase.from("companies").update(payload).eq("id", companyId);
  if (error) redirect(`/dashboard/settings?error=${encodeURIComponent(error.message)}`);
  await supabase.from("company_members").update({ dashboard_route: dashboardRoute }).eq("company_id", companyId);
  revalidatePath("/dashboard/settings");
  revalidatePath(dashboardRoute);
}

export async function updateProfile(formData: FormData) {
  const { user, supabase } = await requireUser();
  const payload = {
    full_name: z.string().min(2).parse(value(formData, "fullName")),
    phone: value(formData, "phone") || null,
  };
  const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
  if (error) redirect(`/dashboard/profile?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/profile");
}

export async function saveRoboticsRecord(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const moduleKey = value(formData, "module") as RoboticsModuleKey;
  const crmModule = getRoboticsModule(moduleKey);
  if (!crmModule.table) redirect("/dashboard/education");

  const id = value(formData, "id");
  const payload: Record<string, string | number | null> = {};
  for (const field of crmModule.fields) {
    payload[field.name] = roboticsValue(formData, field.name, field.type);
  }
  if (moduleKey === "groups") {
    payload.skip_holidays = payload.skip_holidays || "no";
    payload.status = payload.status || "active";
    payload.schedule = payload.schedule || "";
    payload.max_students = Number(payload.max_students ?? 0) || 12;
  }

  const result = id
    ? await supabase.from(crmModule.table).update(payload).eq("id", id).eq("company_id", companyId)
    : await supabase.from(crmModule.table).insert({ ...payload, company_id: companyId });

  if (result.error) redirect(`${crmModule.href}?error=${encodeURIComponent(result.error.message)}`);
  revalidatePath(crmModule.href);
  if (moduleKey === "students") {
    revalidatePath("/dashboard/education/attendance");
    revalidatePath("/dashboard/education/payments");
    revalidatePath("/dashboard/education/subscriptions");
    revalidatePath("/dashboard/education/schedule");
    revalidatePath("/dashboard/education/groups");
    revalidatePath("/dashboard/education/families");
  }
  if (moduleKey === "groups") {
    const groupName = String(payload.name ?? "");
    const mentorName = String(payload.mentor_name ?? "");
    if (groupName) {
      await supabase
        .from("robotics_students")
        .update({ mentor_name: mentorName || null })
        .eq("company_id", companyId)
        .eq("group_name", groupName);
    }
    revalidatePath("/dashboard/education/students");
    revalidatePath("/dashboard/education/attendance");
    revalidatePath("/dashboard/education/payments");
    revalidatePath("/dashboard/education/subscriptions");
    revalidatePath("/dashboard/education/schedule");
    revalidatePath("/dashboard/mentor");
  }
  if (moduleKey === "mentors") {
    revalidatePath("/dashboard/education/students");
    revalidatePath("/dashboard/education/groups");
    revalidatePath("/dashboard/education/schedule");
    revalidatePath("/dashboard/education/tasks");
    revalidatePath("/dashboard/education/inventory");
  }
}

export async function confirmStudentPayment(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const studentName = z.string().min(1).parse(value(formData, "studentName"));
  const groupName = value(formData, "groupName") || null;
  const today = new Date().toISOString().slice(0, 10);

  const subscription = await supabase
    .from("robotics_subscriptions")
    .select("id, total_lessons, price, subscription_type")
    .eq("company_id", companyId)
    .eq("student_name", studentName)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const totalLessons = Number(subscription.data?.total_lessons ?? 8) || 8;
  const price = Number(subscription.data?.price ?? 0) || 0;
  const subscriptionType = String(subscription.data?.subscription_type ?? "Стандарт");

  const payment = await supabase.from("robotics_payments").insert({
    company_id: companyId,
    student_name: studentName,
    group_name: groupName,
    amount: price,
    paid_at: today,
    method: "Kaspi",
    status: "оплачено",
    comment: `Подтверждено: ${totalLessons} занятий`,
  });

  if (payment.error) redirect(`/dashboard/education/payments?error=${encodeURIComponent(payment.error.message)}`);

  const subscriptionPayload = {
    group_name: groupName,
    subscription_type: subscriptionType,
    total_lessons: totalLessons,
    remaining_lessons: totalLessons,
    start_date: today,
    end_date: isoDate(addDays(new Date(), 30)),
    price,
    status: "active",
  };

  const subscriptionResult = subscription.data?.id
    ? await supabase
      .from("robotics_subscriptions")
      .update(subscriptionPayload)
      .eq("id", subscription.data.id)
      .eq("company_id", companyId)
    : await supabase
      .from("robotics_subscriptions")
      .insert({ ...subscriptionPayload, company_id: companyId, student_name: studentName });

  if (subscriptionResult.error) redirect(`/dashboard/education/payments?error=${encodeURIComponent(subscriptionResult.error.message)}`);

  revalidatePath("/dashboard/education/payments");
  revalidatePath("/dashboard/education/subscriptions");
  revalidatePath("/dashboard/education/attendance");
}

export async function saveStudentGrade(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const studentName = z.string().min(1).parse(value(formData, "studentName"));
  const score = z.coerce.number().min(0).max(100).parse(value(formData, "score"));
  const gradeDate = value(formData, "gradeDate") || new Date().toISOString().slice(0, 10);
  const groupName = value(formData, "groupName") || null;
  const mentorName = value(formData, "mentorName") || null;
  const comment = value(formData, "comment") || null;

  const existing = await supabase
    .from("robotics_grades")
    .select("id")
    .eq("company_id", companyId)
    .eq("student_name", studentName)
    .eq("grade_date", gradeDate)
    .maybeSingle();

  const payload = {
    company_id: companyId,
    student_name: studentName,
    group_name: groupName,
    mentor_name: mentorName,
    score,
    grade_date: gradeDate,
    comment,
  };

  const result = existing.data?.id
    ? await supabase.from("robotics_grades").update(payload).eq("id", existing.data.id).eq("company_id", companyId)
    : await supabase.from("robotics_grades").insert(payload);

  if (result.error) redirect(`/dashboard/education/reports?error=${encodeURIComponent(result.error.message)}`);
  revalidatePath("/dashboard/education/reports");
}

export async function deleteRoboticsRecord(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const moduleKey = value(formData, "module") as RoboticsModuleKey;
  const crmModule = getRoboticsModule(moduleKey);
  if (!crmModule.table) redirect("/dashboard/education");
  const id = z.string().uuid().parse(value(formData, "id"));
  const { error } = await supabase.from(crmModule.table).delete().eq("id", id).eq("company_id", companyId);
  if (error) redirect(`${crmModule.href}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(crmModule.href);
}

export async function createLessonsFromGroupSchedule(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const groupId = z.string().uuid().parse(value(formData, "groupId"));
  const startDateRaw = value(formData, "startDate");
  const endDateRaw = value(formData, "endDate");
  const topic = value(formData, "topic") || "Плановый урок";

  const { data: group, error: groupError } = await supabase
    .from("robotics_groups")
    .select("*")
    .eq("id", groupId)
    .eq("company_id", companyId)
    .single();

  if (groupError || !group) {
    redirect(`/dashboard/education/groups?error=${encodeURIComponent(groupError?.message ?? "Group not found")}`);
  }

  const startDate = new Date(startDateRaw || String(group.schedule_start_date ?? "") || isoDate(new Date()));
  const endDate = new Date(endDateRaw || String(group.schedule_end_date ?? "") || isoDate(addDays(new Date(), 60)));
  const days = parseScheduleDays(String(group.schedule_days ?? group.schedule ?? ""));

  if (!days.length) redirect("/dashboard/education/groups?error=Add schedule days first, for example Monday, Wednesday");
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    redirect("/dashboard/education/groups?error=Check schedule start and end dates");
  }

  const seriesId = crypto.randomUUID();
  const lessons: Array<{ company_id: string; [key: string]: string | number | null }> = [];
  for (let day = startDate; day <= endDate; day = addDays(day, 1)) {
    if (!days.includes(day.getDay())) continue;
    lessons.push({
      company_id: companyId,
      lesson_date: isoDate(day),
      lesson_time: String(group.start_time ?? "10:00"),
      lesson_end_time: String(group.end_time ?? ""),
      event_type: "group",
      group_name: String(group.name ?? ""),
      room: String(group.room ?? ""),
      mentor_name: String(group.mentor_name ?? ""),
      topic,
      status: "scheduled",
      source_group_id: groupId,
      series_id: seriesId,
      recurrence_rule: `weekly:${String(group.schedule_days ?? "")}`,
    });
  }

  if (!lessons.length) redirect("/dashboard/education/groups?error=No lessons matched the selected dates");

  const { error } = await supabase.from("robotics_lessons").insert(lessons);
  if (error) redirect(`/dashboard/education/groups?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/education/groups");
  revalidatePath("/dashboard/education/schedule");
}

export async function saveLessonAttendance(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const lessonId = z.string().uuid().parse(value(formData, "lessonId"));
  const lessonDate = value(formData, "lessonDate");
  const groupName = value(formData, "groupName");
  const mentorName = value(formData, "mentorName");
  const studentNames = formData.getAll("studentName").filter((item): item is string => typeof item === "string");

  for (const studentName of studentNames) {
    const status = value(formData, `status:${studentName}`) || "присутствовал";
    const payload = {
      company_id: companyId,
      lesson_id: lessonId,
      student_name: studentName,
      lesson_date: lessonDate,
      status,
      group_name: groupName || null,
      mentor_name: mentorName || null,
      comment: value(formData, `comment:${studentName}`) || null,
    };

    const existing = await supabase
      .from("robotics_attendance")
      .select("id")
      .eq("company_id", companyId)
      .eq("lesson_id", lessonId)
      .eq("student_name", studentName)
      .maybeSingle();

    const result = existing.data?.id
      ? await supabase.from("robotics_attendance").update(payload).eq("id", existing.data.id).eq("company_id", companyId)
      : await supabase.from("robotics_attendance").insert(payload);

    if (result.error) redirect(`/dashboard/education/schedule?error=${encodeURIComponent(result.error.message)}`);

    if (status === "присутствовал" || status === "опоздал") {
      const subscription = await supabase
        .from("robotics_subscriptions")
        .select("id, remaining_lessons")
        .eq("company_id", companyId)
        .eq("student_name", studentName)
        .gt("remaining_lessons", 0)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscription.data?.id) {
        await supabase
          .from("robotics_subscriptions")
          .update({ remaining_lessons: Math.max(0, Number(subscription.data.remaining_lessons ?? 0) - 1) })
          .eq("id", subscription.data.id)
          .eq("company_id", companyId);
      }
    }
  }

  revalidatePath("/dashboard/education/schedule");
  revalidatePath("/dashboard/education/attendance");
  revalidatePath("/dashboard/education/subscriptions");
}

export async function saveSingleLessonAttendance(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const lessonId = z.string().uuid().parse(value(formData, "lessonId"));
  const lessonDate = value(formData, "lessonDate");
  const groupName = value(formData, "groupName");
  const mentorName = value(formData, "mentorName");
  const studentName = value(formData, "studentName");
  const status = value(formData, "status") || "присутствовал";

  const existing = await supabase
    .from("robotics_attendance")
    .select("id, status")
    .eq("company_id", companyId)
    .eq("lesson_id", lessonId)
    .eq("student_name", studentName)
    .maybeSingle();

  const payload = {
    company_id: companyId,
    lesson_id: lessonId,
    student_name: studentName,
    lesson_date: lessonDate,
    status,
    group_name: groupName || null,
    mentor_name: mentorName || null,
    comment: value(formData, "comment") || null,
  };

  const result = existing.data?.id
    ? await supabase.from("robotics_attendance").update(payload).eq("id", existing.data.id).eq("company_id", companyId)
    : await supabase.from("robotics_attendance").insert(payload);

  if (result.error) redirect(`/dashboard/education/schedule?error=${encodeURIComponent(result.error.message)}`);

  const wasAlreadyCounted = existing.data?.status === "присутствовал" || existing.data?.status === "опоздал";
  if (!wasAlreadyCounted && (status === "присутствовал" || status === "опоздал")) {
    const subscription = await supabase
      .from("robotics_subscriptions")
      .select("id, remaining_lessons")
      .eq("company_id", companyId)
      .eq("student_name", studentName)
      .gt("remaining_lessons", 0)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscription.data?.id) {
      await supabase
        .from("robotics_subscriptions")
        .update({ remaining_lessons: Math.max(0, Number(subscription.data.remaining_lessons ?? 0) - 1) })
        .eq("id", subscription.data.id)
        .eq("company_id", companyId);
    }
  }

  revalidatePath("/dashboard/education/schedule");
  revalidatePath("/dashboard/education/attendance");
  revalidatePath("/dashboard/education/subscriptions");
}

export async function saveJournalAttendance(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const studentName = z.string().min(1).parse(value(formData, "studentName"));
  const lessonDate = value(formData, "lessonDate") || new Date().toISOString().slice(0, 10);
  const status = z.enum(["присутствовал", "отсутствовал", "опоздал", "уважительный"]).parse(value(formData, "status"));
  const groupName = value(formData, "groupName") || null;
  const mentorName = value(formData, "mentorName") || null;
  const comment = value(formData, "comment") || null;

  const existing = await supabase
    .from("robotics_attendance")
    .select("id, status")
    .eq("company_id", companyId)
    .eq("student_name", studentName)
    .eq("lesson_date", lessonDate)
    .is("lesson_id", null)
    .maybeSingle();

  const payload = {
    company_id: companyId,
    lesson_id: null,
    student_name: studentName,
    lesson_date: lessonDate,
    status,
    group_name: groupName,
    mentor_name: mentorName,
    comment,
  };

  const result = existing.data?.id
    ? await supabase.from("robotics_attendance").update(payload).eq("id", existing.data.id).eq("company_id", companyId)
    : await supabase.from("robotics_attendance").insert(payload);

  if (result.error) redirect(`/dashboard/education/attendance?error=${encodeURIComponent(result.error.message)}`);

  const wasAlreadyCounted = existing.data?.status === "присутствовал" || existing.data?.status === "опоздал";
  if (!wasAlreadyCounted && (status === "присутствовал" || status === "опоздал")) {
    const subscription = await supabase
      .from("robotics_subscriptions")
      .select("id, remaining_lessons")
      .eq("company_id", companyId)
      .eq("student_name", studentName)
      .gt("remaining_lessons", 0)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscription.data?.id) {
      await supabase
        .from("robotics_subscriptions")
        .update({ remaining_lessons: Math.max(0, Number(subscription.data.remaining_lessons ?? 0) - 1) })
        .eq("id", subscription.data.id)
        .eq("company_id", companyId);
    }
  }

  revalidatePath("/dashboard/education/attendance");
  revalidatePath("/dashboard/education/subscriptions");
}

export async function saveMentorLessonSession(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const groupId = z.string().uuid().parse(value(formData, "groupId"));
  const groupName = z.string().min(1).parse(value(formData, "groupName"));
  const mentorName = value(formData, "mentorName") || null;
  const lessonDate = value(formData, "lessonDate") || new Date().toISOString().slice(0, 10);
  const lessonTime = value(formData, "lessonTime") || "10:00";
  const lessonEndTime = value(formData, "lessonEndTime") || null;
  const room = value(formData, "room") || "Кабинет";
  const topic = z.string().min(2).parse(value(formData, "topic"));
  const studentNames = formData.getAll("studentName").filter((item): item is string => typeof item === "string");

  const existingLesson = await supabase
    .from("robotics_lessons")
    .select("id")
    .eq("company_id", companyId)
    .eq("source_group_id", groupId)
    .eq("lesson_date", lessonDate)
    .maybeSingle();

  const lessonPayload = {
    company_id: companyId,
    lesson_date: lessonDate,
    lesson_time: lessonTime,
    lesson_end_time: lessonEndTime,
    event_type: "group",
    group_name: groupName,
    room,
    mentor_name: mentorName || "",
    topic,
    status: "done",
    source_group_id: groupId,
  };

  const lessonResult = existingLesson.data?.id
    ? await supabase.from("robotics_lessons").update(lessonPayload).eq("id", existingLesson.data.id).eq("company_id", companyId).select("id").single()
    : await supabase.from("robotics_lessons").insert(lessonPayload).select("id").single();

  if (lessonResult.error || !lessonResult.data?.id) {
    redirect(`/dashboard/mentor?group=${groupId}&error=${encodeURIComponent(lessonResult.error?.message ?? "Lesson save failed")}`);
  }

  const lessonId = lessonResult.data.id;

  for (const studentName of studentNames) {
    const status = z.enum(["присутствовал", "отсутствовал", "опоздал", "уважительный"]).parse(value(formData, `status:${studentName}`) || "присутствовал");
    const comment = value(formData, `comment:${studentName}`) || null;
    const scoreRaw = value(formData, `score:${studentName}`);
    const score = scoreRaw ? z.coerce.number().min(0).max(100).parse(scoreRaw) : null;
    const gradeComment = value(formData, `gradeComment:${studentName}`) || null;

    const existingAttendance = await supabase
      .from("robotics_attendance")
      .select("id, status")
      .eq("company_id", companyId)
      .eq("lesson_id", lessonId)
      .eq("student_name", studentName)
      .maybeSingle();

    const attendancePayload = {
      company_id: companyId,
      lesson_id: lessonId,
      student_name: studentName,
      lesson_date: lessonDate,
      status,
      group_name: groupName,
      mentor_name: mentorName,
      comment,
    };

    const attendanceResult = existingAttendance.data?.id
      ? await supabase.from("robotics_attendance").update(attendancePayload).eq("id", existingAttendance.data.id).eq("company_id", companyId)
      : await supabase.from("robotics_attendance").insert(attendancePayload);

    if (attendanceResult.error) {
      redirect(`/dashboard/mentor?group=${groupId}&error=${encodeURIComponent(attendanceResult.error.message)}`);
    }

    const wasAlreadyCounted = existingAttendance.data?.status === "присутствовал" || existingAttendance.data?.status === "опоздал";
    if (!wasAlreadyCounted && (status === "присутствовал" || status === "опоздал")) {
      const subscription = await supabase
        .from("robotics_subscriptions")
        .select("id, remaining_lessons")
        .eq("company_id", companyId)
        .eq("student_name", studentName)
        .gt("remaining_lessons", 0)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscription.data?.id) {
        await supabase
          .from("robotics_subscriptions")
          .update({ remaining_lessons: Math.max(0, Number(subscription.data.remaining_lessons ?? 0) - 1) })
          .eq("id", subscription.data.id)
          .eq("company_id", companyId);
      }
    }

    if (score !== null) {
      const existingGrade = await supabase
        .from("robotics_grades")
        .select("id")
        .eq("company_id", companyId)
        .eq("student_name", studentName)
        .eq("grade_date", lessonDate)
        .maybeSingle();

      const gradePayload = {
        company_id: companyId,
        student_name: studentName,
        group_name: groupName,
        mentor_name: mentorName,
        score,
        grade_date: lessonDate,
        comment: gradeComment,
      };

      const gradeResult = existingGrade.data?.id
        ? await supabase.from("robotics_grades").update(gradePayload).eq("id", existingGrade.data.id).eq("company_id", companyId)
        : await supabase.from("robotics_grades").insert(gradePayload);

      if (gradeResult.error) {
        redirect(`/dashboard/mentor?group=${groupId}&error=${encodeURIComponent(gradeResult.error.message)}`);
      }
    }
  }

  revalidatePath("/dashboard/mentor");
  revalidatePath("/dashboard/education/attendance");
  revalidatePath("/dashboard/education/reports");
  revalidatePath("/dashboard/education/schedule");
  revalidatePath("/dashboard/education/subscriptions");
  redirect(`/dashboard/mentor?group=${groupId}&saved=1`);
}

export async function assignStudentToGroup(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const studentId = z.string().uuid().parse(value(formData, "studentId"));
  const groupName = z.string().min(1).parse(value(formData, "groupName"));
  const mentorName = value(formData, "mentorName") || null;
  const { error } = await supabase
    .from("robotics_students")
    .update({ group_name: groupName, mentor_name: mentorName })
    .eq("id", studentId)
    .eq("company_id", companyId);
  if (error) redirect(`/dashboard/education/groups?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/education/groups");
  revalidatePath("/dashboard/education/students");
}

export async function assignStudentsToGroup(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const studentIds = formData.getAll("studentId").filter((item): item is string => typeof item === "string" && Boolean(item));
  const groupName = z.string().min(1).parse(value(formData, "groupName"));
  const mentorName = value(formData, "mentorName") || null;

  if (!studentIds.length) {
    redirect(`/dashboard/education/groups?error=${encodeURIComponent("Выберите хотя бы одного ученика")}`);
  }

  const { error } = await supabase
    .from("robotics_students")
    .update({ group_name: groupName, mentor_name: mentorName })
    .eq("company_id", companyId)
    .in("id", studentIds);

  if (error) redirect(`/dashboard/education/groups?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/education/groups");
  revalidatePath("/dashboard/education/students");
  revalidatePath("/dashboard/education/attendance");
  revalidatePath("/dashboard/mentor");
}

export async function removeStudentFromGroup(formData: FormData) {
  const { supabase, companyId } = await companyContext();
  const studentId = z.string().uuid().parse(value(formData, "studentId"));
  const { error } = await supabase
    .from("robotics_students")
    .update({ group_name: null, mentor_name: null })
    .eq("id", studentId)
    .eq("company_id", companyId);
  if (error) redirect(`/dashboard/education/groups?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/education/groups");
  revalidatePath("/dashboard/education/students");
}

export async function seedRoboticsDemoData() {
  const { supabase, companyId } = await companyContext();
  const inserts = [
    supabase.from("robotics_students").insert([
      { company_id: companyId, first_name: "Amina", last_name: "Saken", parent_name: "Aigerim", parent_phone: "+77010000001", whatsapp: "+77010000001", school: "NIS", grade: "5", group_name: "Robo Starter", mentor_name: "Daniyar", status: "active", notes: "Strong LEGO SPIKE progress" },
      { company_id: companyId, first_name: "Timur", last_name: "Omar", parent_name: "Murat", parent_phone: "+77010000002", whatsapp: "+77010000002", school: "School 7", grade: "6", group_name: "Arduino Lab", mentor_name: "Aruzhan", status: "active", notes: "Needs attendance follow-up" },
    ]),
    supabase.from("robotics_groups").insert([
      { company_id: companyId, name: "Robo Starter", age_range: "8-10", course: "LEGO Robotics", mentor_name: "Daniyar", schedule: "Tue Thu 16:00", room: "A1", rating: 4.8 },
      { company_id: companyId, name: "Arduino Lab", age_range: "11-14", course: "Arduino", mentor_name: "Aruzhan", schedule: "Mon Wed 18:00", room: "B2", rating: 4.6 },
    ]),
    supabase.from("robotics_mentors").insert([
      { company_id: companyId, name: "Daniyar Robotics", phone: "+77015550101", position: "Mentor", groups: "Robo Starter", schedule: "Tue Thu", efficiency: 92 },
      { company_id: companyId, name: "Aruzhan Code", phone: "+77015550102", position: "Senior Mentor", groups: "Arduino Lab", schedule: "Mon Wed", efficiency: 88 },
    ]),
    supabase.from("robotics_payments").insert([
      { company_id: companyId, student_name: "Amina Saken", amount: 45000, paid_at: new Date().toISOString().slice(0, 10), method: "Kaspi", status: "оплачено", comment: "Monthly subscription" },
      { company_id: companyId, student_name: "Timur Omar", amount: 22500, paid_at: new Date().toISOString().slice(0, 10), method: "карта", status: "частично", comment: "Half paid" },
    ]),
    supabase.from("robotics_lessons").insert([
      { company_id: companyId, lesson_date: new Date().toISOString().slice(0, 10), lesson_time: "16:00", group_name: "Robo Starter", room: "A1", mentor_name: "Daniyar", topic: "Sensors and loops" },
      { company_id: companyId, lesson_date: new Date().toISOString().slice(0, 10), lesson_time: "18:00", group_name: "Arduino Lab", room: "B2", mentor_name: "Aruzhan", topic: "LED circuits" },
    ]),
    supabase.from("robotics_inventory").insert([
      { company_id: companyId, name: "LEGO SPIKE Prime", category: "Kit", quantity: 8, price: 220000, condition: "good", location: "A1", responsible: "Daniyar", unique_id: "SPIKE-001" },
      { company_id: companyId, name: "Arduino Uno", category: "Board", quantity: 20, price: 8500, condition: "good", location: "B2", responsible: "Aruzhan", unique_id: "ARD-001" },
    ]),
    supabase.from("robotics_learning").insert([
      { company_id: companyId, lesson_number: 1, title: "Система светофора", concept: "Датчик цвета и условия IF/ELSE", course: "SPIKE Prime", level: "beginner", practice: "Собрать шасси, закрепить датчик цвета и протестировать красный/зелёный сигнал.", checklist: "Датчик 8-15 мм\nБесконечный цикл\nОстановка на красном", status: "active" },
      { company_id: companyId, lesson_number: 2, title: "Датчик касания и лабиринт", concept: "Реакция робота на столкновение", course: "SPIKE Prime", level: "beginner", practice: "Собрать бампер, подключить датчик касания, запрограммировать отъезд и разворот.", checklist: "Бампер нажимает датчик\nРобот отъезжает назад\nПоворот уводит от стены", status: "active" },
      { company_id: companyId, lesson_number: 3, title: "Ультразвуковой датчик расстояния", concept: "Зрение робота и безопасная дистанция", course: "SPIKE Prime", level: "beginner", practice: "Закрепить датчик спереди и объехать препятствия по условию расстояния.", checklist: "Датчик смотрит прямо\nИспользуются сантиметры\nРобот успевает остановиться", status: "active" },
      { company_id: companyId, lesson_number: 5, title: "Движение по чёрной линии", concept: "Релейный регулятор", course: "SPIKE Prime", level: "intermediate", practice: "Настроить датчик цвета вниз и движение по краю линии.", checklist: "Порог чёрного/белого\nДатчик 8-10 мм\n3 круга без схода", status: "planned" },
      { company_id: companyId, lesson_number: 8, title: "Боевое робо-сумо", concept: "Стратегия атаки и защита от края", course: "SPIKE Prime", level: "intermediate", practice: "Построить сумо-робота с ковшом, ультразвуком и датчиком края.", checklist: "Габариты проверены\nБелая линия распознаётся\nАтака при цели впереди", status: "planned" },
      { company_id: companyId, lesson_number: 17, title: "Переход на EV3", concept: "Новая платформа, старые принципы", course: "EV3", level: "intermediate", practice: "Собрать EV3-сумо и сравнить поведение со SPIKE Prime.", checklist: "Моторы подключены\nДатчики проверены\nНайдены отличия платформ", status: "planned" },
      { company_id: companyId, lesson_number: 29, title: "PyBricks: Hello World", concept: "Первый текстовый код", course: "Python", level: "advanced", practice: "Написать программу: робот едет 50 см, издаёт сигнал и выводит имя команды.", checklist: "Импорты верные\nПорты моторов указаны\nКод запускается без ошибок", status: "planned" },
    ]),
    supabase.from("robotics_methods").insert([
      { company_id: companyId, title: "S7 Lesson Checklist", course: "SPIKE Prime", lesson_number: 1, level: "beginner", goal: "Стандартизировать урок: цель, сборка, код, тест, фидбек родителю.", materials: "SPIKE Prime kit, цветные карточки, ноутбук", instructions: "1. Показать задачу\n2. Собрать базу\n3. Написать условие\n4. Провести 3 теста", checklist: "Цель объяснена\nРобот протестирован\nФидбек записан", status: "active" },
    ]),
    supabase.from("robotics_feedback").insert([
      { company_id: companyId, student_name: "Amina Saken", group_name: "Robo Starter", mentor_name: "Daniyar", skill: "Датчики", score: 9, feedback_date: new Date().toISOString().slice(0, 10), status: "новый", note: "Хорошо поняла цветовой датчик, нужно закрепить IF/ELSE." },
    ]),
    supabase.from("robotics_team").insert([
      { company_id: companyId, name: "Daniyar Robotics", role: "mentor", phone: "+77015550101", email: "daniyar@s7.kz", groups: "Robo Starter", permissions: "attendance, feedback, learning", status: "active" },
      { company_id: companyId, name: "Aruzhan Code", role: "mentor", phone: "+77015550102", email: "aruzhan@s7.kz", groups: "Arduino Lab", permissions: "attendance, feedback, schedule", status: "active" },
    ]),
  ];

  const results = await Promise.all(inserts);
  const error = results.find((result) => result.error)?.error;
  if (error) redirect(`/dashboard/education?error=${encodeURIComponent(error.message)}`);
  for (const crmModule of roboticsModuleList) revalidatePath(crmModule.href);
  revalidatePath("/dashboard/education");
}
