import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig, hasSupabaseConfig } from "./config";
import type { Database } from "./types";

const REMEMBER_SESSION_COOKIE = "crm_remember_session";
const REMEMBER_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

type CreateClientOptions = {
  rememberSession?: boolean;
};

export function hasSupabaseEnv() {
  return hasSupabaseConfig();
}

export async function createClient(options?: CreateClientOptions) {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseConfig();
  const rememberSession =
    options?.rememberSession ?? cookieStore.get(REMEMBER_SESSION_COOKIE)?.value === "1";

  if (!hasSupabaseEnv()) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, rememberSession ? { ...options, maxAge: REMEMBER_SESSION_MAX_AGE } : options);
            });
          } catch {
            // Server components cannot write cookies; middleware refreshes sessions.
          }
        },
      },
    },
  );
}

export async function setRememberSession(rememberSession: boolean) {
  const cookieStore = await cookies();

  if (rememberSession) {
    cookieStore.set(REMEMBER_SESSION_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: REMEMBER_SESSION_MAX_AGE,
    });
    return;
  }

  cookieStore.delete(REMEMBER_SESSION_COOKIE);
}
