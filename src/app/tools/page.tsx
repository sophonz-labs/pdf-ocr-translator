import { Suspense } from "react";
import type { Metadata } from "next";
import { TOOLS } from "@/components/site";
import { Tools } from "./tools";

export const metadata: Metadata = { title: "도구 · PDF OCR" };

async function WithTab({ searchParams }: { searchParams: PageProps<"/tools">["searchParams"] }) {
  const tab = (await searchParams).tab;
  return <Tools initialTab={TOOLS.find((t) => t.tab === tab)?.tab ?? "ocr"} />;
}

export default function Page({ searchParams }: PageProps<"/tools">) {
  return (
    <Suspense>
      <WithTab searchParams={searchParams} />
    </Suspense>
  );
}
