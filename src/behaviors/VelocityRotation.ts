import { Particle } from "../Particle";
import { DEG_TO_RADS } from "../ParticleUtils";
import { IEmitterBehavior, BehaviorOrder } from "./Behaviors";
import { BehaviorEditorConfig } from "./editor/Types";

/**
 * A Rotation behavior that aligns each particle's rotation with its current velocity vector,
 * so the sprite faces its direction of travel. Reads `particle.config.velocity`, which is
 * populated by any of the movement behaviors (moveSpeed, moveSpeedStatic, moveAcceleration,
 * path). Runs after movement updates so the angle reflects the new velocity each frame.
 *
 * Example configuration:
 * ```javascript
 * {
 *     "type": "rotationVelocity",
 *     "config": {
 *          "offset": 0
 *     }
 * }
 * ```
 */
export class VelocityRotationBehavior implements IEmitterBehavior {
  public static type = "rotationVelocity";
  public static editorConfig?: BehaviorEditorConfig;

  public order = BehaviorOrder.Late + 1;
  private offset: number;

  constructor(config: {
    /**
     * Rotation offset in degrees added to the velocity angle. Use 90 if the sprite art
     * faces up by default instead of right. Defaults to 0.
     */
    offset?: number;
  }) {
    this.offset = (config.offset ?? 0) * DEG_TO_RADS;
  }

  initParticles(first: Particle): void {
    let next: Particle | null = first;
    while (next) {
      const vel = next.config.velocity;
      if (vel && (vel.x !== 0 || vel.y !== 0)) {
        next.rotation = Math.atan2(vel.y, vel.x) + this.offset;
      }
      next = next.next;
    }
  }

  updateParticle(particle: Particle): void {
    const vel = particle.config.velocity;
    if (vel && (vel.x !== 0 || vel.y !== 0)) {
      particle.rotation = Math.atan2(vel.y, vel.x) + this.offset;
    }
  }
}
