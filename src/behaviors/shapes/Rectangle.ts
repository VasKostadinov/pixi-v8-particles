// @ts-nocheck — vendored from pixijs-userland/particle-emitter; loose typing matches upstream.
import { Particle } from "../../Particle";
import { DEG_TO_RADS } from "../../ParticleUtils";
import type { ObjectProperty } from "../BehaviorConfigSchema";
import { SpawnShape } from "./SpawnShape";

/**
 * A SpawnShape that randomly picks locations inside a rectangle, or — when `edges` is
 * enabled — along its perimeter. When spawning on edges it can optionally apply rotation
 * to particles so that they are aimed outward, perpendicular to the edge they spawned on.
 *
 * Example config:
 * ```javascript
 * {
 *     type: 'rect',
 *     data: {
 *          x: 0,
 *          y: 0,
 *          w: 10,
 *          h: 100,
 *          edges: true,
 *          affectRotation: true
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
  /**
   * If rotation should be applied to particles, pointing them outward perpendicular to the
   * edge they spawned on. Only takes effect when `edges` is true.
   */
  public affectRotation: boolean;
  /**
   * Random spread added to the outward rotation so the stream fans out instead of moving as
   * a rigid sheet. Stored in radians; supplied via config in degrees. Defaults to 0.
   */
  public spread: number;

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
    /**
     * If true (and `edges` is true), rotate each particle to point outward, perpendicular to
     * the edge it spawned on. Defaults to false.
     */
    affectRotation?: boolean;
    /**
     * Random spread, in degrees, added to the outward rotation so the stream fans out instead
     * of moving as a rigid sheet. Defaults to 0.
     */
    spread?: number;
  }) {
    this.x = config.x;
    this.y = config.y;
    this.w = config.w;
    this.h = config.h;
    this.edges = !!config.edges;
    this.affectRotation = !!config.affectRotation;
    this.spread = (config.spread || 0) * DEG_TO_RADS;
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
      // outward normal angle of the edge the particle landed on (radians; 0 = +x/right,
      // +y = down), matching how movement behaviors rotate the initial velocity vector
      let outward = 0;
      if (t < w) {
        // top edge: left -> right
        particle.x = this.x + t;
        particle.y = this.y;
        outward = -Math.PI / 2;
      } else if ((t -= w) < h) {
        // right edge: top -> bottom
        particle.x = this.x + w;
        particle.y = this.y + t;
        outward = 0;
      } else if ((t -= h) < w) {
        // bottom edge: right -> left
        particle.x = this.x + (w - t);
        particle.y = this.y + h;
        outward = Math.PI / 2;
      } else {
        // left edge: bottom -> top
        t -= w;
        particle.x = this.x;
        particle.y = this.y + (h - t);
        outward = Math.PI;
      }
      if (this.affectRotation) {
        // skip the RNG when there's no spread (the common case): the result is just `outward`
        particle.rotation = this.spread ? outward + (Math.random() - 0.5) * this.spread : outward;
      }
      return;
    }
    // place the particle at a random point in the rectangle
    particle.x = Math.random() * this.w + this.x;
    particle.y = Math.random() * this.h + this.y;
  }
}
