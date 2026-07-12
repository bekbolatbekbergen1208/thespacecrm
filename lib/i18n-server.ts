import { cookies } from "next/headers";
import { defaultLocale, getDictionary, normalizeLocale, type Locale } from "@/lib/i18n";

export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get("crm_locale")?.value ?? defaultLocale);
}

export async function getServerDictionary() {
  return getDictionary(await getServerLocale());
}
