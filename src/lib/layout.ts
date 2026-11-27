// Rebuilds reading structure (headings, paragraphs, notes) from positioned PDF/OCR lines.
// All coordinates are PDF points, top-down (y grows downward), page-local.

export type Run = { text: string; bold?: boolean; italic?: boolean; sup?: boolean };
export type TextLine = { runs: Run[]; x0: number; x1: number; top: number; bottom: number; size: number };
export type PageLayout = { n: number; width: number; height: number; lines: TextLine[] };
/** `top`: where the block starts on its page, so bookmarks pointing mid-page can find it. */
export type Block = { kind: "h1" | "h2" | "h3" | "p" | "note"; runs: Run[]; page: number; top?: number; tr?: string };

/** A pdf.js text item reduced to what layout needs. `y` is the baseline. */
export type Item = { text: string; x: number; y: number; w: number; size: number; bold: boolean; italic: boolean };

export const lineText = (l: { runs: Run[] }) => l.runs.map((r) => r.text).join("");

const SENTENCE_END = /[.!?。！？…:;"”’)\]]$/;
const PAGE_NUMBER = /^[\s\-–—.]*([0-9]+|[ivxlcdm]+)[\s\-–—.]*$/i;
const CJK = /[\u3040-\u30ff\u3400-\u9fff]/; // Chinese/Japanese join without spaces
const HANGUL = /[\uac00-\ud7a3]/;

/**
 * Groups pdf.js items (in content order) into visual lines, keeping bold/italic/superscript runs.
 * Lines are split on geometry only: pdf.js also marks end-of-line where just the font transform changes.
 */
export function linesFromItems(items: Item[]): TextLine[] {
  const lines: TextLine[] = [];
  let cur: (TextLine & { base: number }) | null = null;

  for (const it of items) {
    if (!it.text) continue;
    const raised = cur ? cur.base - it.y : 0;
    const isSup = !!cur && it.size < cur.size * 0.8 && raised > cur.size * 0.15 && raised < cur.size * 0.8;
    const newLine =
      !cur ||
      (!isSup && Math.abs(it.y - cur.base) > Math.max(it.size, cur.size) * 0.5) ||
      it.x < cur.x1 - cur.size * 2 ||
      it.x - cur.x1 > cur.size * 3; // a wide gap on the same baseline is the next column
    if (newLine) {
      if (!it.text.trim()) continue;
      cur = { runs: [], x0: it.x, x1: it.x, top: it.y - it.size * 0.8, bottom: it.y + it.size * 0.2, size: it.size, base: it.y };
      lines.push(cur);
    }
    const line = cur!;
    const prev = line.runs.at(-1)?.text ?? "";
    // pdf.js often drops the space between items; restore it from the horizontal gap.
    if (prev && !/\s$/.test(prev) && !/^\s/.test(it.text) && it.x - line.x1 > Math.min(it.size, line.size) * 0.15)
      push(line.runs, { text: " ", bold: false, italic: false });
    push(line.runs, { text: it.text, bold: it.bold, italic: it.italic, sup: isSup || undefined });
    line.x1 = Math.max(line.x1, it.x + it.w);
    if (!isSup) line.size = Math.max(line.size, it.size);
  }
  for (const l of lines) {
    const t = l.runs.at(-1);
    if (t) t.text = t.text.trimEnd();
    if (l.runs[0]) l.runs[0].text = l.runs[0].text.trimStart();
  }
  return lines.filter((l) => lineText(l));
}

function push(runs: Run[], r: Run) {
  const last = runs.at(-1);
  if (last && !!last.bold === !!r.bold && !!last.italic === !!r.italic && !!last.sup === !!r.sup) last.text += r.text;
  // Spaces take the style of what is around them rather than starting a new run.
  else if (last && r.text === " ") last.text += " ";
  else runs.push({ ...r });
}

type Joiner = (before: string, after: string) => "" | " " | "dehyphen";

/**
 * Decides how two lines meet, using the document itself as the dictionary: a word broken across
 * a line ("생|겨도", "hyphen-|ated") joins if the joined form appears whole elsewhere, keeps the
 * space/hyphen if the parts do. Korean books break both mid-word and between words.
 */
function makeJoiner(pages: PageLayout[]): Joiner {
  const vocab = new Set<string>();
  const strip = (w: string) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  for (const p of pages)
    for (const l of p.lines) {
      const words = lineText(l).split(/\s+/);
      // First/last words of a line may be fragments; only interior words are trusted.
      for (const w of words.slice(1, -1)) vocab.add(strip(w));
    }
  const tail = (s: string) => strip(s.split(/\s+/).at(-1) ?? "");
  const head = (s: string) => strip(s.split(/\s+/)[0] ?? "");

  // Document-wide tendency for Hangul|Hangul breaks, from the breaks that have evidence.
  let mid = 0;
  let between = 0;
  for (const p of pages)
    p.lines.forEach((l, i) => {
      const n = p.lines[i + 1];
      if (!n) return;
      const a = tail(lineText(l));
      const b = head(lineText(n));
      if (!HANGUL.test(a.at(-1) ?? "") || !HANGUL.test(b[0] ?? "")) return;
      if (vocab.has(a + b)) mid++;
      else if (vocab.has(a) && vocab.has(b)) between++;
    });
  // Only a clear majority overrides the safer default (a stray space reads better than two fused words).
  const hangulDefault = mid >= 5 && mid >= between * 3 ? "" : " ";

  return (before, after) => {
    const a = tail(before);
    const b = head(after);
    if (/[A-Za-z]-$/.test(before) && /^[a-z]/.test(after)) return vocab.has(`${a}-${b}`) ? "" : "dehyphen";
    if (CJK.test(before.at(-1) ?? "") && CJK.test(after[0] ?? "")) return "";
    if (HANGUL.test(before.at(-1) ?? "") && HANGUL.test(after[0] ?? "")) {
      if (vocab.has(a + b)) return "";
      if (vocab.has(a) && vocab.has(b)) return " ";
      return hangulDefault;
    }
    return " ";
  };
}

/** Appends a line to a paragraph, joining the break the way `join` decides. */
function joinRuns(into: Run[], next: Run[], join: Joiner) {
  const last = into.at(-1);
  if (!last) return next.forEach((r) => push(into, r));
  const how = join(lineText({ runs: into }), lineText({ runs: next }));
  if (how === "dehyphen") last.text = last.text.slice(0, -1);
  else if (how === " ") push(into, { text: " " });
  next.forEach((r) => push(into, r));
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** The font size that carries the most characters: the body text size. */
function bodySizeOf(pages: PageLayout[]) {
  const hist = new Map<number, number>();
  for (const p of pages)
    for (const l of p.lines) {
      const k = Math.round(l.size * 2) / 2;
      hist.set(k, (hist.get(k) ?? 0) + lineText(l).length);
    }
  let best = 10;
  let max = -1;
  for (const [k, v] of hist) if (v > max) [best, max] = [k, v];
  return best;
}

/** Drops running headers/footers and page numbers: short lines at the page edges that are numbers or repeat across pages. */
function stripMargins(pages: PageLayout[]): PageLayout[] {
  const edge = (p: PageLayout, l: TextLine) => l.bottom < p.height * 0.1 || l.top > p.height * 0.9;
  // Letters only: OCR renders the same running head as "78 : Title", "80 Title", "Title 1: 79".
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}]+/gu, " ")
      .replace(/^(?:[ivxlcdm]+ )+|(?: [ivxlcdm]+)+$/g, "")
      .trim();
  const seen = new Map<string, number>();
  for (const p of pages)
    for (const k of new Set(p.lines.filter((l) => edge(p, l)).map((l) => norm(lineText(l)))))
      seen.set(k, (seen.get(k) ?? 0) + 1);
  return pages.map((p) => ({
    ...p,
    lines: p.lines.filter((l) => {
      if (!edge(p, l)) return true;
      const t = lineText(l);
      if (PAGE_NUMBER.test(t)) return false;
      const k = norm(t);
      return !(k && t.length < 120 && (seen.get(k) ?? 0) >= 3);
    }),
  }));
}

