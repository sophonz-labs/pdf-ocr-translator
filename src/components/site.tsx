import Link from "next/link";
import type { ReactNode } from "react";
import { DICT, type Lang } from "@/i18n";
import { AppIcon } from "./brand";
import { LangSwitch } from "./lang-switch";

export const TOOLS = ["ocr", "translate"] as const;
export type ToolTab = (typeof TOOLS)[number];

export function SiteHeader({ lang, right, onLang }: { lang: Lang; right?: ReactNode; onLang?: (l: Lang) => void }) {
  const t = DICT[lang];
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href={`/${lang}`} className="flex items-center gap-2.5" aria-label={t.home}>
        <AppIcon size={32} />
        <span className="text-lg font-semibold tracking-tight">PDF OCR</span>
      </Link>
      <div className="flex items-center gap-3">
        <LangSwitch lang={lang} label={t.langSwitch} onChange={onLang} />
        {right}
      </div>
    </header>
  );
}
