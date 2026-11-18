// Run: pnpm test
import assert from "node:assert/strict";
import { buildBlocks, lineText, linesFromItems, type PageLayout, type TextLine } from "./layout.ts";

const L = (text: string, x0: number, top: number, x1 = 400, size = 10, style: { bold?: boolean; italic?: boolean } = {}): TextLine => ({
  runs: [{ text, ...style }],
  x0,
  x1,
  top,
  bottom: top + size,
  size,
});
const page = (n: number, lines: TextLine[]): PageLayout => ({ n, width: 450, height: 660, lines });

// Book-like pages: running header, indented paragraphs, hyphenation, heading, footnote, paragraph across a page break.
const pages = [
  page(1, [
    L("Twenty Years After Communism", 100, 20, 300, 9),
    L("Chapter One", 50, 80, 250, 18),
    L("The first paragraph starts here and runs on to", 50, 120),
    L("the next line where it ends with a hyphen-", 50, 133),
    L("ated word.", 50, 146, 120),
    L("A second paragraph is indented and continues", 70, 159),
    L("over the page break without ending its sentence", 50, 172),
    L("1. A footnote in small type.", 50, 600, 300, 8),
    L("12", 220, 640, 230, 9),
  ]),
  page(2, [
    L("13 : Twenty Years After Communism", 100, 20, 300, 9),
    L("and finishes on the second page.", 50, 60, 260),
    L("Third paragraph, indented, at the top of", 70, 73),
    L("the second page.", 50, 86, 150),
    L("13", 220, 640, 230, 9),
  ]),
  page(3, [L("Twenty Years After Communism 1: 15", 100, 20, 300, 9), L("Some closing text that is long enough here.", 50, 60), L("14", 220, 640, 230, 9)]),
];

const blocks = buildBlocks(pages);
const out = blocks.map((b) => `${b.kind}: ${lineText(b)}`);
assert.deepEqual(out, [
  "h1: Chapter One",
  "p: The first paragraph starts here and runs on to the next line where it ends with a hyphenated word.",
  "p: A second paragraph is indented and continues over the page break without ending its sentence and finishes on the second page.",
  "note: 1. A footnote in small type.",
  "p: Third paragraph, indented, at the top of the second page.",
  "p: Some closing text that is long enough here.",
]);

// Items -> lines: style runs, restored spaces, superscript note markers.
const items = [
  { text: "Plain", x: 50, y: 100, w: 25, size: 10, bold: false, italic: false },
  { text: "bold", x: 78, y: 100, w: 20, size: 10, bold: true, italic: false },
  { text: " and ", x: 98, y: 100, w: 20, size: 10, bold: false, italic: false },
  { text: "italic", x: 118, y: 100, w: 25, size: 10, bold: false, italic: true },
  { text: "3", x: 143, y: 96, w: 4, size: 6, bold: false, italic: false },
  { text: "Next line", x: 50, y: 113, w: 40, size: 10, bold: false, italic: false },
];
const lines = linesFromItems(items);
assert.equal(lines.length, 2);
assert.deepEqual(JSON.parse(JSON.stringify(lines[0].runs)), [
  { text: "Plain ", bold: false, italic: false },
  { text: "bold", bold: true, italic: false },
  { text: " and ", bold: false, italic: false },
  { text: "italic", bold: false, italic: true },
  { text: "3", bold: false, italic: false, sup: true },
]);
assert.equal(lineText(lines[1]), "Next line");

console.log("layout: ok");

// Headings: levels cluster by size; a full-width line slightly above body size is body text; picture noise is not a heading.
const hp = buildBlocks([
  page(1, [
    L("1 First Chapter", 50, 60, 250, 17),
    L("A Section", 50, 100, 150, 13.4),
    L("noise ~ | 4) ㅣ ' “. ㅜㅜ", 50, 130, 200, 12),
    L("A body line measured a bit tall because the scan was slightly skewed here", 50, 160, 400, 13),
    L("Ordinary body text that keeps going until the right margin of the page", 50, 175),
    L("and ends here.", 50, 188, 150),
  ]),
  page(2, [L("2 Second Chapter", 50, 60, 260, 16.8), L("Another Section", 50, 100, 170, 13.1), L("Body text on the second page that runs to the right margin.", 50, 130)]),
]).filter((b) => b.kind !== "p" && b.kind !== "note");
assert.deepEqual(
  hp.map((b) => `${b.kind}: ${lineText(b)}`),
  ["h1: 1 First Chapter", "h2: A Section", "h1: 2 Second Chapter", "h2: Another Section"],
);
console.log("headings: ok");

// Line joins decided from the document's own words: Korean mid-word vs between-word breaks, English hyphens.
const jp = buildBlocks([
  page(1, [
    L("이 책에서 생겨도 괜찮은 일과 포함하고 있는 내용과 actor-centered views 를 다룹니다 그리고", 50, 100),
    L("문단은 계속되고 여기서 생", 50, 113),
    L("겨도 문제없이 이어지고 우리는", 50, 126),
    L("문단은 다시 이어진다 an actor-", 50, 139),
    L("centered view and a hyphen-", 50, 152),
    L("ated word end.", 50, 165, 120),
  ]),
]);
assert.equal(
  lineText(jp[0]),
  "이 책에서 생겨도 괜찮은 일과 포함하고 있는 내용과 actor-centered views 를 다룹니다 그리고 문단은 계속되고 여기서 생겨도 문제없이 이어지고 우리는 문단은 다시 이어진다 an actor-centered view and a hyphenated word end.",
);
console.log("joins: ok");
