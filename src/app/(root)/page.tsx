import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "PDF OCR · sophonz labs" };

// Static hosting has no server redirect: pick the saved language (default English) in the browser.
const forward = `var l="en";try{if(localStorage.getItem("lang")==="ko")l="ko"}catch(e){}location.replace("/"+l+"/"+location.search+location.hash)`;

export default function Root() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: forward }} />
      <noscript>
        <Link href="/en/">English</Link> · <Link href="/ko/">한국어</Link>
      </noscript>
    </>
  );
}
