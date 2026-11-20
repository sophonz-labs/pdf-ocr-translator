import assert from "node:assert/strict";
import { agentPrompt, type PromptInfo } from "./agent-prompt.ts";

const base: PromptInfo = { file: "book.ko.epub", source: "auto", target: "ko", mode: "both", origin: "epub", total: 10, done: 9, failed: 1, edited: 2 };

const ko = agentPrompt("ko", base);
assert.ok(ko.includes("`book.ko.epub`"));
assert.ok(!ko.includes("원문 원문"), "auto source must not repeat the word");
assert.ok(ko.includes('<br/><span lang="ko">'), "describes the in-element translation of list and table cells");
assert.ok(ko.includes("국립국어원"), "Korean target gets the Korean defaults");

const en = agentPrompt("en", { ...base, source: "en", target: "ja", mode: "replace", origin: "ocr" });
assert.ok(en.includes("The original is not in this EPUB"));
assert.ok(en.includes("English (`en`) → Japanese (`ja`)"));
assert.ok(!en.includes("국립국어원"), "non-Korean target has no Korean-specific rules");
assert.ok(en.includes("already holds only the translation"));

console.log("agent-prompt: ok");
