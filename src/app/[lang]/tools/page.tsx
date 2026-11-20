import type { Metadata } from "next";
import { DICT, type Lang } from "@/i18n";
import { ToolsRoute } from "./route-client";

export async function generateMetadata({ params }: PageProps<"/[lang]/tools">): Promise<Metadata> {
  return { title: DICT[(await params).lang as Lang].meta.tools };
}

export default async function Page({ params }: PageProps<"/[lang]/tools">) {
  return <ToolsRoute lang={(await params).lang as Lang} />;
}
