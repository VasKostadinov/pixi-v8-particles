/**
 * attachDropZone wires an element as a drag-and-drop target for image files.
 *
 * - Prevents the browser's default "open file" behavior on drop.
 * - Filters DataTransfer.files down to those whose type starts with "image/".
 * - Toggles a .is-dragover class while a drag is hovering, using a depth
 *   counter so child elements don't flicker the class on dragenter/leave.
 * - Returns a detach function that removes all listeners.
 *
 * When opts.stopPropagation is true, drop and dragover events stop propagating
 * so an outer (global) drop handler doesn't also fire. Use this for inner
 * zones (per-input, per-list) and leave it false for the global zone.
 *
 * A single module-level window.dragend listener resets every active zone's
 * depth + .is-dragover state when a drag is cancelled (Escape, source aborts,
 * Alt-Tab during drag). Per-zone tracking is via a WeakRef of the element so
 * a panel rebuild that drops the DOM node also lets its entry get reclaimed —
 * no listener leak even if the caller forgets to call detach.
 */
export interface DropZoneOptions {
  stopPropagation?: boolean;
}

interface ZoneState {
  depth: number;
}

const zoneState = new WeakMap<HTMLElement, ZoneState>();
const activeRefs = new Set<WeakRef<HTMLElement>>();
let globalInstalled = false;

function installGlobalDragEnd(): void {
  if (globalInstalled || typeof window === "undefined") return;
  globalInstalled = true;
  window.addEventListener("dragend", () => {
    for (const ref of [...activeRefs]) {
      const el = ref.deref();
      if (!el) {
        activeRefs.delete(ref);
        continue;
      }
      const state = zoneState.get(el);
      if (!state) continue;
      state.depth = 0;
      el.classList.remove("is-dragover");
    }
  });
}

export function attachDropZone(
  el: HTMLElement,
  onFiles: (files: File[]) => void,
  opts: DropZoneOptions = {},
): () => void {
  installGlobalDragEnd();
  const state: ZoneState = { depth: 0 };
  zoneState.set(el, state);
  const ref = new WeakRef(el);
  activeRefs.add(ref);

  const setDragOver = (on: boolean) => {
    el.classList.toggle("is-dragover", on);
  };

  const hasImageItem = (dt: DataTransfer | null): boolean => {
    if (!dt) return false;
    if (dt.items && dt.items.length > 0) {
      for (let i = 0; i < dt.items.length; i++) {
        const it = dt.items[i];
        if (it.kind === "file" && it.type.startsWith("image/")) return true;
      }
      return false;
    }
    // Some browsers don't populate items during dragover — assume yes and
    // filter at drop time. This keeps the visual feedback responsive.
    return true;
  };

  const onDragEnter = (ev: DragEvent) => {
    if (!hasImageItem(ev.dataTransfer)) return;
    ev.preventDefault();
    if (opts.stopPropagation) ev.stopPropagation();
    state.depth++;
    if (state.depth === 1) setDragOver(true);
  };

  const onDragOver = (ev: DragEvent) => {
    if (!hasImageItem(ev.dataTransfer)) return;
    ev.preventDefault();
    if (opts.stopPropagation) ev.stopPropagation();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "copy";
  };

  const onDragLeave = (ev: DragEvent) => {
    if (opts.stopPropagation) ev.stopPropagation();
    state.depth = Math.max(0, state.depth - 1);
    if (state.depth === 0) setDragOver(false);
  };

  const onDrop = (ev: DragEvent) => {
    ev.preventDefault();
    if (opts.stopPropagation) ev.stopPropagation();
    state.depth = 0;
    setDragOver(false);
    const dt = ev.dataTransfer;
    if (!dt) return;
    const files: File[] = [];
    for (let i = 0; i < dt.files.length; i++) {
      const f = dt.files[i];
      if (f.type.startsWith("image/")) files.push(f);
    }
    onFiles(files);
  };

  el.addEventListener("dragenter", onDragEnter);
  el.addEventListener("dragover", onDragOver);
  el.addEventListener("dragleave", onDragLeave);
  el.addEventListener("drop", onDrop);

  return () => {
    activeRefs.delete(ref);
    zoneState.delete(el);
    el.removeEventListener("dragenter", onDragEnter);
    el.removeEventListener("dragover", onDragOver);
    el.removeEventListener("dragleave", onDragLeave);
    el.removeEventListener("drop", onDrop);
  };
}
