import type { EmitterConfigV3 } from "../../src/EmitterConfig";

export type Preset = {
  /** Stable kebab-case id, e.g. "plasma-swirl". */
  id: string;
  /** Human-readable label shown in the UI. */
  name: string;
  /** Builds a fresh config object. Always returns a new instance — never share refs. */
  build(): EmitterConfigV3;
};

export const presets: Preset[] = [
  {
    id: "default",
    name: "Default",
    build: () => ({
      lifetime: { min: 1.5, max: 2.5 },
      frequency: 0.02,
      particlesPerWave: 1,
      spawnChance: 1,
      emitterLifetime: -1,
      maxParticles: 300,
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
                { time: 0.2, value: 1 },
                { time: 0.8, value: 1 },
                { time: 1, value: 0 },
              ],
            },
          },
        },
        { type: "scaleStatic", config: { min: 5, max: 8 } },
        { type: "colorStatic", config: { color: "#ffffff" } },
        {
          type: "moveSpeed",
          config: {
            speed: {
              list: [
                { time: 0, value: 60 },
                { time: 1, value: 30 },
              ],
            },
            minMult: 0.8,
          },
        },
        { type: "rotationStatic", config: { min: 0, max: 360 } },
        { type: "textureSingle", config: { texture: "" } },
        {
          type: "spawnShape",
          config: {
            type: "torus",
            data: { x: 0, y: 0, radius: 8, innerRadius: 0, rotation: false },
          },
        },
      ],
    }),
  },
  {
    id: "plasma-swirl",
    name: "Plasma Swirl",
    build: () => ({
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
        { type: "rotationStatic", config: { min: 0, max: 360 } },
        { type: "blendMode", config: { blendMode: "add" } },
        { type: "textureSingle", config: { texture: "" } },
        {
          type: "spawnShape",
          config: {
            type: "torus",
            data: { x: 0, y: 0, radius: 12, innerRadius: 0, rotation: false },
          },
        },
      ],
    }),
  },
  {
    id: "fountain",
    name: "Fountain",
    build: () => ({
      lifetime: { min: 1.4, max: 2.6 },
      frequency: 0.004,
      particlesPerWave: 1,
      spawnChance: 1,
      emitterLifetime: -1,
      maxParticles: 800,
      addAtBack: false,
      pos: { x: 0, y: 120 },
      emit: true,
      autoUpdate: false,
      behaviors: [
        {
          type: "alpha",
          config: {
            alpha: {
              list: [
                { time: 0, value: 0 },
                { time: 0.1, value: 1 },
                { time: 0.9, value: 0.9 },
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
                { time: 0, value: 4 },
                { time: 1, value: 3 },
              ],
            },
            minMult: 0.8,
          },
        },
        {
          type: "color",
          config: {
            color: {
              list: [
                { time: 0, value: "#e8f9ff" },
                { time: 0.5, value: "#5cb8ff" },
                { time: 1, value: "#1a4d99" },
              ],
            },
          },
        },
        {
          type: "moveAcceleration",
          config: {
            accel: { x: 0, y: 520 },
            minStart: 320,
            maxStart: 420,
            rotate: false,
          },
        },
        { type: "rotationStatic", config: { min: 250, max: 290 } },
        { type: "blendMode", config: { blendMode: "add" } },
        { type: "textureSingle", config: { texture: "" } },
        {
          type: "spawnShape",
          config: {
            type: "torus",
            data: { x: 0, y: 0, radius: 8, innerRadius: 0, rotation: false },
          },
        },
      ],
    }),
  },
  {
    id: "rain",
    name: "Rain",
    build: () => ({
      lifetime: { min: 1.0, max: 1.4 },
      frequency: 0.005,
      particlesPerWave: 1,
      spawnChance: 1,
      emitterLifetime: -1,
      maxParticles: 1500,
      addAtBack: false,
      pos: { x: 0, y: 0 },
      emit: true,
      autoUpdate: false,
      behaviors: [
        { type: "alphaStatic", config: { alpha: 0.7 } },
        { type: "scaleStatic", config: { min: 2, max: 4 } },
        { type: "colorStatic", config: { color: "#a8c8e0" } },
        {
          type: "moveAcceleration",
          config: {
            accel: { x: 0, y: 200 },
            minStart: 600,
            maxStart: 750,
            rotate: false,
          },
        },
        { type: "rotationStatic", config: { min: 88, max: 92 } },
        { type: "rotationVelocity", config: { offset: 0 } },
        { type: "textureSingle", config: { texture: "" } },
        {
          type: "spawnShape",
          config: {
            type: "rect",
            data: { x: -400, y: -300, w: 800, h: 20 },
          },
        },
      ],
    }),
  },
  {
    id: "sparks",
    name: "Sparks",
    build: () => ({
      lifetime: { min: 0.6, max: 1.4 },
      frequency: 0.003,
      particlesPerWave: 1,
      spawnChance: 1,
      emitterLifetime: -1,
      maxParticles: 800,
      addAtBack: false,
      pos: { x: 0, y: 60 },
      emit: true,
      autoUpdate: false,
      behaviors: [
        {
          type: "alpha",
          config: {
            alpha: {
              list: [
                { time: 0, value: 1 },
                { time: 0.7, value: 1 },
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
                { time: 1, value: 1 },
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
                { time: 0, value: "#fff8e1" },
                { time: 0.3, value: "#ffcc4a" },
                { time: 0.7, value: "#ff5722" },
                { time: 1, value: "#3a0000" },
              ],
            },
          },
        },
        {
          type: "moveAcceleration",
          config: {
            accel: { x: 0, y: 600 },
            minStart: 200,
            maxStart: 500,
            maxSpeed: 900,
            rotate: false,
          },
        },
        { type: "rotationStatic", config: { min: 240, max: 300 } },
        { type: "rotationVelocity", config: { offset: 0 } },
        { type: "blendMode", config: { blendMode: "add" } },
        { type: "textureSingle", config: { texture: "" } },
        {
          type: "spawnShape",
          config: {
            type: "torus",
            data: { x: 0, y: 0, radius: 4, innerRadius: 0, rotation: false },
          },
        },
      ],
    }),
  },
  {
    id: "fire",
    name: "Fire",
    build: () => ({
      lifetime: { min: 0.8, max: 1.5 },
      frequency: 0.005,
      particlesPerWave: 1,
      spawnChance: 1,
      emitterLifetime: -1,
      maxParticles: 600,
      addAtBack: false,
      pos: { x: 0, y: 80 },
      emit: true,
      autoUpdate: false,
      behaviors: [
        {
          type: "alpha",
          config: {
            alpha: {
              list: [
                { time: 0, value: 0 },
                { time: 0.15, value: 0.9 },
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
                { time: 0, value: 8 },
                { time: 0.5, value: 14 },
                { time: 1, value: 6 },
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
                { time: 0, value: "#fff7c2" },
                { time: 0.3, value: "#ffa524" },
                { time: 0.7, value: "#d6280a" },
                { time: 1, value: "#2a0000" },
              ],
            },
          },
        },
        {
          type: "moveAcceleration",
          config: {
            accel: { x: 0, y: -50 },
            minStart: 120,
            maxStart: 180,
            rotate: false,
          },
        },
        { type: "rotationStatic", config: { min: 265, max: 275 } },
        { type: "blendMode", config: { blendMode: "add" } },
        { type: "textureSingle", config: { texture: "" } },
        {
          type: "spawnShape",
          config: {
            type: "torus",
            data: { x: 0, y: 0, radius: 30, innerRadius: 0, rotation: false },
          },
        },
      ],
    }),
  },
  {
    id: "smoke",
    name: "Smoke",
    build: () => ({
      lifetime: { min: 2.5, max: 4.0 },
      frequency: 0.04,
      particlesPerWave: 1,
      spawnChance: 1,
      emitterLifetime: -1,
      maxParticles: 200,
      addAtBack: false,
      pos: { x: 0, y: 80 },
      emit: true,
      autoUpdate: false,
      behaviors: [
        {
          type: "alpha",
          config: {
            alpha: {
              list: [
                { time: 0, value: 0 },
                { time: 0.2, value: 0.5 },
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
                { time: 0, value: 6 },
                { time: 1, value: 30 },
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
                { time: 0, value: "#777777" },
                { time: 1, value: "#333333" },
              ],
            },
          },
        },
        {
          type: "moveSpeed",
          config: {
            speed: {
              list: [
                { time: 0, value: 80 },
                { time: 1, value: 30 },
              ],
            },
            minMult: 0.8,
          },
        },
        { type: "rotationStatic", config: { min: 255, max: 285 } },
        { type: "textureSingle", config: { texture: "" } },
        {
          type: "spawnShape",
          config: {
            type: "torus",
            data: { x: 0, y: 0, radius: 10, innerRadius: 0, rotation: false },
          },
        },
      ],
    }),
  },
  {
    id: "snow",
    name: "Snow",
    build: () => ({
      lifetime: { min: 4, max: 7 },
      frequency: 0.08,
      particlesPerWave: 1,
      spawnChance: 1,
      emitterLifetime: -1,
      maxParticles: 300,
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
                { time: 0.85, value: 1 },
                { time: 1, value: 0 },
              ],
            },
          },
        },
        { type: "scaleStatic", config: { min: 1.5, max: 4 } },
        { type: "colorStatic", config: { color: "#ffffff" } },
        {
          type: "movePath",
          config: {
            path: "sin(x / 30) * 20",
            speed: {
              list: [
                { time: 0, value: 80 },
                { time: 1, value: 80 },
              ],
            },
            minMult: 0.7,
          },
        },
        { type: "rotationStatic", config: { min: 88, max: 92 } },
        { type: "textureSingle", config: { texture: "" } },
        {
          type: "spawnShape",
          config: {
            type: "rect",
            data: { x: -400, y: -300, w: 800, h: 20 },
          },
        },
      ],
    }),
  },
  {
    id: "confetti",
    name: "Confetti",
    build: () => ({
      lifetime: { min: 2, max: 3.5 },
      frequency: 0.02,
      particlesPerWave: 1,
      spawnChance: 1,
      emitterLifetime: -1,
      maxParticles: 500,
      addAtBack: false,
      pos: { x: 0, y: 0 },
      emit: true,
      autoUpdate: false,
      behaviors: [
        { type: "alphaStatic", config: { alpha: 1 } },
        { type: "scaleStatic", config: { min: 4, max: 7 } },
        {
          type: "color",
          config: {
            color: {
              list: [
                { time: 0, value: "#ff4a4a" },
                { time: 0.25, value: "#ffd44a" },
                { time: 0.5, value: "#4aff7a" },
                { time: 0.75, value: "#4ab8ff" },
                { time: 1, value: "#d44aff" },
              ],
            },
          },
        },
        {
          type: "moveAcceleration",
          config: {
            accel: { x: 0, y: 300 },
            minStart: 200,
            maxStart: 350,
            rotate: false,
          },
        },
        {
          type: "rotation",
          config: {
            accel: 0,
            minSpeed: -360,
            maxSpeed: 360,
            minStart: 0,
            maxStart: 360,
          },
        },
        { type: "textureSingle", config: { texture: "" } },
        {
          type: "spawnShape",
          config: {
            type: "rect",
            data: { x: -400, y: -300, w: 800, h: 20 },
          },
        },
      ],
    }),
  },
  {
    id: "explosion",
    name: "Explosion",
    build: () => ({
      lifetime: { min: 0.6, max: 1.0 },
      frequency: 0.8,
      particlesPerWave: 45,
      spawnChance: 1,
      emitterLifetime: -1,
      maxParticles: 100,
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
                { time: 0, value: 1 },
                { time: 0.6, value: 1 },
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
                { time: 0, value: 2 },
                { time: 0.4, value: 8 },
                { time: 1, value: 0.5 },
              ],
            },
          },
        },
        {
          type: "color",
          config: {
            color: {
              list: [
                { time: 0, value: "#ffffff" },
                { time: 0.4, value: "#ffaa44" },
                { time: 1, value: "#ff2a00" },
              ],
            },
          },
        },
        {
          type: "moveSpeed",
          config: {
            speed: {
              list: [
                { time: 0, value: 450 },
                { time: 1, value: 50 },
              ],
            },
          },
        },
        { type: "spawnBurst", config: { start: 0, spacing: 8, distance: 0 } },
        { type: "blendMode", config: { blendMode: "add" } },
        { type: "textureSingle", config: { texture: "" } },
      ],
    }),
  },
  {
    id: "starfield",
    name: "Starfield",
    build: () => ({
      lifetime: { min: 4, max: 8 },
      frequency: 0.02,
      particlesPerWave: 1,
      spawnChance: 1,
      emitterLifetime: -1,
      maxParticles: 400,
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
                { time: 0.5, value: 0.4 },
                { time: 0.85, value: 1 },
                { time: 1, value: 0 },
              ],
            },
          },
        },
        { type: "scaleStatic", config: { min: 1, max: 3 } },
        {
          type: "color",
          config: {
            color: {
              list: [
                { time: 0, value: "#aaccff" },
                { time: 0.5, value: "#ffffff" },
                { time: 1, value: "#ffcccc" },
              ],
            },
          },
        },
        {
          type: "moveSpeed",
          config: {
            speed: {
              list: [
                { time: 0, value: 5 },
                { time: 1, value: 5 },
              ],
            },
            minMult: 0.6,
          },
        },
        { type: "rotationStatic", config: { min: 0, max: 360 } },
        { type: "blendMode", config: { blendMode: "add" } },
        { type: "textureSingle", config: { texture: "" } },
        {
          type: "spawnShape",
          config: {
            type: "rect",
            data: { x: -450, y: -300, w: 900, h: 600 },
          },
        },
      ],
    }),
  },
];
