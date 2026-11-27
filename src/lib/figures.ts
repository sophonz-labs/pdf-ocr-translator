// Picture regions on a rendered page: inked areas that the recognised text doesn't account for.
// Tesseract labels pictures as (garbage) text blocks, so it can't tell us; the pixels can.

export type Box = { x0: number; y0: number; x1: number; y1: number };
type Pixels = { data: Uint8ClampedArray; width: number; height: number };

/**
 * `text`: boxes of recognised lines, in pixels. Returns picture boxes in pixels, top to bottom.
 * Ink is anything clearly darker than the paper; text boxes (padded) are masked out; what remains is
 * merged into regions, and only regions large and solid enough to be pictures are kept, not scan
 * borders, gutter shadows, rules or tables (mostly text).
 */
export function findFigures({ data, width: W, height: H }: Pixels, text: Box[], cell = Math.max(4, Math.round(W / 160))): Box[] {
  const gw = Math.ceil(W / cell);
  const gh = Math.ceil(H / cell);
  const luma = (i: number) => (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;

  // Paper: the brightest common tone (90th percentile of a sample).
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4 * 7) hist[luma(i) | 0]++;
  let seen = 0;
  let paper = 255;
  const total = hist.reduce((a, b) => a + b, 0);
  for (let v = 0; v < 256; v++) if ((seen += hist[v]) >= total * 0.9) { paper = v; break; }
  const dark = paper - 50;

  // Share of inked pixels per cell (every other pixel in each direction).
  const ink = new Float32Array(gw * gh);
  for (let y = 0; y < H; y += 2)
    for (let x = 0; x < W; x += 2) if (luma((y * W + x) * 4) < dark) ink[((y / cell) | 0) * gw + ((x / cell) | 0)]++;
  const per = (cell * cell) / 4;
  const on = new Uint8Array(gw * gh);
  for (let k = 0; k < on.length; k++) on[k] = ink[k] / per > 0.06 ? 1 : 0;

  // Mask text, padded by a third of the line height (descenders, accents, underlines).
  const textArea = (b: Box) => (b.x1 - b.x0) * (b.y1 - b.y0);
  for (const t of text) {
    const pad = (t.y1 - t.y0) / 3;
    for (let gy = Math.max(0, ((t.y0 - pad) / cell) | 0); gy <= Math.min(gh - 1, ((t.y1 + pad) / cell) | 0); gy++)
      for (let gx = Math.max(0, ((t.x0 - pad) / cell) | 0); gx <= Math.min(gw - 1, ((t.x1 + pad) / cell) | 0); gx++) on[gy * gw + gx] = 0;
  }

  // Close small gaps (one cell) so a drawing's strokes join into one region.
  const grown = new Uint8Array(on.length);
  for (let gy = 0; gy < gh; gy++)
    for (let gx = 0; gx < gw; gx++)
      if (on[gy * gw + gx])
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const y = gy + dy;
            const x = gx + dx;
            if (y >= 0 && y < gh && x >= 0 && x < gw) grown[y * gw + x] = 1;
          }

  const out: Box[] = [];
  const label = new Int32Array(on.length).fill(-1);
  const queue: number[] = [];
  for (let start = 0; start < grown.length; start++) {
    if (!grown[start] || label[start] >= 0) continue;
    let n = 0;
    let [minX, minY, maxX, maxY] = [gw, gh, 0, 0];
    queue.length = 0;
    queue.push(start);
    label[start] = start;
    while (queue.length) {
      const k = queue.pop()!;
      const x = k % gw;
      const y = (k / gw) | 0;
      n++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      for (const j of [k - 1, k + 1, k - gw, k + gw]) {
        if (j < 0 || j >= grown.length || label[j] >= 0 || !grown[j]) continue;
        if ((j === k - 1 && x === 0) || (j === k + 1 && x === gw - 1)) continue;
        label[j] = start;
        queue.push(j);
      }
    }
    const b = { x0: minX * cell, y0: minY * cell, x1: Math.min(W, (maxX + 1) * cell), y1: Math.min(H, (maxY + 1) * cell) };
    const w = b.x1 - b.x0;
    const h = b.y1 - b.y0;
    const fill = n / ((maxX - minX + 1) * (maxY - minY + 1));
    const touches = minX <= 1 || minY <= 1 || maxX >= gw - 2 || maxY >= gh - 2;
    if (w * h < W * H * 0.015 || Math.min(w, h) < W * 0.06) continue; // specks, ornaments, rules
    if (Math.max(w, h) / Math.min(w, h) > 12) continue; // strips: gutter shadows, borders
    if (fill < 0.3) continue; // frames and scattered marks
    if (touches && (w < W * 0.2 || h < H * 0.2)) continue; // scan edges
    const inside = text.reduce((s, t) => s + Math.max(0, Math.min(t.x1, b.x1) - Math.max(t.x0, b.x0)) * Math.max(0, Math.min(t.y1, b.y1) - Math.max(t.y0, b.y0)), 0);
    if (inside > textArea(b) * 0.35) continue; // mostly text: a table or a text box
    out.push(b);
  }
  return out.sort((a, b) => a.y0 - b.y0);
}
