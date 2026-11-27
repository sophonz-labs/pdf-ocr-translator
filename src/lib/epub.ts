import { strToU8, zipSync, type Zippable } from "fflate";
import { hasTags, parseRuns } from "./inline.ts";
import { lineText, type Block, type Run } from "./layout.ts";

/** A PDF bookmark: `level` 0 is top level; `top` is where it points on the page (PDF points from the top). */
export type TocEntry = { title: string; level: number; page: number; top: number };

/**
 * `trLang` is the language of `Block.tr`, the translation printed under the original.
 * `toc`: the PDF's bookmarks; when they point into the text, chapters and the table of contents follow them.
 * `cover`: a JPEG shown first and used as the library thumbnail. `images`: JPEGs for "img" blocks, by `src`.
 */
export type Book = {
  title: string;
  author?: string;
  lang: string;
  trLang?: string;
  blocks: Block[];
  toc?: TocEntry[];
  cover?: Uint8Array;
  images?: Map<string, Uint8Array>;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function runsToHtml(runs: Run[]) {
  return runs
    .map((r) => {
      let h = esc(r.text);
      if (r.sup) h = `<sup>${h}</sup>`;
      if (r.italic) h = `<i>${h}</i>`;
      if (r.bold) h = `<b>${h}</b>`;
      return h;
    })
    .join("");
}

const xhtml = (title: string, lang: string, body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}">
<head><meta charset="UTF-8"/><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
${body}
</body>
</html>
`;

const CSS = `body { margin: 0 4%; line-height: 1.6; }
h1, h2, h3 { line-height: 1.3; text-align: left; page-break-after: avoid; }
h1 { font-size: 1.6em; margin: 2em 0 1em; }
h2 { font-size: 1.3em; margin: 1.6em 0 .8em; }
h3 { font-size: 1.1em; margin: 1.4em 0 .6em; }
p { margin: 0; text-indent: 1.5em; text-align: justify; }
h1 + p, h2 + p, h3 + p, .note + p { text-indent: 0; }
p.note { font-size: .85em; text-indent: 0; margin: .6em 0; opacity: .85; }
sup { font-size: .7em; line-height: 0; }
p.tr { text-indent: 0; margin: .3em 0 .9em; opacity: .75; }
figure { margin: 1em 0; text-align: center; page-break-inside: avoid; }
figure img { max-width: 100%; }
.cover { margin: 0; text-align: center; }
.cover img { max-width: 100%; max-height: 100vh; }
`;

type Chapter = { title: string; start: number; end: number };
type Nav = { title: string; level: number; at: number }; // `at`: index of the block it points to

/** Each bookmark's first block: the first one at or after the spot it points to. Bookmarks outside the text are dropped. */
function bookmarks(blocks: Block[], toc: TocEntry[]): Nav[] {
  if (!blocks.length) return [];
  const first = blocks[0].page;
  const out: Nav[] = [];
  for (const e of toc) {
    if (e.page < first) continue;
    const at = blocks.findIndex((b) => b.page > e.page || (b.page === e.page && (b.top ?? 0) >= e.top - 2));
    if (at >= 0 && e.title.trim()) out.push({ title: e.title.trim(), level: e.level, at });
  }
  return out;
}

/** Chapters start at the top-level bookmarks, or else at the highest heading level that occurs at least twice. */
function chapters(blocks: Block[], nav: Nav[], fallback: string): Chapter[] {
  const starts: { at: number; title: string }[] = [];
  if (nav.length) {
    const top = Math.min(...nav.map((n) => n.level));
    for (const n of nav) if (n.level === top && starts.at(-1)?.at !== n.at) starts.push({ at: n.at, title: n.title });
  } else {
    const level = (["h1", "h2", "h3"] as const).find((h) => blocks.filter((b) => b.kind === h).length >= 2);
    if (level) blocks.forEach((b, i) => b.kind === level && starts.push({ at: i, title: lineText(b) }));
  }
  if (starts[0]?.at !== 0) starts.unshift({ at: 0, title: nav.length ? fallback : "" });
  const out: Chapter[] = starts.map((s, i) => ({ title: s.title, start: s.at, end: starts[i + 1]?.at ?? blocks.length }));
  // Very long chapters make some readers sluggish; cut them into ~300-block files.
  return out.flatMap((c) =>
    Array.from({ length: Math.max(1, Math.ceil((c.end - c.start) / 300)) }, (_, i) => ({
      title: i ? "" : c.title,
      start: c.start + i * 300,
      end: Math.min(c.end, c.start + i * 300 + 300),
    })),
  );
}

/** Nested <ol> for the nav document; levels deeper than one step below the previous entry are pulled up. */
function navList(items: { title: string; level: number; href: string }[]) {
  let html = "<ol>";
  let depth = 0;
  const base = Math.min(...items.map((it) => it.level));
  items.forEach((it, i) => {
    const level = i ? Math.min(it.level - base, depth + 1) : 0;
    if (i) html += level > depth ? "\n<ol>" : "</li>" + "</ol></li>".repeat(depth - level);
    html += `\n<li><a href="${it.href}">${esc(it.title)}</a>`;
    depth = level;
  });
  return html + (items.length ? "</li>" + "</ol></li>".repeat(depth) : "") + "\n</ol>";
}

export function buildEpub(book: Book): Uint8Array {
  const id = `urn:uuid:${crypto.randomUUID()}`;
  const files: Zippable = {
    // Must be the first entry and stored uncompressed.
    mimetype: [strToU8("application/epub+zip"), { level: 0 }],
    "META-INF/container.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
`),
    "OEBPS/style.css": strToU8(CSS),
  };

  const nav = book.toc?.length ? bookmarks(book.blocks, book.toc) : [];
  const chs = chapters(book.blocks, nav, book.title);
  const fileName = (i: number) => `ch${String(i + 1).padStart(3, "0")}.xhtml`;
  const fileOf = (at: number) => fileName(chs.findIndex((c) => at >= c.start && at < c.end));
  const anchors = new Set(nav.map((n) => n.at));

  chs.forEach((c, i) => {
    const body = book.blocks
      .slice(c.start, c.end)
      .map((b, k) => {
        const id = anchors.has(c.start + k) ? ` id="b${c.start + k}"` : "";
        const tr = b.tr ? `\n<p class="tr" lang="${book.trLang}" xml:lang="${book.trLang}">${hasTags(b.tr) ? runsToHtml(parseRuns(b.tr)) : esc(b.tr)}</p>` : "";
        if (b.kind === "img") return `<figure${id}><img src="${esc(b.src ?? "")}" alt=""/></figure>`;
        if (b.kind === "note") return `<p class="note"${id}>${runsToHtml(b.runs)}</p>${tr}`;
        // Headings are bold by CSS; per-run bold there is noise (e.g. only the Latin glyphs had a bold font).
        const runs = b.kind === "p" ? b.runs : b.runs.map((r) => ({ ...r, bold: false }));
        return `<${b.kind}${id}>${runsToHtml(runs)}</${b.kind}>${tr}`;
      })
      .join("\n");
    files[`OEBPS/${fileName(i)}`] = strToU8(xhtml(c.title || book.title, book.lang, body));
  });
  const entries = nav.length
    ? nav.map((n) => ({ title: n.title, level: n.level, href: `${fileOf(n.at)}#b${n.at}` }))
    : chs.flatMap((c, i) => (c.title || i === 0 ? [{ title: c.title || book.title, level: 0, href: fileName(i) }] : []));
  if (book.cover) {
    files["OEBPS/cover.jpg"] = book.cover;
    files["OEBPS/cover.xhtml"] = strToU8(
      xhtml(book.title, book.lang, `<section epub:type="cover" class="cover"><img src="cover.jpg" alt="${esc(book.title)}"/></section>`),
    );
  }

  const pictures = [...new Set(book.blocks.flatMap((b) => (b.kind === "img" && b.src && book.images?.has(b.src) ? [b.src] : [])))];
  for (const src of pictures) files[`OEBPS/${src}`] = book.images!.get(src)!;

  files["OEBPS/nav.xhtml"] = strToU8(xhtml(book.title, book.lang, `<nav epub:type="toc" id="toc"><h1>${esc(book.title)}</h1>\n${navList(entries)}\n</nav>`));
  const modified = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  files["OEBPS/content.opf"] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${book.lang}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${id}</dc:identifier>
    <dc:title>${esc(book.title)}</dc:title>
    ${book.author ? `<dc:creator>${esc(book.author)}</dc:creator>` : ""}
    <dc:language>${book.lang}</dc:language>
    <meta property="dcterms:modified">${modified}</meta>
    ${book.cover ? '<meta name="cover" content="cover-image"/>' : ""}
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="style.css" media-type="text/css"/>
${book.cover ? '    <item id="cover-image" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>\n    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>\n' : ""}${chs.map((_, i) => `    <item id="c${i + 1}" href="${fileName(i)}" media-type="application/xhtml+xml"/>`).join("\n")}
${pictures.map((src, i) => `    <item id="img${i + 1}" href="${esc(src)}" media-type="image/jpeg"/>`).join("\n")}
  </manifest>
  <spine>
${book.cover ? '    <itemref idref="cover"/>\n' : ""}${chs.map((_, i) => `    <itemref idref="c${i + 1}"/>`).join("\n")}
  </spine>
</package>
`);
  return zipSync(files);
}

/** "ko" when Hangul makes up a good share of the letters, else "en". */
export function guessLang(blocks: Block[]) {
  const t = blocks.map((b) => lineText(b)).join("");
  const hangul = (t.match(/[가-힣]/g) ?? []).length;
  const latin = (t.match(/[A-Za-z]/g) ?? []).length;
  return hangul > latin * 0.3 ? "ko" : "en";
}
