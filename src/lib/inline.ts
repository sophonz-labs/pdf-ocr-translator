// Inline formatting through machine translation: the original's <b>/<i>/<sup>/<a>… go out as tags
// (Google keeps them in place) and come back as runs or elements.
import type { Run } from "./layout.ts";

const NAMES = "b|i|em|strong|sup|sub|a|u|small|span|cite|q|abbr|code|s|mark";
export const INLINE = new Set(NAMES.split("|"));
const tagRe = () => new RegExp(`<(/?)(${NAMES})(?:\\s[^>]*)?>`, "gi");

export const hasTags = (s: string) => tagRe().test(s);
export const stripTags = (s: string) => s.replace(tagRe(), "");
export const escapeText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const decode = (s: string) =>
  s.replace(/&(lt|gt|amp|quot|#39|#x27);/g, (_, e: string) => ({ lt: "<", gt: ">", amp: "&", quot: '"', "#39": "'", "#x27": "'" })[e]!);

/** Text and tags in order; text is entity-decoded. Unknown "<…>" stays text. */
export function tokens(s: string): ({ text: string } | { open: string } | { close: string })[] {
  const out: ({ text: string } | { open: string } | { close: string })[] = [];
  let at = 0;
  for (const m of s.matchAll(tagRe())) {
    if (m.index > at) out.push({ text: decode(s.slice(at, m.index)) });
    const name = m[2].toLowerCase();
    out.push(m[1] ? { close: name } : { open: name });
    at = m.index + m[0].length;
  }
  if (at < s.length) out.push({ text: decode(s.slice(at)) });
  return out;
}

/** Runs as tagged text when their styling differs within the block; otherwise undefined (send the plain text). */
export function markRuns(runs: Run[], heading = false): string | undefined {
  const style = (r: Run) => `${!heading && r.bold ? "b" : ""}${r.italic ? "i" : ""}${r.sup ? "s" : ""}`;
  const shown = runs.filter((r) => r.text.trim());
  if (shown.every((r) => style(r) === style(shown[0]))) return undefined;
  return runs
    .map((r) => {
      let t = escapeText(r.text);
      if (r.sup) t = `<sup>${t}</sup>`;
      if (r.italic) t = `<i>${t}</i>`;
      if (!heading && r.bold) t = `<b>${t}</b>`;
      return t;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tagged translation → runs (b/strong bold, i/em/cite italic, sup superscript; other tags dropped). */
export function parseRuns(s: string): Run[] {
  const depth = { b: 0, i: 0, sup: 0 };
  const key = (n: string) => (n === "b" || n === "strong" ? "b" : n === "i" || n === "em" || n === "cite" ? "i" : n === "sup" ? "sup" : null);
  const runs: Run[] = [];
  for (const t of tokens(s)) {
    if ("text" in t) {
      if (t.text) runs.push({ text: t.text, ...(depth.b && { bold: true }), ...(depth.i && { italic: true }), ...(depth.sup && { sup: true }) });
    } else {
      const k = key("open" in t ? t.open : t.close);
      if (k) depth[k] = Math.max(0, depth[k] + ("open" in t ? 1 : -1));
    }
  }
  return runs;
}

/**
 * An element's content as tagged text, when every child element is inline formatting with text in it
 * (an empty anchor or an image could not survive the round trip). Otherwise undefined.
 */
export function markElement(el: Element): string | undefined {
  let ok = true;
  let any = false;
  const walk = (n: Node): string =>
    [...n.childNodes]
      .map((c) => {
        if (c.nodeType === 3) return escapeText(c.textContent ?? "");
        if (c.nodeType !== 1) return "";
        const e = c as Element;
        if (e.localName === "br") return " ";
        if (!INLINE.has(e.localName) || !e.textContent?.trim()) {
          ok = false;
          return "";
        }
        any = true;
        return `<${e.localName}>${walk(e)}</${e.localName}>`;
      })
      .join("");
  const s = walk(el).replace(/\s+/g, " ").trim();
  return ok && any ? s : undefined;
}

/**
 * Nodes for `el`'s document built from a tagged translation. The k-th <a> (or other tag) takes the
 * attributes of the k-th one in `el`, so links, classes and footnote anchors carry over; `dropIds`
 * when the result sits next to the original. Null when a tag has no counterpart in the original.
 */
export function buildNodes(tagged: string, el: Element, dropIds: boolean): Node[] | null {
  const doc = el.ownerDocument;
  const ns = el.namespaceURI;
  const sources = new Map<string, Element[]>();
  for (const e of el.querySelectorAll("*")) if (INLINE.has(e.localName)) sources.set(e.localName, [...(sources.get(e.localName) ?? []), e]);
  const used = new Map<string, number>();
  const root: Node[] = [];
  const stack: Element[] = [];
  const add = (n: Node) => (stack.length ? stack.at(-1)!.append(n) : root.push(n));
  for (const t of tokens(tagged)) {
    if ("text" in t) add(doc.createTextNode(t.text));
    else if ("open" in t) {
      const k = used.get(t.open) ?? 0;
      const src = sources.get(t.open)?.[k];
      if (!src) return null;
      used.set(t.open, k + 1);
      const e = doc.createElementNS(ns, t.open);
      for (const a of src.attributes) if (!(dropIds && a.name === "id")) e.setAttributeNS(a.namespaceURI, a.name, a.value);
      add(e);
      stack.push(e);
    } else if (stack.at(-1)?.localName === t.close) stack.pop();
  }
  return root;
}
