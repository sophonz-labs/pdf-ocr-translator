// The extension's page: the same tools as the website's /tools, shown in Chrome's side panel (or a tab).
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TOOLS } from "@/components/site";
import { Tools } from "@/app/tools/tools";
import "./app.css";

const tab = new URLSearchParams(location.search).get("tab");
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Tools initialTab={TOOLS.find((t) => t.tab === tab)?.tab ?? "ocr"} />
  </StrictMode>,
);
