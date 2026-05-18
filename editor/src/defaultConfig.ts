import type { EmitterConfigV3 } from "../../src/EmitterConfig";

// A dense plasma swirl — particles burst outward from a tiny ring along a
// sine-wave path, decelerating as they cycle white → cyan → magenta → gold →
// deep violet. Additive blend lets overlapping particles bloom into colored
// plasma. Scale values look large because Texture.WHITE is 1×1 — the rendered
// size is scale * 1px, so you need double-digit values to be visible.
export function defaultConfig(): EmitterConfigV3 {
  return {
    lifetime: { min: 1.2, max: 2.2 },
    frequency: 0.002,
    particlesPerWave: 1,
    spawnChance: 1,
    emitterLifetime: -1,
    maxParticles: 1200,
    addAtBack: false,
    pos: { x: 0, y: 0 },
    emit: true,
    autoUpdate: false,
    behaviors: [
      {
        type: "alpha",
        config: {
          alpha: {
            list: [
              { time: 0, value: 0 },
              { time: 0.12, value: 0.9 },
              { time: 1, value: 0 },
            ],
          },
        },
      },
      {
        type: "scale",
        config: {
          scale: {
            list: [
              { time: 0, value: 3 },
              { time: 0.5, value: 10 },
              { time: 1, value: 8 },
            ],
          },
          minMult: 0.6,
        },
      },
      {
        type: "color",
        config: {
          color: {
            list: [
              { time: 0, value: "#ffffff" },
              { time: 0.22, value: "#5cf0ff" },
              { time: 0.5, value: "#ff4cf2" },
              { time: 0.78, value: "#ffb347" },
              { time: 1, value: "#2a0a3d" },
            ],
          },
        },
      },
      {
        type: "movePath",
        config: {
          path: "sin(x / 40) * 55",
          speed: {
            list: [
              { time: 0, value: 260 },
              { time: 1, value: 30 },
            ],
          },
          minMult: 0.7,
        },
      },
      {
        type: "rotationStatic",
        config: { min: 0, max: 360 },
      },
      {
        type: "blendMode",
        config: { blendMode: "add" },
      },
      { type: "textureSingle", config: { texture: "" } },
      {
        type: "spawnShape",
        config: {
          type: "torus",
          data: { x: 0, y: 0, radius: 12, innerRadius: 0, rotation: false },
        },
      },
    ],
  };
}
