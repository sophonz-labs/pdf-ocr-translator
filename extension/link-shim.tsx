// Stand-in for next/link in the extension build: the site's own pages live on the web, so open them there.
import type { AnchorHTMLAttributes } from "react";

export const SITE = "https://pdf-ocr-pi.vercel.app";

export default function Link({ href, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const url = href.startsWith("/") ? SITE + href : href;
  return <a href={url} target="_blank" rel="noopener" {...rest} />;
}
