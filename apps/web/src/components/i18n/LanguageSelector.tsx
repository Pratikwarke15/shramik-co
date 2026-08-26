"use client";

import { useState, useEffect } from "react";
import { Globe } from "lucide-react";

const languages = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
];

export function LanguageSelector() {
  const [current, setCurrent] = useState("en");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("coopgig_lang");
    if (saved) setCurrent(saved);
  }, []);

  const select = (code: string) => {
    setCurrent(code);
    localStorage.setItem("coopgig_lang", code);
    setOpen(false);
  };

  const selected = languages.find((l) => l.code === current) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
      >
        <Globe className="h-4 w-4" />
        <span>{selected.native}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border bg-white py-1 shadow-lg animate-fade-in">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => select(lang.code)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                  current === lang.code ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"
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
