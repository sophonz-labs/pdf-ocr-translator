import type { ReactNode } from "react";

// Only "/" lives here; it forwards to /en/ or /ko/.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
