// Open Graph images and per-page metadata. Images are drawn at build time (static export) with Next's ImageResponse.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import { ImageResponse } from "next/og";
import { DICT, LOCALES, type Lang } from "@/i18n";

export const SITE = "https://ocr.sophonz.com";
export const OG_SIZE = { width: 1200, height: 630 };

type PageKey = "home" | "tools" | "privacy";
const PATH: Record<PageKey, string> = { home: "/", tools: "/tools/", privacy: "/privacy/" };

function text(lang: Lang, page: PageKey) {
  const m = DICT[lang].meta;
  if (page === "home") return { title: m.title, description: m.description, heading: DICT[lang].landing.title, sub: m.description };
  if (page === "tools") return { title: m.tools, description: m.toolsDesc, heading: m.ogTools, sub: m.toolsDesc };
  return { title: m.privacy, description: m.privacyDesc, heading: m.ogPrivacy, sub: m.privacyDesc };
}

/** Title, description, canonical/alternate URLs, Open Graph and Twitter fields for one page. The image itself comes from the route's opengraph-image. */
export function pageMeta(lang: Lang, page: PageKey): Metadata {
  const { title, description } = text(lang, page);
  const url = `/${lang}${PATH[page]}`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}${PATH[page]}`])) },
    openGraph: {
      title,
      description,
      url,
      siteName: "PDF OCR · sophonz labs",
      locale: lang === "ko" ? "ko_KR" : "en_US",
      type: "website",
      images: [{ url: `/${lang}${PATH[page]}og.png`, ...OG_SIZE, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`/${lang}${PATH[page]}og.png`] },
  };
}

const font = readFile(join(process.cwd(), "public/fonts/NanumGothic-Regular.ttf"));
const icon = readFile(join(process.cwd(), "src/app/icon.svg")).then((b) => `data:image/svg+xml;base64,${b.toString("base64")}`);

export async function ogImage(lang: Lang, page: PageKey) {
  const { heading, sub } = text(lang, page);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          color: "#fff",
          fontFamily: "Nanum",
          backgroundColor: "#040013",
          backgroundImage: "radial-gradient(circle at 18% 12%, #482191 0%, transparent 55%), radial-gradient(circle at 88% 92%, #174262 0%, transparent 55%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 34 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
          <img src={await icon} width={68} height={68} alt="" style={{ borderRadius: 15 }} />
          PDF OCR
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: heading.length > 40 ? 58 : 68, lineHeight: 1.2, letterSpacing: -1.5, color: "#fff", wordBreak: "keep-all" }}>{heading}</div>
          <div style={{ fontSize: 28, lineHeight: 1.45, color: "#c4c8e8", wordBreak: "keep-all" }}>{sub}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#7DD3FC" }}>
          <span>ocr.sophonz.com</span>
          <span style={{ color: "#8b8fb0" }}>sophonz labs</span>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: [{ name: "Nanum", data: await font, style: "normal", weight: 400 }] },
  );
}
