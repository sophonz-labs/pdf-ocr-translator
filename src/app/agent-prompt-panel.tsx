"use client";

import { useState } from "react";
import { useT } from "@/i18n-context";

/** Shown after "Build EPUB": instructions to give an AI agent with the downloaded file. */
export function AgentPrompt({ prompt }: { prompt: string }) {
  const t = useT().tr;
  const [copied, setCopied] = useState(false);
  return (
    <section className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-xl">
          <h3 className="text-sm font-medium">{t.agentTitle}</h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{t.agentBody}</p>
        </div>
        <button
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          onClick={async () => {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? t.copied : t.copyPrompt}
        </button>
      </div>
      <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed whitespace-pre-wrap text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">{prompt}</pre>
    </section>
  );
}
