// @ts-nocheck — vendored from pixijs-userland/particle-emitter; loose typing matches upstream.
import { Particle } from "../Particle";
import { Color, combineRGBComponents } from "../ParticleUtils";
import { PropertyList } from "../PropertyList";
import { PropertyNode, ValueList } from "../PropertyNode";
import { IEmitterBehavior, BehaviorOrder } from "./Behaviors";
import type { BehaviorConfigSchema } from "./BehaviorConfigSchema";

/**
 * A Color behavior that applies an interpolated or stepped list of values to the particle's tint property.
 *
 * Example config:
 * ```javascript
 * {
 *     type: 'color',
 *     config: {
 *         color: {
 *              list: [{value: '#ff0000' time: 0}, {value: '#00ff00', time: 0.5}, {value: '#0000ff', time: 1}]
 *         },
 *     }
 * }
 * ```
 */
export class ColorBehavior implements IEmitterBehavior {
  public static type = "color";
  public static configSchema: BehaviorConfigSchema = null;

  public order = BehaviorOrder.Normal;
  private list: PropertyList<Color>;
  constructor(config: {
    /**
     * Color of the particles as 6 digit hex codes.
     */
    color: ValueList<string>;
  }) {
    this.list = new PropertyList(true);
    this.list.reset(PropertyNode.createList(config.color));
  }

  initParticles(first: Particle): void {
    let next = first;
    const color = this.list.first.value;
    const tint = combineRGBComponents(color.r, color.g, color.b);

    while (next) {
      next.tint = tint;
      next = next.next;
    }
  }

  updateParticle(particle: Particle): void {
    particle.tint = this.list.interpolate(particle.agePercent);
  }
}

/**
 * A Color behavior that applies a single color to the particle's tint property at initialization.
 *
 * Example config:
 * ```javascript
 * {
 *     type: 'colorStatic',
 *     config: {
 *         color: '#ffff00',
 *     }
 * }
 * ```
 */
export class StaticColorBehavior implements IEmitterBehavior {
  public static type = "colorStatic";
  public static configSchema: BehaviorConfigSchema = null;

  public order = BehaviorOrder.Normal;
  private value: number;
  constructor(config: {
    /**
     * Color of the particles as 6 digit hex codes.
     */
    color: string;
  }) {
    let color = config.color;

    if (color.charAt(0) === "#") {
      color = color.substr(1);
    } else if (color.indexOf("0x") === 0) {
      color = color.substr(2);
    }

    // Expand CSS-style 3-digit shorthand ("fff" -> "ffffff") — parsed as-is it
    // would land as 0x000fff, a silently wrong near-blue instead of white.
    if (color.length === 3) {
      color = color.replace(/./g, "$&$&");
    }

    const parsed = parseInt(color, 16);

    // An unparseable string gives NaN and an 8-digit AARRGGBB string gives a
    // value above 0xFFFFFF; both make pixi v8 throw when they land on a
    // particle's tint. Drop any alpha byte and fall back to white.
    this.value = Number.isFinite(parsed) ? parsed & 0xffffff : 0xffffff;
  }

  initParticles(first: Particle): void {
    let next = first;

    while (next) {
      next.tint = this.value;
      next = next.next;
    }
  }
}
