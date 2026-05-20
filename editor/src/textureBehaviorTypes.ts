/**
 * Behavior type strings for texture behaviors the global drop handler knows
 * how to write into. Kept in sync by hand with src/behaviors/*.ts `static type`
 * values. AnimatedRandom and AnimatedSingle are intentionally excluded — they
 * carry extra per-frame data (time, framerate) the user can't supply from a
 * bare image drop. Drops onto their inner texture lists still work via the
 * list-level drop zone in propertyControls.ts.
 */
export const TEXTURE_SINGLE = "textureSingle";
export const TEXTURE_RANDOM = "textureRandom";
export const TEXTURE_ORDERED = "textureOrdered";

export type TextureBehaviorType =
  | typeof TEXTURE_SINGLE
  | typeof TEXTURE_RANDOM
  | typeof TEXTURE_ORDERED;

// Declared as ReadonlyArray<string> so `.includes(t: string)` type-checks
// directly; `satisfies` keeps the compile-time check that the contents are
// valid TextureBehaviorType values.
export const KNOWN_TYPES: ReadonlyArray<string> = [
  TEXTURE_SINGLE,
  TEXTURE_RANDOM,
  TEXTURE_ORDERED,
] satisfies ReadonlyArray<TextureBehaviorType>;

export function isKnownTextureBehaviorType(t: string): t is TextureBehaviorType {
  return KNOWN_TYPES.includes(t);
}
