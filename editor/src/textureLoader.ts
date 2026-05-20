/**
 * Editor-side texture loader and (for dropped files) filename memory.
 *
 * Pixi v8's Texture.from(stringId) is a bare Cache.get lookup — it does not
 * fetch the URL. So for any string the user wants to use as a particle
 * texture (dropped blob: URL, pasted https:// URL, default-config URL), we
 * must load and register it in pixi's Cache ourselves, then notify the
 * PreviewStage to re-apply the config so the now-resolvable texture takes
 * effect.
 *
 * Two entry points:
 *   - addFile(file): the drag-and-drop path. Creates a blob: URL, remembers
 *     the file.name for the export rewriter, and loads.
 *   - ensureLoaded(url): call when a string that *looks like* a URL appears
 *     in the config (user typed it, default config has it, etc.). No-op if
 *     already cached or in flight.
 *
 * Both paths converge on loadIntoCache, which uses <img>.decode() to wait
 * for the bitmap, wraps the HTMLImageElement in a Texture, and registers it
 * under the URL key. Success notifies subscribe() listeners; failures notify
 * subscribeLoadErrors() listeners (and also write to console.warn).
 *
 * No revocation: the editor is a design-time tool, the maps live as long
 * as the page. Memory is bounded by how many distinct textures appear in a
 * single session.
 */

import { Cache, Texture } from "pixi.js";

export type LoadErrorReason = "cors" | "decode" | "other";
export interface LoadErrorInfo {
  url: string;
  reason: LoadErrorReason;
  error: unknown;
}

const nameByUrl = new Map<string, string>();
const subscribers = new Set<() => void>();
const errorSubscribers = new Set<(info: LoadErrorInfo) => void>();
const loadInFlight = new Set<string>();

export function addFile(file: File): string {
  const url = URL.createObjectURL(file);
  nameByUrl.set(url, file.name);
  void loadIntoCache(url);
  return url;
}

export function ensureLoaded(url: string): void {
  if (!url || !isUrlLike(url)) return;
  if (Cache.has(url) || loadInFlight.has(url)) return;
  void loadIntoCache(url);
}

export function nameFor(url: string): string | undefined {
  return nameByUrl.get(url);
}

export function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

export function subscribeLoadErrors(cb: (info: LoadErrorInfo) => void): () => void {
  errorSubscribers.add(cb);
  return () => {
    errorSubscribers.delete(cb);
  };
}

async function loadIntoCache(url: string): Promise<void> {
  if (loadInFlight.has(url) || Cache.has(url)) return;
  loadInFlight.add(url);
  let succeeded = false;
  let errorInfo: LoadErrorInfo | null = null;
  try {
    const img = new Image();
    // crossOrigin is required for WebGL to upload remote textures without
    // tainting the canvas. blob:/data: URLs are same-origin so we skip it.
    if (!url.startsWith("blob:") && !url.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.src = url;
    await img.decode();
    if (!Cache.has(url)) {
      Cache.set(url, Texture.from(img));
      succeeded = true;
    }
  } catch (err) {
    const reason = classifyError(url, err);
    if (reason === "cors") {
      console.warn(
        `[textureLoader] CORS-blocked: ${url} — the server does not send Access-Control-Allow-Origin, so WebGL cannot upload the image. Try a CORS-friendly host or drop the file locally.`,
      );
    } else {
      console.warn(`[textureLoader] failed to load ${url}`, err);
    }
    errorInfo = { url, reason, error: err };
  } finally {
    loadInFlight.delete(url);
  }
  // Notify after loadInFlight is cleared so a subscriber that calls
  // ensureLoaded for the same URL sees the now-cached entry instead of
  // the in-flight guard.
  if (succeeded) {
    for (const cb of subscribers) cb();
  } else if (errorInfo) {
    for (const cb of errorSubscribers) cb(errorInfo);
  }
}

function classifyError(url: string, err: unknown): LoadErrorReason {
  // Browser-behaviour heuristic: Chrome and Firefox both surface CORS-tainted
  // image loads from <img>.decode() as DOMException("EncodingError"). Not
  // spec-guaranteed; if a future engine changes this, the toast message
  // degrades (says "decode failed" instead of "CORS"), not the rendering.
  const isRemote = url.startsWith("http:") || url.startsWith("https:");
  if (isRemote && err instanceof DOMException && err.name === "EncodingError") {
    return "cors";
  }
  if (err instanceof DOMException && err.name === "EncodingError") {
    return "decode";
  }
  return "other";
}

function isUrlLike(s: string): boolean {
  return /^(https?:|blob:|data:)/.test(s);
}
