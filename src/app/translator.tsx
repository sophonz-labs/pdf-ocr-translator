"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { COMMON_LANGS, LANGS } from "@/lib/translate";
import { save } from "./save";

export type Mode = "replace" | "both";
/** A book to translate: its paragraphs, and how to build the EPUB once translations are in. */
export type Job = {
  name: string;
  segments: { tag: string; text: string }[];
  build: (tr: (string | undefined)[], mode: Mode, lang: string) => Uint8Array;
  /** Translations already made (by the one-shot routine), to review and edit here. */
  preset?: { tr: (string | undefined)[]; source: string; target: string; mode: Mode };
};
type St = "" | "ok" | "fail" | "edit";

export async function jobFromEpub(f: File): Promise<Job> {
  const { readEpub, writeEpub } = await import("@/lib/epub-io");
  const book = readEpub(new Uint8Array(await f.arrayBuffer()));
  if (!book.segments.length) throw new Error("번역할 문단을 찾지 못했습니다");
  return { name: f.name.replace(/\.epub$/i, ""), segments: book.segments, build: (tr, mode, lang) => writeEpub(book, tr, mode, lang) };
}

const NAME_FIX: Record<string, string> = { "zh-CN": "중국어(간체)", "zh-TW": "중국어(번체)" };
let names: { code: string; name: string }[] | null = null;
/** Google's language codes with Korean names, sorted by name. Built on first use (client only). */
function langNames() {
  if (!names) {
    const dn = new Intl.DisplayNames(["ko"], { type: "language", fallback: "code" });
    const of = (c: string) => {
      try {
        return dn.of(c) ?? c;
      } catch {
        return c;
      }
    };
    names = LANGS.map((code) => ({ code, name: NAME_FIX[code] ?? of(code) })).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }
  return names;
}

export function LangSelect({ label, value, onChange, auto, disabled }: { label: string; value: string; onChange: (v: string) => void; auto?: boolean; disabled?: boolean }) {
  // Names come from Intl, whose data differs between Node and the browser: build the list on the client only.
  const client = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const all = client ? langNames() : [];
  const opt = ({ code, name }: { code: string; name: string }) => (
    <option key={code} value={code}>
      {name} · {code}
    </option>
  );
  return (
    <label className="flex items-center gap-1.5 text-xs text-zinc-500">
      {label}
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={`${select} max-w-48 text-zinc-900 dark:text-zinc-100`}>
        {auto && <option value="auto">자동 감지</option>}
        {client ? (
          <>
            <optgroup label="자주 쓰는 언어">{COMMON_LANGS.map((c) => opt(all.find((l) => l.code === c)!))}</optgroup>
            <optgroup label={`전체 ${all.length}개`}>{all.map(opt)}</optgroup>
          </>
        ) : (
          value !== "auto" && <option value={value}>{value}</option>
        )}
      </select>
    </label>
  );
}

// A new job object starts the review over (even the same book opened again).
const keys = new WeakMap<Job, number>();
let lastKey = 0;
const jobKey = (j: Job) => keys.get(j) ?? (keys.set(j, ++lastKey), lastKey);

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

  const [dragging, setDragging] = useState(false);
  const input = (
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
  );

  return (
    <>
      {!job && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) open(f);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition focus-within:ring-2 focus-within:ring-blue-500/40 ${
            dragging
              ? "border-blue-500 bg-blue-50/60 dark:bg-blue-500/10"
              : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
          }`}
        >
          {input}
          <p className="text-sm font-medium">{loading ? "읽는 중…" : "EPUB을 끌어다 놓거나 클릭해서 선택"}</p>
          <p className="mt-1 text-xs text-zinc-500">PDF는 &lsquo;PDF OCR&rsquo; 탭에서 변환한 뒤 결과의 &lsquo;번역&rsquo;을 누르면 여기로 옵니다.</p>
        </label>
      )}
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}
      {job && (
        <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-medium">{job.name}</h2>
              <p className="text-xs text-zinc-500 tabular-nums">{job.segments.length.toLocaleString()}문단</p>
            </div>
            <label className={`${btn} cursor-pointer`}>
              {loading ? "읽는 중…" : "다른 EPUB 열기"}
              {input}
            </label>
          </div>
              <Review key={jobKey(job)} job={job} />
        </section>
      )}
    </>
  );
}

function Review({ job }: { job: Job }) {
  const n = job.segments.length;
  const p = job.preset;
  const [source, setSource] = useState(p?.source ?? "auto");
  const [target, setTarget] = useState(p?.target ?? "ko");
  const [mode, setMode] = useState<Mode>(p?.mode ?? "both");
  const [tr, setTr] = useState<(string | undefined)[]>(() => p?.tr ?? Array(n).fill(undefined));
  const [st, setSt] = useState<St[]>(() => (p ? p.tr.map((t) => (t ? "ok" : "fail")) : Array(n).fill("")));
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
          source,
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

      <div className="flex flex-wrap items-center gap-2 px-5 pt-3">
        <LangSelect label="원문" value={source} onChange={setSource} auto disabled={!!progress} />
        <span aria-hidden className="text-zinc-400">→</span>
        <LangSelect label="번역" value={target} onChange={changeTarget} disabled={!!progress} />
        <span className="ml-auto text-xs text-zinc-500 tabular-nums">
          번역 {done}/{n}
          {failed > 0 && <span className="text-red-600"> · 실패 {failed}</span>}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-5 py-3">
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
