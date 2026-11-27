// The PDF → text pipeline, shared by the OCR tab and the one-shot routine. Browser only.
import type { TocEntry } from "@/lib/epub";
import { findFigures, type Box } from "@/lib/figures";
import type { Figure, PageLayout } from "@/lib/layout";
import type { SavedPage } from "@/lib/store";
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
  /** The PDF's bookmarks, for EPUB chapters and table of contents. */
  toc: TocEntry[];
  /** Page 1 as a JPEG, for the EPUB cover. */
  cover?: Uint8Array;
  /** Pictures cut out of the pages, by their path in the EPUB (`images/p12-1.jpg`). */
  images: Map<string, Uint8Array>;
};

type Pdf = Awaited<ReturnType<typeof import("pdfjs-dist/legacy/build/pdf.mjs").getDocument>["promise"]>;

/** Bookmarks with the page and spot each one points to (top-down PDF points). Broken destinations are skipped. */
async function readToc(pdf: Pdf): Promise<TocEntry[]> {
  const out: TocEntry[] = [];
  const walk = async (items: Awaited<ReturnType<Pdf["getOutline"]>> | null, level: number) => {
    for (const it of items ?? []) {
      try {
        const dest = typeof it.dest === "string" ? await pdf.getDestination(it.dest) : it.dest;
        if (dest?.[0]) {
          const n = (typeof dest[0] === "number" ? dest[0] : await pdf.getPageIndex(dest[0])) + 1;
          const height = (await pdf.getPage(n)).getViewport({ scale: 1 }).height;
          // [page, /XYZ left top zoom] or [page, /FitH top]: top counts up from the bottom; other kinds mean the page top.
          const y = dest[1]?.name === "XYZ" ? dest[3] : /^FitB?H$/.test(dest[1]?.name ?? "") ? dest[2] : null;
          out.push({ title: it.title, level, page: n, top: typeof y === "number" ? Math.max(0, height - y) : 0 });
        }
      } catch {}
      if (level < 2) await walk(it.items, level + 1);
    }
  };
  await walk(await pdf.getOutline().catch(() => null), 0);
  return out;
}

type PdfPage = Awaited<ReturnType<Pdf["getPage"]>>;

async function render(page: PdfPage, scale: number) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, viewport }).promise;
  return { canvas, viewport };
}

const jpeg = async (canvas: HTMLCanvasElement) => {
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  return blob ? new Uint8Array(await blob.arrayBuffer()) : undefined;
};

/** Page 1 rendered about 1200px wide as a JPEG. */
async function coverJpeg(pdf: Pdf) {
  const page = await pdf.getPage(1);
  const { canvas } = await render(page, Math.min(2.5, 1200 / page.getViewport({ scale: 1 }).width));
  const out = await jpeg(canvas);
  canvas.width = canvas.height = 0;
  return out;
}

/** Cuts the pictures out of a page rendered at SCALE as JPEGs (at most 1600px wide). `text`: recognised lines in canvas pixels. */
async function cutFigures(canvas: HTMLCanvasElement, text: Box[], n: number, images: Map<string, Uint8Array>): Promise<Figure[]> {
  const boxes = findFigures(canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height), text);
  const out: Figure[] = [];
  for (const [k, b] of boxes.entries()) {
    const fit = Math.min(1, 1600 / (b.x1 - b.x0));
    const c = document.createElement("canvas");
    c.width = Math.round((b.x1 - b.x0) * fit);
    c.height = Math.round((b.y1 - b.y0) * fit);
    c.getContext("2d")!.drawImage(canvas, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, 0, 0, c.width, c.height);
    const bytes = await jpeg(c);
    c.width = c.height = 0;
    if (!bytes) continue;
    const src = `images/p${n}-${k + 1}.jpg`;
    images.set(src, bytes);
    out.push({ src, x0: b.x0 / SCALE, x1: b.x1 / SCALE, top: b.y0 / SCALE, bottom: b.y1 / SCALE });
  }
  return out;
}

const SCALE = 2.5; // render scale for OCR: ~180 dpi on a letter page, enough for body text
const MIN_CONFIDENCE = 65;

