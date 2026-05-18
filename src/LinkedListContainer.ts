import { Container, ContainerChild } from "pixi.js";

/** Interface for a child of a LinkedListContainer (has the prev/next properties added) */
export interface LinkedListChild extends ContainerChild {
  nextChild: LinkedListChild | null;
  prevChild: LinkedListChild | null;
}

/**
 * v8 port: the original v6 implementation overrode `render`, `renderAdvanced`,
 * `updateTransform`, `calculateBounds`, and `getLocalBounds` so it could keep
 * children in a doubly-linked list instead of an array — saving O(n) array
 * splices when particles were added/removed every frame.
 *
 * Those internals were removed in PixiJS v8 (the render pipeline is now centralized
 * in the renderer, not on each Container). So this v8 version maintains the same
 * external linked-list API (firstChild/lastChild/childCount/addChildBelow/Above,
 * and nextChild/prevChild fields on children) but delegates actual rendering to
 * v8's standard Container. The O(1) array-splice optimization is gone; use the
 * v8 ParticleContainer backend instead if you have high particle counts.
 */
export class LinkedListContainer extends Container {
  private _firstChild: LinkedListChild | null = null;
  private _lastChild: LinkedListChild | null = null;
  private _childCount = 0;

  public get firstChild(): LinkedListChild | null {
    return this._firstChild;
  }

  public get lastChild(): LinkedListChild | null {
    return this._lastChild;
  }

  public get childCount(): number {
    return this._childCount;
  }

  private _linkAtEnd(child: LinkedListChild): void {
    if (this._lastChild) {
      this._lastChild.nextChild = child;
      child.prevChild = this._lastChild;
      this._lastChild = child;
    } else {
      this._firstChild = this._lastChild = child;
    }
    ++this._childCount;
  }

  private _linkAtStart(child: LinkedListChild): void {
    if (this._firstChild) {
      this._firstChild.prevChild = child;
      child.nextChild = this._firstChild;
      this._firstChild = child;
    } else {
      this._firstChild = this._lastChild = child;
    }
    ++this._childCount;
  }

  private _unlink(child: LinkedListChild): void {
    if (child.nextChild) {
      child.nextChild.prevChild = child.prevChild;
    }
    if (child.prevChild) {
      child.prevChild.nextChild = child.nextChild;
    }
    if (this._firstChild === child) {
      this._firstChild = child.nextChild;
    }
    if (this._lastChild === child) {
      this._lastChild = child.prevChild;
    }
    child.nextChild = null;
    child.prevChild = null;
    --this._childCount;
  }

  public addChild<U extends ContainerChild[]>(...children: U): U[0] {
    const result = super.addChild(...children);

    for (let i = 0; i < children.length; i++) {
      this._linkAtEnd(children[i] as LinkedListChild);
    }

    return result;
  }

  public addChildAt<U extends ContainerChild>(child: U, index: number): U {
    const result = super.addChildAt(child, index);
    const c = child as unknown as LinkedListChild;

    if (index <= 0) {
      this._linkAtStart(c);
    } else if (index >= this._childCount) {
      this._linkAtEnd(c);
    } else {
      let i = 0;
      let target = this._firstChild!;

      while (i < index && target.nextChild) {
        target = target.nextChild;
        ++i;
      }
      const before = target.prevChild;

      c.nextChild = target;
      c.prevChild = before;
      target.prevChild = c;
      if (before) before.nextChild = c;
      else this._firstChild = c;
      ++this._childCount;
    }

    return result;
  }

  /**
   * Adds a child to the container to be rendered below another child.
   */
  public addChildBelow<U extends ContainerChild>(child: U, relative: ContainerChild): U {
    const idx = this.getChildIndex(relative);

    return this.addChildAt(child, idx);
  }

  /**
   * Adds a child to the container to be rendered above another child.
   */
  public addChildAbove<U extends ContainerChild>(child: U, relative: ContainerChild): U {
    const idx = this.getChildIndex(relative);

    return this.addChildAt(child, idx + 1);
  }

  public removeChild<U extends ContainerChild[]>(...children: U): U[0] {
    const result = super.removeChild(...children);

    for (let i = 0; i < children.length; i++) {
      const c = children[i] as unknown as LinkedListChild;

      if (c && (c.nextChild || c.prevChild || this._firstChild === c)) {
        this._unlink(c);
      }
    }

    return result;
  }

  public removeChildAt<U extends ContainerChild>(index: number): U {
    const child = super.removeChildAt<U>(index);

    if (child) {
      this._unlink(child as unknown as LinkedListChild);
    }

    return child;
  }

  public removeChildren(beginIndex = 0, endIndex?: number): ContainerChild[] {
    const removed = super.removeChildren(beginIndex, endIndex);

    for (let i = 0; i < removed.length; i++) {
      this._unlink(removed[i] as unknown as LinkedListChild);
    }

    return removed;
  }
}
