"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TOOLS, type ToolTab } from "@/components/site";
import { I18n } from "@/i18n-context";
import type { Lang } from "@/i18n";
import { Tools } from "../../tools";

/** The tools page on the web. A language switch swaps the text in place, so OCR or translation in progress survives. */
export function ToolsRoute({ lang: initial }: { lang: Lang }) {
  const [lang, setLang] = useState(initial);
  const switchLang = (l: Lang) => {
    setLang(l);
    document.documentElement.lang = l;
    history.replaceState(null, "", location.pathname.replace(/^\/(en|ko)/, `/${l}`) + location.search);
  };
  const tools = (tab: ToolTab) => <Tools initialTab={tab} onLang={switchLang} />;
  return (
    <I18n lang={lang}>
      {/* The static HTML is the OCR tab; ?tab= is read in the browser. */}
      <Suspense fallback={tools("ocr")}>
        <WithTab render={tools} />
      </Suspense>
    </I18n>
  );
}

function WithTab({ render }: { render: (tab: ToolTab) => React.ReactNode }) {
  const tab = useSearchParams().get("tab");
  useEffect(() => void delete document.documentElement.dataset.tab, []); // React shows the right panel from here on
  return render(TOOLS.find((t) => t === tab) ?? "ocr");
}
