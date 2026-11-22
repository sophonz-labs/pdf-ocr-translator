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
  if (page === "home") return { title: m.title, description: m.description, heading: m.ogHome, sub: m.description };
  if (page === "tools") return { title: m.tools, description: m.toolsDesc, heading: m.ogTools, sub: m.toolsDesc };
  return { title: m.privacy, description: m.privacyDesc, heading: m.ogPrivacy, sub: m.privacyDesc };
}

/** Site-wide fields for every root layout: base URL, app name, and search-engine ownership tags (build env, set as repo variables). */
export function siteMeta(): Metadata {
  const v = (k: string) => process.env[k] || undefined;
  return {
    metadataBase: new URL(SITE),
    applicationName: "PDF OCR",
    publisher: "sophonz labs (INOBS Inc.)",
    verification: { google: v("NEXT_PUBLIC_GSC_VERIFICATION"), other: v("NEXT_PUBLIC_NAVER_VERIFICATION") ? { "naver-site-verification": v("NEXT_PUBLIC_NAVER_VERIFICATION")! } : undefined },
  };
}

/** Title, description, canonical/alternate URLs, Open Graph and Twitter fields for one page. The image itself comes from the route's opengraph-image. */
export function pageMeta(lang: Lang, page: PageKey): Metadata {
  const { title, description } = text(lang, page);
  const url = `/${lang}${PATH[page]}`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: { ...Object.fromEntries(LOCALES.map((l) => [l, `/${l}${PATH[page]}`])), "x-default": `/en${PATH[page]}` } },
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

const asset = (f: string) => readFile(join(process.cwd(), f));
const regular = asset("public/fonts/NanumGothic-Regular.ttf");
const bold = asset("src/og/NanumGothic-Bold.ttf");
const geist = asset("src/og/Geist-Bold.ttf");
const dataUri = (f: string, type: string) => asset(f).then((b) => `data:${type};base64,${b.toString("base64")}`);
const icon = dataUri("src/app/icon.svg", "image/svg+xml");
// Screens from the extension (src/og/*.jpg): the OCR side panel, and the translation review for the tools page.
const shot = (lang: Lang, page: PageKey) => dataUri(`src/og/${page === "tools" ? "review" : "panel"}-${lang}.jpg`, "image/jpeg");

export async function ogImage(lang: Lang, page: PageKey) {
  const { heading, sub } = text(lang, page);
  const wide = page === "tools"; // the review screen is a wide layout
  const shotW = wide ? 520 : 360;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          color: "#fff",
          fontFamily: "Nanum",
          backgroundColor: "#040013",
          backgroundImage: "radial-gradient(circle at 18% 12%, #482191 0%, transparent 55%), radial-gradient(circle at 88% 92%, #174262 0%, transparent 55%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 56px 72px", width: 1200 - shotW - 120 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, fontWeight: 700 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
            <img src={await icon} width={60} height={60} alt="" style={{ borderRadius: 13 }} />
            PDF OCR
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {/* Geist first: NanumGothic Bold draws "ti" as a broken ligature. Hangul falls back to Nanum. */}
            <div style={{ fontFamily: "Geist, Nanum", fontSize: heading.length > 32 ? 46 : 54, fontWeight: 700, lineHeight: 1.25, letterSpacing: -1, wordBreak: "keep-all" }}>
              {heading}
            </div>
            <div style={{ fontSize: 23, lineHeight: 1.55, color: "#c4c8e8", wordBreak: "keep-all" }}>{sub}</div>
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 21, color: "#7DD3FC" }}>
            <span>ocr.sophonz.com</span>
            <span style={{ color: "#8b8fb0" }}>sophonz labs</span>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 56,
            top: 56,
            width: shotW,
            height: 630,
            display: "flex",
            overflow: "hidden",
            borderRadius: 18,
            backgroundColor: "#fafafa",
            boxShadow: "0 30px 80px rgba(0,0,0,.55)",
            border: "1px solid rgba(255,255,255,.1)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> */}
          <img src={await shot(lang, page)} width={shotW} alt="" style={{ objectFit: "cover", objectPosition: "top" }} />
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Nanum", data: await regular, style: "normal", weight: 400 },
        { name: "Nanum", data: await bold, style: "normal", weight: 700 },
        { name: "Geist", data: await geist, style: "normal", weight: 700 },
      ],
    },
  );
}
