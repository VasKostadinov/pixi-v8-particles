import {
  Application,
  Container,
  ParticleContainer,
  Texture,
  type Ticker,
} from "pixi.js";
import { Emitter } from "../../src/Emitter";
import type { EmitterConfigV3 } from "../../src/EmitterConfig";

export class PreviewStage {
  private parent: Container;
  private emitter: Emitter | null = null;

  constructor(private app: Application) {
    this.parent = new ParticleContainer();
    app.stage.addChild(this.parent);
    this.relayout();
    app.ticker.add((time: Ticker) => this.update(time.deltaMS * 0.001));
    window.addEventListener("resize", () => this.relayout());
  }

  relayout() {
    this.parent.x = this.app.renderer.width * 0.5;
    this.parent.y = this.app.renderer.height * 0.5;
  }

  applyConfig(config: EmitterConfigV3) {
    if (this.emitter) {
      this.emitter.destroy();
      this.emitter = null;
    }
    const resolved = prepareForRuntime(config);
    this.ensureParentFor(resolved);
    try {
      this.emitter = new Emitter(this.parent, resolved);
    } catch (err) {
      console.warn("Invalid emitter config", err);
      this.emitter = null;
    }
  }

  /**
   * ParticleContainer can't render per-particle blend modes. If the config needs one,
   * fall back to a plain Container (Sprite-based Particle path); otherwise keep the
   * fast ParticleContainer.
   */
  private ensureParentFor(config: EmitterConfigV3) {
    const wantSpritePath = needsSpriteBackend(config);
    const isParticleContainer = this.parent instanceof ParticleContainer;
    if (wantSpritePath === !isParticleContainer) return;

    this.app.stage.removeChild(this.parent);
    this.parent.destroy({ children: true });
    this.parent = wantSpritePath ? new Container() : new ParticleContainer();
    this.app.stage.addChild(this.parent);
    this.relayout();
  }

  private update(deltaSec: number) {
    if (this.emitter) this.emitter.update(deltaSec);
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
  const blend = config.behaviors.find((b) => b.type === "blendMode");
  const mode = (blend?.config as { blendMode?: string } | undefined)?.blendMode;
  return !!mode && mode !== "normal";
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

function normalizeBehaviorConfig(
  type: string,
  src: unknown,
): Record<string, unknown> {
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
    try {
      return Texture.from(t);
    } catch {
      return Texture.WHITE;
    }
  }
  return Texture.WHITE;
}
