---
name: proofread
description: Proofread a machine-translated bilingual EPUB (from PDF OCR Translator at ocr.sophonz.com, or calibre Ebook Translator) and build the finished books - a bilingual and a translation-only EPUB and PDF, with a glossary, embedded Noto Serif + KoPub Batang fonts and justified PDF. Use when the user hands over a translated EPUB to proofread, or pastes the "translation proofreading instructions" prompt from PDF OCR Translator.
---

# Proofread a bilingual EPUB

The scripts are in `${CLAUDE_PLUGIN_ROOT}/scripts` (call it `S` below). Every script takes `--lang <code>`: the `lang` attribute the translation elements carry (`ko`, `en`, `ja`, `zh-CN`, …; default `ko`). Pass it on every call when the target isn't Korean.

What the scripts understand:

- **PDF OCR Translator, "translation under the original"**: each source element is followed by a translation element of the same kind with `lang="<target>" style="opacity:.75"`; in `li td th dt dd figcaption caption` the translation is inside the element as `<br/><span lang="<target>">`.
- **PDF OCR Translator, EPUB built from a scanned PDF**: each block (`p`, `h1`–`h3`, footnote `p.note`) is followed by `<p class="tr" lang="<target>">`.
- **calibre Ebook Translator**: the source element followed by one with `lang="<target>"`.
- **"Translation only" layout**: the source isn't in the file. The scripts can't pair anything; ask the user for the original EPUB, translate again in PDF OCR Translator with "translation under the original", or proofread by hand against the original.

Translation-only edition, CSS, fonts and the PDF are fixed by the scripts. Don't replace them with your own.

## 0. Check the tools

```
python3 S/doctor.py --lang <code>
```

Install what it reports missing (calibre, `pip install fonttools pymupdf`). For a Korean target it needs KoPub Batang Light/Medium/Bold installed (from the Korean Publishers Society, kopus.org); the plugin doesn't ship it because its licence doesn't clearly allow redistribution. If the fonts sit in some folder, set `PROOF_FONTS=<folder>`. Stop and tell the user if something can't be installed.

Work in a folder next to the book, e.g. `work/`. Keep the user's original files untouched.

## 1. Survey

Count files, paragraphs and source–translation pairs; look for unpaired paragraphs and how mixed the register and name spellings are:

```
python3 S/pars.py book.epub work/pars --lang <code>
python3 S/check.py book.epub --lang <code>
```

## 2. Glossary (`glossary.md`, next to the book)

Collect recurring terms, names of people and places, titles of works and chapters, with how the first pass actually translated them. A `| Source | Translation | Avoid |` table, preceded by translation principles: register, loanword spelling, title formatting, bibliographic details, footnote numbering, following the target language's standard conventions (for Korean: 한다체 body text, National Institute of Korean Language loanword rules, 『』 book titles and 「」 article titles). Add rules that fit the book (forms of address, honorifics). Show the user the principles and the main terms before step 4 when the book is long.

## 3. Structural fixes (only with the source PDF, for books from scans)

```
python3 S/pdfsplits.py source.pdf book.epub --lang <code>   # paragraphs cut at page breaks
```

Decide merges and deletions per file from `work/pars/*.txt` and write them as JSON in `work/ops/` (format in the header of `S/apply_ops.py`), then:

```
python3 S/apply_ops.py book.epub work/ops work/structured.epub --lang <code>
```

Join paragraphs cut by page breaks and delete page numbers and running heads that got into them; join footnotes and quotations continued on the next page; mend words hyphenated at line ends; move body and footnote fragments back where they belong; delete meaningless OCR fragments. Source and translation always move as a pair: when you join source paragraphs, join the translations and retranslate the joined paragraph as one. Leave OCR typos unrelated to page breaks.

## 4. Proofreading

```
python3 S/extract.py work/structured.epub work 40 --lang <code>   # or book.epub if step 3 was skipped
```

This writes `work/chunks/c000.txt`… Give each chunk, `corrector.md` (next to this file) and the glossary to a proofreader (subagents in parallel for long books), who writes the result under the same name in `work/out/`.

## 5. Merge and verify

```
python3 S/merge.py work work/corrected.epub
```

Blocks that broke the markup rules keep their first-pass translation and are listed as `rejected`. Proofread only those again, append them to a file in `work/out/`, and rerun until nothing is rejected.

## 6. Build the books

```
python3 S/build.py work/corrected.epub "<book folder>" "<file name base>" "<title in the target language>" --lang <code>
```

This makes `<base> - 교정본.epub/.pdf` (bilingual) and `<base> - 교정본 (<language>만).epub/.pdf` (translation only): curly quotes in the translation, the translation-only edition (source elements dropped with their ids kept as anchors, table of contents and `dc:language` in the target language), fonts subset and embedded (Noto Serif Light/Regular/Bold and italics; for Korean KoPub Batang Light/Medium/Bold), paragraph spacing and weights in CSS, and a justified PDF from calibre. `check.py` runs on both at the end.

## 7. Final check

Check the output itself, not just exit codes:

- Fonts actually embedded in the PDFs: `python3 -c "import pymupdf,sys; d=pymupdf.open(sys.argv[1]); print(sorted({f[3] for p in d for f in p.get_fonts()}))" "<file>.pdf"`
- Render a few pages you fixed and look at them (paragraph joins, weights, justification, spacing).
- In the translation-only edition, broken links and leftover source paragraphs are 0 (bibliography excepted).

## Report

Briefly, in the user's language: counts of each kind of fix with representative locations, what you checked and what you didn't, and what's left open (OCR typos unrelated to page breaks, term mismatches from partial retranslation). Never report something as checked if you didn't check it.
