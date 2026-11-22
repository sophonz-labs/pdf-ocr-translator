import Script from "next/script";

// Google Analytics 4 on the website only (the extension build never includes it). Off unless the build sets NEXT_PUBLIC_GA_ID.
const GA = process.env.NEXT_PUBLIC_GA_ID;

export function Analytics() {
  if (!GA) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA}`} strategy="afterInteractive" />
      <Script id="ga" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config",${JSON.stringify(GA)})`}
      </Script>
    </>
  );
}

export const analyticsOn = Boolean(GA);
