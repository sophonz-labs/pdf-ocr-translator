import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { isLang, LOCALES } from "@/i18n";
import { pageMeta, SITE } from "../og";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const dynamicParams = false;
export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }));

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  return { metadataBase: new URL(SITE), ...pageMeta(isLang(lang) ? lang : "en", "home") };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <html lang={lang} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* The static tools page is the OCR tab; show ?tab=translate's panel before React reads the URL (see globals.css). */}
        <script dangerouslySetInnerHTML={{ __html: `if(/[?&]tab=translate\\b/.test(location.search))document.documentElement.dataset.tab="translate"` }} />
      </head>
      <body className="@container min-h-full flex flex-col">
        {children}
        <SiteFooter lang={lang} />
      </body>
    </html>
  );
}
