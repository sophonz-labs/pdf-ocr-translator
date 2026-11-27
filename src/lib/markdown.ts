import type { Book } from "./epub.ts";
import type { Run } from "./layout.ts";

// Backslash-escape what Markdown would read as markup inside a paragraph.
const inline = (s: string) => s.replace(/([\\`*_[\]<>])/g, "\\$1");

function runs(rs: Run[]) {
  return rs
    .map((r) => {
      // Emphasis markers must hug the text: "**bold** " not "**bold **".
      const [, lead, core, trail] = /^(\s*)([^]*?)(\s*)$/.exec(r.text)!;
      if (!core) return r.text;
      let t = inline(core);
      if (r.sup) t = `<sup>${t}</sup>`;
      if (r.italic) t = `*${t}*`;
      if (r.bold) t = `**${t}**`;
      return lead + t + trail;
    })
    .join("");
}

/** The book as Markdown: YAML front matter, headings as #/##/###, footnotes as plain paragraphs after the body. */
export function toMarkdown(book: Book) {
  const yaml = (s: string) => JSON.stringify(s); // a JSON string is a valid YAML scalar
  const head = ["---", `title: ${yaml(book.title)}`, ...(book.author ? [`author: ${yaml(book.author)}`] : []), `lang: ${book.lang}`, "---"];
  const body = book.blocks.map((b) => {
    if (b.kind === "h1" || b.kind === "h2" || b.kind === "h3") return `${"#".repeat(+b.kind[1])} ${runs(b.runs.map((r) => ({ ...r, bold: false })))}`;
    if (b.kind === "img") return `![](${b.src})`;
    if (b.kind === "note") return `<small>${runs(b.runs)}</small>`;
    // A paragraph starting like a heading, quote, list item or rule would turn into one.
    return runs(b.runs)
      .replace(/^(#|>|[-+*]\s|={3,}|-{3,})/, "\\$1")
      .replace(/^(\d+)([.)]\s)/, "$1\\$2");
  });
  return [...head, "", ...body.flatMap((b) => [b, ""])].join("\n");
}
