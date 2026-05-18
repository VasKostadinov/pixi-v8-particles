import type { ObjectProperty, ListProperty } from "../../src/behaviors/editor/Types";
import { Torus } from "../../src/behaviors/shapes/Torus";
import { Rectangle } from "../../src/behaviors/shapes/Rectangle";
import { PolygonalChain } from "../../src/behaviors/shapes/PolygonalChain";
import type { SpawnShapeClass } from "../../src/behaviors/shapes/SpawnShape";
import { buildDefault } from "./behaviorRegistry";

export interface ShapeMeta {
  type: string;
  editorConfig: ObjectProperty | ListProperty;
  defaultData: () => unknown;
}

const shapeClasses: SpawnShapeClass[] = [Torus, Rectangle, PolygonalChain];

export const shapeMetas: ShapeMeta[] = shapeClasses
  .filter((c) => !!c.editorConfig)
  .map((c) => ({
    type: c.type,
    editorConfig: c.editorConfig!,
    defaultData: () => defaultDataForShape(c.editorConfig!),
  }));

export const shapeMetaByType = new Map<string, ShapeMeta>(shapeMetas.map((m) => [m.type, m]));

function defaultDataForShape(cfg: ObjectProperty | ListProperty): unknown {
  if (cfg.type === "object") return buildDefault(cfg.props);
  return [];
}

export const dictionaries: Record<string, Map<string, ShapeMeta>> = {
  shapes: shapeMetaByType,
};