export async function ocrPdf(
  f: File,
  opts: {
    lang: string;
    skipText: boolean;
    /** Cut pictures out of the pages for the EPUB (renders text-layer pages that contain images). */
    figures: boolean;
    /** Pages finished in an earlier run of this file: used as they are, not read again. */
    restore?: Map<number, SavedPage>;
    /** Called with each page as it's finished, to keep it for a later run. */
    persist?: (n: number, p: SavedPage) => void;
    /** The pages to read out of `total`; throw to refuse (e.g. a range past the end). */
    pick: (total: number) => number[];
    cancelled: () => boolean;
    onOpen: (pages: number[], lanes: number) => void;
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
  const result: OcrResult = { name: f.name.replace(/\.pdf$/i, ""), bytes, lines: new Map(), layouts: new Map(), toc: [], images: new Map() };
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
    const pages = opts.pick(pdf.numPages);
    result.toc = await readToc(pdf);
    result.cover = await coverJpeg(pdf).catch(() => undefined);

    // One tesseract worker per lane; each holds its own copy of the models (~100MB+), so cap it.
    const laneCount = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1, pages.length));
    opts.onOpen(pages, laneCount);
    let next = 0;
    const PICTURES = new Set([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject, pdfjs.OPS.paintImageXObjectRepeat]);
    // Page 1 is the cover already.
    const wantFigures = (n: number) => opts.figures && !(n === 1 && result.cover);

    const lane = async () => {
      let worker: OcrWorker | null = null;
      let at = 0;
      while (!opts.cancelled()) {
        if (next >= pages.length) return;
        const n = pages[next++];
        at = n;
        const start = performance.now();
        const old = opts.restore?.get(n);
        if (old) {
          result.layouts.set(n, old.layout);
          if (old.lines) result.lines.set(n, old.lines);
          for (const [src, b] of old.images) result.images.set(src, b);
          opts.onPage(n, { status: old.status, progress: 1, text: old.text, ms: old.ms });
          continue;
        }
        const keep = (status: SavedPage["status"], text: string) => {
          const layout = result.layouts.get(n)!;
          const images = (layout.figures ?? []).flatMap((f) => (result.images.has(f.src) ? [[f.src, result.images.get(f.src)!] as [string, Uint8Array]] : []));
          opts.persist?.(n, { status, text, ms: performance.now() - start, lines: result.lines.get(n), layout, images });
        };
        try {
          const page = await pdf.getPage(n);
          const vp = page.getViewport({ scale: 1 });
          if (opts.skipText) {
            const tc = await page.getTextContent();
            const text = tc.items.map((i) => ("str" in i ? i.str + (i.hasEOL ? "\n" : "") : "")).join("");
            if (text.trim().length > 20) {
              const lines = await textLayerLines(page, tc);
              let figures: Figure[] = [];
              // Scans with a text layer, and born-digital pages with photos: look for pictures in the rendered page.
              if (wantFigures(n) && (await page.getOperatorList()).fnArray.some((op) => PICTURES.has(op))) {
                const { canvas } = await render(page, SCALE);
                const px = (v: number) => v * SCALE;
                figures = await cutFigures(canvas, lines.map((l) => ({ x0: px(l.x0), x1: px(l.x1), y0: px(l.top), y1: px(l.bottom) })), n, result.images);
                canvas.width = canvas.height = 0;
              }
              result.layouts.set(n, { n, width: vp.width, height: vp.height, lines, figures });
              keep("text", text);
              opts.onPage(n, { status: "text", progress: 1, text, ms: performance.now() - start });
              continue;
            }
          }

          opts.onPage(n, { status: "render", progress: 0 });
          const { canvas, viewport } = await render(page, SCALE);

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
          // Lines, not words: Korean words come back in fragments and PDF extractors insert spaces between them.
          // Pictures produce garbage lines; real text scores 80+, picture noise mostly under 60.
          const paras = (data.blocks ?? []).flatMap((b) => b.paragraphs).map((p) => p.lines.filter((l) => l.confidence >= MIN_CONFIDENCE));
          const found = paras.flat();
          const figures = wantFigures(n) ? await cutFigures(canvas, found.map((l) => l.bbox), n, result.images) : [];
          canvas.width = canvas.height = 0; // free the bitmap now, not at GC time
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
            figures,
          });
          keep("done", text);
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
  return buildEpub({ ...bookOf(r), lang: guessLang(blocks), blocks });
}

const bookOf = (r: OcrResult) => ({ title: r.title ?? r.name, author: r.author, toc: r.toc, cover: r.cover, images: r.images });

/** Markdown, or a zip of it with its pictures (`images/…`) when it has any. */
export async function markdownFromOcr(r: OcrResult): Promise<{ bytes: Uint8Array; ext: "md" | "zip" }> {
  const { buildBlocks } = await import("@/lib/layout");
  const { guessLang } = await import("@/lib/epub");
  const { toMarkdown } = await import("@/lib/markdown");
  const { strToU8, zipSync } = await import("fflate");
  const blocks = buildBlocks([...r.layouts.values()]);
  const md = strToU8(toMarkdown({ ...bookOf(r), lang: guessLang(blocks), blocks }));
  const used = blocks.flatMap((b) => (b.kind === "img" && b.src && r.images.has(b.src) ? [b.src] : []));
  if (!used.length) return { bytes: md, ext: "md" };
  return { bytes: zipSync({ [`${r.name}.md`]: md, ...Object.fromEntries(used.map((src) => [src, [r.images.get(src)!, { level: 0 }]])) }), ext: "zip" };
}

/** The OCR result as a translation job (paragraphs rebuilt the same way as the EPUB export). */
export async function jobFromOcr(r: OcrResult): Promise<Job> {
  const { buildBlocks } = await import("@/lib/layout");
  const { buildEpub, guessLang } = await import("@/lib/epub");
  const { applyTranslations, blockSources, blockTexts } = await import("@/lib/translate");
  const blocks = buildBlocks([...r.layouts.values()]);
  const texts = blockTexts(blocks);
  const sources = blockSources(blocks);
  const keep = texts.map((t, i) => (t ? i : -1)).filter((i) => i >= 0);
  return {
    name: r.name,
    origin: "ocr",
    segments: keep.map((i) => ({ tag: blocks[i].kind, text: texts[i], src: sources[i] })),
    build: (tr, mode, lang) => {
      const all: (string | undefined)[] = Array(blocks.length);
      keep.forEach((i, k) => (all[i] = tr[k]));
      const out = applyTranslations(blocks, all, mode);
      return buildEpub({ ...bookOf(r), lang: mode === "replace" ? lang : guessLang(blocks), trLang: lang, blocks: out });
    },
    pdf: async (tr) => {
      const [{ buildTranslatedPdf }, { stripTags }] = await Promise.all([import("@/lib/translated-pdf"), import("@/lib/inline")]);
      const all: (string | undefined)[] = Array(blocks.length);
      keep.forEach((i, k) => (all[i] = tr[k] && stripTags(tr[k])));
      const font = await fetch("/fonts/NanumGothic-Regular.ttf").then((x) => x.arrayBuffer());
      return buildTranslatedPdf(r.bytes, blocks, all, font);
    },
  };
}
