// The original PDF with each translated block written over its place on the page: the text is
// covered with the paper colour and the translation set in the same area, shrunk until it fits.
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import type { Block, LineBox } from "./layout.ts";

/** Splits `text` into `weights.length` pieces sized by the weights, at spaces where there are any. */
export function splitByWeight(text: string, weights: number[]): string[] {
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const out: string[] = [];
  let at = 0;
  let acc = 0;
  weights.forEach((w, k) => {
    acc += w;
    if (k === weights.length - 1) return out.push(text.slice(at).trim());
    let cut = Math.round((text.length * acc) / total);
    const space = text.lastIndexOf(" ", cut);
    if (space > at && cut - space < 20) cut = space;
    out.push(text.slice(at, cut).trim());
    at = cut;
  });
  return out;
}

/** Lines of `text` no wider than `width`: breaks at spaces, and inside a word only when it alone is too wide. */
export function wrap(text: string, width: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  let cur = "";
  const push = (piece: string) => {
    if (!cur || measure(cur + piece) <= width) return void (cur += piece);
    lines.push(cur.trimEnd());
    cur = piece.trimStart();
  };
  for (const word of text.match(/\S+\s*/g) ?? []) {
    if (measure(word.trimEnd()) <= width) push(word);
    else for (const ch of word) push(ch); // CJK runs without spaces, long URLs
  }
  if (cur.trim()) lines.push(cur.trimEnd());
  return lines;
}

const LEADING = 1.25;

/**
 * `tr[i]` is the translation of `blocks[i]` (blocks need `boxes`). `font`: a TrueType font covering the
 * target language. Throws when the translations use characters the font doesn't have.
 */
export async function buildTranslatedPdf(original: ArrayBuffer, blocks: Block[], tr: (string | undefined)[], fontBytes: ArrayBuffer): Promise<Uint8Array> {
  const doc = await PDFDocument.load(original, { ignoreEncryption: true });
  doc.registerFontkit(fontkit);
  // Full font: pdf-lib's subsetting drops most Hangul glyphs from NanumGothic (they render blank).
  const font = await doc.embedFont(fontBytes);
  const has = new Set(font.getCharacterSet());
  const missing = new Set([...tr.join("")].filter((c) => !/\s/.test(c) && !has.has(c.codePointAt(0)!)));
  if (missing.size) throw new Error(`no glyphs for ${[...missing].slice(0, 12).join(" ")}`);

  const pages = doc.getPages();
  blocks.forEach((b, i) => {
    const t = tr[i]?.replace(/\s+/g, " ").trim();
    if (!t || !b.boxes?.length) return;
    // One part per page the block spans (a paragraph over a page break), text shared by line length.
    const parts = new Map<number, LineBox[]>();
    for (const x of b.boxes) parts.set(x.page, [...(parts.get(x.page) ?? []), x]);
    const groups = [...parts.values()];
    const texts = splitByWeight(t, groups.map((g) => g.reduce((s, x) => s + (x.x1 - x.x0), 0)));
    groups.forEach((g, k) => {
      const page = pages[g[0].page - 1];
      if (!page) return;
      // shortcut: assumes an unrotated page whose crop box starts at 0,0 (what scanners produce).
      const H = page.getHeight();
      const x0 = Math.min(...g.map((x) => x.x0));
      const x1 = Math.max(...g.map((x) => x.x1));
      const top = Math.min(...g.map((x) => x.top));
      const bottom = Math.max(...g.map((x) => x.bottom));
      // shortcut: covers with white, so tinted paper shows a lighter patch; sample the scan's colour if that bothers.
      page.drawRectangle({ x: x0 - 1, y: H - bottom - 1, width: x1 - x0 + 2, height: bottom - top + 2, color: rgb(1, 1, 1) });
      const sizes = g.map((x) => x.size).sort((a, b) => a - b);
      let size = sizes[Math.floor(sizes.length / 2)];
      let lines = wrap(texts[k], x1 - x0, (s) => font.widthOfTextAtSize(s, size));
      // Shrink until it fits the original area (translations run longer or shorter than the original).
      while (size > 4 && lines.length * size * LEADING > bottom - top + size * (LEADING - 1)) {
        size *= 0.92;
        lines = wrap(texts[k], x1 - x0, (s) => font.widthOfTextAtSize(s, size));
      }
      lines.forEach((line, j) => page.drawText(line, { x: x0, y: H - top - size * (j + 1) * LEADING + size * (LEADING - 1), size, font, color: rgb(0, 0, 0) }));
    });
  });
  return doc.save();
}
