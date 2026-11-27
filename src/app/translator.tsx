"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { COMMON_LANGS, LANGS } from "@/lib/translate";
import type { Lang } from "@/i18n";
import { useLang, useT } from "@/i18n-context";
import { agentPrompt as agentPromptText, type PromptInfo } from "@/lib/agent-prompt";
import { AgentPrompt } from "./agent-prompt-panel";
import { save } from "./save";

type Mode = "replace" | "both";
/** A book to translate: its paragraphs, and how to build the EPUB once translations are in. */
export type Job = {
  name: string;
  /** `src`: the text sent for translation when it differs from `text` (tagged inline formatting). */
  segments: { tag: string; text: string; src?: string }[];
  build: (tr: (string | undefined)[], mode: Mode, lang: string) => Uint8Array;
  /** Where the book came from; the agent prompt describes each one's markup. */
  origin: "ocr" | "epub";
};
type St = "" | "ok" | "fail" | "edit";

export async function jobFromEpub(f: File, noSegments: string): Promise<Job> {
  const { readEpub, writeEpub } = await import("@/lib/epub-io");
  const book = readEpub(new Uint8Array(await f.arrayBuffer()));
  if (!book.segments.length) throw new Error(noSegments);
  return { name: f.name.replace(/\.epub$/i, ""), origin: "epub", segments: book.segments, build: (tr, mode, lang) => writeEpub(book, tr, mode, lang) };
}

const NAME_FIX: Record<Lang, Record<string, string>> = {
  en: { "zh-CN": "Chinese (Simplified)", "zh-TW": "Chinese (Traditional)" },
  ko: { "zh-CN": "중국어(간체)", "zh-TW": "중국어(번체)" },
};
const names: Partial<Record<Lang, { code: string; name: string }[]>> = {};
/** Google's language codes with names in the UI language, sorted by name. Built on first use (client only). */
function langNames(lang: Lang) {
  if (!names[lang]) {
    const dn = new Intl.DisplayNames([lang], { type: "language", fallback: "code" });
    const of = (c: string) => {
      try {
        return dn.of(c) ?? c;
      } catch {
        return c;
      }
    };
    names[lang] = LANGS.map((code) => ({ code, name: NAME_FIX[lang][code] ?? of(code) })).sort((a, b) => a.name.localeCompare(b.name, lang));
  }
  return names[lang];
}

function LangSelect({ label, value, onChange, auto, disabled }: { label: string; value: string; onChange: (v: string) => void; auto?: boolean; disabled?: boolean }) {
  // Names come from Intl, whose data differs between Node and the browser: build the list on the client only.
  const client = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const lang = useLang();
  const t = useT().tr;
  const all = client ? langNames(lang) : [];
  const opt = ({ code, name }: { code: string; name: string }) => (
    <option key={code} value={code}>
      {name} · {code}
    </option>
  );
  return (
    <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
      {label}
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={`${select} max-w-48 text-zinc-900 dark:text-zinc-100`}>
        {auto && <option value="auto">{t.auto}</option>}
        {client ? (
          <>
            <optgroup label={t.common}>{COMMON_LANGS.map((c) => opt(all.find((l) => l.code === c)!))}</optgroup>
            <optgroup label={t.all(all.length)}>{all.map(opt)}</optgroup>
          </>
        ) : (
          value !== "auto" && <option value={value}>{value}</option>
        )}
      </select>
    </label>
  );
}

// A new job object starts the review over (even the same book opened again).
const keys = new WeakMap<Job, number>();
let lastKey = 0;
const jobKey = (j: Job) => keys.get(j) ?? (keys.set(j, ++lastKey), lastKey);

const FILTERS = ["all", "todo", "fail", "edit"] as const;
const PAGE = 30;
// Rough display width for sizing textareas: CJK and Hangul take about two Latin columns.
const width = (s: string) => s.length + (s.match(/[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uff00-\uffef]/g)?.length ?? 0);

const btn =
  "rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800";
const primary =
  "rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200";
const select = "rounded-md border border-zinc-200 bg-transparent px-1.5 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900";

