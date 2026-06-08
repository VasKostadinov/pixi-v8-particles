import {
  Application,
  Cache,
  Container,
  ParticleContainer,
  Sprite,
  Texture,
  type Ticker,
} from "pixi.js";
import { Emitter } from "../../src/Emitter";
import type { EmitterConfigV3 } from "../../src/EmitterConfig";

export class PreviewStage {
  private parent: Container;
  private emitter: Emitter | null = null;
  private followMouse = false;
  private mouseLocal: { x: number; y: number } | null = null;
  private currentConfig: EmitterConfigV3 | null = null;
  private timeScale = 1;
  private bgSprite: Sprite | null = null;

  constructor(private app: Application) {
    this.parent = new ParticleContainer();
    app.stage.addChild(this.parent);
    this.relayout();
    app.ticker.add((time: Ticker) => {
      try {
        // Scale the emitter's clock for slow-mo / fast-forward. At 0 the emitter
        // advances by zero each frame (frozen: no movement, no new spawns) while
        // already-alive particles stay on screen.
        this.update(time.deltaMS * 0.001 * this.timeScale);
      } catch (err) {
        console.error("emitter update failed", err);
      }
    });
    window.addEventListener("resize", () => this.relayout());

    const canvas = app.canvas;
    canvas.addEventListener("pointermove", (e) => {
      const rect = canvas.getBoundingClientRect();
      // Convert client coords → parent-local coords (parent is centered).
      this.mouseLocal = {
        x: e.clientX - rect.left - this.app.renderer.width * 0.5,
        y: e.clientY - rect.top - this.app.renderer.height * 0.5,
      };
    });
    canvas.addEventListener("pointerleave", () => {
      this.mouseLocal = null;
    });
  }

  relayout() {
    this.parent.x = this.app.renderer.width * 0.5;
    this.parent.y = this.app.renderer.height * 0.5;
    if (this.bgSprite) {
      this.bgSprite.x = this.app.renderer.width * 0.5;
      this.bgSprite.y = this.app.renderer.height * 0.5;
    }
  }

  setTimeScale(scale: number) {
    this.timeScale = scale;
  }

  getTimeScale(): number {
    return this.timeScale;
  }

  /**
   * Set or clear the centered, non-stretched preview background image. The image
   * is a pixi Sprite kept at the bottom of app.stage (behind the particle parent)
   * so it composites correctly in every bg mode — including "solid", where the
   * canvas is opaque and a CSS-div backdrop would be occluded. Passing null
   * removes the sprite (but not the texture, which main.ts owns).
   */
  setBackgroundImage(texture: Texture | null) {
    if (!texture) {
      if (this.bgSprite) {
        this.app.stage.removeChild(this.bgSprite);
        this.bgSprite.destroy(); // sprite only — leaves the texture intact
        this.bgSprite = null;
      }
      return;
    }
    if (!this.bgSprite) {
      this.bgSprite = new Sprite(texture);
      this.bgSprite.anchor.set(0.5);
    } else {
      this.bgSprite.texture = texture;
    }
    this.bgSprite.scale.set(1); // non-stretched: native pixel size
    this.app.stage.addChildAt(this.bgSprite, 0); // keep behind the particle parent
    this.relayout();
  }

  setFollowMouse(on: boolean) {
    this.followMouse = on;
    if (!on && this.emitter && this.currentConfig) {
      const pos = this.currentConfig.pos ?? { x: 0, y: 0 };
      this.emitter.updateSpawnPos(pos.x, pos.y);
    }
  }

  applyConfig(config: EmitterConfigV3) {
    if (this.emitter) {
      this.emitter.destroy();
      this.emitter = null;
    }
    const resolved = prepareForRuntime(config);
    this.currentConfig = resolved;
    this.rebuildParent(resolved);
    try {
      this.emitter = new Emitter(this.parent, resolved);
    } catch (err) {
      console.warn("Invalid emitter config", err);
      this.emitter = null;
    }
  }

  /**
   * Rebuild the particle parent from scratch on every config apply. The backend
   * depends on the config: a non-normal blend mode (or anything else listed in
   * needsSpriteBackend) needs a plain Container with Sprite-based particles,
   * because pixi v8's ParticleContainer can't render per-particle blend modes
   * and samples a single shared texture latched from the first particle (with
   * its blend derived from that one texture's premultiply mode), which renders
   * blended emitters incorrectly. Otherwise we use the fast ParticleContainer.
   *
   * We recreate rather than reuse so no latched ParticleContainer state survives
   * a rebuild — most importantly the shared texture, which would otherwise stay
   * pinned to Texture.WHITE if the first particle spawned before its image
   * finished loading. The emitter is already torn down and recreated each apply,
   * so a fresh container is cheap and keeps the two in lockstep.
   */
  private rebuildParent(config: EmitterConfigV3) {
    const wantSpritePath = needsSpriteBackend(config);
    this.app.stage.removeChild(this.parent);
    this.parent.destroy({ children: true });
    this.parent = wantSpritePath ? new Container() : new ParticleContainer();
    this.app.stage.addChild(this.parent);
    if (this.bgSprite) this.app.stage.setChildIndex(this.bgSprite, 0);
    this.relayout();
  }

