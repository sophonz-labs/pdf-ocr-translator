// Run: pnpm test
import assert from "node:assert/strict";
import { markRuns, parseRuns } from "./inline.ts";
import { applyTranslations, blockSources, blockTexts, translateTexts } from "./translate.ts";
import type { Block } from "./layout.ts";

const blocks: Block[] = [
  { kind: "h1", runs: [{ text: "One" }], page: 1 },
  { kind: "p", runs: [{ text: "Plain " }, { text: "it", italic: true }], page: 1 },
  { kind: "p", runs: [{ text: "All bold", bold: true }], page: 1 },
];

// Fake Google: upper-cases each paragraph. `drop` makes batches lose a paragraph, forcing per-block retries.
function fake(drop: boolean) {
  const calls: string[] = [];
  const f = async (url: string) => {
    const q = new URL(url).searchParams.get("query.text")!;
    calls.push(q);
    let t = q.toUpperCase();
    if (drop && q.includes("\n\n")) t = t.split("\n\n").slice(1).join("\n\n");
    return new Response(JSON.stringify({ translation: t }));
  };
  return { f, calls };
}

let a = fake(false);
const texts = blockTexts(blocks);
let tr = await translateTexts(texts, "ko", { fetch: a.f });
assert.deepEqual(tr, ["ONE", "PLAIN IT", "ALL BOLD"]);
assert.equal(a.calls.length, 1, "one batched request");

a = fake(true);
const seen: number[] = [];
tr = await translateTexts(texts, "ko", { fetch: a.f, onResult: (i) => seen.push(i) });
assert.deepEqual(tr, ["ONE", "PLAIN IT", "ALL BOLD"]);
assert.equal(a.calls.length, 4, "mismatched batch redone per block");
assert.deepEqual(seen.sort(), [0, 1, 2]);

a = fake(false);
tr = await translateTexts(texts, "ko", { fetch: a.f, only: [2] });
assert.deepEqual(tr, [undefined, undefined, "ALL BOLD"]);

let srcSeen = "";
await translateTexts(["x"], "ko", { source: "en", fetch: async (u: string) => ((srcSeen = new URL(u).searchParams.get("query.source_language")!), new Response(JSON.stringify({ translation: "y" }))) });
assert.equal(srcSeen, "en");

const failing = async () => new Response("", { status: 500 });
// shortcut: retries sleep 1s+2s, so this case takes ~3s per block; keep it to one block.
tr = await translateTexts(["One"], "ko", { fetch: failing });
assert.deepEqual(tr, [undefined]);

const both = applyTranslations(blocks, ["하나", "평범", "모두 굵게"], "both");
assert.equal(both[1].tr, "평범");
assert.equal(both[1].runs, blocks[1].runs);
const rep = applyTranslations(blocks, ["하나", "평범", "모두 굵게"], "replace");
assert.deepEqual(rep[1].runs, [{ text: "평범", bold: undefined, italic: undefined }]);
assert.deepEqual(rep[2].runs, [{ text: "모두 굵게", bold: true, italic: undefined }]);

// Google returns a footnote number as <sup>1</sup>: dropped from plain paragraphs, kept where we sent tags.
const html = async () => new Response(JSON.stringify({ translation: "형성됩니다.<sup>1</sup> <b>a</b> 1 < 2" }));
assert.deepEqual(await translateTexts(["x"], "ko", { fetch: html }), ["형성됩니다.1 a 1 < 2"]);
assert.deepEqual(await translateTexts(["<i>x</i>"], "ko", { fetch: html }), ["형성됩니다.<sup>1</sup> <b>a</b> 1 < 2"]);

// Mixed styling goes out tagged and comes back as runs.
const src = blockSources(blocks);
assert.deepEqual(src, [undefined, "Plain <i>it</i>", undefined]);
assert.equal(markRuns([{ text: "Title " }, { text: "bold", bold: true }], true), undefined, "headings ignore bold");
assert.equal(markRuns([{ text: "a < b & " }, { text: "c", italic: true }, { text: "1", sup: true }]), "a &lt; b &amp; <i>c</i><sup>1</sup>");
const rt = applyTranslations(blocks, [undefined, "평범한 <i>그것</i><sup>2</sup> &lt;x&gt;", undefined], "replace");
assert.deepEqual(rt[1].runs, [{ text: "평범한 " }, { text: "그것", italic: true }, { text: "2", sup: true }, { text: " <x>" }]);
assert.deepEqual(parseRuns("<b>굵게 <i>둘 다</i></b></i> 끝 <a>링크</a>"), [
  { text: "굵게 ", bold: true },
  { text: "둘 다", bold: true, italic: true },
  { text: " 끝 " },
  { text: "링크" },
]);
// Another engine: one paragraph per call.
const asked: string[] = [];
tr = await translateTexts(texts, "ko", { engine: async (s) => (asked.push(s), s.toLowerCase()) });
assert.deepEqual(tr, ["one", "plain it", "all bold"]);
assert.deepEqual(asked, texts);

console.log("translate: ok");
