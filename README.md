# PDF OCR Translator

Turn image-only PDFs (scans, photographed pages) into searchable PDFs and paragraph-based EPUBs, then translate them. Everything runs in the browser; files never leave the device.

- Web: https://ocr.sophonz.com
- Chrome extension: the same tools in Chrome's side panel ([extension/README.md](extension/README.md))

## How it works

- [pdf.js](https://github.com/mozilla/pdf.js) renders each page to a canvas (legacy build, for Safari and older Chrome), with its wasm decoders for JBIG2/JPEG2000 scans.
- [tesseract.js](https://github.com/naptha/tesseract.js) runs OCR in Web Workers, up to 4 pages in parallel, `kor+eng` by default. Worker, wasm core and models are self-hosted (no CDN). Pages that already have a text layer can skip OCR.
- **Searchable PDF**: the original PDF with an invisible text layer per OCR line ([pdf-lib](https://pdf-lib.js.org), NanumGothic subset for Hangul).
- **EPUB**: reading structure rebuilt from line positions (`src/lib/layout.ts`): paragraphs from indentation, spacing and short last lines; headings from font size; running heads, page numbers and footnotes separated; hyphenation and Korean mid-word breaks joined using the document's own vocabulary.
- **EPUB translation** works on any EPUB or on the OCR result. It is step by step, like the advanced mode of [ebook-translator-calibre-plugin](https://github.com/bookfere/ebook-translator-calibre-plugin): translate untranslated or selected paragraphs, review and edit each, then build the EPUB with the translation alone or under the original. 243 languages. It calls Google Translate's keyless endpoint (the plugin's "Google (Free) - New" engine, `src/lib/translate.ts`) straight from the browser. This is the only feature that sends text off the device, and only the paragraph text.

## Layout

- `src/app/[lang]/`: the site in English (`/en/`, default) and Korean (`/ko/`); `/` forwards to the saved language. All text is in `src/i18n.ts`.
- `src/app/tools.tsx`, `translator.tsx`, `ocr.ts`: the tools, shared by the site and the extension.
- `extension/`: Chrome extension (Vite build of the same tools).

## Develop

```sh
bun install    # postinstall copies worker/wasm files into public/vendor
bun dev
bun run test   # layout/EPUB/translation unit tests (Node 22.6+)
bun run build  # static export to out/
bun run build:extension
```

Pushing to `main` builds the static site and publishes it to the `gh-pages` branch (GitHub Pages, `ocr.sophonz.com`).

## Adding an OCR language

Drop `<lang>.traineddata` from [tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast) into `public/models/`, add it to `OCR_LANGS` in `src/app/tools.tsx` (combine with `+`, e.g. `jpn+eng`), and add labels under `ocr.langs` in `src/i18n.ts`.

## License

MIT. Bundled third-party files keep their own licenses: tessdata models (Apache-2.0), NanumGothic (SIL OFL 1.1, `public/fonts/OFL.txt`); tesseract.js and pdf.js files copied at install time are Apache-2.0.
