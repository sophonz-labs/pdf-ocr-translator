# pdf-ocr

PDF OCR that runs entirely in the browser. Files never leave the page.

- [pdf.js](https://github.com/mozilla/pdf.js) renders each page to a canvas (legacy build, for Safari and older Chrome).
- [tesseract.js](https://github.com/naptha/tesseract.js) runs OCR in a Web Worker, with `kor+eng` for mixed Korean/English text. Worker, wasm core and models are self-hosted (no CDN).
- Pages that already have a text layer are read directly and skip OCR (toggle in the UI).
- "검색 가능한 PDF 다운로드" returns the original PDF with an invisible OCR text layer per line ([pdf-lib](https://pdf-lib.js.org), NanumGothic subset for Hangul). Pages look unchanged but can be searched and copied.
- Models: `public/models/{kor,eng}.traineddata` from [tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast).

## Run

```sh
pnpm install   # postinstall copies worker/wasm files into public/vendor
pnpm dev
```

## Adding a language

Drop `<lang>.traineddata` from tessdata_fast into `public/models/` and add an entry to `LANGS` in `src/app/page.tsx` (combine with `+`, e.g. `jpn+eng`).
