// Run: pnpm test
import assert from "node:assert/strict";
import { applyTranslations, blockTexts, translateTexts } from "./translate.ts";
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

console.log("translate: ok");
