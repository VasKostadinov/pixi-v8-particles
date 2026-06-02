import type { IEmitterBehaviorClass } from "../../src/behaviors/Behaviors";
import type { BehaviorConfigSchema, Property } from "../../src/behaviors/BehaviorConfigSchema";

import { AccelerationBehavior } from "../../src/behaviors/AccelerationMovement";
import { AlphaBehavior, StaticAlphaBehavior } from "../../src/behaviors/Alpha";
import {
  RandomAnimatedTextureBehavior,
  SingleAnimatedTextureBehavior,
} from "../../src/behaviors/AnimatedTexture";
import { BlendModeBehavior } from "../../src/behaviors/BlendMode";
import { BurstSpawnBehavior } from "../../src/behaviors/BurstSpawn";
import { ColorBehavior, StaticColorBehavior } from "../../src/behaviors/Color";
import { OrderedTextureBehavior } from "../../src/behaviors/OrderedTexture";
import { PathBehavior } from "../../src/behaviors/PathMovement";
import { PointSpawnBehavior } from "../../src/behaviors/PointSpawn";
import { RandomTextureBehavior } from "../../src/behaviors/RandomTexture";
import {
  RotationBehavior,
  StaticRotationBehavior,
  NoRotationBehavior,
} from "../../src/behaviors/Rotation";
import { ScaleBehavior, StaticScaleBehavior } from "../../src/behaviors/Scale";
import { ShapeSpawnBehavior } from "../../src/behaviors/ShapeSpawn";
import { SingleTextureBehavior } from "../../src/behaviors/SingleTexture";
import { SpeedBehavior, StaticSpeedBehavior } from "../../src/behaviors/SpeedMovement";
import { VelocityRotationBehavior } from "../../src/behaviors/VelocityRotation";

export interface BehaviorMeta {
  type: string;
  configSchema: BehaviorConfigSchema;
  defaultConfig: () => Record<string, unknown>;
}

const allClasses: IEmitterBehaviorClass[] = [
  AccelerationBehavior,
  AlphaBehavior,
  StaticAlphaBehavior,
  RandomAnimatedTextureBehavior,
  SingleAnimatedTextureBehavior,
  BlendModeBehavior,
  BurstSpawnBehavior,
  ColorBehavior,
  StaticColorBehavior,
  OrderedTextureBehavior,
  PathBehavior,
  PointSpawnBehavior,
  RandomTextureBehavior,
  RotationBehavior,
  StaticRotationBehavior,
  NoRotationBehavior,
  ScaleBehavior,
  StaticScaleBehavior,
  ShapeSpawnBehavior,
  SingleTextureBehavior,
  SpeedBehavior,
  StaticSpeedBehavior,
  VelocityRotationBehavior,
];

export const behaviorMetas: BehaviorMeta[] = allClasses
  .filter((c) => !!c.configSchema)
  .map((c) => ({
    type: c.type,
    configSchema: c.configSchema!,
    defaultConfig: () => buildDefault(c.configSchema!.props),
  }));

export const behaviorMetaByType = new Map<string, BehaviorMeta>(
  behaviorMetas.map((m) => [m.type, m]),
);

export function groupBehaviorsByCategory(): Map<string, BehaviorMeta[]> {
  const out = new Map<string, BehaviorMeta[]>();
  for (const m of behaviorMetas) {
    const cat = m.configSchema.category;
    const list = out.get(cat) ?? [];
    list.push(m);
    out.set(cat, list);
  }
  return out;
}

export function buildDefault(props: Property[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of props) {
    const v = defaultForProperty(p);
    if (v !== undefined) out[p.name] = v;
  }
  return out;
}

export function defaultForProperty(p: Property): unknown {
  switch (p.type) {
    case "number":
      return p.default;
    case "color":
      return p.default;
    case "boolean":
      return p.default;
    case "text":
      return p.default;
    case "point":
      return { ...p.default };
    case "image":
      return "";
    case "numberList":
      return {
        list: [
          { time: 0, value: p.default },
          { time: 1, value: p.default },
        ],
      };
    case "colorList":
      return {
        list: [
          { time: 0, value: p.default },
          { time: 1, value: p.default },
        ],
      };
    case "list":
      return [];
    case "object":
      return buildDefault(p.props);
    case "select":
      return p.default;
    case "subconfig":
      return undefined;
  }
}
