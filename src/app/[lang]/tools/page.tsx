import type { Metadata } from "next";
import type { Lang } from "@/i18n";
import { pageMeta } from "../../og";
import { ToolsRoute } from "./route-client";

export async function generateMetadata({ params }: PageProps<"/[lang]/tools">): Promise<Metadata> {
  return pageMeta((await params).lang as Lang, "tools");
}

export default async function Page({ params }: PageProps<"/[lang]/tools">) {
  return <ToolsRoute lang={(await params).lang as Lang} />;
}
