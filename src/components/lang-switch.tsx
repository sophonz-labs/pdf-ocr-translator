"use client";

import { LANG_LABEL, LOCALES, saveLang, type Lang } from "@/i18n";

/**
 * Without `onChange` it moves to the same page under the other locale (/en/... ↔ /ko/...).
 * The tools page and the extension pass `onChange` so a switch keeps the work in progress.
 */
export function LangSwitch({ lang, label, onChange }: { lang: Lang; label: string; onChange?: (l: Lang) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-zinc-100 p-0.5 text-xs dark:bg-zinc-800">
      {LOCALES.map((l) => (
        <button
          key={l}
          role="radio"
          aria-checked={l === lang}
          lang={l}
          onClick={() => {
            if (l === lang) return;
            saveLang(l);
            if (onChange) onChange(l);
            else location.href = location.pathname.replace(/^\/(en|ko)(?=\/|$)/, `/${l}`) + location.search;
          }}
          className={`rounded-md px-2 py-1 transition ${l === lang ? "bg-white font-medium shadow-sm dark:bg-zinc-950" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
