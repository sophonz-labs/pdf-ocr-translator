"use client";

import { useRef, useState } from "react";
import type { Line } from "./searchable-pdf";

type Status = "pending" | "render" | "ocr" | "text" | "done" | "error";
type Page = { n: number; status: Status; progress: number; text: string; ms?: number };

const LABEL: Record<Status, string> = {
  pending: "대기",
  render: "렌더링",
  ocr: "OCR",
  text: "텍스트 레이어",
  done: "완료",
  error: "오류",
};

export default function Home() {
  const [pages, setPages] = useState<Page[]>([]);
  const [lang, setLang] = useState("kor");
  const [skipText, setSkipText] = useState(true);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [exporting, setExporting] = useState(false);
  const cancelled = useRef(false);
  const source = useRef<{ name: string; bytes: ArrayBuffer } | null>(null);
  const lines = useRef(new Map<number, Line[]>());

  const update = (n: number, patch: Partial<Page>) =>
    setPages((ps) => ps.map((p) => (p.n === n ? { ...p, ...patch } : p)));

  async function run(file: File) {
    setRunning(true);
    setError("");
    setPages([]);
    cancelled.current = false;
    const t0 = performance.now();
    const timer = setInterval(() => setElapsed(performance.now() - t0), 250);

    // Loaded lazily: both libraries touch browser-only globals at import time.
    // pdf.js legacy build: the modern one needs Map.getOrInsertComputed (Chrome 145+, no Safari).
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
    const { OCRClient } = await import("tesseract-wasm");
    let ocr: InstanceType<typeof OCRClient> | null = null;

    try {
      setPhase("PDF 여는 중");
      const bytes = await file.arrayBuffer();
      source.current = { name: file.name.replace(/\.pdf$/i, ""), bytes };
      lines.current = new Map();
      // pdf.js detaches the buffer it is given, so hand it a copy and keep the original for export.
      const pdf = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
      setPages(Array.from({ length: pdf.numPages }, (_, i) => ({ n: i + 1, status: "pending", progress: 0, text: "" })));

      for (let n = 1; n <= pdf.numPages && !cancelled.current; n++) {
        const start = performance.now();
        setPhase(`${n} / ${pdf.numPages} 페이지`);
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
        const bitmap = await createImageBitmap(canvas);

        if (!ocr) {
          setPhase(`${n} / ${pdf.numPages} 페이지 · ${lang} 모델 로딩`);
          ocr = new OCRClient({ workerURL: "/vendor/tesseract-worker.js" });
          await ocr.loadModel(`/models/${lang}.traineddata`);
          setPhase(`${n} / ${pdf.numPages} 페이지`);
        }

        update(n, { status: "ocr" });
        await ocr.loadImage(bitmap);
        bitmap.close();
        // Progress arrives over a MessagePort and can land after getText resolves; drop late ticks.
        const text = await ocr.getText((p: number) =>
          setPages((ps) => ps.map((x) => (x.n === n && x.status === "ocr" ? { ...x, progress: Math.min(p / 100, 1) } : x))),
        );
        // Already recognized by getText, so this only reads back the boxes. Lines, not words:
        // Korean words come back in fragments and extractors then insert spaces between them.
        const boxes = await ocr.getTextBoxes("line");
        lines.current.set(
          n,
          boxes.map(({ text, rect }) => {
            // shortcut: assumes an unrotated page; rotated pages get boxes in the wrong direction.
            const [x, y] = viewport.convertToPdfPoint(rect.left, rect.bottom);
            const [x2, y2] = viewport.convertToPdfPoint(rect.right, rect.top);
            return { text: text.trim(), x, y, w: x2 - x, h: y2 - y };
          }),
        );
        update(n, { status: "done", progress: 1, text, ms: performance.now() - start });
      }
      setPhase(cancelled.current ? "중단됨" : "완료");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPages((ps) => ps.map((p) => (p.status === "render" || p.status === "ocr" ? { ...p, status: "error" } : p)));
      setPhase("오류");
    } finally {
      await ocr?.destroy();
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

  const total = pages.length;
  const finished = pages.filter((p) => p.status === "done" || p.status === "text").length;
  const overall = total ? pages.reduce((s, p) => s + p.progress, 0) / total : 0;
  const allText = pages.filter((p) => p.text).map((p) => `--- ${p.n} 페이지 ---\n${p.text}`).join("\n\n");

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 font-sans">
      <h1 className="text-2xl font-bold">PDF OCR</h1>
      <p className="mt-1 text-sm text-zinc-500">
        tesseract-wasm + pdf.js. 파일은 서버로 올라가지 않고 브라우저 안에서만 처리됩니다.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <input
          type="file"
          accept="application/pdf"
          disabled={running}
          onChange={(e) => e.target.files?.[0] && run(e.target.files[0])}
          className="text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-white dark:file:bg-zinc-100 dark:file:text-black"
        />
        <label className="text-sm">
          언어{" "}
          <select value={lang} disabled={running} onChange={(e) => setLang(e.target.value)} className="rounded border px-2 py-1 dark:bg-zinc-900">
            <option value="kor">한국어</option>
            <option value="eng">영어</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={skipText} disabled={running} onChange={(e) => setSkipText(e.target.checked)} />
          텍스트 레이어가 있으면 OCR 생략
        </label>
        {running && (
          <button onClick={() => (cancelled.current = true)} className="rounded border px-3 py-1 text-sm">
            중단
          </button>
        )}
      </div>

      {total > 0 && (
        <section className="mt-8">
          <div className="flex justify-between text-sm">
            <span>
              {phase} · 총 {total}페이지 중 {finished}페이지 완료
            </span>
            <span className="tabular-nums">
              {Math.round(overall * 100)}% · {(elapsed / 1000).toFixed(1)}초
            </span>
          </div>
          <Bar value={overall} />

          <ol className="mt-4 grid gap-1 text-sm">
            {pages.map((p) => (
              <li key={p.n} className="grid grid-cols-[4rem_7rem_1fr_4rem] items-center gap-3">
                <span className="tabular-nums">p.{p.n}</span>
                <span className={p.status === "error" ? "text-red-600" : p.status === "pending" ? "text-zinc-400" : ""}>
                  {LABEL[p.status]}
                </span>
                <Bar value={p.progress} />
                <span className="text-right tabular-nums text-zinc-500">{p.ms ? `${(p.ms / 1000).toFixed(1)}s` : ""}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {allText && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">결과</h2>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(allText)} className="rounded border px-3 py-1 text-sm">
                복사
              </button>
              <button
                onClick={downloadPdf}
                disabled={running || exporting}
                className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
              >
                {exporting ? "PDF 만드는 중…" : "검색 가능한 PDF 다운로드"}
              </button>
            </div>
          </div>
          <textarea readOnly value={allText} className="mt-2 h-96 w-full rounded border p-3 font-mono text-sm dark:bg-zinc-900" />
        </section>
      )}
    </main>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-blue-600 transition-[width]" style={{ width: `${value * 100}%` }} />
    </div>
  );
}
