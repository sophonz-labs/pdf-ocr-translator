// Chrome's built-in Translator API (Chrome 138+ desktop): the model runs on the device, so the text
// never leaves the browser. Each language pair is a separate download the first time it's used.
type Monitor = { addEventListener(t: "downloadprogress", f: (e: { loaded: number }) => void): void };
type Availability = "unavailable" | "downloadable" | "downloading" | "available";
type Translator = { translate(s: string, o?: { signal?: AbortSignal }): Promise<string>; destroy(): void };
type Detector = { detect(s: string): Promise<{ detectedLanguage: string; confidence: number }[]>; destroy(): void };
type Api<T, O> = { availability(o: O): Promise<Availability>; create(o: O & { monitor?: (m: Monitor) => void; signal?: AbortSignal }): Promise<T> };
type Pair = { sourceLanguage: string; targetLanguage: string };

const api = () => (globalThis as unknown as { Translator?: Api<Translator, Pair> }).Translator;
const detectorApi = () => (globalThis as unknown as { LanguageDetector?: Api<Detector, object> }).LanguageDetector;

export const hasOnDevice = () => !!api();

// Google's codes → BCP 47 as Chrome expects them.
const ALIAS: Record<string, string> = { "zh-CN": "zh", "zh-TW": "zh-Hant", iw: "he", jw: "jv", "pt-PT": "pt" };
export const bcp47 = (code: string) => ALIAS[code] ?? code;

/** The source language of `sample` (a few paragraphs), or null when the detector isn't there or isn't sure. */
async function detect(sample: string, signal?: AbortSignal) {
  const D = detectorApi();
  try {
    if (!D || (await D.availability({})) === "unavailable") return null;
    // create() can still fail ("Model not available") when availability() said otherwise.
    const d = await D.create({ signal });
    const [best] = await d.detect(sample).finally(() => d.destroy());
    return best && best.confidence > 0.5 && best.detectedLanguage !== "und" ? best.detectedLanguage : null;
  } catch (e) {
    if (signal?.aborted) throw e;
    return null;
  }
}

export class OnDeviceError extends Error {
  constructor(public reason: "unsupported" | "detect" | "pair") {
    super(reason);
  }
}

/**
 * A translate function for `translateTexts({ engine })`. `sample` decides the source when it's "auto".
 * `onDownload(0..1)` reports the model download, which happens once per language pair.
 * Call from a click: downloading a model needs a user gesture.
 */
export async function onDeviceEngine(source: string, target: string, sample: string, onDownload: (p: number) => void, signal?: AbortSignal) {
  const T = api();
  if (!T) throw new OnDeviceError("unsupported");
  const from = source === "auto" ? await detect(sample, signal) : bcp47(source);
  if (!from) throw new OnDeviceError("detect");
  const pair = { sourceLanguage: from, targetLanguage: bcp47(target) };
  if ((await T.availability(pair)) === "unavailable") throw new OnDeviceError("pair");
  const tr = await T.create({ ...pair, signal, monitor: (m) => m.addEventListener("downloadprogress", (e) => onDownload(e.loaded)) });
  signal?.addEventListener("abort", () => tr.destroy(), { once: true });
  return (text: string) => tr.translate(text, { signal });
}
