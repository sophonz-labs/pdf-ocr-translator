# pdf-ocr

PDF OCR that runs entirely in the browser. Files never leave the page.

- [pdf.js](https://github.com/mozilla/pdf.js) renders each page to a canvas (legacy build, for Safari and older Chrome).
- [tesseract.js](https://github.com/naptha/tesseract.js) runs OCR in a Web Worker, with `kor+eng` for mixed Korean/English text. Worker, wasm core and models are self-hosted (no CDN).
- Pages that already have a text layer are read directly and skip OCR (toggle in the UI).
- "검색 가능한 PDF 다운로드" returns the original PDF with an invisible OCR text layer per line ([pdf-lib](https://pdf-lib.js.org), NanumGothic subset for Hangul). Pages look unchanged but can be searched and copied.
- Pages are processed in parallel (one tesseract worker per lane, up to 4).
- "EPUB" rebuilds reading structure from line positions (`src/lib/layout.ts`): paragraphs from indentation, spacing and short last lines; headings from font size; running headers, page numbers and footnotes separated; hyphenation and Korean mid-word line breaks joined using the document's own vocabulary. Bold/italic come from font names (digital PDFs only; OCR has no font style).
- EPUB translation (optional) sends each paragraph to Google Translate's keyless endpoint, the one the "Google (Free) - New" engine of [ebook-translator-calibre-plugin](https://github.com/bookfere/ebook-translator-calibre-plugin) uses (`src/lib/translate.ts`). The browser calls it directly. Output is the translation alone or the original with the translation below each paragraph. Paragraphs Google fails on keep the original text. This is the only feature that sends text off the device.
- Models: `public/models/{kor,eng}.traineddata` from [tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast).

## Run

```sh
pnpm install   # postinstall copies worker/wasm files into public/vendor
pnpm dev
pnpm test      # layout/EPUB/translation unit tests
```

## Adding a language

Drop `<lang>.traineddata` from tessdata_fast into `public/models/` and add an entry to `LANGS` in `src/app/page.tsx` (combine with `+`, e.g. `jpn+eng`).
