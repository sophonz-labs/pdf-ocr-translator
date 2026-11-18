import { strToU8, zipSync, type Zippable } from "fflate";
import { lineText, type Block, type Run } from "./layout.ts";

export type Book = { title: string; author?: string; lang: string; blocks: Block[] };

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
`;

/** Splits at the highest heading level that occurs at least twice; that becomes the chapter level. */
function chapters(blocks: Block[]) {
  const level = (["h1", "h2", "h3"] as const).find((h) => blocks.filter((b) => b.kind === h).length >= 2);
  const out: { title: string; blocks: Block[] }[] = [];
  for (const b of blocks) {
    if (!out.length || (level && b.kind === level)) out.push({ title: b.kind === level ? lineText(b) : "", blocks: [] });
    out.at(-1)!.blocks.push(b);
  }
  // Very long chapters make some readers sluggish; cut them into ~300-block files.
  return out.flatMap((c) =>
    Array.from({ length: Math.ceil(c.blocks.length / 300) }, (_, i) => ({ title: i ? "" : c.title, blocks: c.blocks.slice(i * 300, i * 300 + 300) })),
  );
}

export function buildEpub(book: Book): Uint8Array {
  const id = `urn:uuid:${crypto.randomUUID()}`;
  const chs = chapters(book.blocks);
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

  const toc: string[] = [];
  chs.forEach((c, i) => {
    const name = `ch${String(i + 1).padStart(3, "0")}.xhtml`;
    const body = c.blocks
      .map((b) => {
        if (b.kind === "note") return `<p class="note">${runsToHtml(b.runs)}</p>`;
        // Headings are bold by CSS; per-run bold there is noise (e.g. only the Latin glyphs had a bold font).
        const runs = b.kind === "p" ? b.runs : b.runs.map((r) => ({ ...r, bold: false }));
        return `<${b.kind}>${runsToHtml(runs)}</${b.kind}>`;
      })
      .join("\n");
    files[`OEBPS/${name}`] = strToU8(xhtml(c.title || book.title, book.lang, body));
    if (c.title || i === 0) toc.push(`<li><a href="${name}">${esc(c.title || book.title)}</a></li>`);
  });

  files["OEBPS/nav.xhtml"] = strToU8(
    xhtml(book.title, book.lang, `<nav epub:type="toc" id="toc"><h1>${esc(book.title)}</h1><ol>\n${toc.join("\n")}\n</ol></nav>`),
  );
  const modified = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  files["OEBPS/content.opf"] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${book.lang}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${id}</dc:identifier>
    <dc:title>${esc(book.title)}</dc:title>
    ${book.author ? `<dc:creator>${esc(book.author)}</dc:creator>` : ""}
    <dc:language>${book.lang}</dc:language>
    <meta property="dcterms:modified">${modified}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="style.css" media-type="text/css"/>
${chs.map((_, i) => `    <item id="c${i + 1}" href="ch${String(i + 1).padStart(3, "0")}.xhtml" media-type="application/xhtml+xml"/>`).join("\n")}
  </manifest>
  <spine>
${chs.map((_, i) => `    <itemref idref="c${i + 1}"/>`).join("\n")}
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
