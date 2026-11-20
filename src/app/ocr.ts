// The PDF → text pipeline, shared by the OCR tab and the one-shot routine. Browser only.
import type { PageLayout } from "@/lib/layout";
import type { Line } from "./searchable-pdf";
import type { Job } from "./translator";

export type Status = "pending" | "render" | "ocr" | "text" | "done" | "error";
export type Page = { n: number; status: Status; progress: number; text: string; ms?: number };

/** Everything the exports need: the original bytes, OCR lines in PDF points, and layout for the EPUB. */
export type OcrResult = {
  name: string;
  bytes: ArrayBuffer;
  title?: string;
  author?: string;
  lines: Map<number, Line[]>;
  layouts: Map<number, PageLayout>;
};

const SCALE = 2.5; // render scale for OCR: ~180 dpi on a letter page, enough for body text
const MIN_CONFIDENCE = 65;

export async function ocrPdf(
  f: File,
  opts: {
    lang: string;
    skipText: boolean;
    cancelled: () => boolean;
    onOpen: (pages: number, lanes: number) => void;
    onPage: (n: number, patch: Partial<Page>) => void;
    /** Recognition progress of a page being OCR'd (may arrive late; callers ignore pages already finished). */
    onProgress: (n: number, progress: number) => void;
  },
): Promise<OcrResult> {
  // Loaded lazily: both libraries touch browser-only globals at import time.
  // pdf.js legacy build: the modern one needs Map.getOrInsertComputed (Chrome 145+, no Safari).
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
  const Tesseract = await import("tesseract.js");
  const { textLayerLines } = await import("@/lib/pdf-text");
  type OcrWorker = Awaited<ReturnType<typeof Tesseract.createWorker>>;
  const workers: OcrWorker[] = [];

  const bytes = await f.arrayBuffer();
  const result: OcrResult = { name: f.name.replace(/\.pdf$/i, ""), bytes, lines: new Map(), layouts: new Map() };
  try {
    // pdf.js detaches the buffer it is given, so hand it a copy and keep the original for export.
    const pdf = await pdfjs.getDocument({
      data: bytes.slice(0),
      // Scanned books are mostly JBIG2/JPEG2000 images; without the wasm decoders they render blank.
      wasmUrl: "/vendor/pdfjs/wasm/",
      cMapUrl: "/vendor/pdfjs/cmaps/",
      standardFontDataUrl: "/vendor/pdfjs/standard_fonts/",
      iccUrl: "/vendor/pdfjs/iccs/",
      fontExtraProperties: true, // font names, for bold/italic in the EPUB
    }).promise;
    const info = (await pdf.getMetadata().catch(() => null))?.info as { Title?: string; Author?: string } | undefined;
    result.title = info?.Title?.trim() || undefined;
    result.author = info?.Author?.trim() || undefined;

    // One tesseract worker per lane; each holds its own copy of the models (~100MB+), so cap it.
    const laneCount = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
    opts.onOpen(pdf.numPages, laneCount);
    let next = 1;

    const lane = async () => {
      let worker: OcrWorker | null = null;
      let at = 0;
      while (!opts.cancelled()) {
        const n = next++;
        if (n > pdf.numPages) return;
        at = n;
        const start = performance.now();
        try {
          const page = await pdf.getPage(n);
          const vp = page.getViewport({ scale: 1 });
          if (opts.skipText) {
            const tc = await page.getTextContent();
            const text = tc.items.map((i) => ("str" in i ? i.str + (i.hasEOL ? "\n" : "") : "")).join("");
            if (text.trim().length > 20) {
              result.layouts.set(n, { n, width: vp.width, height: vp.height, lines: await textLayerLines(page, tc) });
              opts.onPage(n, { status: "text", progress: 1, text, ms: performance.now() - start });
              continue;
            }
          }

          opts.onPage(n, { status: "render", progress: 0 });
          const viewport = page.getViewport({ scale: SCALE });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvas, viewport }).promise;

          if (!worker) {
            worker = await Tesseract.createWorker(opts.lang.split("+"), Tesseract.OEM.LSTM_ONLY, {
              workerPath: "/vendor/worker.min.js",
              // Load the worker from its file, not a blob: URL (extension pages' CSP only allows 'self').
              workerBlobURL: false,
              corePath: "/vendor",
              langPath: "/models",
              gzip: false,
              logger: (m) => {
                if (m.status === "recognizing text") opts.onProgress(at, m.progress);
              },
            });
            workers.push(worker);
          }

          opts.onPage(n, { status: "ocr" });
          const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
          canvas.width = canvas.height = 0; // free the bitmap now, not at GC time
          // Lines, not words: Korean words come back in fragments and PDF extractors insert spaces between them.
          // Pictures produce garbage lines; real text scores 80+, picture noise mostly under 60.
          const paras = (data.blocks ?? []).flatMap((b) => b.paragraphs).map((p) => p.lines.filter((l) => l.confidence >= MIN_CONFIDENCE));
          const found = paras.flat();
          const text = paras.filter((p) => p.length).map((p) => p.map((l) => l.text.trim()).join("\n")).join("\n\n");
          result.lines.set(
            n,
            found.map(({ text, bbox }) => {
              // shortcut: assumes an unrotated page; rotated pages get boxes in the wrong direction.
              const [x, y] = viewport.convertToPdfPoint(bbox.x0, bbox.y1);
              const [x2, y2] = viewport.convertToPdfPoint(bbox.x1, bbox.y0);
              return { text: text.trim(), x, y, w: x2 - x, h: y2 - y };
            }),
          );
          result.layouts.set(n, {
            n,
            width: vp.width,
            height: vp.height,
            lines: found.map(({ text, bbox }) => ({
              runs: [{ text: text.trim().replace(/\s+/g, " ") }],
              x0: bbox.x0 / SCALE,
              x1: bbox.x1 / SCALE,
              top: bbox.y0 / SCALE,
              bottom: bbox.y1 / SCALE,
              // Same convention as the searchable PDF (size = 0.8 x line height), so re-reading it agrees.
              size: ((bbox.y1 - bbox.y0) / SCALE) * 0.8,
            })),
          });
          opts.onPage(n, { status: "done", progress: 1, text, ms: performance.now() - start });
        } catch (e) {
          console.error(`page ${n}`, e);
          opts.onPage(n, { status: "error", progress: 1, ms: performance.now() - start });
        }
      }
    };
    await Promise.all(Array.from({ length: laneCount }, lane));
    // ?debug exposes the extracted line layout for offline tuning of the EPUB heuristics.
    if (new URLSearchParams(location.search).has("debug")) Object.assign(window, { __layouts: [...result.layouts.values()] });
    return result;
  } finally {
    await Promise.all(workers.map((w) => w.terminate()));
  }
}

