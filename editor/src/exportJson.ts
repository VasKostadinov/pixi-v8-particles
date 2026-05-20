import type { EmitterConfigV3 } from "../../src/EmitterConfig";
import * as textureLoader from "./textureLoader";

export interface ExportResult {
  json: string;
  /** Count of blob: URLs that were rewritten to filenames. */
  replacedCount: number;
}

export function exportConfig(config: EmitterConfigV3): ExportResult {
  const clone = JSON.parse(JSON.stringify(config)) as unknown;
  let replacedCount = 0;

  const walk = (node: unknown): unknown => {
    if (typeof node === "string") {
      // Only blob: URLs get rewritten — the loader only remembers filenames
      // for dropped files. http(s):/data: URLs are kept verbatim; data: URLs
      // in particular round-trip as-is (no filename meaning, exported as
      // their full base64 payload).
      if (node.startsWith("blob:")) {
        const name = textureLoader.nameFor(node);
        if (name) {
          replacedCount++;
          return name;
        }
      }
      return node;
    }
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) node[i] = walk(node[i]);
      return node;
    }
    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      for (const k of Object.keys(obj)) obj[k] = walk(obj[k]);
      return obj;
    }
    return node;
  };

  const rewritten = walk(clone);
  return {
    json: JSON.stringify(rewritten, null, 2),
    replacedCount,
  };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadJson(text: string, filename = "emitter.json"): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
