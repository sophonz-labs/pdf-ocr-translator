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

export async function translateText(text: string, target: string, f: Fetcher = fetch, signal?: AbortSignal, source = "auto") {
  const q = new URLSearchParams({
    "params.client": "gtx",
    "query.source_language": source,
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
      // Google sometimes answers with HTML for what looks like markup (a footnote number becomes <sup>1</sup>); we write plain text.
      return ((await r.json()) as { translation: string }).translation.replace(/<\/?(sup|sub|b|i|em|strong|u|span)\b[^>]*>/gi, "");
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

type Opts = {
  /** Source language code; default "auto" (Google detects it). */
  source?: string;
  /** Indices to translate; default all non-empty. */
  only?: number[];
  onProgress?: (done: number, total: number) => void;
  /** Called as each paragraph lands (undefined = Google failed on it). */
  onResult?: (i: number, t: string | undefined) => void;
  fetch?: Fetcher;
  signal?: AbortSignal;
};

/**
 * Translates paragraphs, batched with blank lines between them; a batch whose answer comes back
 * with a different paragraph count is redone one paragraph at a time.
 * Returns one translation per input (undefined where not asked or where Google failed).
 */
export async function translateTexts(texts: string[], target: string, opts: Opts = {}) {
  const f = opts.fetch ?? fetch;
  const out: (string | undefined)[] = texts.map(() => undefined);
  const set = (i: number, t: string | undefined) => {
    out[i] = t;
    opts.onResult?.(i, t);
  };
  const todo = (opts.only ?? texts.map((_, i) => i)).filter((i) => texts[i]?.trim());

  const batches: number[][] = [];
  let cur: number[] = [];
  let size = 0;
  for (const i of todo) {
    const b = bytes(texts[i]) + 6;
    if (cur.length && size + b > MAX_BYTES) {
      batches.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(i);
    size += b;
  }
  if (cur.length) batches.push(cur);

  const one = async (i: number) => {
    try {
      const parts = [];
      for (const p of pieces(texts[i])) parts.push(await translateText(p, target, f, opts.signal, opts.source));
      set(i, parts.join(" "));
    } catch (e) {
      if (opts.signal?.aborted) throw e;
      set(i, undefined);
    }
  };

  let next = 0;
  let done = 0;
  opts.onProgress?.(0, todo.length);
  const lane = async () => {
    while (next < batches.length) {
      const batch = batches[next++];
      let parts: string[] | null = null;
      if (batch.length > 1) {
        try {
          parts = (await translateText(batch.map((i) => texts[i]).join(SEP), target, f, opts.signal, opts.source)).split(/\n\s*\n/);
        } catch (e) {
          if (opts.signal?.aborted) throw e;
        }
      }
      if (parts?.length === batch.length) batch.forEach((i, k) => set(i, parts[k].trim()));
      else for (const i of batch) await one(i);
      done += batch.length;
      opts.onProgress?.(done, todo.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(LANES, batches.length) }, lane));
  return out;
}

/** The text sent for translation for each block. */
export const blockTexts = (blocks: Block[]) => blocks.map((b) => lineText(b).replace(/\s+/g, " ").trim());

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

/** Every language code Google Translate takes (same list as the calibre plugin's Google engines). */
// prettier-ignore
export const LANGS = ["ab","ace","ach","aa","af","sq","alz","am","ar","hy","as","av","awa","ay","az","ban","bal","bm","bci","ba","eu","btx","bts","bbc","be","bem","bn","bew","bho","bik","bs","br","bg","bua","yue","ca","ceb","ch","ce","ny","zh-CN","zh-TW","chk","cv","co","crh","hr","cs","da","fa-AF","dv","din","doi","dov","nl","dyu","dz","en","eo","et","ee","fo","fj","tl","fi","fon","fr","fy","fur","ff","gaa","gl","ka","de","el","gn","gu","ht","cnh","ha","haw","iw","hil","hi","hmn","hu","hrx","iba","is","ig","ilo","id","ga","it","jam","ja","jw","kac","kl","kn","kr","pam","kk","kha","km","cgg","kg","rw","ktu","trp","kv","gom","ko","kri","ku","ckb","ky","lo","ltg","la","lv","lij","li","ln","lt","lmo","lg","luo","lb","mk","mad","mai","mak","mg","ms","ms-Arab","ml","mt","mam","gv","mi","mr","mh","mwr","mfe","chm","mni-Mtei","min","lus","mn","my","nhe","ndc-ZW","nr","new","ne","bm-Nkoo","no","nus","oc","or","om","os","pag","pap","ps","fa","pl","pt","pt-PT","pa","pa-Arab","qu","kek","rom","ro","rn","ru","se","sm","sg","sa","sat-Latn","gd","nso","sr","st","crs","shn","sn","scn","szl","sd","si","sk","sl","so","es","su","sus","sw","ss","sv","ty","tg","ber-Latn","ber","ta","tt","te","tet","th","bo","ti","tiv","tpi","to","ts","tn","tcy","tum","tr","tk","tyv","ak","udm","uk","ur","ug","uz","ve","vec","vi","war","cy","wo","xh","sah","yi","yo","yua","zap","zu"];
export const COMMON_LANGS = ["ko", "en", "ja", "zh-CN", "zh-TW", "de", "fr", "es", "ru"];
