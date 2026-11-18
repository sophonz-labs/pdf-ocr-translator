import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, popGraphicsState, pushGraphicsState, setCharacterSqueeze, setTextRenderingMode, TextRenderingMode } from "pdf-lib";

/** A recognized line of text in PDF user-space points (origin bottom-left). */
export type Line = { text: string; x: number; y: number; w: number; h: number };

/**
 * Returns a copy of the original PDF with an invisible text layer over each OCR'd page,
 * so the pages look unchanged but can be searched, selected and copied.
 */
export async function buildSearchablePdf(original: ArrayBuffer, lines: Map<number, Line[]>): Promise<Uint8Array> {
  const doc = await PDFDocument.load(original, { ignoreEncryption: true });
  doc.registerFontkit(fontkit);
  // NanumGothic covers Hangul and Latin; subset keeps only the glyphs actually used.
  const fontBytes = await fetch("/fonts/NanumGothic-Regular.ttf").then((r) => r.arrayBuffer());
  const font = await doc.embedFont(fontBytes, { subset: true });
  const pages = doc.getPages();

  for (const [n, list] of lines) {
    const page = pages[n - 1];
    page.pushOperators(pushGraphicsState(), setTextRenderingMode(TextRenderingMode.Invisible));
    for (const { text, x, y, w, h } of list) {
      const unit = font.widthOfTextAtSize(text, 1);
      if (!unit || w <= 0) continue;
      // Font size from the line height (so heading sizes survive re-reading the PDF),
      // then squeeze horizontally to the box width so selection lines up with the image.
      const size = h * 0.8;
      try {
        page.pushOperators(setCharacterSqueeze((w / (unit * size)) * 100));
        page.drawText(text, { x, y: y + h * 0.18, size, font });
      } catch {
        // Glyph not in the font: skip that line rather than failing the whole export.
      }
    }
    page.pushOperators(popGraphicsState());
  }
  return doc.save();
}
