"use client";

import { useRef, useState } from "react";
import { SiteHeader, TOOLS, type ToolTab } from "@/components/site";
import type { Lang } from "@/i18n";
import { useLang, useT } from "@/i18n-context";
import { epubFromOcr, jobFromOcr, ocrPdf, searchablePdf, type OcrResult, type Page, type Status } from "./ocr";
import { save } from "./save";
import { jobFromEpub, Translator, type Job } from "./translator";

const OCR_LANGS = ["kor+eng", "kor", "eng"];
type Phase = "" | "opening" | "working" | "stopped" | "done" | "error";

/** Both tools behind tabs. Shared by the web page and the extension; `onLang` switches the language in place. */
export function Tools({ initialTab, onLang }: { initialTab: ToolTab; onLang: (l: Lang) => void }) {
  const lang = useLang();
  const t = useT();
  const T = t.ocr;
  const LABEL: Record<Status, string> = T.status;
  const [pages, setPages] = useState<Page[]>([]);
  const [ocrLang, setOcrLang] = useState("kor+eng");
  const [skipText, setSkipText] = useState(true);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>(""); // a key, so a language switch mid-run relabels it
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "epub" | null>(null);
  const [copied, setCopied] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [tab, setTabState] = useState<ToolTab>(initialTab);
  const setTab = (t: ToolTab) => {
    setTabState(t);
    history.replaceState(null, "", `${location.pathname}?tab=${t}`);
  };
  const [dragging, setDragging] = useState(false);
  const cancelled = useRef(false);
  const [lanes, setLanes] = useState(1);
  const result = useRef<OcrResult | null>(null);
  const [made, setMade] = useState<string | null>(null); // name of the finished OCR result, offered in the translate tab

  const update = (n: number, patch: Partial<Page>) =>
    setPages((ps) => ps.map((p) => (p.n === n ? { ...p, ...patch } : p)));

  async function run(f: File) {
    if (running) return;
    setRunning(true);
    setError("");
    setPages([]);
    setMade(null);
    setFile({ name: f.name, size: f.size });
    cancelled.current = false;
    // eslint-disable-next-line react-hooks/purity -- runs in an event handler, not during render
    const t0 = performance.now();
    const timer = setInterval(() => setElapsed(performance.now() - t0), 250);

    try {
      setPhase("opening");
      result.current = await ocrPdf(f, {
        lang: ocrLang,
        skipText,
        cancelled: () => cancelled.current,
        onOpen: (total, laneCount) => {
          setPages(Array.from({ length: total }, (_, i) => ({ n: i + 1, status: "pending", progress: 0, text: "" })));
          setLanes(laneCount);
          setPhase("working");
        },
        onPage: update,
        // Drop ticks for pages already marked done (progress can arrive late).
        onProgress: (n, progress) => setPages((ps) => ps.map((x) => (x.n === n && x.status === "ocr" ? { ...x, progress } : x))),
      });
      setPhase(cancelled.current ? "stopped" : "done");
      setMade(result.current.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPages((ps) => ps.map((p) => (p.status === "render" || p.status === "ocr" ? { ...p, status: "error" } : p)));
      setPhase("error");
    } finally {
      clearInterval(timer);
      setElapsed(performance.now() - t0);
      setRunning(false);
    }
  }

  async function exportAs(kind: "pdf" | "epub") {
    const r = result.current;
    if (!r) return;
    setExporting(kind);
    try {
      if (kind === "pdf") save(await searchablePdf(r), `${r.name}-ocr.pdf`, "application/pdf");
      else save(await epubFromOcr(r), `${r.name}.epub`, "application/epub+zip");
    } catch (e) {
      setError(T.exportFailed(kind.toUpperCase(), e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(null);
    }
  }

  /** Hands the OCR result to the translator as an EPUB job. */
  async function toTranslator() {
    if (!result.current) return;
    if (job && !confirm(T.replaceJob)) return;
    setJob(await jobFromOcr(result.current));
    setTab("translate");
  }

  async function openFile(f: File) {
    if (/\.epub$/i.test(f.name)) {
      try {
        setJob(await jobFromEpub(f, t.tr.noSegments));
        setTab("translate");
      } catch (e) {
        setError(T.epubFailed(e instanceof Error ? e.message : String(e)));
      }
    } else if (f.type === "application/pdf") run(f);
  }

  async function copy() {
    await navigator.clipboard.writeText(allText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const total = pages.length;
  const finished = pages.filter((p) => p.status === "done" || p.status === "text").length;
  const overall = total ? pages.reduce((s, p) => s + p.progress, 0) / total : 0;
  const timed = pages.filter((p) => p.ms);
  const avg = timed.length ? timed.reduce((s, p) => s + p.ms!, 0) / timed.length : 0;
  const eta = running && avg ? ((total - finished) * avg) / lanes / 1000 : 0;
  const withText = pages.filter((p) => p.text.trim());
  const allText = withText.map((p) => `${T.copyHeader(p.n)}\n${p.text.trim()}`).join("\n\n");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
      <SiteHeader lang={lang} onLang={onLang} />
      <nav role="tablist" aria-label={T.tablist} className="mt-8 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-zinc-200 dark:border-zinc-800">
        {TOOLS.map((k) => (
          <button
            key={k}
            role="tab"
            id={`tab-${k}`}
            aria-selected={tab === k}
            aria-controls={`panel-${k}`}
            onClick={() => setTab(k)}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm transition ${
              tab === k
                ? "border-zinc-900 font-medium text-zinc-900 dark:border-white dark:text-white"
                : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {t.tools[k].label}
            {k === "ocr" && running && <span className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600 align-middle" />}
          </button>
        ))}
      </nav>
      <p className="mt-4 mb-8 text-sm text-zinc-600 dark:text-zinc-400">
        {t.tools[tab].desc} {T.local}
      </p>



      <div role="tabpanel" id="panel-ocr" aria-labelledby="tab-ocr" hidden={tab !== "ocr"}>

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
          if (f) openFile(f);
        }}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition focus-within:ring-2 focus-within:ring-blue-500/40 ${
          dragging
            ? "border-blue-500 bg-blue-50/60 dark:bg-blue-500/10"
            : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
        } ${running ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          type="file"
          accept="application/pdf,.epub,application/epub+zip"
          disabled={running}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) openFile(f);
          }}
        />
        <svg aria-hidden viewBox="0 0 24 24" className="h-8 w-8 text-zinc-400 transition group-hover:text-zinc-600 dark:group-hover:text-zinc-300" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <p className="mt-3 text-sm font-medium">{T.drop}</p>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{file ? `${file.name} · ${formatSize(file.size)}` : T.dropHint}</p>
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label={T.langGroup} className="inline-flex rounded-lg bg-zinc-100 p-0.5 text-sm dark:bg-zinc-800">
          {OCR_LANGS.map((v) => (
            <button
              key={v}
              role="radio"
              aria-checked={ocrLang === v}
              disabled={running}
              onClick={() => setOcrLang(v)}
              className={`rounded-md px-3 py-1.5 transition ${
                ocrLang === v
                  ? "bg-white font-medium shadow-sm dark:bg-zinc-950"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {T.langs[v]}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input type="checkbox" className="peer sr-only" checked={skipText} disabled={running} onChange={(e) => setSkipText(e.target.checked)} />
          <span className="relative h-5 w-9 rounded-full bg-zinc-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/40 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4 dark:bg-zinc-700" />
          {T.skipText}
        </label>
      </div>

      {total > 0 && (
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{phase && T[phase]}</p>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                {T.pages(finished, total)} · {T.secs((elapsed / 1000).toFixed(1))}
                {running && lanes > 1 && ` · ${T.lanes(lanes)}`}
                {avg > 0 && ` · ${T.perPage((avg / lanes / 1000).toFixed(2))}`}
                {eta > 0 && ` · ${T.eta(Math.ceil(eta))}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {running && (
                <button onClick={() => (cancelled.current = true)} className="rounded-md px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
                  {T.stop}
                </button>
              )}
              <span className="text-2xl font-semibold tracking-tight tabular-nums">{Math.round(overall * 100)}%</span>
            </div>
          </div>

          <div
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
            role="progressbar"
            aria-label={T.progress}
            aria-valuenow={Math.round(overall * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300" style={{ width: `${overall * 100}%` }} />
          </div>

          <ol className="mt-5 flex flex-wrap gap-1" aria-label={T.pageStates}>
            {pages.map((p) => (
              <li
                key={p.n}
                title={`${T.page(p.n)} · ${LABEL[p.status]}${p.ms ? ` · ${T.secs((p.ms / 1000).toFixed(1))}` : ""}`}
                aria-label={`${T.page(p.n)} ${LABEL[p.status]}`}
                className={`relative grid h-7 min-w-7 place-items-center overflow-hidden rounded-md px-1 text-[10px] font-medium tabular-nums ${TILE[p.status]}`}
              >
                {(p.status === "ocr" || p.status === "render") && (
                  <span className="absolute inset-x-0 bottom-0 bg-blue-500/25 transition-[height]" style={{ height: `${p.progress * 100}%` }} />
                )}
                <span className="relative">{p.n}</span>
              </li>
            ))}
          </ol>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
            {(["done", "text", "ocr", "pending", "error"] as const).map((s) =>
              s === "error" && !pages.some((p) => p.status === "error") ? null : (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-sm ${TILE[s]}`} />
                  {LABEL[s]}
                </span>
              ),
            )}
          </div>
        </section>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>
      )}

      {withText.length > 0 && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <div>
              <h2 className="text-sm font-medium">{T.result}</h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">{T.chars(allText.length.toLocaleString())}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={copy} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                {copied ? T.copied : T.copy}
              </button>
              <button onClick={toTranslator} disabled={running} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800">
                {T.toTranslate}
              </button>
              {(["pdf", "epub"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => exportAs(k)}
                  disabled={running || !!exporting}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0 4-4m-4 4-4-4M4 20h16" />
                  </svg>
                  {exporting === k ? T.making : k === "pdf" ? T.searchablePdf : "EPUB"}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[28rem] overflow-auto px-5 py-4">
            {withText.map((p) => (
              <article key={p.n} className="mb-5 last:mb-0">
                <p className="mb-1.5 text-[11px] font-medium tracking-wide text-zinc-400">
                  {T.page(p.n)}{p.status === "text" && ` · ${LABEL.text}`}
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{p.text.trim()}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      </div>

      <div role="tabpanel" id="panel-translate" aria-labelledby="tab-translate" hidden={tab !== "translate"}>
        <Translator job={job} setJob={setJob} made={made} onUseMade={toTranslator} />
      </div>
    </main>
  );
}


const TILE: Record<Status, string> = {
  pending: "bg-zinc-100 text-zinc-400 ring-1 ring-zinc-200 ring-inset dark:bg-zinc-800 dark:text-zinc-500 dark:ring-zinc-700",
  render: "bg-blue-50 text-blue-700 ring-1 ring-blue-500 ring-inset dark:bg-blue-500/10 dark:text-blue-300",
  ocr: "bg-blue-50 text-blue-700 ring-1 ring-blue-500 ring-inset dark:bg-blue-500/10 dark:text-blue-300",
  text: "bg-emerald-500 text-white",
  done: "bg-blue-600 text-white",
  error: "bg-red-500 text-white",
};

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
