// @ts-nocheck — vendored from pixijs-userland/particle-emitter; loose typing matches upstream.
import { Particle } from "../../Particle";
import type { ObjectProperty } from "../BehaviorConfigSchema";
import { SpawnShape } from "./SpawnShape";

/**
 * A SpawnShape that randomly picks locations inside a rectangle.
 *
 * Example config:
 * ```javascript
 * {
 *     type: 'rect',
 *     data: {
 *          x: 0,
 *          y: 0,
 *          w: 10,
 *          h: 100
 *     }
 * }
 * ```
 */
export class Rectangle implements SpawnShape {
  public static type = "rect";
  public static configSchema: ObjectProperty = null;
  /**
   * X (left) position of the rectangle.
   */
  public x: number;
  /**
   * Y (top) position of the rectangle.
   */
  public y: number;
  /**
   * Width of the rectangle.
   */
  public w: number;
  /**
   * Height of the rectangle.
   */
  public h: number;
  /**
   * If particles should be spawned on the perimeter (frame) of the rectangle
   * rather than inside it.
   */
  public edges: boolean;

  constructor(config: {
    /**
     * X (left) position of the rectangle.
     */
    x: number;
    /**
     * Y (top) position of the rectangle.
     */
    y: number;
    /**
     * Width of the rectangle.
     */
    w: number;
    /**
     * Height of the rectangle.
     */
    h: number;
    /**
     * If true, particles are spawned only along the perimeter (frame) of the rectangle.
     */
    edges?: boolean;
  }) {
    this.x = config.x;
    this.y = config.y;
    this.w = config.w;
    this.h = config.h;
    this.edges = !!config.edges;
  }

  getRandPos(particle: Particle): void {
    if (this.edges) {
      const w = this.w;
      const h = this.h;
      const perimeter = 2 * (w + h);
      if (perimeter <= 0) {
        particle.x = this.x;
        particle.y = this.y;
        return;
      }
      // pick a random point along the perimeter, weighted so each edge gets
      // a share proportional to its length
      let t = Math.random() * perimeter;
      if (t < w) {
        // top edge: left -> right
        particle.x = this.x + t;
        particle.y = this.y;
      } else if ((t -= w) < h) {
        // right edge: top -> bottom
        particle.x = this.x + w;
        particle.y = this.y + t;
      } else if ((t -= h) < w) {
        // bottom edge: right -> left
        particle.x = this.x + (w - t);
        particle.y = this.y + h;
      } else {
        // left edge: bottom -> top
        t -= w;
        particle.x = this.x;
        particle.y = this.y + (h - t);
      }
      return;
    }
    // place the particle at a random point in the rectangle
    particle.x = Math.random() * this.w + this.x;
    particle.y = Math.random() * this.h + this.y;
  }
}
