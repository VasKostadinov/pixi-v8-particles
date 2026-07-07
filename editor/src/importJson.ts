import JSON5 from "json5";
import type { EmitterConfigV3 } from "../../src/EmitterConfig";

export type ParseResult = { ok: true; config: EmitterConfigV3 } | { ok: false; error: string };

export function parseImport(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Empty input" };

  // JSON5 accepts strict JSON plus JS-object-literal conveniences (unquoted
  // keys, single quotes, trailing commas, comments) so pasted configs import
  // without hand-editing.
  let parsed: unknown;
  try {
    parsed = JSON5.parse(trimmed);
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Root must be a JSON object" };
  }

  const o = parsed as Record<string, unknown>;
  if (!o.lifetime || typeof o.lifetime !== "object") {
    return { ok: false, error: "Missing 'lifetime' object" };
  }
  const life = o.lifetime as Record<string, unknown>;
  if (typeof life.min !== "number" || typeof life.max !== "number") {
    return { ok: false, error: "'lifetime' must have numeric 'min' and 'max'" };
  }
  if (typeof o.frequency !== "number") {
    return { ok: false, error: "Missing numeric 'frequency'" };
  }
  if (!o.pos || typeof o.pos !== "object") {
    return { ok: false, error: "Missing 'pos' object" };
  }
  const pos = o.pos as Record<string, unknown>;
  if (typeof pos.x !== "number" || typeof pos.y !== "number") {
    return { ok: false, error: "'pos' must have numeric 'x' and 'y'" };
  }
  if (!Array.isArray(o.behaviors)) {
    return { ok: false, error: "Missing 'behaviors' array (V3 format required)" };
  }
  for (let i = 0; i < o.behaviors.length; i++) {
    const b = o.behaviors[i];
    if (!b || typeof b !== "object" || typeof (b as { type?: unknown }).type !== "string") {
      return { ok: false, error: `behaviors[${i}] must have a string 'type'` };
    }
  }

  return { ok: true, config: parsed as EmitterConfigV3 };
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsText(file);
  });
}
