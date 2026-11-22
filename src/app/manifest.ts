import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PDF OCR · sophonz labs",
    short_name: "PDF OCR",
    description: "Searchable PDFs and EPUBs from image-only PDFs, with translation. Everything runs in your browser.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#482191",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
