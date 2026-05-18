// @ts-nocheck — bridges v8 Particle to the upstream Sprite-based API used by behaviors.
import { Particle as PixiParticle, Texture } from 'pixi.js';
import type { Emitter } from './Emitter';
import type { LinkedListChild } from './LinkedListContainer';

/**
 * Per-particle backend that uses pixi.js v8 `Particle` (the lightweight,
 * ParticleContainer-only primitive) instead of `Sprite`.
 *
 * Requirements when using this backend:
 * - The emitter's parent MUST be a `ParticleContainer`.
 * - All textures used by behaviors must share a single `TextureSource`
 *   (i.e. come from one spritesheet / atlas).
 * - Per-particle `blendMode` is not supported by ParticleContainer; set the
 *   blend mode on the ParticleContainer instead.
 *
 * This class adapts the v8 Particle to the Sprite-shaped API the original
 * particle-emitter behaviors expect:
 * - `position.x` / `position.y` proxy → `x` / `y`
 * - `scale.x` / `scale.y` proxy → `scaleX` / `scaleY`
 * - `anchor.x` / `anchor.y` proxy → `anchorX` / `anchorY`
 * - `visible` is tracked but ignored at render time (remove from container to hide)
 * - `blendMode` is tracked but ignored (set on the container)
 * - linked-list pointers and lifecycle fields used by Emitter
 */
class XYProxy
{
    constructor(private target: any, private xField: string, private yField: string) {}
    get x(): number { return this.target[this.xField]; }
    set x(v: number) { this.target[this.xField] = v; }
    get y(): number { return this.target[this.yField]; }
    set y(v: number) { this.target[this.yField] = v; }
    set(x: number, y?: number): void
    {
        this.target[this.xField] = x;
        this.target[this.yField] = y ?? x;
    }
    copyFrom(p: { x: number; y: number }): void
    {
        this.target[this.xField] = p.x;
        this.target[this.yField] = p.y;
    }
}

export class FastParticle extends PixiParticle implements LinkedListChild
{
    public emitter: Emitter;
    public maxLife: number = 0;
    public age: number = 0;
    public agePercent: number = 0;
    public oneOverLife: number = 0;

    public next: FastParticle | null = null;
    public prev: FastParticle | null = null;
    public prevChild: LinkedListChild | null = null;
    public nextChild: LinkedListChild | null = null;

    /** Static per-particle config for behaviors to use. Not cleared on recycle. */
    public config: { [key: string]: any } = {};

    /** Set by Emitter; used by recycle() to know which ParticleContainer to remove from. */
    public parent: any = null;

    /** Tracked for API compatibility; v8 ParticleContainer doesn't render hidden particles per-flag. */
    public visible: boolean = true;
    /** Tracked for API compatibility; ParticleContainer-level blend mode applies instead. */
    public blendMode: string = 'normal';

    public position: XYProxy;
    public scale: XYProxy;
    public anchor: XYProxy;

    constructor(emitter: Emitter)
    {
        super({ texture: Texture.EMPTY });
        this.emitter = emitter;
        this.position = new XYProxy(this, 'x', 'y');
        this.scale = new XYProxy(this, 'scaleX', 'scaleY');
        this.anchor = new XYProxy(this, 'anchorX', 'anchorY');
        // particles centered by default
        this.anchorX = 0.5;
        this.anchorY = 0.5;

        // hot-path methods on the instance, matching upstream perf trick
        this.init = this.init;
        this.kill = this.kill;
    }

    public init(maxLife: number): void
    {
        this.maxLife = maxLife;
        this.age = 0;
        this.agePercent = 0;
        this.rotation = 0;
        this.x = 0;
        this.y = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this.tint = 0xffffff;
        this.alpha = 1;
        this.oneOverLife = 1 / this.maxLife;
        this.visible = true;
    }

    public kill(): void
    {
        this.emitter.recycle(this as any);
    }

    public destroy(): void
    {
        if (this.parent && typeof this.parent.removeParticle === 'function')
        {
            this.parent.removeParticle(this);
        }
        this.parent = null;
        this.emitter = null as any;
        this.next = null;
        this.prev = null;
    }
}
