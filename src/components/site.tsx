import Link from "next/link";
import type { ReactNode } from "react";
import { DICT, type Lang } from "@/i18n";
import { AppIcon, GitHubMark } from "./brand";
import { LangSwitch } from "./lang-switch";

export const TOOLS = ["ocr", "translate"] as const;
export type ToolTab = (typeof TOOLS)[number];

export function SiteHeader({ lang, right, onLang }: { lang: Lang; right?: ReactNode; onLang?: (l: Lang) => void }) {
  const t = DICT[lang];
  return (
    // Same width (the landing page's) and height on every page, so the header doesn't jump between pages.
    <header className="relative left-1/2 flex h-9 w-[min(62rem,calc(100cqw-2rem))] -translate-x-1/2 items-center justify-between gap-4">
      <Link href={`/${lang}`} className="flex items-center gap-2.5" aria-label={t.home}>
        <AppIcon size={32} />
        <span className="text-lg font-semibold tracking-tight">PDF OCR</span>
      </Link>
      <div className="flex items-center gap-3">
        <a
          href="https://github.com/sophonz-labs/pdf-ocr-translator"
          aria-label="GitHub"
          title="GitHub"
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          <GitHubMark className="size-5" />
        </a>
        <LangSwitch lang={lang} label={t.langSwitch} onChange={onLang} />
        {right}
      </div>
    </header>
  );
}
