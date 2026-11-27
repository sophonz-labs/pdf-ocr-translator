// Run: pnpm test
import assert from "node:assert/strict";
import { strFromU8, unzipSync } from "fflate";
import { buildEpub, guessLang } from "./epub.ts";
import type { Block } from "./layout.ts";

const blocks: Block[] = [
  { kind: "h1", runs: [{ text: "One & Only" }], page: 1 },
  { kind: "p", runs: [{ text: "Plain " }, { text: "bold", bold: true }, { text: " <x> " }, { text: "it", italic: true }, { text: "1", sup: true }], page: 1 },
  { kind: "note", runs: [{ text: "1. Note." }], page: 1 },
  { kind: "h1", runs: [{ text: "Two" }], page: 2 },
  { kind: "p", runs: [{ text: "Second chapter." }], page: 2 },
];
const bytes = buildEpub({ title: "Test", author: "A", lang: guessLang(blocks), blocks });

// OCF: "mimetype" must be the first entry, stored (method 0), with no extra field.
const head = new DataView(bytes.buffer, bytes.byteOffset);
assert.equal(head.getUint32(0, true), 0x04034b50);
assert.equal(head.getUint16(8, true), 0, "mimetype stored uncompressed");
assert.equal(strFromU8(bytes.subarray(30, 38)), "mimetype");
assert.equal(strFromU8(bytes.subarray(38, 58)), "application/epub+zip");

const files = unzipSync(bytes);
assert.deepEqual(Object.keys(files).filter((f) => f.endsWith(".xhtml")).sort(), ["OEBPS/ch001.xhtml", "OEBPS/ch002.xhtml", "OEBPS/nav.xhtml"]);
const ch1 = strFromU8(files["OEBPS/ch001.xhtml"]);
assert.match(ch1, /<h1>One &amp; Only<\/h1>/);
assert.match(ch1, /<p>Plain <b>bold<\/b> &lt;x&gt; <i>it<\/i><sup>1<\/sup><\/p>/);
assert.match(ch1, /<p class="note">1\. Note\.<\/p>/);
assert.match(strFromU8(files["OEBPS/content.opf"]), /<dc:language>en<\/dc:language>/);
assert.match(strFromU8(files["OEBPS/nav.xhtml"]), /<a href="ch002.xhtml">Two<\/a>/);

const bi = unzipSync(buildEpub({ title: "T", lang: "en", trLang: "ko", blocks: [{ kind: "p", runs: [{ text: "Hi" }], page: 1, tr: "안녕 <&>" }] }));
assert.match(strFromU8(bi["OEBPS/ch001.xhtml"]), /<p>Hi<\/p>\n<p class="tr" lang="ko" xml:lang="ko">안녕 &lt;&amp;&gt;<\/p>/);

// Bookmarks: chapters split at top-level entries, nested nav with anchors, one pointing mid-page; cover first in the spine.
const tb: Block[] = [
  { kind: "p", runs: [{ text: "Front matter." }], page: 1, top: 100 },
  { kind: "h1", runs: [{ text: "Part One" }], page: 2, top: 80 },
  { kind: "p", runs: [{ text: "Intro." }], page: 2, top: 120 },
  { kind: "h2", runs: [{ text: "Section A" }], page: 2, top: 400 },
  { kind: "p", runs: [{ text: "A text." }], page: 2, top: 430 },
  { kind: "h1", runs: [{ text: "Part Two" }], page: 3, top: 80 },
];
const toc = [
  { title: "Before the text", level: 0, page: 0, top: 0 },
  { title: "Part One", level: 0, page: 2, top: 0 },
  { title: "Section A", level: 1, page: 2, top: 395 },
  { title: "Part Two", level: 0, page: 3, top: 0 },
];
const tf = unzipSync(buildEpub({ title: "T", lang: "en", blocks: tb, toc, cover: new Uint8Array([0xff, 0xd8]) }));
assert.deepEqual(Object.keys(tf).filter((f) => /ch\d+/.test(f)).sort(), ["OEBPS/ch001.xhtml", "OEBPS/ch002.xhtml", "OEBPS/ch003.xhtml"]);
const nav = strFromU8(tf["OEBPS/nav.xhtml"]);
assert.match(nav, /<li><a href="ch002.xhtml#b1">Part One<\/a>\n<ol>\n<li><a href="ch002.xhtml#b3">Section A<\/a><\/li><\/ol><\/li>\n<li><a href="ch003.xhtml#b5">Part Two<\/a><\/li>\n<\/ol>/);
assert.doesNotMatch(nav, /Before the text/);
assert.match(strFromU8(tf["OEBPS/ch002.xhtml"]), /<h2 id="b3">Section A<\/h2>/);
const opf = strFromU8(tf["OEBPS/content.opf"]);
assert.match(opf, /properties="cover-image"/);
assert.match(opf, /<spine>\n    <itemref idref="cover"\/>\n    <itemref idref="c1"\/>/);
assert.ok(tf["OEBPS/cover.jpg"]);

console.log("epub: ok");
