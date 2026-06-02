import { Emitter } from "./Emitter";
import * as behaviors from "./behaviors";

/**
 * Registers every behavior bundled with this package.
 *
 * Behaviors are otherwise opt-in: import the ones you use and call
 * `Emitter.registerBehavior(...)` yourself so bundlers can tree-shake the
 * rest. Call this helper once at startup when you'd rather have every
 * behavior available and don't care about bundle size.
 *
 * Registration is idempotent (keyed by `behavior.type`), so calling this
 * multiple times — or mixing it with manual `registerBehavior` calls — is safe.
 */
export function registerAllBehaviors(): void {
  Emitter.registerBehavior(behaviors.AccelerationBehavior);
  Emitter.registerBehavior(behaviors.AlphaBehavior);
  Emitter.registerBehavior(behaviors.StaticAlphaBehavior);
  Emitter.registerBehavior(behaviors.RandomAnimatedTextureBehavior);
  Emitter.registerBehavior(behaviors.SingleAnimatedTextureBehavior);
  Emitter.registerBehavior(behaviors.BlendModeBehavior);
  Emitter.registerBehavior(behaviors.BurstSpawnBehavior);
  Emitter.registerBehavior(behaviors.ColorBehavior);
  Emitter.registerBehavior(behaviors.StaticColorBehavior);
  Emitter.registerBehavior(behaviors.OrderedTextureBehavior);
  Emitter.registerBehavior(behaviors.PathBehavior);
  Emitter.registerBehavior(behaviors.PointSpawnBehavior);
  Emitter.registerBehavior(behaviors.RandomTextureBehavior);
  Emitter.registerBehavior(behaviors.RotationBehavior);
  Emitter.registerBehavior(behaviors.StaticRotationBehavior);
  Emitter.registerBehavior(behaviors.NoRotationBehavior);
  Emitter.registerBehavior(behaviors.ScaleBehavior);
  Emitter.registerBehavior(behaviors.StaticScaleBehavior);
  Emitter.registerBehavior(behaviors.ShapeSpawnBehavior);
  Emitter.registerBehavior(behaviors.SingleTextureBehavior);
  Emitter.registerBehavior(behaviors.SpeedBehavior);
  Emitter.registerBehavior(behaviors.StaticSpeedBehavior);
  Emitter.registerBehavior(behaviors.VelocityRotationBehavior);
}
