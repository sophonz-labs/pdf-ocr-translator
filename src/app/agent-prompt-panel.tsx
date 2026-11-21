"use client";

import { useState } from "react";
import { useT } from "@/i18n-context";

/** Shown after "Build EPUB": instructions to give an AI agent with the downloaded file. */
export function AgentPrompt({ prompt }: { prompt: string }) {
  const t = useT().tr;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <section className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-xl">
          <h3 className="text-sm font-medium">{t.agentTitle}</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{t.agentBody}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{t.openClaudeHint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Claude desktop deep link: prefills Claude Code's composer (q is cut at ~14,000 chars) and never sends. */}
          <a
            href={`claude://code/new?q=${encodeURIComponent(prompt)}`}
            onClick={copy}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {t.openClaude}
          </a>
          <button
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            onClick={copy}
          >
            {copied ? t.copied : t.copyPrompt}
          </button>
        </div>
      </div>
      <details className="group mt-3">
        <summary className="cursor-pointer text-xs text-zinc-500 select-none hover:text-zinc-800 dark:hover:text-zinc-200">
          <span className="group-open:hidden">{t.showPrompt}</span>
          <span className="hidden group-open:inline">{t.hidePrompt}</span>
        </summary>
        <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed whitespace-pre-wrap text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">{prompt}</pre>
      </details>
    </section>
  );
}
