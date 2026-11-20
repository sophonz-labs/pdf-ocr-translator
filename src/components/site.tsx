import Link from "next/link";
import type { ReactNode } from "react";
import { AppIcon } from "./brand";

export const TOOLS = [
  { tab: "ocr", label: "PDF OCR", desc: "스캔한 PDF에서 한글·영어 텍스트를 뽑아 검색 가능한 PDF와 문단을 살린 EPUB으로 만듭니다. 만든 EPUB은 그대로 번역 탭으로 이어집니다." },
  { tab: "translate", label: "EPUB 번역", desc: "EPUB을 문단 단위로 번역하고, 한 문단씩 검토하고 고친 뒤 다시 EPUB으로 묶습니다." },
] as const;
export type ToolTab = (typeof TOOLS)[number]["tab"];

export function SiteHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" className="flex items-center gap-2.5" aria-label="PDF OCR 홈">
        <AppIcon size={32} />
        <span className="text-lg font-semibold tracking-tight">PDF OCR</span>
      </Link>
      {right}
    </header>
  );
}
