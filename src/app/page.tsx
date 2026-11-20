import Link from "next/link";
import { AppIcon } from "@/components/brand";
import { SiteHeader, TOOLS } from "@/components/site";

const FEATURES = [
  {
    title: "브라우저에서 모두 처리",
    body: "OCR부터 PDF·EPUB 생성까지 이 브라우저 안에서 처리합니다. 번역할 때만 문단 텍스트가 Google 번역으로 전송됩니다.",
  },
  {
    title: "문단 단위 EPUB",
    body: "줄바꿈이 아니라 문단 단위로 다시 잇습니다. 머리말과 쪽 번호를 빼고, 줄 끝에서 끊긴 단어를 붙이고, 쪽을 넘어가는 문단도 하나로 묶습니다.",
  },
  {
    title: "검색 가능한 PDF",
    body: "원본 위에 보이지 않는 텍스트 층을 얹습니다. 보이는 모습은 그대로이고, 찾기와 복사를 할 수 있습니다.",
  },
  {
    title: "검토하며 번역",
    body: "243개 언어로 문단 단위 번역을 하고, 문단마다 고치거나 골라서 다시 번역한 뒤 EPUB으로 묶습니다.",
  },
];

export default function Landing() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 break-keep px-4 py-10 sm:py-14">
      <SiteHeader
        right={
          <Link href="/tools" className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
            도구 열기
          </Link>
        }
      />

      <section className="mt-20 flex flex-col items-start gap-6 sm:mt-28">
        <AppIcon size={72} className="drop-shadow-[0_8px_24px_rgba(72,33,145,0.35)]" />
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">이미지로 된 PDF를, 검색되는 문서와 EPUB으로.</h1>
        <p className="max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          스캔본처럼 글자가 이미지로만 들어 있는 PDF에서 텍스트를 인식해 검색 가능한 PDF와 문단 단위 EPUB을 만들고, 원하는 언어로 번역합니다. 모두 브라우저에서 처리합니다.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/tools?tab=ocr"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            PDF 변환하기
          </Link>
          <Link href="/tools?tab=translate" className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
            EPUB 번역하기
          </Link>
        </div>
      </section>

      <section className="mt-24 grid gap-4 sm:grid-cols-2">
        {TOOLS.map((t, i) => (
          <Link
            key={t.tab}
            href={`/tools?tab=${t.tab}`}
            className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
          >
            <p className="text-xs text-zinc-400 tabular-nums">0{i + 1}</p>
            <h2 className="mt-3 font-medium">
              {t.label}
              <span aria-hidden className="ml-1 inline-block text-zinc-400 transition group-hover:translate-x-0.5">
                →
              </span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">{t.desc}</p>
          </Link>
        ))}
      </section>

      <section className="mt-24">
        <h2 className="text-sm font-medium text-zinc-500">기능</h2>
        <div className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
