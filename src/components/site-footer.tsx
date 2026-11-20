import Link from "next/link";
import { SophonzLabs } from "./brand";
import { TOOLS } from "./site";

type Item = { label: string; href: string };
const COLUMNS: { title: string; items: Item[] }[] = [
  { title: "도구", items: TOOLS.map((t) => ({ label: t.label, href: `/tools?tab=${t.tab}` })) },
  {
    title: "오픈소스",
    items: [
      { label: "tesseract.js", href: "https://github.com/naptha/tesseract.js" },
      { label: "pdf.js", href: "https://github.com/mozilla/pdf.js" },
      { label: "ebook-translator", href: "https://github.com/bookfere/ebook-translator-calibre-plugin" },
    ],
  },
  {
    title: "sophonz labs",
    items: [
      { label: "sophonz terminal", href: "https://sophonz.io" },
      { label: "inobs.io", href: "https://inobs.io" },
      { label: "contact@sophonz.ai", href: "mailto:contact@sophonz.ai" },
    ],
  },
];

// Cached so the static pages can prerender; refreshed on the next deploy.
async function Year() {
  "use cache";
  return new Date().getFullYear();
}

/** Laid out like the sophonz terminal site's footer: wordmark and a line on the left, titled columns on the right. */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-zinc-200 bg-zinc-100/60 px-6 pt-14 pb-10 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <SophonzLabs height={15} className="self-start text-zinc-900 dark:text-zinc-100" />
          <p className="max-w-xs leading-6 text-zinc-500">
            PDF OCR, 검색 가능한 PDF, EPUB 변환과 번역. 모두 브라우저에서 처리합니다.
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.title} className="min-w-0">
              <h2 className="mb-4 text-[13px] font-normal text-zinc-500">{col.title}</h2>
              <ul className="flex flex-col gap-3">
                {col.items.map(({ label, href }) => {
                  const cls = "whitespace-nowrap text-zinc-800 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white";
                  return (
                    <li key={href}>
                      {href.startsWith("/") ? (
                        <Link href={href} className={cls}>
                          {label}
                        </Link>
                      ) : (
                        <a href={href} className={cls} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}>
                          {label}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="mx-auto mt-12 max-w-5xl border-t border-zinc-200 pt-6 text-[12px] text-zinc-500 dark:border-zinc-800">
        &copy; <Year /> INOBS Inc.
      </div>
    </footer>
  );
}
