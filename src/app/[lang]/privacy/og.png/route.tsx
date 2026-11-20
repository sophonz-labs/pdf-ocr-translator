import { LOCALES, type Lang } from "@/i18n";
import { ogImage } from "@/app/og";

// A route handler rather than opengraph-image: the exported file keeps its .png name, so GitHub Pages serves it as image/png.
export const dynamic = "force-static";
export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }));

export async function GET(_: Request, { params }: { params: Promise<{ lang: string }> }) {
  return ogImage((await params).lang as Lang, "privacy");
}
