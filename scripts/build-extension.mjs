// Builds the Chrome extension into extension/dist and zips it for the Chrome Web Store.
// Run: bun run build:extension
import { cpSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { build } from "vite";
import { zipSync } from "fflate";

const root = new URL("..", import.meta.url).pathname;
const ext = join(root, "extension");
const dist = join(ext, "dist");

await build({ configFile: join(ext, "vite.config.ts") });

// Runtime assets the page fetches by absolute path (same layout as the website's public/).
for (const dir of ["vendor", "models", "fonts"]) cpSync(join(root, "public", dir), join(dist, dir), { recursive: true });
cpSync(join(ext, "icons"), join(dist, "icons"), { recursive: true });
cpSync(join(ext, "background.js"), join(dist, "background.js"));
cpSync(join(ext, "_locales"), join(dist, "_locales"), { recursive: true });

const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(ext, "manifest.json"), "utf8"));
manifest.version = version;
writeFileSync(join(dist, "manifest.json"), JSON.stringify(manifest, null, 2));

// Chrome refuses extensions with files or folders starting with "_" (reserved), except _locales.
const files = {};
const walk = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (name.startsWith("_") && !(d === dist && name === "_locales")) throw new Error(`reserved name in extension: ${relative(dist, p)}`);
    if (statSync(p).isDirectory()) walk(p);
    else files[relative(dist, p)] = readFileSync(p);
  }
};
walk(dist);
const zip = join(ext, `pdf-ocr-extension-${version}.zip`);
writeFileSync(zip, zipSync(files, { level: 9 }));
console.log(`extension: ${Object.keys(files).length} files, ${(statSync(zip).size / 1e6).toFixed(1)} MB → ${relative(root, zip)}`);
