// @ts-nocheck — vendored from pixijs-userland/particle-emitter; loose typing matches upstream.
import { Particle } from "../Particle";
import { IEmitterBehavior, BehaviorOrder } from "./Behaviors";
import type { BehaviorConfigSchema } from "./BehaviorConfigSchema";

/**
 * A Spawn behavior that sends particles out from a single point at the emitter's position.
 *
 * Example config:
 * ```javascript
 * {
 *     type: 'spawnPoint',
 *     config: {}
 * }
 * ```
 */
export class PointSpawnBehavior implements IEmitterBehavior {
  public static type = "spawnPoint";
  public static configSchema: BehaviorConfigSchema = null;

  order = BehaviorOrder.Spawn;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initParticles(_first: Particle): void {
    // really just a no-op
  }
}
