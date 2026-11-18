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

console.log("epub: ok");
