// The extension's page: the same tools as the website's /[lang]/tools, shown in Chrome's side panel.
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { TOOLS } from "@/components/site";
import { preferredLang, type Lang } from "@/i18n";
import { I18n } from "@/i18n-context";
import { Tools } from "@/app/tools";
import "./app.css";

const tab = new URLSearchParams(location.search).get("tab");

function App() {
  const [lang, setLang] = useState<Lang>(preferredLang);
  const switchLang = (l: Lang) => {
    document.documentElement.lang = l;
    setLang(l);
  };
  return (
    <I18n lang={lang}>
      <Tools initialTab={TOOLS.find((t) => t === tab) ?? "ocr"} onLang={switchLang} />
    </I18n>
  );
}

document.documentElement.lang = preferredLang();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
