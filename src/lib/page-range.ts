/** "20-80", "5", "1-3, 10, 12-" → sorted page numbers within 1..total; "" means every page. null when nothing valid is left or the text doesn't parse. */
export function parsePages(spec: string, total: number): number[] | null {
  if (!spec.trim()) return Array.from({ length: total }, (_, i) => i + 1);
  const out = new Set<number>();
  for (const part of spec.replace(/\s*[-–~]\s*/g, "-").split(/[,，\s]+/).filter(Boolean)) {
    const m = /^(\d*)-(\d*)$|^(\d+)$/.exec(part);
    if (!m) return null;
    const from = m[3] ? +m[3] : m[1] ? +m[1] : 1;
    const to = m[3] ? +m[3] : m[2] ? +m[2] : total;
    for (let n = Math.max(1, from); n <= Math.min(total, to); n++) out.add(n);
  }
  return out.size ? [...out].sort((a, b) => a - b) : null;
}
