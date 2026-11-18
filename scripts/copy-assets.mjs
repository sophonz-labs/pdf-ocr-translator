// Copies worker/wasm files that must be served as static assets next to each other.
import { cpSync, mkdirSync } from "node:fs";

const out = "public/vendor";
mkdirSync(out, { recursive: true });
for (const f of ["tesseract-worker.js", "tesseract-core.wasm", "tesseract-core-fallback.wasm"])
  cpSync(`node_modules/tesseract-wasm/dist/${f}`, `${out}/${f}`);
cpSync("node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs", `${out}/pdf.worker.min.mjs`);
