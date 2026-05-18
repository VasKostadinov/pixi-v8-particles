import type { EmitterConfigV3 } from "../../src/EmitterConfig";

// A warm-to-cool ember/spark burst — additive blend, fades in then out,
// shrinks over life, randomly aimed from a tiny ring. Looks like a sparkler.
export function defaultConfig(): EmitterConfigV3 {
  return {
    lifetime: { min: 0.6, max: 1.4 },
    frequency: 0.004,
    particlesPerWave: 1,
    spawnChance: 1,
    emitterLifetime: -1,
    maxParticles: 500,
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
              { time: 0.15, value: 1 },
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
              { time: 0, value: 0.9 },
              { time: 1, value: 0.1 },
            ],
          },
          minMult: 0.7,
        },
      },
      {
        type: "color",
        config: {
          color: {
            list: [
              { time: 0, value: "#fff2b3" },
              { time: 0.3, value: "#ffae3c" },
              { time: 0.7, value: "#ff3d6b" },
              { time: 1, value: "#3c1a78" },
            ],
          },
        },
      },
      {
        type: "moveSpeed",
        config: {
          speed: {
            list: [
              { time: 0, value: 180 },
              { time: 1, value: 30 },
            ],
          },
          minMult: 0.6,
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
          data: { x: 0, y: 0, radius: 6, innerRadius: 0, rotation: false },
        },
      },
    ],
  };
}
