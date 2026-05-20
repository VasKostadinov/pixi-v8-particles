import type { EmitterConfigV3 } from "../../src/EmitterConfig";
import * as textureLoader from "./textureLoader";
import type { EditorCtx } from "./ctx";
import { attachDropZone } from "./dropZone";
import {
  TEXTURE_RANDOM,
  TEXTURE_SINGLE,
  isKnownTextureBehaviorType,
} from "./textureBehaviorTypes";

/**
 * Attach a drop zone at the editor's workspace root. Inner zones (per-input,
 * per-list) call stopPropagation, so this handler only fires when the user
 * drops onto empty editor chrome.
 *
 * Routing rules (matches the spec):
 *   - Walk config.behaviors for the first behavior whose type is in the
 *     known texture set (excluding the Animated variants — those need
 *     per-frame data the drop alone can't provide).
 *   - textureRandom / textureOrdered → append URLs to config.textures.
 *   - textureSingle → replace config.texture with first URL; toast on extras.
 *   - None found → 1 file adds textureSingle; 2+ files add textureRandom.
 */
export function attachGlobalDrop(
  root: HTMLElement,
  config: EmitterConfigV3,
  ctx: EditorCtx,
): void {
  attachDropZone(root, (files) => {
    if (files.length === 0) {
      ctx.toast("No image files in drop", "info");
      return;
    }

    const urls = files.map((f) => textureLoader.addFile(f));
    const target = findFirstKnownTextureBehavior(config);

    if (!target) {
      // No texture behavior at all — add a fresh one.
      const newBehavior =
        urls.length === 1
          ? { type: TEXTURE_SINGLE, config: { texture: urls[0] } }
          : { type: TEXTURE_RANDOM, config: { textures: urls } };
      config.behaviors.push(newBehavior);
      ctx.notifyStructural();
      ctx.toast(
        urls.length === 1
          ? `Added Single Texture with ${files[0].name}`
          : `Added Random Texture with ${urls.length} images`,
        "ok",
      );
      return;
    }

    if (target.type === TEXTURE_SINGLE) {
      target.config.texture = urls[0];
      ctx.notifyStructural();
      if (urls.length > 1) {
        ctx.toast(
          `Single Texture takes one image — used ${files[0].name}, ignored ${urls.length - 1}`,
          "info",
        );
      } else {
        ctx.toast(`Set Single Texture to ${files[0].name}`, "ok");
      }
      return;
    }

    // textureRandom or textureOrdered — the only remaining options after the
    // textureSingle early-return above. Append to .textures, initialising if
    // needed before notifyStructural so history captures a single mutation.
    const list = [...((target.config.textures as string[] | undefined) ?? []), ...urls];
    target.config.textures = list;
    ctx.notifyStructural();
    ctx.toast(
      `Appended ${urls.length} image(s) to ${target.type === TEXTURE_RANDOM ? "Random" : "Ordered"} Texture`,
      "ok",
    );
  });
}

interface KnownBehavior {
  type: string;
  config: Record<string, unknown> & {
    texture?: string;
    textures?: string[];
  };
}

function findFirstKnownTextureBehavior(config: EmitterConfigV3): KnownBehavior | null {
  for (const b of config.behaviors) {
    if (isKnownTextureBehaviorType(b.type)) {
      return b as unknown as KnownBehavior;
    }
  }
  return null;
}
