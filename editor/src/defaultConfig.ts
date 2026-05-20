import type { EmitterConfigV3 } from "../../src/EmitterConfig";
import { presets } from "./presets";

/**
 * The initial config loaded on editor boot. Delegates to the first preset
 * (Default) so the single source of truth lives in `presets.ts`.
 */
export function defaultConfig(): EmitterConfigV3 {
  return presets[0].build();
}
