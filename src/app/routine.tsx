"use client";

import { useRef, useState } from "react";
import { epubFromOcr, jobFromOcr, ocrPdf, searchablePdf } from "./ocr";
import { save } from "./save";
import { jobFromEpub, LangSelect, type Job, type Mode } from "./translator";

type StepState = "wait" | "run" | "done" | "error";
type Step = { key: string; label: string; state: StepState; detail?: string };
type Output = { name: string; bytes: Uint8Array; type: string; label: string };

const OCR_LANGS = [
  ["kor+eng", "한국어 + 영어"],
  ["kor", "한국어"],
  ["eng", "영어"],
] as const;

const card = "rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";
const select = "rounded-md border border-zinc-200 bg-transparent px-1.5 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const primary =
  "rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200";
const btn = "rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800";

function Check({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2 text-sm ${disabled ? "opacity-40" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/**
 * PDF (or EPUB) in, files out, in one go: OCR → searchable PDF → EPUB → translated EPUB.
 * The translation can then be opened in the translate tab for review.
 */
export function Routine({ onReview }: { onReview: (job: Job) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [ocrLang, setOcrLang] = useState("kor+eng");
  const [skipText, setSkipText] = useState(true);
  const [wantPdf, setWantPdf] = useState(true);
  const [wantEpub, setWantEpub] = useState(true);
  const [wantTr, setWantTr] = useState(true);
  const [source, setSource] = useState("auto");
  const [target, setTarget] = useState("ko");
  const [mode, setMode] = useState<Mode>("both");
  const [steps, setSteps] = useState<Step[]>([]);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [reviewJob, setReviewJob] = useState<Job | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const cancelled = useRef(false);
  const abort = useRef<AbortController | null>(null);

  const isEpub = !!file && /\.epub$/i.test(file.name);
  const nothing = isEpub ? !wantTr : !wantPdf && !wantEpub && !wantTr;

  const set = (key: string, patch: Partial<Step>) => setSteps((s) => s.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  async function start() {
    if (!file || running) return;
    const f = file;
    cancelled.current = false;
    const ctl = new AbortController();
    abort.current = ctl;
    setRunning(true);
    setError("");
    setOutputs([]);
    setReviewJob(null);
    const plan: Step[] = [
      ...(isEpub ? [{ key: "read", label: "EPUB 읽기" }] : [{ key: "ocr", label: "OCR" }]),
      ...(!isEpub && wantPdf ? [{ key: "pdf", label: "검색 가능한 PDF" }] : []),
      ...(!isEpub && wantEpub ? [{ key: "epub", label: "EPUB 재구성" }] : []),
      ...(wantTr ? [{ key: "tr", label: "번역" }, { key: "trEpub", label: "번역 EPUB" }] : []),
    ].map((s) => ({ ...s, state: "wait" as StepState }));
    setSteps(plan);
    const out: Output[] = [];
    const add = (o: Output) => {
      out.push(o);
      setOutputs([...out]);
    };
    let current = plan[0].key;
    const step = async <T,>(key: string, fn: () => Promise<T>, detail?: (v: T) => string) => {
      current = key;
      set(key, { state: "run" });
      const v = await fn();
      set(key, { state: "done", detail: detail?.(v) });
      return v;
    };

    try {
      let job: Job;
      if (isEpub) {
        job = await step("read", () => jobFromEpub(f), (j) => `${j.segments.length.toLocaleString()}문단`);
      } else {
        let done = 0;
        let total = 0;
        const r = await step(
          "ocr",
          () =>
            ocrPdf(f, {
              lang: ocrLang,
              skipText,
              cancelled: () => cancelled.current,
              onOpen: (pages, lanes) => {
                total = pages;
                set("ocr", { detail: `0/${pages}쪽 · ${lanes}개 병렬` });
              },
              onPage: (_, p) => {
                if (p.status === "done" || p.status === "text" || p.status === "error") set("ocr", { detail: `${++done}/${total}쪽` });
              },
              onProgress: () => {},
            }),
          () => `${total}쪽`,
        );
        if (cancelled.current) throw new Error("중단했습니다");
        const name = r.name;
        if (wantPdf) add({ ...(await step("pdf", async () => ({ bytes: await searchablePdf(r) }))), name: `${name}-ocr.pdf`, type: "application/pdf", label: "검색 가능한 PDF" });
        if (wantEpub) add({ ...(await step("epub", async () => ({ bytes: await epubFromOcr(r) }))), name: `${name}.epub`, type: "application/epub+zip", label: "EPUB" });
        job = await jobFromOcr(r);
      }

      if (wantTr) {
        const { translateTexts } = await import("@/lib/translate");
        const tr = await step(
          "tr",
          () =>
            translateTexts(
              job.segments.map((s) => s.text),
              target,
              { source, signal: ctl.signal, onProgress: (d, t) => set("tr", { detail: `${d}/${t}문단` }) },
            ),
          (tr) => {
            const failed = tr.filter((t) => !t).length;
            return `${tr.length - failed}/${tr.length}문단${failed ? ` · 실패 ${failed}개는 원문 유지` : ""}`;
          },
        );
        const bytes = await step("trEpub", async () => job.build(tr, mode, target));
        add({ name: `${job.name}.${target}.epub`, bytes, type: "application/epub+zip", label: "번역 EPUB" });
        setReviewJob({ ...job, preset: { tr, source, target, mode } });
      }
      for (const o of out) save(o.bytes, o.name, o.type);
    } catch (e) {
      set(current, { state: "error" });
      setError(cancelled.current || ctl.signal.aborted ? "중단했습니다." : e instanceof Error ? e.message : String(e));
    } finally {
      abort.current = null;
      setRunning(false);
    }
  }

  function cancel() {
    cancelled.current = true;
    abort.current?.abort();
  }

  return (
    <div className="space-y-4">
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
          if (f) setFile(f);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-8 text-center transition focus-within:ring-2 focus-within:ring-blue-500/40 ${
          dragging ? "border-blue-500 bg-blue-50/60 dark:bg-blue-500/10" : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
        } ${running ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          type="file"
          accept="application/pdf,.epub,application/epub+zip"
          disabled={running}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) setFile(f);
          }}
        />
        <p className="text-sm font-medium">{file ? file.name : "PDF나 EPUB을 끌어다 놓거나 클릭해서 선택"}</p>
        <p className="mt-1 text-xs text-zinc-500">{file ? "다른 파일을 놓으면 바꿉니다" : "설정한 단계를 차례로 돌리고 결과 파일을 받습니다"}</p>
      </label>

      <section className={`${card} divide-y divide-zinc-200 dark:divide-zinc-800`}>
        <div className={`grid gap-3 px-5 py-4 sm:grid-cols-[7rem_1fr] ${isEpub ? "opacity-40" : ""}`}>
          <p className="text-sm font-medium">1. OCR</p>
          <div className="flex flex-wrap items-center gap-4">
            <select aria-label="인식 언어" value={ocrLang} disabled={running || isEpub} onChange={(e) => setOcrLang(e.target.value)} className={select}>
              {OCR_LANGS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <Check label="텍스트가 있는 페이지는 OCR 생략" checked={skipText} onChange={setSkipText} disabled={running || isEpub} />
          </div>
        </div>
        <div className={`grid gap-3 px-5 py-4 sm:grid-cols-[7rem_1fr] ${isEpub ? "opacity-40" : ""}`}>
          <p className="text-sm font-medium">2. 변환</p>
          <div className="flex flex-wrap items-center gap-4">
            <Check label="검색 가능한 PDF" checked={wantPdf} onChange={setWantPdf} disabled={running || isEpub} />
            <Check label="EPUB (원문)" checked={wantEpub} onChange={setWantEpub} disabled={running || isEpub} />
          </div>
        </div>
        <div className="grid gap-3 px-5 py-4 sm:grid-cols-[7rem_1fr]">
          <p className="text-sm font-medium">3. 번역</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Check label="번역 EPUB 만들기" checked={wantTr} onChange={setWantTr} disabled={running} />
            {wantTr && (
              <>
                <LangSelect label="원문" value={source} onChange={setSource} auto disabled={running} />
                <LangSelect label="번역" value={target} onChange={setTarget} disabled={running} />
                <select aria-label="번역 배치" value={mode} disabled={running} onChange={(e) => setMode(e.target.value as Mode)} className={select}>
                  <option value="both">원문 아래 번역</option>
                  <option value="replace">번역만</option>
                </select>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <button className={primary} disabled={!file || running || nothing} onClick={start}>
            {running ? "진행 중…" : "한 번에 실행"}
          </button>
          {running && (
            <button className={btn} onClick={cancel}>
              중단
            </button>
          )}
          {wantTr && <p className="text-xs text-zinc-500">번역 단계만 문단 텍스트를 Google 번역으로 보냅니다.</p>}
        </div>
      </section>

      {steps.length > 0 && (
        <section className={`${card} px-5 py-4`}>
          <ol className="space-y-2.5">
            {steps.map((s) => (
              <li key={s.key} className="flex items-center gap-3 text-sm">
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${
                    s.state === "done"
                      ? "bg-blue-600 text-white"
                      : s.state === "run"
                        ? "animate-pulse ring-2 ring-blue-600"
                        : s.state === "error"
                          ? "bg-red-600 text-white"
                          : "ring-1 ring-zinc-300 dark:ring-zinc-700"
                  }`}
                >
                  {s.state === "done" ? "✓" : s.state === "error" ? "!" : ""}
                </span>
                <span className={s.state === "wait" ? "text-zinc-400" : ""}>{s.label}</span>
                {s.detail && <span className="text-xs text-zinc-500 tabular-nums">{s.detail}</span>}
              </li>
            ))}
          </ol>
          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}
          {outputs.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              {outputs.map((o) => (
                <button key={o.name} className={btn} onClick={() => save(o.bytes, o.name, o.type)}>
                  {o.label} 받기
                </button>
              ))}
              {reviewJob && (
                <button className={primary} onClick={() => onReview(reviewJob)}>
                  번역 검토·수정하기
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