  private update(deltaSec: number) {
    if (this.emitter) {
      if (this.followMouse && this.mouseLocal) {
        this.emitter.updateSpawnPos(this.mouseLocal.x, this.mouseLocal.y);
      }
      this.emitter.update(deltaSec);
    }
  }

  particleCount(): number {
    const e = this.emitter as unknown as { particleCount?: number } | null;
    return e?.particleCount ?? 0;
  }
}

/* ------------------------------------------------------------------ */
/* Editor-state → emitter-ready config:                               */
/*   - resolve texture strings to Texture instances                    */
/*   - normalize ValueLists so the runtime can't trip on edge cases    */
/* ------------------------------------------------------------------ */
function needsSpriteBackend(config: EmitterConfigV3): boolean {
  // ParticleContainer (the v8 fast path) batches against a single TextureSource
  // and ignores per-particle blendMode. Three situations require switching to a
  // plain Container with Sprite-based particles:
  //   - any non-normal blend mode. ParticleContainer derives its blend from a
  //     single shared texture latched from the first particle, so "add"/"screen"
  //     don't reliably remove black backgrounds the way per-Sprite blend does.
  //   - multiple textures loaded as separate sources (no atlas in the editor),
  //     where ParticleContainer would clamp to one source and render only one
  //     of the textures regardless of which the behavior assigned.
  for (const b of config.behaviors) {
    if (b.type === "blendMode") {
      const cfg = b.config as { blendMode?: string } | undefined;
      if (cfg?.blendMode && cfg.blendMode !== "normal") return true;
    }
    if (b.type === "textureRandom" || b.type === "textureOrdered") {
      const textures = (b.config as { textures?: unknown[] } | undefined)?.textures;
      if (textures && textures.length > 1) return true;
    }
    if (b.type === "animatedSingle" || b.type === "animatedRandom") {
      return true;
    }
  }
  return false;
}

function prepareForRuntime(config: EmitterConfigV3): EmitterConfigV3 {
  const cloned: EmitterConfigV3 = {
    ...config,
    behaviors: config.behaviors.map((b) => ({
      ...b,
      config: normalizeBehaviorConfig(b.type, b.config),
    })),
  };
  return cloned;
}

const VALUE_LIST_KEYS_BY_TYPE: Record<string, string[]> = {
  alpha: ["alpha"],
  color: ["color"],
  scale: ["scale"],
  moveSpeed: ["speed"],
  movePath: ["speed"],
};

function normalizeBehaviorConfig(type: string, src: unknown): Record<string, unknown> {
  const cfg: Record<string, unknown> = { ...(src as object) };

  // textures
  if (type === "textureSingle") {
    cfg.texture = stringToTexture(cfg.texture);
  } else if (type === "textureRandom" || type === "textureOrdered") {
    const arr = (cfg.textures ?? []) as unknown[];
    const resolved = arr.map((t) => stringToTexture(t));
    cfg.textures = resolved.length > 0 ? resolved : [Texture.WHITE];
  }

  // value lists
  const listKeys = VALUE_LIST_KEYS_BY_TYPE[type];
  if (listKeys) {
    for (const key of listKeys) {
      const list = cfg[key] as ValueListLike | undefined;
      if (list && Array.isArray(list.list)) cfg[key] = normalizeValueList(list);
    }
  }

  return cfg;
}

interface ValueListLike {
  list: { time: number; value: unknown }[];
  isStepped?: boolean;
}

function normalizeValueList(list: ValueListLike): ValueListLike {
  const sorted = [...list.list].sort((a, b) => a.time - b.time);
  if (sorted.length === 0) return list;

  // Clamp times into [0, 1] and anchor first=0 / last>=1 so the runtime's
  // interpolator never walks past the end of the chain.
  const stops = sorted.map((s) => ({
    time: Math.max(0, Math.min(1, s.time)),
    value: s.value,
  }));
  if (stops[0].time > 0) stops.unshift({ time: 0, value: stops[0].value });
  if (stops[stops.length - 1].time < 1) {
    stops.push({ time: 1, value: stops[stops.length - 1].value });
  }
  // The runtime collapses a 2-stop list to a single node when both values are
  // equal, then trips its own complex interpolator. Force a 3rd stop so the
  // chain is always well-formed.
  if (stops.length === 2 && stops[0].value === stops[1].value) {
    stops.push({ time: 1, value: stops[1].value });
  }

  return { ...list, list: stops };
}

function stringToTexture(t: unknown): Texture {
  if (t instanceof Texture) return t;
  if (typeof t === "string" && t.trim()) {
    // Texture.from(string) is a bare Cache.get() in pixi v8 — it warns and
    // returns undefined on miss. Check first so a not-yet-loaded URL falls
    // back quietly to WHITE; textureLoader will re-apply once it lands.
    if (!Cache.has(t)) return Texture.WHITE;
    try {
      return Texture.from(t) ?? Texture.WHITE;
    } catch {
      return Texture.WHITE;
    }
  }
  return Texture.WHITE;
}
