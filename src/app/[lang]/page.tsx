import Link from "next/link";
import { AppIcon } from "@/components/brand";
import { SiteHeader, TOOLS } from "@/components/site";
import { PluginGuide } from "@/components/plugin-guide";
import type { Metadata } from "next";
import { DICT, type Lang } from "@/i18n";
import { pageMeta, SITE } from "../og";

// Set once the extension is published (build env NEXT_PUBLIC_CWS_URL).
const STORE_URL = process.env.NEXT_PUBLIC_CWS_URL;

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  return pageMeta((await params).lang as Lang, "home");
}

export default async function Landing({ params }: PageProps<"/[lang]">) {
  const lang = (await params).lang as Lang;
  const t = DICT[lang];
  const L = t.landing;
  // Structured data for search results: a free web app (and Chrome extension) by sophonz labs.
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "PDF OCR",
    url: `${SITE}/${lang}/`,
    description: t.meta.description,
    inLanguage: lang,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (web browser), Chrome",
    browserRequirements: "Requires JavaScript and WebAssembly",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
    screenshot: `${SITE}/${lang}/og.png`,
    image: `${SITE}/icon.svg`,
    sameAs: ["https://github.com/sophonz-labs/pdf-ocr-translator", ...(STORE_URL ? [STORE_URL] : [])],
    publisher: { "@type": "Organization", name: "sophonz labs (INOBS Inc.)", email: "contact@sophonz.ai" },
  };
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 break-keep px-4 py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <SiteHeader
        lang={lang}
        right={
          <Link href={`/${lang}/tools`} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
            {L.open}
          </Link>
        }
      />

      <section className="mt-20 flex flex-col items-start gap-6 sm:mt-28">
        <AppIcon size={72} className="drop-shadow-[0_8px_24px_rgba(72,33,145,0.35)]" />
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{L.title}</h1>
        <p className="max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">{L.lead}</p>
        <div className="flex flex-wrap gap-3">
          {STORE_URL ? (
            <a
              href={STORE_URL}
              className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {L.addToChrome}
            </a>
          ) : (
            <span className="rounded-lg bg-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 dark:bg-zinc-800">{L.storeSoon}</span>
          )}
          <Link href={`/${lang}/tools`} className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
            {L.tryWeb}
          </Link>
        </div>
      </section>

      <section className="mt-24">
        <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{L.stepsTitle}</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {L.steps.map((step, i) => (
            <li key={step.title}>
              <p className="text-xs text-zinc-400 tabular-nums">0{i + 1}</p>
              <h3 className="mt-2 font-medium">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tab, i) => (
          <Link
            key={tab}
            href={`/${lang}/tools?tab=${tab}`}
            className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
          >
            <p className="text-xs text-zinc-400 tabular-nums">0{i + 1}</p>
            <h2 className="mt-3 font-medium">
              {t.tools[tab].label}
              <span aria-hidden className="ml-1 inline-block text-zinc-400 transition group-hover:translate-x-0.5">
                →
              </span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{t.tools[tab].desc}</p>
          </Link>
        ))}
      </section>

      <section className="mt-24">
        <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{L.featuresTitle}</h2>
        <div className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {L.features.map((f) => (
            <div key={f.title}>
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <PluginGuide t={L.plugin} />
    </main>
  );
}