/** `made`: name of the EPUB just built in the OCR tab, offered here so it can be picked up without saving and re-opening it. */
export function Translator({
  job,
  setJob,
  made,
  onUseMade,
}: {
  job: Job | null;
  setJob: (j: Job | null) => void;
  made: string | null;
  onUseMade: () => void;
}) {
  const all = useT();
  const t = all.tr;
  const epubFailed = all.ocr.epubFailed;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function open(f: File) {
    setError("");
    setLoading(true);
    try {
      setJob(await jobFromEpub(f, t.noSegments));
    } catch (e) {
      setError(epubFailed(e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }

  const [dragging, setDragging] = useState(false);
  const input = (
    <input
      type="file"
      accept=".epub,application/epub+zip"
      className="sr-only"
      onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (f) open(f);
      }}
    />
  );

  return (
    <>
      {!job && made && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 px-5 py-4 dark:border-blue-500/30 dark:bg-blue-500/10">
          <div className="min-w-0">
            <p className="text-sm font-medium">{t.madeTitle}</p>
            <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">{made}</p>
          </div>
          <button className={primary} onClick={onUseMade}>
            {t.useMade}
          </button>
        </div>
      )}
      {!job && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) open(f);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition focus-within:ring-2 focus-within:ring-blue-500/40 ${
            dragging
              ? "border-blue-500 bg-blue-50/60 dark:bg-blue-500/10"
              : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
          }`}
        >
          {input}
          <p className="text-sm font-medium">{loading ? t.reading : t.drop}</p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{t.dropHint}</p>
        </label>
      )}
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}
      {job && (
        <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-medium">{job.name}</h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">{t.paragraphs(job.segments.length.toLocaleString())}</p>
            </div>
            <label className={`${btn} cursor-pointer`}>
              {loading ? t.reading : t.openOther}
              {input}
            </label>
          </div>
          <Review key={jobKey(job)} job={job} />
        </section>
      )}
    </>
  );
}

function Review({ job }: { job: Job }) {
  const ui = useLang();
  const t = useT().tr;
  const [built, setBuilt] = useState<PromptInfo | null>(null); // the last EPUB built, for the agent prompt
  const n = job.segments.length;
  const [source, setSource] = useState("auto");
  const [engine, setEngine] = useState<"google" | "device">("google");
  const device = useSyncExternalStore(
    () => () => {},
    () => "Translator" in self,
    () => false,
  );
  const [target, setTarget] = useState<string>(useLang()); // into the UI language unless changed
  const [mode, setMode] = useState<Mode>("both");
  const [tr, setTr] = useState<(string | undefined)[]>(() => Array(n).fill(undefined));
  const [st, setSt] = useState<St[]>(() => Array(n).fill(""));
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [page, setPage] = useState(0);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [notice, setNotice] = useState("");
  const abort = useRef<AbortController | null>(null);

  // Kept in this browser: opening the same book again brings the translations back.
  const saveKey = useMemo(() => import("@/lib/store").then((m) => ({ m, key: m.jobKey(job.name, job.segments.map((s) => s.text)) })), [job]);
  const [loaded, setLoaded] = useState(false);
  const [resumed, setResumed] = useState(0);
  useEffect(() => {
    let live = true;
    saveKey.then(async ({ m, key }) => {
      const j = await m.loadJob(key);
      if (!live) return;
      if (j?.tr.length === n) {
        setSource(j.source);
        setTarget(j.target);
        setMode(j.mode);
        setTr(j.tr);
        setSt(j.st as St[]);
        setResumed(j.tr.filter(Boolean).length);
      }
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [saveKey, n]);
  useEffect(() => {
    if (!loaded) return;
    const h = setTimeout(() => saveKey.then(({ m, key }) => (tr.some(Boolean) ? m.saveJob(key, { source, target, mode, tr, st }) : m.clearJob(key))), 800);
    return () => clearTimeout(h);
  }, [loaded, saveKey, source, target, mode, tr, st]);
  function discard() {
    if (!confirm(t.discardConfirm)) return;
    setTr(Array(n).fill(undefined));
    setSt(Array(n).fill(""));
    setResumed(0);
  }

  const done = st.filter((s) => s === "ok" || s === "edit").length;
  const failed = st.filter((s) => s === "fail").length;
  const todo = job.segments.map((_, i) => i).filter((i) => !tr[i]);
  const rows = job.segments
    .map((_, i) => i)
    .filter((i) => filter === "all" || (filter === "todo" ? !tr[i] : st[i] === filter));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const step = !done || progress ? 2 : done === n ? 4 : 3;

  async function translate(only: number[]) {
    if (!only.length) return;
    const { translateTexts } = await import("@/lib/translate");
    const ctl = new AbortController();
    abort.current = ctl;
    setNotice("");
    try {
      let run: ((s: string) => Promise<string>) | undefined;
      if (engine === "device") {
        const { onDeviceEngine, OnDeviceError } = await import("@/lib/on-device");
        setProgress([0, only.length]);
        const sample = only.slice(0, 20).map((i) => job.segments[i].text).join("\n");
        try {
          run = await onDeviceEngine(source, target, sample, (p) => setNotice(t.downloading(Math.round(p * 100))), ctl.signal);
          setNotice("");
        } catch (e) {
          if (e instanceof OnDeviceError) return setNotice(t.onDeviceError[e.reason]);
          throw e;
        }
      }
      await translateTexts(
        // The on-device translator gets plain text: tagged words come back untranslated (Chrome 158).
        job.segments.map((s) => (run ? s.text : (s.src ?? s.text))),
        target,
        {
          only,
          source,
          engine: run,
          signal: ctl.signal,
          onProgress: (d, t) => setProgress([d, t]),
          onResult: (i, t) => {
            setTr((a) => a.with(i, t ?? a[i]));
            setSt((a) => a.with(i, t ? "ok" : "fail"));
          },
        },
      );
    } catch (e) {
      if (!ctl.signal.aborted) setNotice(t.stopped(e instanceof Error ? e.message : String(e)));
    } finally {
      abort.current = null;
      setProgress(null);
    }
  }

  function changeTarget(v: string) {
    if (done && !confirm(t.changeTarget)) return;
    setTarget(v);
    setTr(Array(n).fill(undefined));
    setSt(Array(n).fill(""));
  }

  function build() {
    try {
      const file = `${job.name}.${target}.epub`;
      save(job.build(tr, mode, target), file, "application/epub+zip");
      setBuilt({ file, source, target, mode, origin: job.origin, total: n, done, failed, edited: st.filter((s) => s === "edit").length });
    } catch (e) {
      setNotice(t.buildFailed(e instanceof Error ? e.message : String(e)));
    }
  }

  const toggle = (i: number) =>
    setSel((s) => {
      const c = new Set(s);
      if (c.has(i)) c.delete(i);
      else c.add(i);
      return c;
    });
  const allShown = shown.length > 0 && shown.every((i) => sel.has(i));

  return (
    <div>
      <ol className="flex flex-wrap gap-x-5 gap-y-1 border-b border-zinc-200 px-5 py-2.5 text-xs dark:border-zinc-800">
        {t.steps.map((label, k) => (
          <li key={label} className={k + 1 <= step ? "font-medium text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}>
            <span
              className={`mr-1.5 inline-grid h-4 w-4 place-items-center rounded-full text-[10px] ${
                k + 1 < step ? "bg-blue-600 text-white" : k + 1 === step ? "ring-1 ring-blue-600 text-blue-600" : "ring-1 ring-zinc-300 dark:ring-zinc-700"
              }`}
            >
              {k + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-2 px-5 pt-3">
        <LangSelect label={t.source} value={source} onChange={setSource} auto disabled={!!progress} />
        <span aria-hidden className="text-zinc-400">→</span>
        <LangSelect label={t.target} value={target} onChange={changeTarget} disabled={!!progress} />
        {device && (
          <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            {t.engine}
            <select value={engine} disabled={!!progress} onChange={(e) => setEngine(e.target.value as "google" | "device")} className={`${select} text-zinc-900 dark:text-zinc-100`}>
              <option value="google">{t.google}</option>
              <option value="device">{t.onDevice}</option>
            </select>
          </label>
        )}
        <span className="ml-auto text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
          {t.count(done, n)}
          {failed > 0 && <span className="text-red-600"> · {t.failedCount(failed)}</span>}
        </span>
        {resumed > 0 && (
          <p className="w-full text-xs text-zinc-600 dark:text-zinc-400">
            {t.resumed(resumed)} ·{" "}
            <button className="underline" disabled={!!progress} onClick={discard}>
              {t.discard}
            </button>
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-5 py-3">
        <button className={primary} disabled={!!progress || !todo.length} onClick={() => translate(todo)}>
          {t.translateTodo(todo.length.toLocaleString())}
        </button>
        <button className={btn} disabled={!!progress || !sel.size} onClick={() => translate([...sel].sort((a, b) => a - b))}>
          {t.retranslate(sel.size)}
        </button>
        {progress && (
          <>
            <span className="text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
              {progress[0]}/{progress[1]}
            </span>
            <button className={btn} onClick={() => abort.current?.abort()}>
              {t.cancel}
            </button>
          </>
        )}
      </div>
      {progress && (
        <div className="mx-5 mb-2 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="h-full bg-blue-600 transition-[width]" style={{ width: `${(progress[0] / Math.max(1, progress[1])) * 100}%` }} />
        </div>
      )}
      {notice && <p className="mx-5 mb-2 text-sm text-red-600">{notice}</p>}

      <div className="flex flex-wrap items-center gap-3 border-y border-zinc-200 px-5 py-2 text-xs dark:border-zinc-800">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={allShown} onChange={() => setSel((s) => new Set(allShown ? [...s].filter((i) => !shown.includes(i)) : [...s, ...shown]))} />
          {t.selectPage}
        </label>
        {sel.size > 0 && (
          <button className="text-zinc-600 dark:text-zinc-400 underline" onClick={() => setSel(new Set())}>
            {t.clear}
          </button>
        )}
        <div role="radiogroup" aria-label={t.view} className="ml-auto inline-flex rounded-md bg-zinc-100 p-0.5 dark:bg-zinc-800">
          {FILTERS.map((v) => (
            <button
              key={v}
              role="radio"
              aria-checked={filter === v}
              onClick={() => {
                setFilter(v);
                setPage(0);
              }}
              className={`rounded px-2 py-1 ${filter === v ? "bg-white font-medium shadow-sm dark:bg-zinc-950" : "text-zinc-600 dark:text-zinc-400"}`}
            >
              {t.filters[v]}
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {shown.map((i) => (
          <li key={i} className="grid gap-2 px-5 py-3 sm:grid-cols-[auto_1fr_1fr]">
            <label className="flex items-start gap-2 pt-0.5 text-[11px] text-zinc-400 tabular-nums">
              <input type="checkbox" checked={sel.has(i)} onChange={() => toggle(i)} aria-label={t.select(i + 1)} />
              <span className="w-10">
                {i + 1}
                <br />
                {job.segments[i].tag}
              </span>
            </label>
            <p className="max-h-40 overflow-auto text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{job.segments[i].text}</p>
            <div>
              <textarea
                aria-label={t.translation(i + 1)}
                value={tr[i] ?? ""}
                placeholder={st[i] === "fail" ? t.failPlaceholder : t.todoPlaceholder}
                rows={Math.min(8, Math.max(2, Math.ceil(Math.max(width(tr[i] ?? ""), width(job.segments[i].text)) / 45)))}
                onChange={(e) => {
                  const v = e.target.value;
                  setTr((a) => a.with(i, v || undefined));
                  setSt((a) => a.with(i, v ? "edit" : ""));
                }}
                className={`w-full resize-y rounded-md border bg-transparent px-2 py-1.5 text-sm leading-relaxed ${
                  st[i] === "fail" ? "border-red-300 dark:border-red-500/50" : st[i] === "edit" ? "border-amber-300 dark:border-amber-500/50" : "border-zinc-200 dark:border-zinc-700"
                }`}
              />
            </div>
          </li>
        ))}
        {!shown.length && <li className="px-5 py-6 text-center text-sm text-zinc-600 dark:text-zinc-400">{t.none}</li>}
      </ul>

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <button className={btn} disabled={page === 0} onClick={() => setPage(page - 1)}>
          {t.prev}
        </button>
        <span className="text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
          {page + 1} / {pages}
        </span>
        <button className={btn} disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
          {t.next}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <select aria-label={t.layout} value={mode} onChange={(e) => setMode(e.target.value as Mode)} className={select}>
            <option value="both">{t.both}</option>
            <option value="replace">{t.replace}</option>
          </select>
          <button className={primary} disabled={!done || !!progress} onClick={build}>
            {t.build}
          </button>
        </div>
      </div>
      {built && <AgentPrompt key={JSON.stringify(built)} prompt={agentPromptText(ui, built)} />}
    </div>
  );
}
