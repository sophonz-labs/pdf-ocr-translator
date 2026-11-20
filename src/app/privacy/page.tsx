import type { Metadata } from "next";
import { SiteHeader } from "@/components/site";

export const metadata: Metadata = { title: "개인정보처리방침 · PDF OCR" };

// Linked from the Chrome Web Store listing; keep it in step with what the extension actually does.
export default function Privacy() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 break-keep px-4 py-10 sm:py-14">
      <SiteHeader />
      <article className="mt-12 space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 [&_h2]:mt-10 [&_h2]:text-base [&_h2]:font-medium [&_h2]:text-zinc-900 dark:[&_h2]:text-zinc-100">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">개인정보처리방침</h1>
        <p className="text-zinc-500">시행일 2026년 11월 21일 · 적용 대상: PDF OCR 웹사이트와 Chrome 확장 프로그램</p>

        <h2>처리하는 정보</h2>
        <p>
          사용자가 고른 PDF와 EPUB 파일은 브라우저 안에서만 처리합니다. 텍스트 인식(OCR), 검색 가능한 PDF와 EPUB 만들기는 모두 이 기기에서 일어나며, 파일과 인식한
          텍스트를 저희 서버나 제3자에게 보내지 않습니다. 저희는 사용자를 식별하는 정보, 이용 기록, 쿠키를 수집하지 않습니다.
        </p>

        <h2>번역 기능</h2>
        <p>
          사용자가 번역을 시작했을 때만, 번역할 문단의 텍스트를 Google 번역(translate-pa.googleapis.com)으로 보냅니다. 파일 자체는 보내지 않습니다. 보낸 텍스트는 Google의
          개인정보처리방침에 따라 처리됩니다. 번역을 쓰지 않으면 어떤 텍스트도 외부로 나가지 않습니다.
        </p>

        <h2>확장 프로그램 권한</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>sidePanel: 툴바 아이콘을 누르면 사이드 패널에 도구를 엽니다.</li>
          <li>translate-pa.googleapis.com 접근: 위의 번역 기능에만 씁니다.</li>
        </ul>
        <p>다른 웹사이트의 내용, 방문 기록, 탭 정보는 읽지 않습니다.</p>

        <h2>보관</h2>
        <p>작업 중인 파일과 번역은 페이지를 닫거나 새로 고치면 사라집니다. 저장은 사용자가 내려받은 파일로만 남습니다.</p>

        <h2>문의</h2>
        <p>
          주식회사 아이놉스(INOBS Inc.) ·{" "}
          <a className="underline" href="mailto:contact@sophonz.ai">
            contact@sophonz.ai
          </a>
        </p>
      </article>
    </main>
  );
}
