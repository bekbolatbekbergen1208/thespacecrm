import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Explicitly enabled for local development only; production keeps authentication.
export function isLocalPreview() {
  return process.env.NODE_ENV === "development" && process.env.LOCAL_PREVIEW === "true";
}

export const localUser = {
  id: "local-preview", email: "local@s7robotics.local", user_metadata: { full_name: "S7 Robotics" },
  app_metadata: {}, aud: "authenticated", created_at: "2026-01-01T00:00:00Z",
};

// Offline read-only preview. Never sends database or authentication requests.
export function createLocalPreviewClient() {
  function query() {
    let single = false;
    let mutation = false;
    const chain: unknown = new Proxy({}, {
      get(_target, property) {
        if (property === "then") {
          return (resolve: (result: unknown) => unknown) => Promise.resolve({
            data: single ? null : [], count: 0,
            error: mutation ? { message: "Локальный просмотр: сохранение пока отключено." } : null,
          }).then(resolve);
        }
        return () => {
          if (property === "single" || property === "maybeSingle") single = true;
          if (["insert", "update", "upsert", "delete"].includes(String(property))) mutation = true;
          return chain;
        };
      },
    });
    return chain;
  }
  return {
    from: query,
    auth: {
      getUser: async () => ({ data: { user: localUser }, error: null }),
      signOut: async () => ({ error: null }),
    },
  } as unknown as SupabaseClient<Database>;
}
