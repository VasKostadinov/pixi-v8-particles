// @ts-nocheck — vendored from pixijs-userland/particle-emitter; loose typing matches upstream.
import { combineRGBComponents, SimpleEase, Color } from "./ParticleUtils";
import { PropertyNode } from "./PropertyNode";

/**
 * Rescales an interpolation value into a single segment's 0-1 range.
 *
 * Deliberately does NOT clamp: values outside the segment extrapolate, which is
 * the long-standing behavior for lists whose stops don't span the full 0-1
 * lifetime and which existing configs are tuned against. It only guards the
 * divide — two stops sharing a time would otherwise yield Infinity/NaN and
 * poison every value downstream.
 */
function segmentLerp(lerp: number, start: number, end: number): number {
  const span = end - start;

  return span === 0 ? 0 : (lerp - start) / span;
}

function intValueSingle(this: PropertyList<number>): number {
  return this.first.value;
}

function intColorSingle(this: PropertyList<Color>): number {
  const { r, g, b } = this.first.value;

  return combineRGBComponents(r, g, b);
}

function intValueSimple(this: PropertyList<number>, lerp: number): number {
  if (this.ease) lerp = this.ease(lerp);

  return (this.first.next.value - this.first.value) * lerp + this.first.value;
}

function intColorSimple(this: PropertyList<Color>, lerp: number): number {
  if (this.ease) lerp = this.ease(lerp);

  const curVal = this.first.value;
  const nextVal = this.first.next.value;
  const r = (nextVal.r - curVal.r) * lerp + curVal.r;
  const g = (nextVal.g - curVal.g) * lerp + curVal.g;
  const b = (nextVal.b - curVal.b) * lerp + curVal.b;

  return combineRGBComponents(r, g, b);
}

function intValueComplex(this: PropertyList<number>, lerp: number): number {
  if (this.ease) lerp = this.ease(lerp);

  // make sure we are on the right segment
  let current = this.first;
  let next = current.next;

  // `next.next &&` guard: lerp can drift past 1.0 from `age * (1/maxLife)`
  // float precision, walking past the last node and crashing on null.
  while (next.next && lerp > next.time) {
    current = next;
    next = next.next;
  }
  // convert the lerp value to the segment range
  lerp = segmentLerp(lerp, current.time, next.time);

  return (next.value - current.value) * lerp + current.value;
}

function intColorComplex(this: PropertyList<Color>, lerp: number): number {
  if (this.ease) lerp = this.ease(lerp);

  // make sure we are on the right segment
  let current = this.first;
  let next = current.next;

  // See intValueComplex — same float-drift guard.
  while (next.next && lerp > next.time) {
    current = next;
    next = next.next;
  }
  // convert the lerp value to the segment range
  lerp = segmentLerp(lerp, current.time, next.time);
  const curVal = current.value;
  const nextVal = next.value;
  const r = (nextVal.r - curVal.r) * lerp + curVal.r;
  const g = (nextVal.g - curVal.g) * lerp + curVal.g;
  const b = (nextVal.b - curVal.b) * lerp + curVal.b;

  return combineRGBComponents(r, g, b);
}

function intValueStepped(this: PropertyList<number>, lerp: number): number {
  if (this.ease) lerp = this.ease(lerp);

  // make sure we are on the right segment
  let current = this.first;

  while (current.next && lerp > current.next.time) {
    current = current.next;
  }

  return current.value;
}

function intColorStepped(this: PropertyList<Color>, lerp: number): number {
  if (this.ease) lerp = this.ease(lerp);

  // make sure we are on the right segment
  let current = this.first;

  while (current.next && lerp > current.next.time) {
    current = current.next;
  }
  const curVal = current.value;

  return combineRGBComponents(curVal.r, curVal.g, curVal.b);
}

/**
 * Singly linked list container for keeping track of interpolated properties for particles.
 * Each Particle will have one of these for each interpolated property.
 */
export class PropertyList<V> {
  /**
   * The first property node in the linked list.
   */
  public first: PropertyNode<V>;
  /**
   * Calculates the correct value for the current interpolation value. This method is set in
   * the reset() method.
   * @param lerp The interpolation value from 0-1.
   * @return The interpolated value. Colors are converted to the hex value.
   */
  public interpolate: (lerp: number) => number;
  /**
   * A custom easing method for this list.
   * @param lerp The interpolation value from 0-1.
   * @return The eased value, also from 0-1.
   */
  public ease: SimpleEase;
  /**
   * If this list manages colors, which requires a different method for interpolation.
   */
  private isColor: boolean;

  /**
   * @param isColor If this list handles color values
   */
  constructor(isColor = false) {
    this.first = null;
    this.isColor = !!isColor;
    this.interpolate = null;
    this.ease = null;
  }

  /**
   * Resets the list for use.
   * @param first The first node in the list.
   * @param first.isStepped If the values should be stepped instead of interpolated linearly.
   */
  public reset(first: PropertyNode<V>): void {
    this.first = first;
    const isSimple = first.next && first.next.time >= 1;

    if (!first.next) {
      // PropertyNode.createList collapses a two-stop list into a single node when
      // both stops carry the same value, and a one-stop list is a single node to
      // begin with. Every other interpolator dereferences first.next, so those
      // lists used to throw on the first update. Hold the one value instead.
      this.interpolate = this.isColor ? intColorSingle : intValueSingle;
    } else if (isSimple) {
      this.interpolate = this.isColor ? intColorSimple : intValueSimple;
    } else if (first.isStepped) {
      this.interpolate = this.isColor ? intColorStepped : intValueStepped;
    } else {
      this.interpolate = this.isColor ? intColorComplex : intValueComplex;
    }
    this.ease = this.first.ease;
  }
}
