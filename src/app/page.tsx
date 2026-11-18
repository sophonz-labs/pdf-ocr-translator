"use client";

import { useRef, useState } from "react";
import type { Line } from "./searchable-pdf";

type Status = "pending" | "render" | "ocr" | "text" | "done" | "error";
type Page = { n: number; status: Status; progress: number; text: string; ms?: number };

const LABEL: Record<Status, string> = {
  pending: "대기",
  render: "렌더링",
  ocr: "인식 중",
  text: "텍스트 레이어",
  done: "완료",
  error: "오류",
};

const LANGS = [
  { value: "kor+eng", label: "한국어 + 영어" },
  { value: "kor", label: "한국어" },
  { value: "eng", label: "영어" },
];

export default function Home() {
  const [pages, setPages] = useState<Page[]>([]);
  const [lang, setLang] = useState("kor+eng");
  const [skipText, setSkipText] = useState(true);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const cancelled = useRef(false);
  const source = useRef<{ name: string; bytes: ArrayBuffer } | null>(null);
  const lines = useRef(new Map<number, Line[]>());
  const current = useRef(0);

  const update = (n: number, patch: Partial<Page>) =>
    setPages((ps) => ps.map((p) => (p.n === n ? { ...p, ...patch } : p)));

  async function run(f: File) {
    if (running) return;
    setRunning(true);
    setError("");
    setPages([]);
    setFile({ name: f.name, size: f.size });
    cancelled.current = false;
    const t0 = performance.now();
    const timer = setInterval(() => setElapsed(performance.now() - t0), 250);

    // Loaded lazily: both libraries touch browser-only globals at import time.
    // pdf.js legacy build: the modern one needs Map.getOrInsertComputed (Chrome 145+, no Safari).
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
    const Tesseract = await import("tesseract.js");
    let worker: Awaited<ReturnType<typeof Tesseract.createWorker>> | null = null;

    try {
      setPhase("PDF 여는 중");
      const bytes = await f.arrayBuffer();
      source.current = { name: f.name.replace(/\.pdf$/i, ""), bytes };
      lines.current = new Map();
      // pdf.js detaches the buffer it is given, so hand it a copy and keep the original for export.
      const pdf = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
      setPages(Array.from({ length: pdf.numPages }, (_, i) => ({ n: i + 1, status: "pending", progress: 0, text: "" })));

      for (let n = 1; n <= pdf.numPages && !cancelled.current; n++) {
        const start = performance.now();
        current.current = n;
        setPhase(`${n}페이지 처리 중`);
        const page = await pdf.getPage(n);

        if (skipText) {
          const tc = await page.getTextContent();
          const text = tc.items.map((i) => ("str" in i ? i.str + (i.hasEOL ? "\n" : "") : "")).join("");
          if (text.trim().length > 20) {
            update(n, { status: "text", progress: 1, text, ms: performance.now() - start });
            continue;
          }
        }

        update(n, { status: "render", progress: 0 });
        const viewport = page.getViewport({ scale: 2.5 }); // ~180 DPI
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, viewport }).promise;

        if (!worker) {
          setPhase("언어 모델 불러오는 중");
          worker = await Tesseract.createWorker(lang.split("+"), Tesseract.OEM.LSTM_ONLY, {
            workerPath: "/vendor/worker.min.js",
            corePath: "/vendor",
            langPath: "/models",
            gzip: false,
            logger: (m) => {
              if (m.status !== "recognizing text") return;
              const at = current.current;
              // Drop ticks for pages already marked done (progress can arrive late).
              setPages((ps) => ps.map((x) => (x.n === at && x.status === "ocr" ? { ...x, progress: m.progress } : x)));
            },
          });
          setPhase(`${n}페이지 처리 중`);
        }

        update(n, { status: "ocr" });
        const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
        // Lines, not words: Korean words come back in fragments and PDF extractors insert spaces between them.
        const found = (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines));
        lines.current.set(
          n,
          found.map(({ text, bbox }) => {
            // shortcut: assumes an unrotated page; rotated pages get boxes in the wrong direction.
            const [x, y] = viewport.convertToPdfPoint(bbox.x0, bbox.y1);
            const [x2, y2] = viewport.convertToPdfPoint(bbox.x1, bbox.y0);
            return { text: text.trim(), x, y, w: x2 - x, h: y2 - y };
          }),
        );
        update(n, { status: "done", progress: 1, text: data.text, ms: performance.now() - start });
      }
      setPhase(cancelled.current ? "중단됨" : "완료");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPages((ps) => ps.map((p) => (p.status === "render" || p.status === "ocr" ? { ...p, status: "error" } : p)));
      setPhase("오류");
    } finally {
      await worker?.terminate();
      clearInterval(timer);
      setElapsed(performance.now() - t0);
      setRunning(false);
    }
  }

  async function downloadPdf() {
    if (!source.current) return;
    setExporting(true);
    try {
      const { buildSearchablePdf } = await import("./searchable-pdf");
      const out = await buildSearchablePdf(source.current.bytes, lines.current);
      const url = URL.createObjectURL(new Blob([out as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${source.current.name}-ocr.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setError(`PDF 생성 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExporting(false);
    }
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
  const eta = running && avg ? ((total - finished) * avg) / 1000 : 0;
  const withText = pages.filter((p) => p.text.trim());
  const allText = withText.map((p) => `--- ${p.n} 페이지 ---\n${p.text.trim()}`).join("\n\n");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-20">
      <header className="mb-10">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-900 text-[11px] font-bold tracking-tight text-white dark:bg-white dark:text-zinc-900">
            OCR
          </div>
          <h1 className="text-xl font-semibold tracking-tight">PDF OCR</h1>
        </div>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          스캔한 PDF에서 한글과 영어 텍스트를 뽑아 검색 가능한 PDF로 돌려줍니다. 파일은 서버로 올라가지 않고 이 브라우저 안에서만
          처리됩니다.
        </p>
      </header>

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
          if (f?.type === "application/pdf") run(f);
        }}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition focus-within:ring-2 focus-within:ring-blue-500/40 ${
          dragging
            ? "border-blue-500 bg-blue-50/60 dark:bg-blue-500/10"
            : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
        } ${running ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          type="file"
          accept="application/pdf"
          disabled={running}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) run(f);
          }}
        />
        <svg aria-hidden viewBox="0 0 24 24" className="h-8 w-8 text-zinc-400 transition group-hover:text-zinc-600 dark:group-hover:text-zinc-300" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <p className="mt-3 text-sm font-medium">PDF를 끌어다 놓거나 클릭해서 선택</p>
        <p className="mt-1 text-xs text-zinc-500">{file ? `${file.name} · ${formatSize(file.size)}` : "스캔본, 사진 PDF 모두 가능"}</p>
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="인식 언어" className="inline-flex rounded-lg bg-zinc-100 p-0.5 text-sm dark:bg-zinc-800">
          {LANGS.map((l) => (
            <button
              key={l.value}
              role="radio"
              aria-checked={lang === l.value}
              disabled={running}
              onClick={() => setLang(l.value)}
              className={`rounded-md px-3 py-1.5 transition ${
                lang === l.value
                  ? "bg-white font-medium shadow-sm dark:bg-zinc-950"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input type="checkbox" className="peer sr-only" checked={skipText} disabled={running} onChange={(e) => setSkipText(e.target.checked)} />
          <span className="relative h-5 w-9 rounded-full bg-zinc-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/40 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4 dark:bg-zinc-700" />
          텍스트가 있는 페이지는 OCR 생략
        </label>
      </div>

      {total > 0 && (
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{phase}</p>
              <p className="mt-0.5 text-xs text-zinc-500 tabular-nums">
                {finished} / {total} 페이지 · {(elapsed / 1000).toFixed(1)}초
                {avg > 0 && ` · 페이지당 ${(avg / 1000).toFixed(1)}초`}
                {eta > 0 && ` · 약 ${Math.ceil(eta)}초 남음`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {running && (
                <button onClick={() => (cancelled.current = true)} className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
                  중단
                </button>
              )}
              <span className="text-2xl font-semibold tracking-tight tabular-nums">{Math.round(overall * 100)}%</span>
            </div>
          </div>

          <div
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
            role="progressbar"
            aria-label="전체 진행률"
            aria-valuenow={Math.round(overall * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300" style={{ width: `${overall * 100}%` }} />
          </div>

          <ol className="mt-5 flex flex-wrap gap-1" aria-label="페이지별 상태">
            {pages.map((p) => (
              <li
                key={p.n}
                title={`${p.n}페이지 · ${LABEL[p.status]}${p.ms ? ` · ${(p.ms / 1000).toFixed(1)}초` : ""}`}
                aria-label={`${p.n}페이지 ${LABEL[p.status]}`}
                className={`relative grid h-7 min-w-7 place-items-center overflow-hidden rounded-md px-1 text-[10px] font-medium tabular-nums ${TILE[p.status]}`}
              >
                {(p.status === "ocr" || p.status === "render") && (
                  <span className="absolute inset-x-0 bottom-0 bg-blue-500/25 transition-[height]" style={{ height: `${p.progress * 100}%` }} />
                )}
                <span className="relative">{p.n}</span>
              </li>
            ))}
          </ol>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
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
              <h2 className="text-sm font-medium">결과</h2>
              <p className="text-xs text-zinc-500 tabular-nums">{allText.length.toLocaleString()}자</p>
            </div>
            <div className="flex gap-2">
              <button onClick={copy} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                {copied ? "복사됨" : "복사"}
              </button>
              <button
                onClick={downloadPdf}
                disabled={running || exporting}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0 4-4m-4 4-4-4M4 20h16" />
                </svg>
                {exporting ? "만드는 중…" : "검색 가능한 PDF"}
              </button>
            </div>
          </div>
          <div className="max-h-[28rem] overflow-auto px-5 py-4">
            {withText.map((p) => (
              <article key={p.n} className="mb-5 last:mb-0">
                <p className="mb-1.5 text-[11px] font-medium tracking-wide text-zinc-400">
                  {p.n}페이지{p.status === "text" && " · 텍스트 레이어"}
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{p.text.trim()}</p>
              </article>
            ))}
          </div>
        </section>
      )}
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
