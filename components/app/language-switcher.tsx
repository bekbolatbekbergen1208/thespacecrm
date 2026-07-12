"use client";

import { Globe2 } from "lucide-react";
import { LOCALES, localeLabels, normalizeLocale, type Locale } from "@/lib/i18n";

function readLocale() {
  if (typeof document === "undefined") return "ru" as Locale;
  const match = document.cookie.match(/(?:^|; )crm_locale=([^;]+)/);
  return normalizeLocale(match ? decodeURIComponent(match[1]) : null);
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  function changeLocale(locale: Locale) {
    document.cookie = `crm_locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = locale;
    window.location.reload();
  }

  const current = readLocale();

  if (compact) {
    return (
      <label className="relative inline-flex h-10 items-center">
        <Globe2 className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500" />
        <select
          aria-label="Language"
          defaultValue={current}
          onChange={(event) => changeLocale(event.target.value as Locale)}
          className="premium-input h-10 appearance-none rounded-full pl-9 pr-4 text-sm font-bold text-white outline-none"
        >
          {LOCALES.map((locale) => (
            <option key={locale} value={locale}>{locale.toUpperCase()}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/[0.045] p-1">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => changeLocale(locale)}
          className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
            current === locale ? "bg-white text-slate-950 shadow-glow" : "text-slate-400 hover:text-white"
          }`}
          aria-pressed={current === locale}
        >
          {localeLabels[locale]}
        </button>
      ))}
    </div>
  );
}
