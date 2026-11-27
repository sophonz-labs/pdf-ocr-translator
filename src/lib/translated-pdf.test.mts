// Run: bun run test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { buildTranslatedPdf, splitByWeight, wrap } from "./translated-pdf.ts";

const mono = (s: string) => s.length;
assert.deepEqual(wrap("one two three four", 9, mono), ["one two", "three", "four"]);
assert.deepEqual(wrap("가나다라마바사", 3, mono), ["가나다", "라마바", "사"], "no spaces: break anywhere");
assert.deepEqual(splitByWeight("aaaa bbbb cccc dddd", [1, 1]), ["aaaa bbbb", "cccc dddd"]);
assert.deepEqual(splitByWeight("abc", [1]), ["abc"]);

const src = await PDFDocument.create();
src.addPage([400, 600]);
src.addPage([400, 600]);
const font = readFileSync(new URL("../../public/fonts/NanumGothic-Regular.ttf", import.meta.url));
const box = (page: number, top: number) => ({ page, x0: 40, x1: 360, top, bottom: top + 12, size: 10 });
const blocks = [
  { kind: "p" as const, runs: [{ text: "x" }], page: 1, boxes: [box(1, 500), box(1, 514), box(2, 40)] },
  { kind: "img" as const, runs: [], page: 2 },
];
const out = await buildTranslatedPdf((await src.save()).buffer as ArrayBuffer, blocks, ["한국어 번역 문장이 두 쪽에 걸쳐 들어갑니다. ".repeat(4), undefined], font.buffer as ArrayBuffer);
assert.equal((await PDFDocument.load(out)).getPageCount(), 2);
await assert.rejects(buildTranslatedPdf((await src.save()).buffer as ArrayBuffer, blocks, ["สวัสดี"], font.buffer as ArrayBuffer), /no glyphs/);

console.log("translated pdf: ok");
