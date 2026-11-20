// Reads an existing EPUB's paragraphs and writes translations back into it. Browser only (DOMParser).
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";

const XHTML = "http://www.w3.org/1999/xhtml";
const BLOCK = "p,h1,h2,h3,h4,h5,h6,li,blockquote,dt,dd,td,th,figcaption,caption,pre,div,section,article,aside,header,footer";
// Translations go inside these (a sibling would add a table cell or list bullet); after the others.
const INSIDE = new Set(["li", "td", "th", "dt", "dd", "figcaption", "caption"]);

type Doc = { path: string; dom: Document; xmlDecl: boolean };
export type Segment = { tag: string; text: string };
export type OpenEpub = { files: Record<string, Uint8Array>; opfPath: string; title: string; docs: Doc[]; segments: Segment[] };

const resolve = (base: string, href: string) => decodeURIComponent(new URL(href, `http://x/${base}`).pathname.slice(1));

function parse(src: string): Document {
  const dom = new DOMParser().parseFromString(src, "application/xhtml+xml");
  // Not well-formed XML (e.g. HTML entities like &nbsp;): let the HTML parser repair it; it serializes back as XHTML.
  return dom.getElementsByTagName("parsererror").length ? new DOMParser().parseFromString(src, "text/html") : dom;
}

export function readEpub(bytes: Uint8Array): OpenEpub {
  const files = unzipSync(bytes);
  const container = files["META-INF/container.xml"];
  if (!container) throw new Error("EPUB이 아닙니다 (META-INF/container.xml 없음)");
  const opfPath = new DOMParser()
    .parseFromString(strFromU8(container), "application/xml")
    .querySelector("rootfile")
    ?.getAttribute("full-path");
  if (!opfPath || !files[opfPath]) throw new Error("content.opf를 찾지 못했습니다");
  const opf = new DOMParser().parseFromString(strFromU8(files[opfPath]), "application/xml");

  const manifest = new Map<string, Element>();
  for (const it of opf.getElementsByTagName("item")) manifest.set(it.getAttribute("id")!, it);
  const docs: Doc[] = [];
  for (const ref of opf.getElementsByTagName("itemref")) {
    const it = manifest.get(ref.getAttribute("idref") ?? "");
    if (!it || !/x?html/.test(it.getAttribute("media-type") ?? "") || /\bnav\b/.test(it.getAttribute("properties") ?? "")) continue;
    const path = resolve(opfPath, it.getAttribute("href")!);
    if (!files[path]) continue;
    const src = strFromU8(files[path]);
    docs.push({ path, dom: parse(src), xmlDecl: src.trimStart().startsWith("<?xml") });
  }

  const els: Element[] = [];
  for (const d of docs) {
    for (const el of d.dom.querySelectorAll(BLOCK)) {
      // Leaf blocks only: a <div> holding <p>s is translated through its <p>s.
      if (el.querySelector(BLOCK) || !el.textContent?.trim()) continue;
      els.push(el);
    }
  }
  const title = opf.getElementsByTagName("dc:title")[0]?.textContent?.trim() || "book";
  const segments = els.map((el) => ({ tag: el.localName, text: el.textContent!.replace(/\s+/g, " ").trim() }));
  return { files, opfPath, title, docs, segments };
}

/** A new EPUB with translations applied. The opened book is left unchanged, so this can run again after more edits. */
export function writeEpub(book: OpenEpub, tr: (string | undefined)[], mode: "replace" | "both", lang: string): Uint8Array {
  const docs = book.docs.map((d) => ({ ...d, dom: d.dom.cloneNode(true) as Document }));
  // Same document order as readEpub, so index i maps to the same element in the clone.
  const els = docs.flatMap((d) => [...d.dom.querySelectorAll(BLOCK)].filter((el) => !el.querySelector(BLOCK) && el.textContent?.trim()));

  els.forEach((el, i) => {
    const t = tr[i];
    if (!t) return;
    const ns = el.namespaceURI ?? XHTML;
    if (mode === "replace") {
      // Put the text in the first text node and blank the rest, so images and the element itself stay.
      const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let first = true;
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent?.trim()) continue;
        n.textContent = first ? t : "";
        first = false;
      }
      el.setAttribute("lang", lang);
      return;
    }
    const doc = el.ownerDocument;
    const span = doc.createElementNS(ns, INSIDE.has(el.localName) ? "span" : el.localName);
    span.textContent = t;
    span.setAttribute("lang", lang);
    span.setAttribute("style", "opacity:.75");
    if (INSIDE.has(el.localName)) {
      el.append(doc.createElementNS(ns, "br"), span);
    } else {
      for (const a of ["class", "dir"]) if (el.hasAttribute(a)) span.setAttribute(a, el.getAttribute(a)!);
      el.after(span);
    }
  });

  const out: Zippable = { mimetype: [strToU8("application/epub+zip"), { level: 0 }] };
  for (const [path, data] of Object.entries(book.files)) if (path !== "mimetype") out[path] = data;
  const ser = new XMLSerializer();
  for (const d of docs) {
    const body = ser.serializeToString(d.dom);
    out[d.path] = strToU8((d.xmlDecl && !body.startsWith("<?xml") ? '<?xml version="1.0" encoding="utf-8"?>\n' : "") + body);
  }
  if (mode === "replace") {
    out[book.opfPath] = strToU8(strFromU8(book.files[book.opfPath]).replace(/(<dc:language[^>]*>)[^<]*/, `$1${lang}`));
  }
  return zipSync(out);
}
