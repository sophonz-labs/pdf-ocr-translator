# Chrome extension

The same tools as the website's `/<lang>/tools`, packaged as an MV3 extension that opens in Chrome's side panel. The website (`/`) is its landing page.

```sh
bun run build:extension   # → extension/dist and extension/pdf-ocr-extension-<version>.zip
```

The version comes from `package.json`; the Web Store rejects an upload whose version is not higher than the last one.

Built with Vite rather than Next: Next's static export puts inline scripts in the HTML, which extension pages' CSP blocks. `next/link` is swapped for `link-shim.tsx` (opens site pages on the web). The manifest allows `'wasm-unsafe-eval'` for tesseract and pdf.js WebAssembly. There are no host permissions on purpose: they put the item into in-depth review, and the translation endpoint already allows extension origins through CORS.

## Try it locally

1. `chrome://extensions` → turn on Developer mode.
2. "Load unpacked" → `extension/dist`.
3. Click the toolbar icon (pin it from the puzzle menu first). The side panel opens.

## Publishing to the Chrome Web Store

1. Register a developer account at https://chrome.google.com/webstore/devconsole (one-time USD 5 fee, 2-step verification required). Use the company account so the listing shows INOBS Inc.; set and verify the contact email under Account.
2. "New item" → upload `extension/pdf-ocr-extension-<version>.zip`.
3. **Store listing** (default language: English)
   - Description: "Listing description" below, English.
   - Category: Productivity (Tools).
   - Icon: taken from the zip (`icons/icon-128.png`).
   - Screenshots (1280×800): `store/en/screenshot-1.png`, `-2`, `-3`.
   - Small promo tile (440×280): `store/en/promo-small-440x280.png`. Marquee (1400×560, optional): `store/en/promo-marquee-1400x560.png`.
   - Homepage: https://ocr.sophonz.com
   - Add Korean under the listing's language menu: the Korean description below and the `store/ko/` images. Name and short description come from `_locales/<lang>/messages.json` in the zip.
4. **Privacy practices**
   - Single purpose: "Recognize text in image-only PDFs, make searchable PDFs and EPUBs, and translate them."
   - `sidePanel` justification: "Opens the tools in the side panel when the toolbar icon is clicked."
   - Remote code: No. (All scripts and wasm are in the package.)
   - Data usage: tick "Website content" only (the paragraph text sent for translation); certify the three statements (no selling, no unrelated use, no credit-worthiness use).
   - Privacy policy URL: https://ocr.sophonz.com/en/privacy/
5. **Distribution**: Public, all regions (or Unlisted for a soft launch).
6. "Submit for review". Review usually takes a few days. After approval, set the repository variable `CWS_URL` (Settings → Secrets and variables → Actions → Variables) to the listing URL and re-run the `pages` workflow; the landing page's "Chrome에 추가" button turns on.

### Listing description

English (default):

```
Recognize the text in image-only PDFs (scans and the like), then make a searchable PDF and a paragraph-based EPUB and translate it into the language you want.

• Text recognition (OCR): Korean and English, several pages at once.
• Searchable PDF: an invisible text layer over the original, so you can find and copy text.
• Paragraph-based EPUB: text rejoined by paragraph, not by line, without running heads or page numbers.
• Translation: 243 languages. Review and edit each paragraph, then pack the original and the translation into one EPUB.
• EPUBs you already have can be translated too.

Everything runs in your browser. Files are never uploaded; only paragraph text is sent to Google Translate, and only when you start a translation.

How to use: click the toolbar icon to open the side panel, then drop a PDF.
Source code (MIT): https://github.com/sophonz-labs/pdf-ocr-translator
```

Korean:

```
이미지로 된 PDF(스캔본 등)에서 텍스트를 인식해 검색 가능한 PDF와 문단 단위 EPUB을 만들고, 원하는 언어로 번역합니다.

• 텍스트 인식(OCR): 한국어·영어. 여러 페이지를 동시에 처리합니다.
• 검색 가능한 PDF: 원본 위에 보이지 않는 텍스트 층을 얹어 찾기와 복사가 됩니다.
• 문단 단위 EPUB: 줄바꿈이 아니라 문단으로 다시 잇고, 머리말과 쪽 번호를 걷어 냅니다.
• 번역: 243개 언어. 문단마다 검토하고 고친 뒤 원문과 번역을 함께 담은 EPUB으로 묶습니다.
• 가지고 있는 EPUB도 바로 번역할 수 있습니다.

모두 브라우저에서 처리합니다. 파일은 서버로 올라가지 않으며, 번역을 시작했을 때만 문단 텍스트가 Google 번역으로 전송됩니다.

사용법: 툴바 아이콘을 누르면 사이드 패널이 열립니다. PDF를 놓으세요.
소스 코드(MIT): https://github.com/sophonz-labs/pdf-ocr-translator
```

### Review risk

Translation uses Google's keyless public endpoint (the one the calibre ebook-translator plugin calls "Google (Free) New"), not the paid Cloud Translation API. Reviewers rarely flag it, but if they do, or Google closes it, the fallback is to ship without translation or let users enter their own Cloud API key.