export async function searchablePdf(r: OcrResult) {
  const { buildSearchablePdf } = await import("./searchable-pdf");
  return buildSearchablePdf(r.bytes, r.lines);
}

export async function epubFromOcr(r: OcrResult) {
  const { buildBlocks } = await import("@/lib/layout");
  const { buildEpub, guessLang } = await import("@/lib/epub");
  const blocks = buildBlocks([...r.layouts.values()]);
  return buildEpub({ title: r.title ?? r.name, author: r.author, lang: guessLang(blocks), blocks });
}

/** The OCR result as a translation job (paragraphs rebuilt the same way as the EPUB export). */
export async function jobFromOcr(r: OcrResult): Promise<Job> {
  const { buildBlocks } = await import("@/lib/layout");
  const { buildEpub, guessLang } = await import("@/lib/epub");
  const { applyTranslations, blockTexts } = await import("@/lib/translate");
  const blocks = buildBlocks([...r.layouts.values()]);
  const texts = blockTexts(blocks);
  const keep = texts.map((t, i) => (t ? i : -1)).filter((i) => i >= 0);
  return {
    name: r.name,
    segments: keep.map((i) => ({ tag: blocks[i].kind, text: texts[i] })),
    build: (tr, mode, lang) => {
      const all: (string | undefined)[] = Array(blocks.length);
      keep.forEach((i, k) => (all[i] = tr[k]));
      const out = applyTranslations(blocks, all, mode);
      return buildEpub({ title: r.title ?? r.name, author: r.author, lang: mode === "replace" ? lang : guessLang(blocks), trLang: lang, blocks: out });
    },
  };
}
