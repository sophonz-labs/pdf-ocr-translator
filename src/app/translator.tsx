"use client";

import { useRef, useState } from "react";
import { TARGETS } from "@/lib/translate";
import { save } from "./save";

type Mode = "replace" | "both";
/** A book to translate: its paragraphs, and how to build the EPUB once translations are in. */
export type Job = {
  name: string;
  segments: { tag: string; text: string }[];
  build: (tr: (string | undefined)[], mode: Mode, lang: string) => Uint8Array;
};
type St = "" | "ok" | "fail" | "edit";

export async function jobFromEpub(f: File): Promise<Job> {
  const { readEpub, writeEpub } = await import("@/lib/epub-io");
  const book = readEpub(new Uint8Array(await f.arrayBuffer()));
  if (!book.segments.length) throw new Error("번역할 문단을 찾지 못했습니다");
  return { name: f.name.replace(/\.epub$/i, ""), segments: book.segments, build: (tr, mode, lang) => writeEpub(book, tr, mode, lang) };
}

const FILTERS = [
  ["all", "전체"],
  ["todo", "미번역"],
  ["fail", "실패"],
  ["edit", "수정함"],
] as const;
const PAGE = 30;

const btn =
  "rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800";
const primary =
  "rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200";
const select = "rounded-md border border-zinc-200 bg-transparent px-1.5 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function Translator({ job, setJob }: { job: Job | null; setJob: (j: Job | null) => void }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function open(f: File) {
    setError("");
    setLoading(true);
    try {
      setJob(await jobFromEpub(f));
    } catch (e) {
      setError(`EPUB을 읽지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="translate" className="mt-10 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-medium">EPUB 번역</h2>
          <p className="text-xs text-zinc-500">
            {job ? `${job.name} · ${job.segments.length.toLocaleString()}문단` : "EPUB을 올리거나 위 결과에서 '번역'을 누르세요."} Google 번역(무료, New)을
            쓰며 문단 텍스트가 Google로 전송됩니다.
          </p>
        </div>
        <label className={`${btn} cursor-pointer`}>
          {loading ? "읽는 중…" : job ? "다른 EPUB 열기" : "EPUB 열기"}
          <input
            type="file"
            accept=".epub,application/epub+zip"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) open(f);
            }}
          />
        </label>
      </div>
      {error && <p className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}
      {/* key: a new book starts with a clean slate */}
      {job && <Review key={`${job.name}:${job.segments.length}`} job={job} />}
    </section>
  );
}

function Review({ job }: { job: Job }) {
  const n = job.segments.length;
  const [target, setTarget] = useState("ko");
  const [mode, setMode] = useState<Mode>("both");
  const [tr, setTr] = useState<(string | undefined)[]>(() => Array(n).fill(undefined));
  const [st, setSt] = useState<St[]>(() => Array(n).fill(""));
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [page, setPage] = useState(0);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [notice, setNotice] = useState("");
  const abort = useRef<AbortController | null>(null);

  const done = st.filter((s) => s === "ok" || s === "edit").length;
  const failed = st.filter((s) => s === "fail").length;
  const todo = job.segments.map((_, i) => i).filter((i) => !tr[i]);
  const rows = job.segments
    .map((_, i) => i)
    .filter((i) => filter === "all" || (filter === "todo" ? !tr[i] : st[i] === filter));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const step = !done || progress ? 2 : done === n ? 4 : 3;

  async function translate(only: number[]) {
    if (!only.length) return;
    const { translateTexts } = await import("@/lib/translate");
    const ctl = new AbortController();
    abort.current = ctl;
    setNotice("");
    try {
      await translateTexts(
        job.segments.map((s) => s.text),
        target,
        {
          only,
          signal: ctl.signal,
          onProgress: (d, t) => setProgress([d, t]),
          onResult: (i, t) => {
            setTr((a) => a.with(i, t ?? a[i]));
            setSt((a) => a.with(i, t ? "ok" : "fail"));
          },
        },
      );
    } catch (e) {
      if (!ctl.signal.aborted) setNotice(`번역 중단: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      abort.current = null;
      setProgress(null);
    }
  }

  function changeTarget(v: string) {
    if (done && !confirm("번역 언어를 바꾸면 지금까지의 번역을 지웁니다. 계속할까요?")) return;
    setTarget(v);
    setTr(Array(n).fill(undefined));
    setSt(Array(n).fill(""));
  }

  function build() {
    try {
      save(job.build(tr, mode, target), `${job.name}.${target}.epub`, "application/epub+zip");
    } catch (e) {
      setNotice(`EPUB 생성 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const toggle = (i: number) =>
    setSel((s) => {
      const c = new Set(s);
      if (c.has(i)) c.delete(i);
      else c.add(i);
      return c;
    });
  const allShown = shown.length > 0 && shown.every((i) => sel.has(i));

  return (
    <div>
      <ol className="flex flex-wrap gap-x-5 gap-y-1 border-b border-zinc-200 px-5 py-2.5 text-xs dark:border-zinc-800">
        {["불러오기", "번역", "검토·수정", "EPUB 만들기"].map((label, k) => (
          <li key={label} className={k + 1 <= step ? "font-medium text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}>
            <span
              className={`mr-1.5 inline-grid h-4 w-4 place-items-center rounded-full text-[10px] ${
                k + 1 < step ? "bg-blue-600 text-white" : k + 1 === step ? "ring-1 ring-blue-600 text-blue-600" : "ring-1 ring-zinc-300 dark:ring-zinc-700"
              }`}
            >
              {k + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-2 px-5 py-3">
        <select aria-label="번역할 언어" value={target} disabled={!!progress} onChange={(e) => changeTarget(e.target.value)} className={select}>
          {TARGETS.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
        <button className={primary} disabled={!!progress || !todo.length} onClick={() => translate(todo)}>
          미번역 {todo.length.toLocaleString()}개 번역
        </button>
        <button className={btn} disabled={!!progress || !sel.size} onClick={() => translate([...sel].sort((a, b) => a - b))}>
          선택 {sel.size}개 다시 번역
        </button>
        {progress && (
          <>
            <span className="text-xs text-zinc-500 tabular-nums">
              {progress[0]}/{progress[1]}
            </span>
            <button className={btn} onClick={() => abort.current?.abort()}>
              중지
            </button>
          </>
        )}
        <span className="ml-auto text-xs text-zinc-500 tabular-nums">
          번역 {done}/{n}
          {failed > 0 && <span className="text-red-600"> · 실패 {failed}</span>}
        </span>
      </div>
      {progress && (
        <div className="mx-5 mb-2 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="h-full bg-blue-600 transition-[width]" style={{ width: `${(progress[0] / Math.max(1, progress[1])) * 100}%` }} />
        </div>
      )}
      {notice && <p className="mx-5 mb-2 text-sm text-red-600">{notice}</p>}

      <div className="flex flex-wrap items-center gap-3 border-y border-zinc-200 px-5 py-2 text-xs dark:border-zinc-800">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={allShown} onChange={() => setSel((s) => new Set(allShown ? [...s].filter((i) => !shown.includes(i)) : [...s, ...shown]))} />이 쪽 선택
        </label>
        {sel.size > 0 && (
          <button className="text-zinc-500 underline" onClick={() => setSel(new Set())}>
            선택 해제
          </button>
        )}
        <div role="radiogroup" aria-label="보기" className="ml-auto inline-flex rounded-md bg-zinc-100 p-0.5 dark:bg-zinc-800">
          {FILTERS.map(([v, label]) => (
            <button
              key={v}
              role="radio"
              aria-checked={filter === v}
              onClick={() => {
                setFilter(v);
                setPage(0);
              }}
              className={`rounded px-2 py-1 ${filter === v ? "bg-white font-medium shadow-sm dark:bg-zinc-950" : "text-zinc-500"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {shown.map((i) => (
          <li key={i} className="grid gap-2 px-5 py-3 sm:grid-cols-[auto_1fr_1fr]">
            <label className="flex items-start gap-2 pt-0.5 text-[11px] text-zinc-400 tabular-nums">
              <input type="checkbox" checked={sel.has(i)} onChange={() => toggle(i)} aria-label={`${i + 1}번 선택`} />
              <span className="w-10">
                {i + 1}
                <br />
                {job.segments[i].tag}
              </span>
            </label>
            <p className="max-h-40 overflow-auto text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{job.segments[i].text}</p>
            <div>
              <textarea
                aria-label={`${i + 1}번 번역`}
                value={tr[i] ?? ""}
                placeholder={st[i] === "fail" ? "번역 실패 · 직접 입력하거나 다시 번역" : "미번역 · 직접 입력할 수 있습니다"}
                rows={Math.min(8, Math.max(2, Math.ceil(((tr[i] ?? job.segments[i].text).length || 1) / 45)))}
                onChange={(e) => {
                  const v = e.target.value;
                  setTr((a) => a.with(i, v || undefined));
                  setSt((a) => a.with(i, v ? "edit" : ""));
                }}
                className={`w-full resize-y rounded-md border bg-transparent px-2 py-1.5 text-sm leading-relaxed ${
                  st[i] === "fail" ? "border-red-300 dark:border-red-500/50" : st[i] === "edit" ? "border-amber-300 dark:border-amber-500/50" : "border-zinc-200 dark:border-zinc-700"
                }`}
              />
            </div>
          </li>
        ))}
        {!shown.length && <li className="px-5 py-6 text-center text-sm text-zinc-500">해당하는 문단이 없습니다.</li>}
      </ul>

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <button className={btn} disabled={page === 0} onClick={() => setPage(page - 1)}>
          이전
        </button>
        <span className="text-xs text-zinc-500 tabular-nums">
          {page + 1} / {pages}
        </span>
        <button className={btn} disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
          다음
        </button>
        <div className="ml-auto flex items-center gap-2">
          <select aria-label="번역 배치" value={mode} onChange={(e) => setMode(e.target.value as Mode)} className={select}>
            <option value="both">원문 아래 번역</option>
            <option value="replace">번역만</option>
          </select>
          <button className={primary} disabled={!done || !!progress} onClick={build}>
            EPUB 만들기
          </button>
        </div>
      </div>
    </div>
  );
}
