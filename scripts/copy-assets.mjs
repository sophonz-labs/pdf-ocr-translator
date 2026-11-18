// Copies worker/wasm files that must be served as static assets (self-hosted, no CDN).
import { cpSync, mkdirSync, rmSync } from "node:fs";

const out = "public/vendor";
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync("node_modules/tesseract.js/dist/worker.min.js", `${out}/worker.min.js`);
// The worker picks one of these by CPU feature support (OEM LSTM_ONLY).
for (const v of ["", "-simd", "-relaxedsimd"])
  cpSync(`node_modules/tesseract.js-core/tesseract-core${v}-lstm.wasm.js`, `${out}/tesseract-core${v}-lstm.wasm.js`);
cpSync("node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs", `${out}/pdf.worker.min.mjs`);
// Image decoders (JBIG2/JPEG2000 scans render blank without these), CJK cmaps, fonts, ICC profiles.
for (const d of ["wasm", "cmaps", "standard_fonts", "iccs"])
  cpSync(`node_modules/pdfjs-dist/${d}`, `${out}/pdfjs/${d}`, { recursive: true });
