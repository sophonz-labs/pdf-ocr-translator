import { lineText, type Block } from "./layout.ts";

// Same keyless endpoint as the "Google (Free) - New" engine of bookfere/ebook-translator-calibre-plugin.
// It answers CORS for any origin, so the browser calls it directly. GET only.
const ENDPOINT = "https://translate-pa.googleapis.com/v1/translate";
const KEY = "AIzaSyDLEeFI5OtFBwYBIoK_jj5m32rZK5CkCXA";
const SEP = "\n\n";
// Percent-encoded query.text budget per request (a Hangul char is 9 bytes encoded).
const MAX_BYTES = 9000;
const LANES = 4;

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export async function translateText(text: string, target: string, f: Fetcher = fetch, signal?: AbortSignal) {
  const q = new URLSearchParams({
    "params.client": "gtx",
    "query.source_language": "auto",
    "query.target_language": target,
    "query.display_language": "en-US",
    data_types: "TRANSLATION",
    key: KEY,
    "query.text": text,
  });
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await f(`${ENDPOINT}?${q}`, { signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return ((await r.json()) as { translation: string }).translation;
    } catch (e) {
      if (signal?.aborted || attempt >= 2) throw e;
      await new Promise((ok) => setTimeout(ok, 1000 * 2 ** attempt));
    }
  }
}

const bytes = (s: string) => encodeURIComponent(s).length;

/** Splits text that alone exceeds the budget at sentence ends (or anywhere, as a last resort). */
function pieces(text: string): string[] {
  if (bytes(text) <= MAX_BYTES) return [text];
  const out: string[] = [];
  let cur = "";
  for (const s of text.match(/[^.!?。！？]+[.!?。！？]*\s*/g) ?? [text]) {
    if (cur && bytes(cur + s) > MAX_BYTES) {
      out.push(cur);
      cur = "";
    }
    cur += s;
    while (bytes(cur) > MAX_BYTES) {
      const cut = Math.floor(cur.length / 2);
      out.push(cur.slice(0, cut));
      cur = cur.slice(cut);
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Translates every block's text, keeping block order. Blocks are batched with blank lines between them;
 * a batch whose answer comes back with a different paragraph count is redone one block at a time.
 * Returns one translation per block (undefined where Google failed, so the caller can keep the original).
 */
export async function translateBlocks(
  blocks: Block[],
  target: string,
  onProgress: (done: number, total: number) => void,
  opts: { fetch?: Fetcher; signal?: AbortSignal } = {},
) {
  const f = opts.fetch ?? fetch;
  const texts = blocks.map((b) => lineText(b).replace(/\s+/g, " ").trim());
  const out: (string | undefined)[] = texts.map((t) => (t ? undefined : ""));

  const batches: number[][] = [];
  let cur: number[] = [];
  let size = 0;
  texts.forEach((t, i) => {
    if (!t) return;
    const b = bytes(t) + 6;
    if (cur.length && size + b > MAX_BYTES) {
      batches.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(i);
    size += b;
  });
  if (cur.length) batches.push(cur);

  const one = async (i: number) => {
    try {
      const parts = [];
      for (const p of pieces(texts[i])) parts.push(await translateText(p, target, f, opts.signal));
      out[i] = parts.join(" ");
    } catch (e) {
      if (opts.signal?.aborted) throw e;
    }
  };

  let next = 0;
  let done = 0;
  const total = batches.reduce((n, b) => n + b.length, 0);
  onProgress(0, total);
  const lane = async () => {
    while (next < batches.length) {
      const batch = batches[next++];
      let parts: string[] | null = null;
      if (batch.length > 1) {
        try {
          parts = (await translateText(batch.map((i) => texts[i]).join(SEP), target, f, opts.signal)).split(/\n\s*\n/);
        } catch (e) {
          if (opts.signal?.aborted) throw e;
        }
      }
      if (parts?.length === batch.length) batch.forEach((i, k) => (out[i] = parts[k].trim()));
      else for (const i of batch) await one(i);
      done += batch.length;
      onProgress(done, total);
    }
  };
  await Promise.all(Array.from({ length: Math.min(LANES, batches.length) }, lane));
  return out;
}

/** Translated copies of the blocks: "replace" swaps the text, "both" keeps the original and adds the translation below it. */
export function applyTranslations(blocks: Block[], tr: (string | undefined)[], mode: "replace" | "both"): Block[] {
  return blocks.map((b, i) => {
    const t = tr[i];
    if (!t) return b;
    if (mode === "both") return { ...b, tr: t };
    // Inline styling cannot be mapped onto translated words; keep it only when it covers the whole block.
    const all = (k: "bold" | "italic") => b.runs.every((r) => r[k] || !r.text.trim());
    return { ...b, runs: [{ text: t, bold: all("bold") || undefined, italic: all("italic") || undefined }] };
  });
}

export const TARGETS = [
  ["ko", "한국어"],
  ["en", "English"],
  ["ja", "日本語"],
  ["zh-CN", "中文(简体)"],
  ["zh-TW", "中文(繁體)"],
  ["de", "Deutsch"],
  ["fr", "Français"],
  ["es", "Español"],
] as const;
