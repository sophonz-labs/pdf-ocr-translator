import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: r("."),
  // Absolute asset paths (/vendor, /models, /fonts) resolve to the extension root, as on the website.
  base: "/",
  publicDir: false,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: "next/link", replacement: r("./link-shim.tsx") },
      { find: /^@\//, replacement: r("../src") + "/" },
    ],
  },
  build: {
    outDir: r("dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 4096, // pdf.js and pdf-lib are big; they load lazily
  },
});
