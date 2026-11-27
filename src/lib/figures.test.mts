// Run: bun run test
import assert from "node:assert/strict";
import { findFigures, type Box } from "./figures.ts";

// A white page with grey "text" stripes, optional dark rectangles.
function page(W: number, H: number, rects: (Box & { v: number })[]) {
  const data = new Uint8ClampedArray(W * H * 4).fill(250);
  for (const r of rects)
    for (let y = r.y0; y < r.y1; y++)
      for (let x = r.x0; x < r.x1; x++) data.set([r.v, r.v, r.v], (y * W + x) * 4);
  return { data, width: W, height: H };
}
const W = 800;
const H = 1100;
// Text lines: dark stripes whose boxes are reported as recognised text.
const lines: Box[] = Array.from({ length: 20 }, (_, i) => ({ x0: 80, x1: 720, y0: 100 + i * 24, y1: 114 + i * 24 }));
const ink = lines.map((l) => ({ ...l, v: 30 }));

assert.deepEqual(findFigures(page(W, H, ink), lines), [], "text only");

const photo = { x0: 150, y0: 640, x1: 650, y1: 960, v: 90 };
const [fig, ...rest] = findFigures(page(W, H, [...ink, photo]), lines);
assert.equal(rest.length, 0);
for (const k of ["x0", "y0", "x1", "y1"] as const) assert.ok(Math.abs(fig[k] - photo[k]) <= 12, `${k}: ${fig[k]} vs ${photo[k]}`);

// Scan border (dark frame) and a gutter shadow are not pictures.
const frame = [
  { x0: 0, y0: 0, x1: W, y1: 12, v: 20 },
  { x0: 0, y0: H - 12, x1: W, y1: H, v: 20 },
  { x0: 0, y0: 0, x1: 12, y1: H, v: 20 },
  { x0: W - 12, y0: 0, x1: W, y1: H, v: 20 },
  { x0: W - 40, y0: 0, x1: W - 20, y1: H, v: 60 },
];
assert.deepEqual(findFigures(page(W, H, [...ink, ...frame]), lines), [], "borders and shadows");

console.log("figures: ok");
