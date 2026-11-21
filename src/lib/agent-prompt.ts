// Instructions to hand an AI agent along with the translated EPUB, so it can proofread it into a finished book.
// The "input" part describes this app's actual EPUB markup (epub-io.ts writeEpub, epub.ts buildEpub); keep them in step.

export type PromptInfo = {
  file: string;
  /** "auto" when the source language was detected. */
  source: string;
  target: string;
  mode: "both" | "replace";
  /** "ocr": an EPUB this app built from a scanned PDF; "epub": an EPUB the user opened. */
  origin: "ocr" | "epub";
  total: number;
  done: number;
  failed: number;
  edited: number;
};

const langName = (code: string, ui: "en" | "ko") => {
  try {
    return new Intl.DisplayNames([ui], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
};

export function agentPrompt(ui: "en" | "ko", p: PromptInfo): string {
  return ui === "ko" ? ko(p) : en(p);
}

function ko(p: PromptInfo) {
  const S = p.source === "auto" ? "원문" : langName(p.source, "ko");
  const T = langName(p.target, "ko");
  const t = p.target;
  const both = p.mode === "both";
  const input =
    p.mode === "replace"
      ? `- 원문 텍스트를 번역으로 바꾼 EPUB이다. 요소마다 첫 텍스트 노드에 번역이 들어 있고 나머지 텍스트 노드는 비어 있으며, \`lang="${t}"\`가 달려 있다. 인라인 서식과 각주 링크 텍스트가 사라졌을 수 있다.
- 원문이 이 EPUB에 없다. 원문 EPUB이나 원서 PDF를 함께 받아 문단 순서대로 대조한다. 없으면 먼저 요청한다.`
      : p.origin === "ocr"
        ? `- 스캔 PDF를 OCR해서 만든 EPUB이다. 원문 블록(\`p\`, \`h1\`~\`h3\`, 각주 \`p.note\`) 바로 뒤에 번역 \`<p class="tr" lang="${t}">\`가 붙는다.
- 원문은 OCR 결과라 오자가 있고, 쪽 머리나 쪽 번호가 일부 남았을 수 있다. 각주는 본문에서 떼어 \`p.note\`로 두었다.`
        : `- 원문 요소 바로 뒤에 같은 종류의 번역 요소가 붙는다(\`lang="${t}" style="opacity:.75"\`). \`li\`, \`td\`, \`th\`, \`dt\`, \`dd\`, \`figcaption\`, \`caption\`은 같은 요소 안 끝에 \`<br/><span lang="${t}">번역</span>\`으로 들어 있다.
- 번역 쪽은 일반 텍스트다. 원문의 기울임, 굵게, 각주 링크가 빠져 있으니 교정하면서 원문을 보고 되살린다.`;

  return `# 번역 교정 작업 지침

${p.source === "auto" ? "원문" : `${S} 원문`}과 1차 ${T} 번역이 담긴 EPUB을 교정해 완성본으로 만드는 일이다. 아래 순서와 원칙을 따른다.

## 이 책

- 파일: \`${p.file}\`
- 언어: ${p.source === "auto" ? "원문은 자동 감지(본문을 보고 판단)" : `${S}(\`${p.source}\`)`} → ${T}(\`${t}\`)
- 배치: ${both ? "원문 아래 번역(대역)" : "번역만"}
- 문단 ${p.total}개 중 번역 ${p.done}개, 실패 ${p.failed}개, 사람이 고친 문단 ${p.edited}개
- PDF OCR Translator(https://ocr.sophonz.com)에서 ${p.origin === "ocr" ? "스캔 PDF를 OCR해 만든 EPUB을" : "가지고 있던 EPUB을"} Google 번역으로 1차 번역했다. 사람이 고친 문단은 의도가 있으니 신중히 다룬다.

## 도구

Claude Code에서 작업한다면 epub-proofread 플러그인의 \`proofread\` 스킬(\`/epub-proofread:proofread\`)로 진행한다. 아래 작업 순서의 추출·병합·번역만 남긴 판·글꼴·PDF를 스크립트가 처리한다.

- 설치돼 있지 않으면 먼저 사용자에게 설치를 제안한다. 셸에서 \`claude plugin install epub-proofread --marketplace sophonz-labs/pdf-ocr-translator\`를 실행하고, 세션에서 \`/reload-plugins\`를 입력하면 된다.
- 스킬을 쓸 때는 \`--lang ${t}\`를 넘긴다.
- 플러그인을 쓸 수 없는 환경이면 아래 지침을 직접 따른다.

## 입력 형식

${input}
- 번역에 실패한 문단은 번역이 비어 있다. 새로 번역한다.
- 원서 PDF가 있으면 구조를 판단하는 기준으로 쓴다.

## 목표와 원칙

산출물은 셋이다.

- 교정한 대역 EPUB과 PDF(원문 문단 뒤에 번역 문단)
- ${T}만 남긴 EPUB과 PDF
- 용어집 \`glossary.md\`

원칙:

- 같은 원어 용어는 책 전체에서 같은 말로 옮긴다.
- 원문에 충실하되 자연스러운 ${T}로 쓴다.
- 이미 맞고 자연스러운 번역은 그대로 둔다. 과잉 윤문하지 않는다.
- 확인하지 않은 것을 확인했다고 하지 않는다.

## 작업 순서

### 1. 조사

책 전체의 파일, 문단 수, 원문·번역 짝 수를 센다. 짝이 없는 문단, 문체와 고유명사 표기가 섞인 정도를 표본으로 본다.

### 2. 용어집

반복 용어, 인명·지명, 작품과 장 제목을 뽑고 1차 번역이 실제로 어떻게 옮겼는지 함께 적는다. \`| 원어 | 번역 | 쓰지 않음 |\` 표로 정리하고, 맨 앞에 번역 원칙(문체, 외래어 표기, 제목 표기, 서지 정보 처리, 각주 번호 처리)을 정한다. ${T}의 표준 표기법과 출판 관례를 따른다.${p.target === "ko" ? " 한국어라면 본문 한다체, 국립국어원 외래어 표기법, 책 제목 『』·글 제목 「」가 기본이다." : ""} 책의 성격에 맞는 규칙(호칭, 존칭 등)을 더한다.

### 3. 구조 교정

스캔에서 온 책은 쪽 경계에서 손상이 생긴다. 번역 교정 전에 원서 PDF와 대조해 고친다.

- 쪽 경계에서 끊긴 문단을 합치고, 끼어든 쪽 번호·쪽 머리를 지운다.
- 다음 쪽으로 이어진 각주와 인용을 합치고, 줄 끝 하이픈으로 끊긴 단어를 잇는다.
- 본문과 각주에 서로 끼어든 조각을 제자리로 옮긴다.
- 의미 없는 OCR 조각은 원문과 번역을 함께 지운다.

원문과 번역은 항상 짝으로 움직인다. 원문을 합치면 번역도 합치고, 합친 번역은 이어 붙이지 말고 한 문단으로 다시 번역한다. 쪽 경계와 무관한 OCR 오타는 이 단계에서 건드리지 않는다.

### 4. 번역 교정

수십~백여 문단씩 덩어리로 나눠, 문단마다 원문과 1차 번역을 나란히 놓고 고친다.

- 오역, 누락, 덧붙임, 뜻이 뒤집힌 곳, 숫자·연도·인명 오류를 고친다.
- 용어집의 용어, 표기, 문체를 적용한다.
- 절 번호, 강조, 각주 표시는 원문 위치에 맞춰 둔다. 시는 행을 나눠 옮긴다.
- 서지 정보, 약어처럼 원어로 둘 것은 그대로 둔다.

마크업은 깨지지 않게 다룬다. 태그와 각주 링크는 자리표시자로 바꿔 넘기고, 돌려받을 때 개수와 짝이 맞는지 스크립트로 확인한다. 허용하는 인라인 태그는 최소로(예: \`<i>\`, \`<b>\`) 둔다.

### 5. 병합과 검증

교정 결과를 XHTML에 되돌려 넣고 확인한다.

- 모든 XHTML이 XML로 파싱된다.
- 원문·번역 짝이 어긋나지 않는다(번역 문단이 연달아 나오지 않는다).
- 빈 각주 링크가 남지 않았고, 차례와 앵커가 살아 있다.

EPUB으로 다시 묶을 때 \`mimetype\`을 압축하지 않고 첫 항목에 넣는다. 제목, 저자, 표지 메타데이터를 채운다.

### 6. ${T}만 남긴 판
${
  both
    ? `
- 번역 요소 앞의 짝 원문을 지운다. 요소 안에 \`<br/><span>\`으로 들어간 번역은 원문 부분과 \`<br/>\`를 지운다.
- 지운 원문에 있던 \`id\`는 번역 앞에 \`<a id="…"></a>\`로 옮겨 각주 역링크와 차례가 깨지지 않게 한다.`
    : `
- 이 EPUB은 이미 번역만 담고 있다. 남은 원문 문단을 찾아 번역한다.`
}
- 짝 없는 원문(참고문헌, 원어 서지)은 남긴다. 차례와 메타데이터 제목은 ${T}로, \`dc:language\`는 \`${t}\`로 한다.
- 남은 원문 본문(출판사 고지, 안내 링크 등)을 찾아 번역한다.

### 7. 조판

글꼴과 PDF 설정은 아래로 정해져 있다. 임의로 바꾸지 않는다.

- 글꼴: 라틴 문자는 Noto Serif, ${p.target === "ko" ? "한글은 KoPub바탕" : `${T} 문자는 그 문자를 지원하는 Noto Serif 계열(예: Noto Serif JP, Noto Serif SC)`}을 쓴다. 파일을 EPUB에 넣고, 책에 쓰인 글자만 남기도록 \`pyftsubset\`으로 서브셋한다.

| 쓰임 | weight | 라틴 문자 | ${p.target === "ko" ? "한글" : T} |
|---|---|---|---|
| 본문 | normal | Noto Serif Light | ${p.target === "ko" ? "KoPub바탕 Light" : "Light 또는 Regular"} |
| 본문 속 굵게(\`b\`, \`strong\`) | 500 | Noto Serif Regular | ${p.target === "ko" ? "KoPub바탕 Medium" : "Medium"} |
| 제목 | bold | Noto Serif Bold | ${p.target === "ko" ? "KoPub바탕 Bold" : "Bold"} |

- 이탤릭은 Noto Serif Light Italic / Italic / Bold Italic을 같은 weight에 잇는다.
- 기존 스타일시트 끝에 \`/* embfonts */\` 표시를 두고 아래 규칙을 붙인다. 다시 돌릴 때는 표시 아래를 지우고 새로 붙인다. 문단 전체가 \`<b>\`/\`<strong>\` 하나인 문단은 제목으로 보고 \`emb-hd\` 클래스를 단다.

\`\`\`css
p{margin-top:0.45em !important;}
b,strong{font-weight:500 !important;}
h1,h2,h3,h4,h5,h6,h1 *,h2 *,h3 *,h4 *,h5 *,h6 *,.emb-hd{font-weight:bold !important;}
body,p,div,span,a,em,i,strong,b,h1,h2,h3,h4,h5,h6,td,th,li,blockquote,sup,sub,small{font-family:"Noto Serif","${p.target === "ko" ? "KoPub Batang" : "<번역 글꼴>"}",serif !important;}
\`\`\`

- 따옴표: 번역 텍스트의 곧은 따옴표를 둥근 따옴표(“ ” ‘ ’)로 바꾼다. 원문은 바꾸지 않는다.
- PDF: calibre로 만들고 양쪽 정렬한다. \`ebook-convert 책.epub 책.pdf --change-justification justify\`
- 대역판과 ${T}만 판 모두 EPUB과 PDF를 만든다.

### 8. 최종 확인

결과물 자체로 확인한다. 명령이 성공했다는 것만으로는 부족하다.

- 문제가 있던 쪽을 렌더링해 눈으로 본다(문단 연결, 굵기, 정렬, 간격).
- PDF에 실제로 들어간 글꼴을 확인한다.
- ${T}만 판에서 깨진 앵커와 남은 원문 문단이 0인지 센다(참고문헌 제외).

## 보고

사용자에게 짧게 보고한다. 고친 유형별 개수와 대표 위치, 확인한 것과 하지 않은 것, 남겨 둔 문제(쪽 경계와 무관한 OCR 오타, 일부만 다시 번역해 생긴 용어 불일치 등).

## 자주 하는 실수

- 정규식이 이웃 태그까지 삼켜 태그 짝이 깨진다. 잡을 대상을 좁게 정한다.
- 각주 링크를 빠뜨려 빈 링크가 남는다. 병합 후 정리한다.
- 원문을 지울 때 \`id\`를 옮기지 않아 앵커가 깨진다.
- 문단 하나만 다시 번역하면 주변과 용어가 갈린다. 주변도 용어집 기준으로 맞춘다.
`;
}

function en(p: PromptInfo) {
  const S = p.source === "auto" ? "source" : langName(p.source, "en");
  const T = langName(p.target, "en");
  const t = p.target;
  const both = p.mode === "both";
  const input =
    p.mode === "replace"
      ? `- An EPUB whose original text was replaced by the translation. In each element the translation sits in the first text node, the other text nodes are empty, and the element carries \`lang="${t}"\`. Inline formatting and footnote link text may be gone.
- The original is not in this EPUB. Get the original EPUB or source PDF as well and compare paragraph by paragraph. Ask for it first if you don't have it.`
      : p.origin === "ocr"
        ? `- An EPUB built by OCR from a scanned PDF. Each original block (\`p\`, \`h1\`–\`h3\`, footnote \`p.note\`) is followed directly by its translation \`<p class="tr" lang="${t}">\`.
- The original is OCR output: expect typos, and possibly some leftover running heads or page numbers. Footnotes were split from the body into \`p.note\`.`
        : `- Each original element is followed directly by a translation element of the same kind (\`lang="${t}" style="opacity:.75"\`). In \`li\`, \`td\`, \`th\`, \`dt\`, \`dd\`, \`figcaption\` and \`caption\` the translation sits inside the element, at the end, as \`<br/><span lang="${t}">translation</span>\`.
- Translations are plain text: italics, bold and footnote links from the original are missing. Restore them from the original while proofreading.`;

  return `# Translation proofreading instructions

The job: proofread an EPUB holding the ${S === "source" ? "source text" : `${S} source text`} and a first-pass ${T} translation, and turn it into a finished book. Follow the steps and principles below.

## This book

- File: \`${p.file}\`
- Languages: ${p.source === "auto" ? "source auto-detected (judge from the text)" : `${S} (\`${p.source}\`)`} → ${T} (\`${t}\`)
- Layout: ${both ? "translation under the original (bilingual)" : "translation only"}
- ${p.total} paragraphs: ${p.done} translated, ${p.failed} failed, ${p.edited} edited by hand
- Made with PDF OCR Translator (https://ocr.sophonz.com): ${p.origin === "ocr" ? "a scanned PDF was OCR'd into an EPUB and" : "an existing EPUB was"} machine-translated with Google Translate. Hand-edited paragraphs were changed on purpose; treat them with care.

## Tools

If you are Claude Code, use the \`proofread\` skill of the epub-proofread plugin (\`/epub-proofread:proofread\`). Its scripts handle extraction, merging, the translation-only edition, fonts and the PDF in the steps below.

- If it isn't installed, offer to install it first: run \`claude plugin install epub-proofread --marketplace sophonz-labs/pdf-ocr-translator\` in a shell, then \`/reload-plugins\` in the session.
- Pass \`--lang ${t}\` to its scripts.
- Where the plugin can't be used, follow the instructions below directly.

## Input

${input}
- Paragraphs whose translation failed have no translation. Translate them.
- If the source PDF is available, use it as the reference for structure.

## Goal and principles

Three deliverables:

- a proofread bilingual EPUB and PDF (each source paragraph followed by its translation)
- a ${T}-only EPUB and PDF
- a glossary, \`glossary.md\`

Principles:

- Translate the same source term the same way throughout the book.
- Stay faithful to the original, in natural ${T}.
- Leave translations that are already correct and natural alone. Don't over-polish.
- Never report something as checked if you didn't check it.

## Steps

### 1. Survey

Count the files, paragraphs and source–translation pairs across the book. Sample unpaired paragraphs and how mixed the register and name spellings are.

### 2. Glossary

Collect recurring terms, names of people and places, and titles of works and chapters, with how the first pass actually translated them. Put them in a \`| Source | Translation | Avoid |\` table, preceded by translation principles (register, loanword spelling, title formatting, bibliographic details, footnote numbering) that follow ${T}'s standard spelling and publishing conventions.${p.target === "ko" ? " For Korean the defaults are the plain written style (한다체) for body text, the National Institute of Korean Language loanword rules, and 『』 for book titles, 「」 for article titles." : ""} Add rules that fit the book (forms of address, honorifics and so on).

### 3. Structural fixes

Books that come from scans get damaged at page breaks. Fix this against the source PDF before proofreading the translation.

- Join paragraphs cut at page breaks; delete page numbers and running heads that got into the text.
- Join footnotes and quotations continued on the next page; mend words hyphenated at line ends.
- Move body and footnote fragments that ended up in each other back where they belong.
- Delete meaningless OCR fragments together with their translations.

Source and translation always move as a pair. When you join source paragraphs, join the translations too, and retranslate the joined paragraph as one instead of gluing the pieces. Leave OCR typos unrelated to page breaks for later.

### 4. Proofreading

Work in chunks of a few dozen to about a hundred paragraphs, with each source paragraph and its first-pass translation side by side.

- Fix mistranslations, omissions, additions, reversed meanings, and errors in numbers, years and names.
- Apply the glossary's terms, spellings and register.
- Keep section numbers, emphasis and footnote markers where the original has them. Translate verse line by line.
- Leave what should stay in the original language (bibliographic details, abbreviations) as is.

Protect the markup: hand tags and footnote links over as placeholders, and check by script that counts and pairs match when they come back. Keep allowed inline tags to a minimum (e.g. \`<i>\`, \`<b>\`).

### 5. Merge and verify

Put the results back into the XHTML and check:

- every XHTML file parses as XML;
- source–translation pairs never drift (no two translation paragraphs in a row);
- no empty footnote links are left, and the table of contents and anchors work.

When re-zipping the EPUB, put \`mimetype\` first and uncompressed. Fill in title, author and cover metadata.

### 6. The ${T}-only edition
${
  both
    ? `
- Delete the source element paired with each translation. Where the translation sits inside the element as \`<br/><span>\`, delete the source part and the \`<br/>\`.
- Move the deleted source element's \`id\` to an \`<a id="…"></a>\` before the translation, so footnote backlinks and the table of contents keep working.`
    : `
- This EPUB already holds only the translation. Find the remaining source-language paragraphs and translate them.`
}
- Keep unpaired source text (bibliography, original-language references). Put the table of contents and metadata title in ${T}, and set \`dc:language\` to \`${t}\`.
- Find and translate leftover source-language body text (publisher notices, navigation links and the like).

### 7. Typesetting

Fonts and PDF settings are fixed as below. Don't substitute others.

- Fonts: Noto Serif for Latin script, ${p.target === "ko" ? "KoPub Batang for Hangul" : `and for ${T} script the Noto Serif family that covers it (e.g. Noto Serif JP, Noto Serif SC)`}. Embed the files in the EPUB, subset with \`pyftsubset\` to the characters the book uses.

| Use | weight | Latin | ${p.target === "ko" ? "Hangul" : T} |
|---|---|---|---|
| Body | normal | Noto Serif Light | ${p.target === "ko" ? "KoPub Batang Light" : "Light or Regular"} |
| Bold in body (\`b\`, \`strong\`) | 500 | Noto Serif Regular | ${p.target === "ko" ? "KoPub Batang Medium" : "Medium"} |
| Headings | bold | Noto Serif Bold | ${p.target === "ko" ? "KoPub Batang Bold" : "Bold"} |

- Italics: Noto Serif Light Italic / Italic / Bold Italic at the same weights.
- Append the rules below to the end of the existing stylesheet after a \`/* embfonts */\` marker; on a rerun, delete everything below the marker first. A paragraph that is a single \`<b>\`/\`<strong>\` counts as a heading and gets the \`emb-hd\` class.

\`\`\`css
p{margin-top:0.45em !important;}
b,strong{font-weight:500 !important;}
h1,h2,h3,h4,h5,h6,h1 *,h2 *,h3 *,h4 *,h5 *,h6 *,.emb-hd{font-weight:bold !important;}
body,p,div,span,a,em,i,strong,b,h1,h2,h3,h4,h5,h6,td,th,li,blockquote,sup,sub,small{font-family:"Noto Serif","${p.target === "ko" ? "KoPub Batang" : "<translation font>"}",serif !important;}
\`\`\`

- Quotes: turn straight quotes in the translation into curly ones (“ ” ‘ ’). Leave the source text alone.
- PDF: make it with calibre, justified: \`ebook-convert book.epub book.pdf --change-justification justify\`
- Make an EPUB and a PDF of both the bilingual and the ${T}-only editions.

### 8. Final check

Check the output itself; a command succeeding is not enough.

- Render the pages that had problems and look at them (paragraph joins, weights, alignment, spacing).
- Check which fonts actually ended up in the PDF.
- In the ${T}-only edition, count broken anchors and leftover source paragraphs; both should be 0 (bibliography excepted).

## Reporting

Report briefly to the user: counts of each kind of fix with representative locations, what you checked and what you didn't, and what's left open (OCR typos unrelated to page breaks, term mismatches from partial retranslation and so on).

## Common mistakes

- A regex swallows neighbouring tags and breaks tag pairs. Keep what you match narrow.
- Footnote links get dropped, leaving empty links. Clean up after merging.
- \`id\`s aren't moved when source elements are deleted, and anchors break.
- Retranslating one paragraph splits terms from its neighbours. Align the surrounding text with the glossary too.
`;
}
