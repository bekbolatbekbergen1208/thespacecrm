const FALLBACK_SUPABASE_URL = "https://rtyrjlyinrnlfkziagwx.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_xh2n04LvQLAkxbaeReXyEg_MwWXcidJ";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    FALLBACK_SUPABASE_ANON_KEY;

  return { url, anonKey };
}

export function hasSupabaseConfig() {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
}
