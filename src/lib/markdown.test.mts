// Run: bun run test
import assert from "node:assert/strict";
import { toMarkdown } from "./markdown.ts";
import { parsePages } from "./page-range.ts";

const md = toMarkdown({
  title: 'A "Book"',
  author: "Me",
  lang: "en",
  blocks: [
    { kind: "h1", runs: [{ text: "Chapter 1" }], page: 1 },
    { kind: "p", runs: [{ text: "Plain " }, { text: "bold ", bold: true }, { text: "it", italic: true }, { text: "2", sup: true }, { text: " a*b_c <x>" }], page: 1 },
    { kind: "p", runs: [{ text: "# not a heading" }], page: 1 },
    { kind: "p", runs: [{ text: "1. not a list" }], page: 1 },
    { kind: "note", runs: [{ text: "2. A note." }], page: 1 },
  ],
});
assert.equal(
  md,
  [
    "---", 'title: "A \\"Book\\""', 'author: "Me"', "lang: en", "---", "",
    "# Chapter 1", "",
    "Plain **bold** *it*<sup>2</sup> a\\*b\\_c \\<x\\>", "",
    "\\# not a heading", "",
    "1\\. not a list", "",
    "<small>2. A note.</small>", "",
  ].join("\n"),
);

assert.deepEqual(parsePages("", 3), [1, 2, 3]);
assert.deepEqual(parsePages("2 - 4, 9, 7-", 9), [2, 3, 4, 7, 8, 9]);
assert.deepEqual(parsePages("-2", 5), [1, 2]);
assert.equal(parsePages("10-20", 5), null);
assert.equal(parsePages("abc", 5), null);

console.log("markdown, page range: ok");
