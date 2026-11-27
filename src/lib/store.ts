// Work in progress kept in this browser (IndexedDB), so a long OCR run or a translation survives a
// closed tab: opening the same file again picks up where it stopped. Nothing here leaves the device.
// Every call fails quietly (private windows, blocked storage): saving is a convenience, not a promise.
import type { Line } from "@/app/searchable-pdf";
import type { PageLayout } from "./layout.ts";

const DB = "pdf-ocr";
const KEEP_DAYS = 30;
type StoreName = "pages" | "jobs";

/** One finished OCR page. `images`: its pictures by EPUB path. */
export type SavedPage = { status: "done" | "text"; text: string; ms?: number; lines?: Line[]; layout: PageLayout; images: [string, Uint8Array][] };
/** A translation in progress. */
export type SavedJob = { source: string; target: string; mode: "replace" | "both"; tr: (string | undefined)[]; st: string[] };

let db: Promise<IDBDatabase> | null = null;
const req = <T,>(r: IDBRequest<T>) => new Promise<T>((ok, no) => ((r.onsuccess = () => ok(r.result)), (r.onerror = () => no(r.error))));

function open() {
  db ??= new Promise<IDBDatabase>((ok, no) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      for (const s of ["pages", "jobs"]) r.result.createObjectStore(s);
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  }).then(async (d) => {
    // Forget work nobody came back to.
    const old = Date.now() - KEEP_DAYS * 864e5;
    for (const s of ["pages", "jobs"] as const) {
      const tx = d.transaction(s, "readwrite");
      const cur = tx.objectStore(s).openCursor();
      await new Promise<void>((done) => {
        cur.onsuccess = () => {
          const c = cur.result;
          if (!c) return done();
          if ((c.value as { savedAt: number }).savedAt < old) c.delete();
          c.continue();
        };
        cur.onerror = () => done();
      });
    }
    return d;
  });
  return db;
}

async function tx<T>(s: StoreName, mode: IDBTransactionMode, f: (o: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  try {
    return await req(f((await open()).transaction(s, mode).objectStore(s)));
  } catch {
    return undefined;
  }
}

/** A file's identity without reading it: same name, size and modification time. */
export const fileKey = (f: File) => `${f.name}|${f.size}|${f.lastModified}`;

const pageRange = (file: string, lang: string) => IDBKeyRange.bound(`${file}|${lang}|`, `${file}|${lang}|￿`);

export const savePage = (file: string, lang: string, n: number, p: SavedPage) =>
  tx("pages", "readwrite", (o) => o.put({ ...p, savedAt: Date.now() }, `${file}|${lang}|${n}`));

export async function loadPages(file: string, lang: string): Promise<Map<number, SavedPage>> {
  const keys = ((await tx("pages", "readonly", (o) => o.getAllKeys(pageRange(file, lang)))) ?? []) as string[];
  const vals = ((await tx("pages", "readonly", (o) => o.getAll(pageRange(file, lang)))) ?? []) as SavedPage[];
  return new Map(keys.map((k, i) => [Number(k.split("|").at(-1)), vals[i]]));
}

export const clearPages = (file: string, lang: string) => tx("pages", "readwrite", (o) => o.delete(pageRange(file, lang)));

/** A job's identity: its name and the text of its paragraphs. */
export function jobKey(name: string, texts: string[]) {
  let h = 0x811c9dc5;
  for (const t of texts) for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 0x01000193);
  return `${name}|${texts.length}|${(h >>> 0).toString(36)}`;
}

export const saveJob = (key: string, j: SavedJob) => tx("jobs", "readwrite", (o) => o.put({ ...j, savedAt: Date.now() }, key));
export const loadJob = (key: string) => tx("jobs", "readonly", (o) => o.get(key)) as Promise<SavedJob | undefined>;
export const clearJob = (key: string) => tx("jobs", "readwrite", (o) => o.delete(key));
