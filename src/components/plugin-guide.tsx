"use client";

import { useState } from "react";
import type { DICT } from "@/i18n";
import { GitHubMark } from "./brand";

const MARKET = "sophonz-labs/pdf-ocr-translator";
const SOURCE = "https://github.com/sophonz-labs/pdf-ocr-translator/tree/main/plugins/epub-proofread";

function Cmd({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-950 px-4 py-3 text-sm text-zinc-100">
      <code>{children}</code>
    </pre>
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
