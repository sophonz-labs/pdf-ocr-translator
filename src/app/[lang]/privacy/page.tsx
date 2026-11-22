import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site";
import type { Lang } from "@/i18n";
import { analyticsOn } from "@/components/analytics";
import { pageMeta } from "../../og";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  return pageMeta((await params).lang as Lang, "privacy");
}

const mail = (
  <a className="underline" href="mailto:contact@sophonz.ai">
    contact@sophonz.ai
  </a>
);

// Linked from the Chrome Web Store listing; keep it in step with what the extension actually does.
const BODY: Record<Lang, ReactNode> = {
  en: (
    <>
      <h1>Privacy policy</h1>
      <p className="text-zinc-500">Effective November 21, 2026 · Applies to the PDF OCR website and Chrome extension</p>
      <h2>What we process</h2>
      <p>
        The PDF and EPUB files you choose are processed only inside your browser. Text recognition (OCR) and building searchable PDFs and EPUBs all happen on
        this device; we do not send the files or the recognized text to our servers or to third parties. {analyticsOn ? "Apart from the website visit statistics below, we" : "We"} collect
        no information that identifies you, no usage logs, and no cookies.
      </p>
      <h2>Translation</h2>
      <p>
        Only when you start a translation is the text of the paragraphs to translate sent to Google Translate (translate-pa.googleapis.com). The file itself is
        not sent. Text sent there is handled under Google&rsquo;s privacy policy. If you don&rsquo;t translate, no text leaves your device.
      </p>
      {analyticsOn && (
        <>
          <h2>Website visit statistics</h2>
          <p>
            The website (ocr.sophonz.com) uses Google Analytics to count visits: the pages viewed, the referring site, approximate region, and browser and device
            type. Google Analytics sets cookies (_ga) to tell repeat visits apart, and the data is handled under Google&rsquo;s privacy policy. It never receives
            your files, their names, the recognized text or translations. The Chrome extension does not use Google Analytics. You can block it in your browser or
            with Google&rsquo;s <a className="underline" href="https://tools.google.com/dlpage/gaoptout">opt-out add-on</a>.
          </p>
        </>
      )}
      <h2>Extension permissions</h2>
      <ul>
        <li>sidePanel: opens the tools in the side panel when you click the toolbar icon. This is the only permission it asks for.</li>
      </ul>
      <p>The extension does not read other websites&rsquo; content, your browsing history, or tab information.</p>
      <h2>Retention</h2>
      <p>Files and translations in progress disappear when you close or reload the page. Only the files you download are kept.</p>
      <h2>Contact</h2>
      <p>INOBS Inc. · {mail}</p>
    </>
  ),
  ko: (
    <>
      <h1>개인정보처리방침</h1>
      <p className="text-zinc-500">시행일 2026년 11월 21일 · 적용 대상: PDF OCR 웹사이트와 Chrome 확장 프로그램</p>
      <h2>처리하는 정보</h2>
      <p>
        사용자가 고른 PDF와 EPUB 파일은 브라우저 안에서만 처리합니다. 텍스트 인식(OCR), 검색 가능한 PDF와 EPUB 만들기는 모두 이 기기에서 일어나며, 파일과 인식한
        텍스트를 저희 서버나 제3자에게 보내지 않습니다. {analyticsOn && "아래의 웹사이트 방문 통계를 제외하면, "}저희는 사용자를 식별하는 정보, 이용 기록, 쿠키를 수집하지 않습니다.
      </p>
      <h2>번역 기능</h2>
      <p>
        사용자가 번역을 시작했을 때만, 번역할 문단의 텍스트를 Google 번역(translate-pa.googleapis.com)으로 보냅니다. 파일 자체는 보내지 않습니다. 보낸 텍스트는 Google의
        개인정보처리방침에 따라 처리됩니다. 번역을 쓰지 않으면 어떤 텍스트도 외부로 나가지 않습니다.
      </p>
      {analyticsOn && (
        <>
          <h2>웹사이트 방문 통계</h2>
          <p>
            웹사이트(ocr.sophonz.com)는 방문 집계를 위해 Google Analytics를 사용합니다. 본 페이지, 유입 경로, 대략적인 지역, 브라우저와 기기 종류가 집계되며, 재방문을
            구분하기 위해 쿠키(_ga)가 저장됩니다. 이 정보는 Google의 개인정보처리방침에 따라 처리됩니다. 파일과 파일 이름, 인식한 텍스트, 번역은 전송되지 않습니다. Chrome
            확장 프로그램은 Google Analytics를 사용하지 않습니다. 브라우저 설정이나 Google의{" "}
            <a className="underline" href="https://tools.google.com/dlpage/gaoptout">차단 부가기능</a>으로 거부할 수 있습니다.
          </p>
        </>
      )}
      <h2>확장 프로그램 권한</h2>
      <ul>
        <li>sidePanel: 툴바 아이콘을 누르면 사이드 패널에 도구를 엽니다. 요청하는 권한은 이것 하나입니다.</li>
      </ul>
      <p>다른 웹사이트의 내용, 방문 기록, 탭 정보는 읽지 않습니다.</p>
      <h2>보관</h2>
      <p>작업 중인 파일과 번역은 페이지를 닫거나 새로 고치면 사라집니다. 저장은 사용자가 내려받은 파일로만 남습니다.</p>
      <h2>문의</h2>
      <p>주식회사 아이놉스(INOBS Inc.) · {mail}</p>
    </>
  ),
};

export default async function Privacy({ params }: PageProps<"/[lang]/privacy">) {
  const lang = (await params).lang as Lang;
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 break-keep px-4 py-10 sm:py-14">
      <SiteHeader lang={lang} />
      <article className="mt-12 space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-zinc-900 dark:[&_h1]:text-zinc-100 [&_h2]:mt-10 [&_h2]:text-base [&_h2]:font-medium [&_h2]:text-zinc-900 dark:[&_h2]:text-zinc-100 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {BODY[lang]}
      </article>
    </main>
  );
}
