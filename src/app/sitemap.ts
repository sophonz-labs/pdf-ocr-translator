import type { MetadataRoute } from "next";
import { LOCALES } from "@/i18n";
import { SITE } from "./og";

export const dynamic = "force-static";

// Every page in both languages, each listing its other-language versions.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "/", priority: 1 },
    { path: "/tools/", priority: 0.9 },
    { path: "/privacy/", priority: 0.3 },
  ];
  const lastModified = new Date();
  return pages.flatMap(({ path, priority }) =>
    LOCALES.map((lang) => ({
      url: `${SITE}/${lang}${path}`,
      lastModified,
      priority,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE}/${l}${path}`])) },
    })),
  );
}
