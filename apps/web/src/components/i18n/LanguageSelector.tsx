"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { LOCALES, useI18n, Locale } from "@/i18n/I18nProvider";

export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);

  const selected = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={t("language.select")}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
      >
        <Globe className="h-4 w-4" />
        <span>{selected.native}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border bg-white py-1 shadow-lg animate-fade-in">
            {LOCALES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLocale(lang.code as Locale);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                  locale === lang.code ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"
                }`}
              >
                <span>{lang.native}</span>
                <span className="text-xs text-gray-400">{lang.code.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default LanguageSelector;
