"use client";

import { useState } from "react";
import type { DICT } from "@/i18n";

const MARKET = "sophonz-labs/pdf-ocr-translator";
const SOURCE = "https://github.com/sophonz-labs/pdf-ocr-translator/tree/main/plugins/epub-proofread";

function Cmd({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-950 px-4 py-3 text-sm text-zinc-100">
      <code>{children}</code>
    </pre>
  );
}

export function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/** Landing: how to install the proofreading plugin, in the Claude app (default) or Claude Code in a terminal. */
export function PluginGuide({ t }: { t: (typeof DICT)["en"]["landing"]["plugin"] }) {
  const [tab, setTab] = useState<"app" | "code">("app");
  const tabs = [
    ["app", t.tabApp],
    ["code", t.tabCode],
  ] as const;
  return (
    <section className="mt-24 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium">{t.title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{t.body}</p>
      <div role="tablist" className="mt-6 inline-flex rounded-lg bg-zinc-100 p-1 text-sm dark:bg-zinc-800">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-1.5 ${tab === id ? "bg-white font-medium shadow-sm dark:bg-zinc-950" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-5">
        {tab === "app" ? (
          <ol className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
            {t.app.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-zinc-400 tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  {step}
                  {i === 0 && <Cmd>{MARKET}</Cmd>}
                </div>
              </li>
            ))}
            <li className="text-xs text-zinc-500">{t.appNote}</li>
          </ol>
        ) : (
          <>
            <p className="text-sm text-zinc-500">{t.install}</p>
            <Cmd>{`/plugin install epub-proofread --marketplace ${MARKET}`}</Cmd>
            <p className="mt-4 text-sm text-zinc-500">{t.run}</p>
            <Cmd>/epub-proofread:proofread</Cmd>
          </>
        )}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-zinc-500">{t.needs}</p>
      <a
        href={SOURCE}
        className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
      >
        <GitHubMark className="size-4" />
        <span className="underline underline-offset-4">{t.source}</span>
      </a>
    </section>
  );
}