/** Rejects OCR noise from pictures: most tokens must be word-like (letters/digits with ordinary punctuation). */
export function looksLikeText(s: string) {
  const tokens = s.split(/\s+/).filter(Boolean);
  const wordy = tokens.filter((t) => /^[("“‘'\[]*[\p{L}\p{N}][\p{L}\p{N}'’.,\-–:]*[)"”’'\],.;:!?]*$/u.test(t));
  return tokens.length > 0 && wordy.length / tokens.length >= 0.7 && /\p{L}{3}|[\p{Script=Hangul}\p{Script=Han}]{2}/u.test(s);
}

export function buildBlocks(input: PageLayout[]): Block[] {
  const pages = stripMargins([...input].sort((a, b) => a.n - b.n));
  const body = bodySizeOf(pages);
  const join = makeJoiner(pages);

  // Per-page geometry: text column edges and the usual distance between body lines.
  const stats = new Map(
    pages.map((p) => {
      const bodyLines = p.lines.filter((l) => Math.abs(l.size - body) <= body * 0.12);
      const xs1 = bodyLines.map((l) => l.x1).sort((a, b) => a - b);
      const tops = bodyLines.map((l) => l.top).sort((a, b) => a - b);
      const gaps = tops.slice(1).map((t, i) => t - tops[i]).filter((g) => g > 0 && g < body * 3);
      return [p.n, { left: median(bodyLines.map((l) => l.x0)), right: xs1.length ? xs1[Math.floor(xs1.length * 0.9)] : p.width, lineGap: median(gaps) || body * 1.3 }];
    }),
  );

  const isHeading = (l: TextLine, n: number) => {
    const r = l.size / body;
    const { left, right } = stats.get(n)!;
    // A full-width line only slightly larger than body text is usually body text measured
    // tall (skewed scan), not a heading.
    const fullWidth = l.x1 - l.x0 > (right - left) * 0.75;
    return r >= 1.2 && !(fullWidth && r < 1.5) && lineText(l).length < 200 && looksLikeText(lineText(l));
  };

  // Heading levels. OCR sizes wobble a few percent, so cluster neighbouring sizes; only sizes used
  // repeatedly form levels, so a one-off title page or figure label cannot claim h1.
  const bins = new Map<number, number>();
  for (const p of pages)
    for (const l of p.lines)
      if (isHeading(l, p.n)) {
        const k = Math.round(l.size * 4) / 4;
        bins.set(k, (bins.get(k) ?? 0) + 1);
      }
  const cluster = (entries: [number, number][]) => {
    const out: { min: number; count: number }[] = [];
    for (const [k, c] of entries.sort((a, b) => b[0] - a[0])) {
      const last = out.at(-1);
      if (last && k >= last.min * 0.92) {
        last.min = k;
        last.count += c;
      } else out.push({ min: k, count: c });
    }
    return out;
  };
  const frequent = cluster([...bins].filter(([, c]) => c >= 2)).filter((c) => c.count >= 3);
  const ranked = frequent.length ? frequent : cluster([...bins]); // short documents: every size counts
  const level = (l: TextLine): Block["kind"] => {
    const k = ranked.findIndex((c) => l.size >= c.min * 0.95);
    return k === 0 ? "h1" : k === 1 ? "h2" : "h3";
  };

  const blocks: Block[] = [];
  let indentStarts = 0;
  let paraStarts = 0;
  // First paragraph line of each page and whether it was indented, for joining paragraphs across pages.
  const pageHeads: { block: Block; indented: boolean; prevIndex: number }[] = [];
  // Paragraphs whose last line on the page is short and ends a sentence: they finished there.
  const closed = new Set<Block>();

  for (const p of pages) {
    // Keep the given reading order (tesseract/pdf.js emit columns one after another); sorting by y would interleave columns.
    const lines = p.lines;
    const { left, right, lineGap } = stats.get(p.n)!;
    // Footnotes: the run of small lines after the last body-size line.
    let lastBody = -1;
    lines.forEach((l, i) => l.size >= body * 0.88 && (lastBody = i));

    let prev: TextLine | null = null;
    let open: Block | null = null;
    let firstOnPage = true;
    let lastPara: { block: Block; line: TextLine } | null = null;

    lines.forEach((l, i) => {
      const note = lastBody >= 0 && i > lastBody && l.size < body * 0.88;
      const kind: Block["kind"] = note ? "note" : isHeading(l, p.n) ? level(l) : "p";
      const next = lines[i + 1];
      const indented = l.x0 - left > l.size * 0.8 && (!next || next.x0 < l.x0 - l.size * 0.5);
      const prevShort = !!prev && prev.x1 < right - l.size * 2 && SENTENCE_END.test(lineText(prev));
      const gap = prev ? l.top - prev.top : 0;
      const sameHeading = open && open.kind === kind && kind.startsWith("h") && gap < l.size * 1.8;
      const continues =
        open && open.kind === kind && (sameHeading || (!kind.startsWith("h") && gap > 0 && gap < Math.max(lineGap, prev!.size * 1.1) * 1.4 && !indented && !prevShort));

      if (continues) joinRuns(open!.runs, l.runs, join);
      else {
        open = { kind, runs: l.runs.map((r) => ({ ...r })), page: p.n, top: l.top };
        if (kind === "p") {
          paraStarts++;
          if (indented) indentStarts++;
          if (firstOnPage) pageHeads.push({ block: open, indented, prevIndex: blocks.length });
          firstOnPage = false;
        }
        blocks.push(open);
      }
      if (kind.startsWith("h")) firstOnPage = false;
      if (kind === "p") lastPara = { block: open!, line: l };
      prev = l;
    });
    const end = lastPara as { block: Block; line: TextLine } | null;
    if (end && end.line.x1 < right - end.line.size * 2 && SENTENCE_END.test(lineText(end.line))) closed.add(end.block);
  }

  // A paragraph that runs over a page break: merge it back unless the new page starts a paragraph.
  const usesIndent = paraStarts > 0 && indentStarts / paraStarts > 0.3;
  const dropped = new Set<Block>();
  for (const { block, indented, prevIndex } of pageHeads) {
    let j = prevIndex - 1;
    while (j >= 0 && (blocks[j].kind === "note" || dropped.has(blocks[j]))) j--;
    const before = blocks[j];
    if (!before || before.kind !== "p" || before.page >= block.page || closed.has(before)) continue;
    const ended = SENTENCE_END.test(lineText(before));
    if (!indented && (usesIndent || !ended)) {
      joinRuns(before.runs, block.runs, join);
      dropped.add(block);
    }
  }
  const out = blocks.filter((b) => !dropped.has(b));
  for (const b of out) if (b.kind.startsWith("h") && b.runs[0]) b.runs[0].text = b.runs[0].text.replace(/^(\d) (\d)\b/, "$1$2");
  return out;
}
