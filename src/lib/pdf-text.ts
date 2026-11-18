import type { PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { linesFromItems, type Item, type TextLine } from "./layout.ts";

type TextContent = Awaited<ReturnType<PDFPageProxy["getTextContent"]>>;
type FontInfo = { name?: string; fallbackName?: string; bold?: boolean; black?: boolean; italic?: boolean };

const BOLD = /bold|black|heavy|semibold|demi/i;
const ITALIC = /italic|oblique|-it\b/i;

/** Positioned lines (with bold/italic) from a page's existing text layer. Needs `fontExtraProperties` for font names. */
export async function textLayerLines(page: PDFPageProxy, tc: TextContent): Promise<TextLine[]> {
  // Font objects reach the main thread only once the page's operator list has been built.
  await page.getOperatorList();
  const vp = page.getViewport({ scale: 1 });
  const styles = new Map<string, { bold: boolean; italic: boolean }>();
  const style = (id: string) => {
    let s = styles.get(id);
    if (!s) {
      const f: FontInfo | null = page.commonObjs.has(id) ? page.commonObjs.get(id) : null;
      const name = `${f?.name ?? ""} ${f?.fallbackName ?? ""}`;
      s = { bold: !!(f?.bold || f?.black) || BOLD.test(name), italic: !!f?.italic || ITALIC.test(name) };
      styles.set(id, s);
    }
    return s;
  };

  const items: Item[] = [];
  for (const it of tc.items) {
    if (!("str" in it)) continue;
    const [a, b, c, d, e, f] = it.transform as number[];
    const width = Math.hypot(a, b) || 1;
    // Glyph height perpendicular to the baseline, so a skewed (synthetic italic) run keeps its real size.
    const size = Math.abs(a * d - b * c) / width;
    const skew = (a * c + b * d) / (width * (size || 1));
    const [x, y] = vp.convertToViewportPoint(e, f);
    const s = style(it.fontName);
    items.push({ text: it.str, x, y, w: it.width, size, bold: s.bold, italic: s.italic || skew > 0.12 });
  }
  return linesFromItems(items);
}
